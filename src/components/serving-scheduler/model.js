// Canonical domain model for the standalone Serving Scheduler chapter
export { SCHEDULER_MODES, TOKEN_BUDGET, REQUEST_CATALOG, deriveSchedulerSnapshot } from '../llm-inference/scheduler-model.js';

export const CHUNK_BUDGETS = [512, 1024, 2048, 4096];
export const PROMPT_LENS = [2048, 8192, 16384];
export const QUEUE_POLICIES = ['fcfs', 'sjf', 'lpm', 'priority_aging'];
export const SCHED_OPS_IDS = ['ttft_avalanche', 'tpot_jitter', 'preempt_thrash', 'prefix_miss'];

export function normalizeSchedulerConfig(input = {}) {
  const batchMode = input.batchMode === 'static' ? 'static' : 'continuous';
  const tokenBudget = CHUNK_BUDGETS.includes(Number(input.tokenBudget)) ? Number(input.tokenBudget) : 1024;
  const promptLen = PROMPT_LENS.includes(Number(input.promptLen)) ? Number(input.promptLen) : 8192;
  const activeDecodes = [8, 32, 64].includes(Number(input.activeDecodes)) ? Number(input.activeDecodes) : 32;
  const policy = QUEUE_POLICIES.includes(input.policy) ? input.policy : 'lpm';
  const kvUtilPct = Math.max(50, Math.min(99, Math.round(Number(input.kvUtilPct ?? 82))));
  const maxNumSeqs = [32, 128, 256].includes(Number(input.maxNumSeqs)) ? Number(input.maxNumSeqs) : 128;
  const opsId = SCHED_OPS_IDS.includes(input.opsId) ? input.opsId : 'ttft_avalanche';
  return { batchMode, tokenBudget, promptLen, activeDecodes, policy, kvUtilPct, maxNumSeqs, opsId };
}

// §3 Chunked Prefill Token Budget (Sarathi / vLLM V1)
export function deriveChunkBudgetModel({ tokenBudget = 1024, promptLen = 8192, activeDecodes = 32 } = {}) {
  const budget = CHUNK_BUDGETS.includes(Number(tokenBudget)) ? Number(tokenBudget) : 1024;
  const pLen = PROMPT_LENS.includes(Number(promptLen)) ? Number(promptLen) : 8192;
  const decodes = [8, 32, 64].includes(Number(activeDecodes)) ? Number(activeDecodes) : 32;

  const prefillRoom = Math.max(64, budget - decodes);
  const chunks = Math.ceil(pLen / prefillRoom);

  // Without chunking: monolithic prefill blocks decode for ~30ms per 1K tokens on 70B H100
  const unchunkedStallMs = Math.round((pLen / 1024) * 32 + 16);
  // With chunking: each iteration runs `decodes` decode tokens + `prefillRoom` prefill tokens
  // Base decode step (~16 ms) + linear prefill chunk compute (~16 ms per 1K prefill tokens)
  const chunkedTpotMs = Math.round(14 + (prefillRoom / 1024) * 18 + decodes * 0.08);
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
    tpotSloPass,
    tcUtilPct,
    prefillPct,
    decodePct,
  };
}

// §4 Queue Scheduling Policies: FCFS vs SJF vs LPM vs Priority+Aging
const QUEUE_REQUESTS = [
  { id: 'R1', label: 'Long RAG (12K)', len: 12000, prefix: 'DocA', prio: 'normal', baseMs: 260 },
  { id: 'R2', label: 'Short Chat (256)', len: 256, prefix: 'Sys', prio: 'high', baseMs: 22 },
  { id: 'R3', label: 'Agent Turn 2 (4K)', len: 4000, prefix: 'DocA', prio: 'normal', baseMs: 95 },
  { id: 'R4', label: 'Code Fix (512)', len: 512, prefix: 'Repo', prio: 'high', baseMs: 30 },
  { id: 'R5', label: 'Agent Turn 3 (4K)', len: 4000, prefix: 'DocA', prio: 'low', baseMs: 95 },
];

export function derivePolicyModel(policy = 'lpm') {
  const p = QUEUE_POLICIES.includes(policy) ? policy : 'lpm';
  let orderIds;
  let prefixHitPct;
  let starvationRisk;

  if (p === 'fcfs') {
    orderIds = ['R1', 'R2', 'R3', 'R4', 'R5'];
    prefixHitPct = 28;
    starvationRisk = 'none';
  } else if (p === 'sjf') {
    orderIds = ['R2', 'R4', 'R3', 'R5', 'R1'];
    prefixHitPct = 34;
    starvationRisk = 'high'; // long requests starve under continuous short arrivals
  } else if (p === 'lpm') {
    // Groups shared DocA prefix requests (R1, R3, R5) together to maximize Radix/APC cache hits
    orderIds = ['R1', 'R3', 'R5', 'R2', 'R4'];
    prefixHitPct = 82;
    starvationRisk = 'medium';
  } else {
    // Priority + Aging: high-priority interactive short jobs run first, aged normal/low jobs guaranteed bounded wait
    orderIds = ['R2', 'R4', 'R1', 'R3', 'R5'];
    prefixHitPct = 66;
    starvationRisk = 'bounded';
  }

  let clock = 0;
  let lastPrefix = '';
  const ordered = orderIds.map((id, idx) => {
    const req = QUEUE_REQUESTS.find((r) => r.id === id);
    const hit = p !== 'fcfs' && req.prefix === 'DocA' && lastPrefix === 'DocA';
    const execMs = hit ? Math.round(req.baseMs * 0.25) : req.baseMs;
    const ttftMs = clock + execMs;
    clock += execMs;
    lastPrefix = req.prefix;
    return { ...req, rank: idx + 1, hit, execMs, ttftMs };
  });

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
    starvationRisk,
  };
}

// §5 Watermark & KV Preemption Trigger
export function deriveWatermarkModel({ kvUtilPct = 82, maxNumSeqs = 128 } = {}) {
  const util = Math.max(50, Math.min(99, Math.round(Number(kvUtilPct) || 82)));
  const cap = [32, 128, 256].includes(Number(maxNumSeqs)) ? Number(maxNumSeqs) : 128;

  // Watermark threshold = 90%; above 90% pauses new waiting admissions; above 95% triggers active preemption
  let state = 'admitting';
  if (util >= 95) state = 'preempting';
  else if (util >= 90) state = 'paused';

  const admittedSeqs = state === 'admitting' ? Math.round(cap * (util / 100)) : Math.round(cap * 0.92);
  const preemptedCount = state === 'preempting' ? Math.max(2, Math.round((util - 94) * 3)) : 0;

  return {
    kvUtilPct: util,
    maxNumSeqs: cap,
    state,
    admittedSeqs,
    preemptedCount,
  };
}
