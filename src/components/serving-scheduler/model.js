// Canonical domain model for the standalone Serving Scheduler chapter
export { SCHEDULER_MODES, TOKEN_BUDGET, REQUEST_CATALOG, deriveSchedulerSnapshot } from '../llm-inference/scheduler-model.js';

export const CHUNK_BUDGETS = [512, 1024, 2048, 4096];
export const PROMPT_LENS = [2048, 8192, 16384];
export const QUEUE_POLICIES = ['fcfs', 'sjf', 'lpm', 'priority_aging'];

export function normalizeSchedulerConfig(input = {}) {
  const batchMode = input.batchMode === 'static' ? 'static' : 'continuous';
  const tokenBudget = CHUNK_BUDGETS.includes(Number(input.tokenBudget)) ? Number(input.tokenBudget) : 1024;
  const promptLen = PROMPT_LENS.includes(Number(input.promptLen)) ? Number(input.promptLen) : 8192;
  const activeDecodes = [8, 32, 64].includes(Number(input.activeDecodes)) ? Number(input.activeDecodes) : 32;
  const policy = QUEUE_POLICIES.includes(input.policy) ? input.policy : 'lpm';
  const kvUtilPct = Math.max(50, Math.min(99, Math.round(Number(input.kvUtilPct ?? 82))));
  const maxNumSeqs = [32, 128, 256].includes(Number(input.maxNumSeqs)) ? Number(input.maxNumSeqs) : 128;
  return { batchMode, tokenBudget, promptLen, activeDecodes, policy, kvUtilPct, maxNumSeqs };
}

// §3 Chunked Prefill Token Budget (Sarathi / vLLM V1)
// Physically consistent rate: SAME 22 ms/1K base prefill compute for both monolithic and chunked,
// with a realistic +8% chunking KV re-read / split overhead on Chunked Prefill!
export function deriveChunkBudgetModel({ tokenBudget = 1024, promptLen = 8192, activeDecodes = 32 } = {}) {
  const budget = CHUNK_BUDGETS.includes(Number(tokenBudget)) ? Number(tokenBudget) : 1024;
  const pLen = PROMPT_LENS.includes(Number(promptLen)) ? Number(promptLen) : 8192;
  const decodes = [8, 32, 64].includes(Number(activeDecodes)) ? Number(activeDecodes) : 32;

  const prefillRoom = Math.max(64, budget - decodes);
  const chunks = Math.ceil(pLen / prefillRoom);

  const msPer1kPrefill = 22; // 70B FP8 TP=4 representative prefill compute rate
  const chunkOverheadFactor = 1.08; // ~8% extra KV re-read / split-attention overhead
  const baseDecodeMs = 12 + decodes * 0.08;

  // Monolithic prefill blocks co-batched decodes for the full prompt (linear + quadratic attention)
  const unchunkedPrefillMs = (pLen / 1024) * msPer1kPrefill + ((pLen / 1024) ** 2) * 0.35;
  const unchunkedStallMs = Math.round(baseDecodeMs + unchunkedPrefillMs);

  // Chunked iteration runs `decodes` decode tokens + `prefillRoom` prefill tokens at the SAME compute rate * 1.08 overhead
  const chunkComputeMs = (prefillRoom / 1024) * msPer1kPrefill * chunkOverheadFactor;
  const chunkedTpotMs = Math.round(baseDecodeMs + chunkComputeMs);
  const totalChunkedPrefillMs = Math.round(unchunkedPrefillMs * chunkOverheadFactor);
  const tpotSloPass = chunkedTpotMs <= 50;

  // Compute utilization rises smoothly with token budget until ridge point (~1024-2048 tokens)
  const tcUtilPct = Math.min(96, Math.round(38 + (Math.min(budget, 2048) / 2048) * 56));
  const prefillPct = Math.round((prefillRoom / budget) * 100);
  const decodePct = 100 - prefillPct;

  return {
    tokenBudget: budget,
    promptLen: pLen,
    activeDecodes: decodes,
    prefillRoom,
    chunks,
    unchunkedStallMs,
    chunkedTpotMs,
    totalChunkedPrefillMs,
    tpotSloPass,
    tcUtilPct,
    prefillPct,
    decodePct,
  };
}

// §4 Queue Scheduling Policies: FCFS vs SJF vs LPM vs Priority+Aging
// Physically grounded shared prefix: R1 (12K), R3 (4K), R5 (4K) share the EXACT SAME 3,072-token DocA prefix
// (<= min(12K, 4K, 4K) = 4K, so any of them can legally warm the 3,072-token prefix — never exceeding a request's own length!)
const SHARED_DOCA_PREFIX = 3072;
const QUEUE_REQUESTS = [
  { id: 'R1', label: 'Long RAG (12K)', len: 12000, prefix: 'DocA', sharedPrefixLen: SHARED_DOCA_PREFIX, prio: 'normal', baseMs: 260 },
  { id: 'R2', label: 'Short Chat (256)', len: 256, prefix: 'Sys', sharedPrefixLen: 0, prio: 'high', baseMs: 22 },
  { id: 'R3', label: 'Agent Turn 2 (4K)', len: 4000, prefix: 'DocA', sharedPrefixLen: SHARED_DOCA_PREFIX, prio: 'normal', baseMs: 95 },
  { id: 'R4', label: 'Code Fix (512)', len: 512, prefix: 'Repo', sharedPrefixLen: 0, prio: 'high', baseMs: 30 },
  { id: 'R5', label: 'Agent Turn 3 (4K)', len: 4000, prefix: 'DocA', sharedPrefixLen: SHARED_DOCA_PREFIX, prio: 'low', baseMs: 95 },
];

export function derivePolicyModel(policy = 'lpm') {
  const p = QUEUE_POLICIES.includes(policy) ? policy : 'lpm';
  let orderIds;
  let starvationRisk;

  if (p === 'fcfs') {
    orderIds = ['R1', 'R2', 'R3', 'R4', 'R5'];
    starvationRisk = 'none';
  } else if (p === 'sjf') {
    orderIds = ['R2', 'R4', 'R3', 'R5', 'R1'];
    starvationRisk = 'high';
  } else if (p === 'lpm') {
    orderIds = ['R1', 'R3', 'R5', 'R2', 'R4'];
    starvationRisk = 'medium';
  } else {
    orderIds = ['R2', 'R4', 'R1', 'R3', 'R5'];
    starvationRisk = 'bounded';
  }

  // Simulate hot-prefix locality under tight LRU capacity (1 hot document slot):
  // If another prefix intervenes (like FCFS interleaving R2/R4 between DocA turns), DocA is evicted.
  let clock = 0;
  let hotPrefix = '';
  let totalHitTokens = 0;
  const totalShareableOpportunities = SHARED_DOCA_PREFIX * 2; // At most 2 reuse hits among 3 DocA requests

  const ordered = orderIds.map((id, idx) => {
    const req = QUEUE_REQUESTS.find((r) => r.id === id);
    const hitTokens = req.sharedPrefixLen > 0 && hotPrefix === req.prefix ? req.sharedPrefixLen : 0;
    const hit = hitTokens > 0;
    const savedFraction = hitTokens / req.len;
    const execMs = Math.max(12, Math.round(req.baseMs * (1 - savedFraction * 0.92)));
    const ttftMs = clock + execMs;
    clock += execMs;
    hotPrefix = req.prefix;
    totalHitTokens += hitTokens;
    return { ...req, rank: idx + 1, hit, hitTokens, savedPct: Math.round(savedFraction * 100), execMs, ttftMs };
  });

  // Dynamically derived hit rate (% of reuse-eligible DocA prefix tokens actually served from cache)
  const prefixHitPct = Math.round((totalHitTokens / totalShareableOpportunities) * 100);

  const sortedTtfts = [...ordered].map((x) => x.ttftMs).sort((a, b) => a - b);
  const p50TtftMs = sortedTtfts[2];
  const p99TtftMs = sortedTtfts[sortedTtfts.length - 1];
  const shortAvgTtftMs = Math.round(
    ordered.filter((x) => x.len <= 512).reduce((s, x) => s + x.ttftMs, 0) / 2
  );

  return {
    policy: p,
    ordered,
    p50TtftMs,
    p99TtftMs,
    shortAvgTtftMs,
    prefixHitPct,
    totalHitTokens,
    starvationRisk,
  };
}

// §5 Watermark & KV Preemption Trigger (monotonic active sequences on preemption!)
export function deriveWatermarkModel({ kvUtilPct = 82, maxNumSeqs = 128 } = {}) {
  const util = Math.max(50, Math.min(99, Math.round(Number(kvUtilPct) || 82)));
  const cap = [32, 128, 256].includes(Number(maxNumSeqs)) ? Number(maxNumSeqs) : 128;

  let state = 'admitting';
  if (util >= 95) state = 'preempting';
  else if (util >= 90) state = 'paused';

  const pauseCap = Math.round(cap * 0.9);
  const preemptedCount = state === 'preempting' ? Math.max(2, Math.round((util - 94) * 3)) : 0;
  const admittedSeqs =
    state === 'admitting'
      ? Math.round(cap * (util / 100))
      : state === 'paused'
        ? pauseCap
        : Math.max(1, pauseCap - preemptedCount);

  return {
    kvUtilPct: util,
    maxNumSeqs: cap,
    state,
    admittedSeqs,
    preemptedCount,
  };
}
