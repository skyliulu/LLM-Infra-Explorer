// Pure canonical model for Speculative Decoding Batch/Load Roofline Crossover
// and Modern Drafter Families (Native MTP, EAGLE-3 d2t vocab trim, Training-Free N-gram / Suffix).

export const SERVING_BATCHES = [1, 8, 32, 64, 128];
export const SERVING_KS = [1, 2, 3, 4, 6];
export const DRAFTER_FAMILIES = ['mtp', 'eagle3', 'ngram'];
export const WORKLOAD_TYPES = ['chat', 'agent_code', 'high_load'];

const RIDGE_TOKENS = 64; // Illustrative GPU roofline ridge point (tokens/step where GEMM transitions from memory-bound to compute-bound)
const DRAFT_COST_PER_TOKEN = 0.045; // Normalized to 1 memory-bound Target step

export function expectedTokensPerRound(k, alpha) {
  const a = Math.max(0.1, Math.min(0.99, Number(alpha) || 0.75));
  const steps = Math.max(0, Math.round(Number(k) || 0));
  if (steps === 0) return 1;
  let sum = 1;
  let p = 1;
  for (let i = 1; i <= steps; i++) {
    p *= a;
    sum += p;
  }
  return sum;
}

export function deriveRooflinePoint({ batchSize = 1, k = 4, alpha = 0.75, draftCostPerToken = DRAFT_COST_PER_TOKEN } = {}) {
  const B = Math.max(1, Number(batchSize) || 1);
  const K = Math.max(0, Math.round(Number(k) || 0));
  const a = Math.max(0.3, Math.min(0.95, Number(alpha) || 0.75));

  const baselineTokens = B;
  const verifyTokens = B * (K + 1);
  const baselineStepTime = Math.max(1, baselineTokens / RIDGE_TOKENS);
  const verifyStepTime = Math.max(1, verifyTokens / RIDGE_TOKENS) + (K > 0 ? K * draftCostPerToken : 0);

  const expectedNew = expectedTokensPerRound(K, a);
  const wastedTokens = Math.max(0, K + 1 - expectedNew);
  const stepRatio = verifyStepTime / baselineStepTime;
  const speedup = expectedNew / stepRatio;

  const regime = verifyTokens <= RIDGE_TOKENS
    ? 'memory_bound'
    : baselineTokens < RIDGE_TOKENS
      ? 'transition'
      : 'compute_bound';

  return {
    batchSize: B,
    k: K,
    alpha: a,
    baselineTokens,
    verifyTokens,
    ridgeTokens: RIDGE_TOKENS,
    baselineStepTime,
    verifyStepTime,
    stepRatio,
    expectedNew,
    wastedTokens,
    speedup,
    beneficial: speedup > 1.02,
    regresses: speedup < 0.98,
    regime,
  };
}

export function recommendOptimalK(batchSize, alpha) {
  let bestK = 0;
  let bestSpeedup = 1.0;
  for (const k of [0, 1, 2, 3, 4, 6]) {
    const pt = deriveRooflinePoint({ batchSize, k, alpha });
    if (pt.speedup > bestSpeedup + 1e-6) {
      bestSpeedup = pt.speedup;
      bestK = k;
    }
  }
  return { bestK, bestSpeedup };
}

export function deriveRooflineSweep({ batchSize = 8, k = 4, alpha = 0.75 } = {}) {
  const safeB = SERVING_BATCHES.includes(batchSize) ? batchSize : 8;
  const safeK = SERVING_KS.includes(k) ? k : 4;
  const safeAlpha = Math.max(0.4, Math.min(0.9, Number(alpha) || 0.75));

  const curve = SERVING_BATCHES.map((b) => deriveRooflinePoint({ batchSize: b, k: safeK, alpha: safeAlpha }));
  const current = curve.find((c) => c.batchSize === safeB) || curve[0];
  const recommended = recommendOptimalK(safeB, safeAlpha);

  return {
    batchSize: safeB,
    k: safeK,
    alpha: safeAlpha,
    curve,
    current,
    recommended,
  };
}

const DRAFTER_PROFILES = {
  mtp: {
    id: 'mtp',
    draftFlopsLevel: 'low',
    extraWeightsLabel: '1-layer chained heads (in-checkpoint)',
    vocabFull: 128000,
    vocabDraft: 128000,
    acceptanceByWorkload: { chat: 0.76, agent_code: 0.84, high_load: 0.75 },
    draftCostPerToken: 0.04,
    defaultK: 3,
  },
  eagle3: {
    id: 'eagle3',
    draftFlopsLevel: 'low_trimmed',
    extraWeightsLabel: 'Multi-layer fusion + 1-layer + d2t head',
    vocabFull: 152064,
    vocabDraft: 32000,
    acceptanceByWorkload: { chat: 0.80, agent_code: 0.86, high_load: 0.78 },
    draftCostPerToken: 0.032,
    defaultK: 4,
  },
  ngram: {
    id: 'ngram',
    draftFlopsLevel: 'zero_gpu',
    extraWeightsLabel: '0 B (CPU suffix / prompt lookup)',
    vocabFull: 152064,
    vocabDraft: 0,
    acceptanceByWorkload: { chat: 0.18, agent_code: 0.82, high_load: 0.45 },
    draftCostPerToken: 0.002,
    defaultK: 4,
  },
};

export function deriveDrafterFamilyModel({ family = 'mtp', workload = 'agent_code' } = {}) {
  const safeFamily = DRAFTER_FAMILIES.includes(family) ? family : 'mtp';
  const safeWorkload = WORKLOAD_TYPES.includes(workload) ? workload : 'agent_code';
  const p = DRAFTER_PROFILES[safeFamily];
  const alpha = p.acceptanceByWorkload[safeWorkload];
  const batchForWorkload = safeWorkload === 'high_load' ? 64 : 1;
  const evalPt = deriveRooflinePoint({
    batchSize: batchForWorkload,
    k: p.defaultK,
    alpha,
    draftCostPerToken: p.draftCostPerToken,
  });
  const vocabReduction = p.vocabDraft > 0 ? p.vocabFull / p.vocabDraft : Infinity;

  return {
    family: safeFamily,
    workload: safeWorkload,
    alpha,
    defaultK: p.defaultK,
    vocabFull: p.vocabFull,
    vocabDraft: p.vocabDraft,
    vocabReduction,
    batchForWorkload,
    speedup: evalPt.speedup,
    expectedNew: evalPt.expectedNew,
    draftCostPerToken: p.draftCostPerToken,
  };
}
