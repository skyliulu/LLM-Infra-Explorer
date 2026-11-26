export const SCHEDULER_MODES = ['static', 'continuous'];
export const ROOFLINE_BATCHES = [1, 16, 128];

// H100 SXM5 BF16 peak (~989 TFLOP/s) / HBM3 bandwidth (~3.35 TB/s) ≈ 295 FLOP/Byte.
export const H100_RIDGE_AI = 295;
export const PREFILL_SAMPLE_TOKENS = 512;

export function deriveRooflineState({ phase = 'prefill', batchSize = 1 } = {}) {
  const safeBatch = ROOFLINE_BATCHES.includes(Number(batchSize)) ? Number(batchSize) : 1;
  // Linear projection weights in BF16 (2 bytes/param) perform 2 FLOPs/param per token:
  // Linear GEMM AI ≈ active_tokens (B * T_prompt for Prefill, B for Decode).
  // By contrast, Decode Attention reads per-request KV caches so its AI stays ~1 FLOP/B regardless of B!
  const prefillAi = safeBatch * PREFILL_SAMPLE_TOKENS;
  const decodeAi = safeBatch;
  const decodeAttnAi = 1;
  const activePhase = phase === 'decode' ? 'decode' : 'prefill';
  const activeAi = activePhase === 'decode' ? decodeAi : prefillAi;
  const bound = activeAi >= H100_RIDGE_AI ? 'compute' : 'memory';

  // Log2 scale mapping [1 .. 1024] -> [8% .. 92%] so pills stay on-track while displaying exact AI
  const toPct = (ai) => Math.max(8, Math.min(92, 8 + (Math.log2(Math.max(1, Math.min(1024, ai))) / Math.log2(1024)) * 84));

  return {
    phase: activePhase,
    batchSize: safeBatch,
    prefillSampleTokens: PREFILL_SAMPLE_TOKENS,
    ridgeAi: H100_RIDGE_AI,
    ridgePct: toPct(H100_RIDGE_AI),
    prefillAi,
    prefillPct: toPct(prefillAi),
    decodeAi,
    decodeAttnAi,
    decodePct: toPct(decodeAi),
    activeAi,
    bound,
  };
}

export const REQUEST_CATALOG = [
  { id: 'R1', key: 'reqShortQa', arrival: 0, promptTokens: 256, decodeSteps: 2, tone: 'sky' },
  { id: 'R2', key: 'reqCodeGen', arrival: 0, promptTokens: 256, decodeSteps: 5, tone: 'indigo' },
  { id: 'R3', key: 'reqLongDoc', arrival: 2, promptTokens: 1024, decodeSteps: 3, tone: 'purple' },
  { id: 'R4', key: 'reqToolCall', arrival: 3, promptTokens: 128, decodeSteps: 2, tone: 'emerald' },
];

export const CHUNK_SIZE = 256;
export const TOKEN_BUDGET = 512;

function simulateStatic() {
  // Wave 1: R1 + R2 run from t=0 until both complete; R3/R4 wait in queue.
  // Wave 2: R3 (1024-tok monolithic prefill takes 3 ticks) + R4 run together.
  const totalTicks = 13;
  const grid = {
    R1: ['prefill', 'decode', 'decode', 'pad', 'pad', 'pad', 'done', 'done', 'done', 'done', 'done', 'done', 'done'],
    R2: ['prefill', 'decode', 'decode', 'decode', 'decode', 'decode', 'done', 'done', 'done', 'done', 'done', 'done', 'done'],
    R3: ['absent', 'absent', 'queued', 'queued', 'queued', 'queued', 'prefill', 'prefill', 'prefill', 'decode', 'decode', 'decode', 'done'],
    R4: ['absent', 'absent', 'absent', 'queued', 'queued', 'queued', 'hol_stall', 'hol_stall', 'prefill', 'decode', 'decode', 'pad', 'done'],
  };

  const r3Slices = { 6: 342, 7: 341, 8: 341 }; // sums to exact 1024 tokens
  const ticks = Array.from({ length: totalTicks }, (_, tick) => {
    let activePrefillTokens = 0;
    let activeDecodeTokens = 0;
    let padSlots = 0;
    let stalledRequests = 0;
    const cells = REQUEST_CATALOG.map((req) => {
      const state = grid[req.id][tick];
      let tokens = 0;
      if (state === 'prefill') {
        tokens = req.id === 'R3' ? (r3Slices[tick] ?? 341) : req.promptTokens;
        activePrefillTokens += tokens;
      } else if (state === 'decode') {
        tokens = 1;
        activeDecodeTokens += 1;
      } else if (state === 'pad') {
        padSlots += 1;
      } else if (state === 'queued' || state === 'hol_stall') {
        stalledRequests += 1;
      }
      return { id: req.id, state, tokens };
    });
    return {
      tick,
      cells,
      activePrefillTokens,
      activeDecodeTokens,
      totalBatchTokens: activePrefillTokens + activeDecodeTokens,
      padSlots,
      stalledRequests,
    };
  });

  const padSlotTotal = ticks.reduce((s, tk) => s + tk.padSlots, 0);
  const activeWorkCells = ticks.reduce(
    (s, tk) => s + tk.cells.filter((c) => c.state === 'prefill' || c.state === 'decode').length,
    0
  );
  const holStallCells = ticks.reduce(
    (s, tk) => s + tk.cells.filter((c) => c.state === 'hol_stall').length,
    0
  );
  const utilizationPct = Math.round((activeWorkCells / Math.max(1, activeWorkCells + padSlotTotal + holStallCells)) * 100);

  return {
    mode: 'static',
    makespan: 12,
    totalTicks,
    padSlotTotal,
    maxDecodeStall: holStallCells,
    utilizationPct,
    ticks,
  };
}

function simulateContinuous() {
  // Iteration-level scheduling + Chunked Prefill (budget = 512 tokens/iter):
  // - R1 completes at t=2 and frees its slot immediately (0 pad bubbles).
  // - R3's 1024-tok prompt splits into 4x256 chunks interleaved with R2/R4 decode tokens.
  const totalTicks = 10;
  const grid = {
    R1: ['prefill', 'decode', 'decode', 'done', 'done', 'done', 'done', 'done', 'done', 'done'],
    R2: ['prefill', 'decode', 'decode', 'decode', 'decode', 'decode', 'done', 'done', 'done', 'done'],
    R3: ['absent', 'absent', 'chunk', 'chunk', 'chunk', 'chunk', 'decode', 'decode', 'decode', 'done'],
    R4: ['absent', 'absent', 'absent', 'prefill', 'decode', 'decode', 'done', 'done', 'done', 'done'],
  };

  const ticks = Array.from({ length: totalTicks }, (_, tick) => {
    let activePrefillTokens = 0;
    let activeDecodeTokens = 0;
    let chunkIndex = 0;
    const cells = REQUEST_CATALOG.map((req) => {
      const state = grid[req.id][tick];
      let tokens = 0;
      if (state === 'prefill' || state === 'chunk') {
        tokens = state === 'chunk' ? Math.min(CHUNK_SIZE, TOKEN_BUDGET) : req.promptTokens;
        activePrefillTokens += tokens;
        if (state === 'chunk') chunkIndex = tick - 1; // t=2..5 -> C1..C4
      } else if (state === 'decode') {
        tokens = 1;
        activeDecodeTokens += 1;
      }
      return { id: req.id, state, tokens, chunkIndex: state === 'chunk' ? chunkIndex : 0 };
    });
    return {
      tick,
      cells,
      activePrefillTokens,
      activeDecodeTokens,
      totalBatchTokens: activePrefillTokens + activeDecodeTokens,
      padSlots: 0,
      stalledRequests: 0,
    };
  });

  return {
    mode: 'continuous',
    makespan: 9,
    totalTicks,
    padSlotTotal: 0,
    maxDecodeStall: 0,
    utilizationPct: 100,
    ticks,
  };
}

export function deriveSchedulerSnapshot({ mode = 'continuous', tick = 3 } = {}) {
  const safeMode = SCHEDULER_MODES.includes(mode) ? mode : 'continuous';
  const staticRun = simulateStatic();
  const continuousRun = simulateContinuous();
  const activeRun = safeMode === 'static' ? staticRun : continuousRun;
  const maxTick = activeRun.totalTicks - 1;
  const safeTick = Math.max(0, Math.min(maxTick, Number.isFinite(Number(tick)) ? Math.trunc(Number(tick)) : 0));

  return {
    mode: safeMode,
    tick: safeTick,
    maxTick,
    activeRun,
    currentTick: activeRun.ticks[safeTick],
    comparison: {
      static: {
        makespan: staticRun.makespan,
        padSlotTotal: staticRun.padSlotTotal,
        maxDecodeStall: staticRun.maxDecodeStall,
        utilizationPct: staticRun.utilizationPct,
      },
      continuous: {
        makespan: continuousRun.makespan,
        padSlotTotal: continuousRun.padSlotTotal,
        maxDecodeStall: continuousRun.maxDecodeStall,
        utilizationPct: continuousRun.utilizationPct,
      },
    },
  };
}
