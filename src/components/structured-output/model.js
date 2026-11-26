export const MASK_ENGINES = ['naive_scan', 'fsm_index', 'xgrammar'];
export const VOCAB_SIZES = [32768, 128256, 256000];
export const JUMP_MODES = ['token_by_token', 'jump_forward'];
export const OVERLAP_MODES = ['serial', 'async_overlap'];
export const PITFALL_IDS = ['bpe_healing', 'recursive_cfg', 'cold_compile', 'spec_coupling'];

export function normalizeStructuredConfig(input = {}) {
  const maskEngine = MASK_ENGINES.includes(input.maskEngine) ? input.maskEngine : 'xgrammar';
  const vocabSize = VOCAB_SIZES.includes(Number(input.vocabSize)) ? Number(input.vocabSize) : 128256;
  const jumpMode = JUMP_MODES.includes(input.jumpMode) ? input.jumpMode : 'jump_forward';
  const overlapMode = OVERLAP_MODES.includes(input.overlapMode) ? input.overlapMode : 'async_overlap';
  const pitfallId = PITFALL_IDS.includes(input.pitfallId) ? input.pitfallId : 'bpe_healing';
  return { maskEngine, vocabSize, jumpMode, overlapMode, pitfallId };
}

// §3 Mask generation latency vs vocab size (ms per decode step, single request)
export function deriveMaskCostModel({ maskEngine = 'xgrammar', vocabSize = 128256 } = {}) {
  const V = VOCAB_SIZES.includes(Number(vocabSize)) ? Number(vocabSize) : 128256;
  const scale = V / 128256;
  // Naive scans every token regex on CPU (~8.4 ms at 128K)
  const naiveMs = Number((8.4 * scale).toFixed(2));
  // Outlines pre-indexed FSM table: 0% per-token regex check at runtime (~0.42 ms materializing valid ID list -> mask)
  const fsmMs = Number((0.42 * scale).toFixed(2));
  // XGrammar: ~99% context-independent precomputed bitmask + ~1% runtime PDA stack check (~0.04 ms/req!)
  const xgrammarMs = Number((0.04 * (0.5 + 0.5 * scale)).toFixed(2));
  const gpuForwardMs = 15.0; // typical H100 decode step

  const entries = [
    { id: 'naive_scan', maskMs: naiveMs, runtimeCheckPct: 100, memMB: 12 },
    { id: 'fsm_index', maskMs: fsmMs, runtimeCheckPct: 0, memMB: Math.round(180 * scale) },
    { id: 'xgrammar', maskMs: xgrammarMs, runtimeCheckPct: 1, memMB: Math.round(18 * scale) },
  ].map((e) => ({
    ...e,
    overheadPct: Number(((e.maskMs / gpuForwardMs) * 100).toFixed(1)),
  }));

  const selected = entries.find((e) => e.id === maskEngine) || entries[2];
  const speedupVsNaive = Number((naiveMs / Math.max(0.01, selected.maskMs)).toFixed(1));
  return { vocabSize: V, entries, selected, speedupVsNaive, gpuForwardMs };
}

// §2 Step-by-step FSM/PDA Logits Masking for `{"tool":"search","k":5}`
const FSM_STEPS = [
  {
    state: 'S0_OPEN_OBJ',
    emitted: '',
    nextToken: '{"',
    candidates: [
      { tok: '{"', logit: 4.8, valid: true },
      { tok: 'Sure', logit: 6.1, valid: false },
      { tok: '```json', logit: 5.4, valid: false },
      { tok: '{', logit: 3.9, valid: true },
      { tok: '[', logit: 2.1, valid: false },
    ],
  },
  {
    state: 'S1_KEY_TOOL',
    emitted: '{"',
    nextToken: 'tool":"',
    candidates: [
      { tok: 'tool":"', logit: 5.2, valid: true },
      { tok: 'name":"', logit: 4.9, valid: false },
      { tok: 'action', logit: 4.4, valid: false },
      { tok: 'tool', logit: 3.1, valid: true },
      { tok: '}', logit: 1.5, valid: false },
    ],
  },
  {
    state: 'S2_ENUM_VAL',
    emitted: '{"tool":"',
    nextToken: 'search',
    candidates: [
      { tok: 'search', logit: 5.7, valid: true },
      { tok: 'calc', logit: 3.6, valid: true },
      { tok: 'browse', logit: 4.8, valid: false },
      { tok: 'web', logit: 4.1, valid: false },
      { tok: '123', logit: 1.2, valid: false },
    ],
  },
  {
    state: 'S3_KEY_K',
    emitted: '{"tool":"search',
    nextToken: '","k":',
    candidates: [
      { tok: '","k":', logit: 5.5, valid: true },
      { tok: '"}', logit: 4.9, valid: false },
      { tok: '","q":', logit: 4.2, valid: false },
      { tok: '",', logit: 3.0, valid: true },
      { tok: ' ', logit: 1.8, valid: false },
    ],
  },
  {
    state: 'S4_INT_VAL',
    emitted: '{"tool":"search","k":',
    nextToken: '5}',
    candidates: [
      { tok: '5}', logit: 5.1, valid: true },
      { tok: '3}', logit: 4.3, valid: true },
      { tok: '"five"', logit: 5.6, valid: false },
      { tok: 'null', logit: 3.4, valid: false },
      { tok: 'true', logit: 2.0, valid: false },
    ],
  },
];

export function deriveFsmStep(step = 0) {
  const s = Math.max(0, Math.min(FSM_STEPS.length - 1, Math.trunc(Number(step) || 0)));
  const frame = FSM_STEPS[s];
  const validExps = frame.candidates.map((c) => (c.valid ? Math.exp(c.logit) : 0));
  const sumExp = validExps.reduce((a, b) => a + b, 0) || 1;
  const rawExps = frame.candidates.map((c) => Math.exp(c.logit));
  const rawSum = rawExps.reduce((a, b) => a + b, 0) || 1;

  const candidates = frame.candidates.map((c, idx) => ({
    ...c,
    rawProbPct: Math.round((rawExps[idx] / rawSum) * 100),
    maskedProbPct: c.valid ? Math.round((validExps[idx] / sumExp) * 100) : 0,
  }));

  return {
    step: s,
    maxStep: FSM_STEPS.length - 1,
    phase: s === 0 ? 'idle' : s === FSM_STEPS.length - 1 ? 'done' : 'running',
    state: frame.state,
    emitted: frame.emitted,
    nextToken: frame.nextToken,
    candidates,
    illegalBlockedCount: candidates.filter((c) => !c.valid).length,
  };
}

// §4 Jump-Forward Decoding compression (13 tokens = 3 det + 1 free + 3 det + 1 free + 3 det + 1 free + 1 det)
export function deriveJumpForwardModel(jumpMode = 'jump_forward') {
  const tokens = [
    { text: '{"', det: true },
    { text: 'status', det: true },
    { text: '":"', det: true },
    { text: 'ok', det: false },
    { text: '","', det: true },
    { text: 'count', det: true },
    { text: '":', det: true },
    { text: '42', det: false },
    { text: ',"', det: true },
    { text: 'tag', det: true },
    { text: '":"', det: true },
    { text: 'fast', det: false },
    { text: '"}', det: true },
  ];
  const serialSteps = tokens.length; // 13 serial GPU decode steps
  // Jump-forward skips contiguous deterministic syntax spans (batch-appends them via mini-prefill)
  // 3 free value samples + 1 closing verify = 4 GPU steps
  const jumpSteps = 4;
  const isJump = jumpMode === 'jump_forward';
  const activeSteps = isJump ? jumpSteps : serialSteps;
  const speedup = Number((serialSteps / jumpSteps).toFixed(2));
  const savedStepsPct = Math.round(((serialSteps - jumpSteps) / serialSteps) * 100);

  return { jumpMode: isJump ? 'jump_forward' : 'token_by_token', tokens, serialSteps, jumpSteps, activeSteps, speedup, savedStepsPct };
}

// §5 Async CPU Mask Overlap (Batch = 60 active constrained requests × 0.04 ms/req = 2.4 ms CPU batch mask)
// Reconciles §3 single-request 0.04 ms with batch-level 2.4 ms CPU mask preparation!
export function deriveOverlapPipeline(overlapMode = 'async_overlap') {
  const isAsync = overlapMode === 'async_overlap';
  const batchSize = 60;
  const perReqMaskMs = 0.04;
  const gpuMs = 15.0;
  const cpuMaskMs = Number((batchSize * perReqMaskMs).toFixed(1)); // 2.4 ms batch CPU mask
  const exposedMs = isAsync ? 0.1 : cpuMaskMs;
  const stepMs = Number((gpuMs + exposedMs).toFixed(1));
  const overheadPct = Number(((exposedMs / gpuMs) * 100).toFixed(1));

  // Strictly proportional Gantt shares against 17.4 ms serial window
  const windowMs = gpuMs + cpuMaskMs; // 17.4 ms
  const gpuPct = Math.round((gpuMs / windowMs) * 100); // 86%
  const maskPct = 100 - gpuPct; // 14%
  const asyncGpuPct = Math.round((stepMs / windowMs) * 100); // 87%

  return {
    overlapMode: isAsync ? 'async_overlap' : 'serial',
    batchSize,
    perReqMaskMs,
    gpuMs,
    cpuMaskMs,
    exposedMs,
    stepMs,
    overheadPct,
    gpuPct,
    maskPct,
    asyncGpuPct,
  };
}
