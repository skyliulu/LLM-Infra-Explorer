// Pure canonical model for Chunkwise Parallel Prefill, Gated DeltaNet vs Additive GLA associative update,
// and Hybrid Linear/Softmax multi-layer memory crossover.

export const CHUNK_SIZES = [16, 64, 128];
export const HYBRID_RATIOS = ['pure_softmax', 'hybrid_3_1', 'hybrid_7_1', 'pure_linear'];
export const BATCH_SIZES = [1, 8, 32, 128];

const RATIO_SPEC = {
  pure_softmax: { fullLayers: 32, linearLayers: 0 },
  hybrid_3_1: { fullLayers: 8, linearLayers: 24 },
  hybrid_7_1: { fullLayers: 4, linearLayers: 28 },
  pure_linear: { fullLayers: 0, linearLayers: 32 },
};

// 1. Chunkwise Parallel Prefill Model
export function deriveChunkwiseModel({
  contextLength = 1024,
  chunkSize = 64,
  dk = 64,
  dv = 64,
  activeChunk = 0,
  gateStrength = 0.45,
} = {}) {
  const N = Math.max(16, Number(contextLength) || 1024);
  const C = CHUNK_SIZES.includes(chunkSize) ? chunkSize : 64;
  const effC = Math.min(C, N);
  const numChunks = Math.ceil(N / effC);
  const demoChunks = 4;
  const clampedChunk = Math.max(0, Math.min(demoChunks - 1, Math.floor(Number(activeChunk) || 0)));
  const clampedGate = Math.max(0, Math.min(0.9, Number.isFinite(Number(gateStrength)) ? Number(gateStrength) : 0.45));

  // Operations per layer (single head, illustrative MACs):
  // Intra-chunk quadratic matmul: O(numChunks * effC^2 * (dk + dv)) = O(N * effC * (dk + dv))
  // Inter-chunk recurrence + readout: O(numChunks * effC * dk * dv) = O(N * dk * dv)
  const serialSequentialHops = N;
  const chunkSequentialHops = numChunks;
  const hopReduction = serialSequentialHops / chunkSequentialHops;

  // Tensor-core arithmetic intensity proxy: serial GEMV has M=1, chunkwise GEMM has M=effC
  const intraChunkOps = numChunks * effC * effC * (dk + dv);
  const interChunkOps = numChunks * (2 * effC * dk * dv);
  const totalChunkOps = intraChunkOps + interChunkOps;
  const fullSoftmaxOps = N * N * (dk + dv);
  const opSpeedup = fullSoftmaxOps / Math.max(1, totalChunkOps);

  // Per-token retention alpha_tok in [0.973, 0.998]; exact chunk-boundary decay = exp(C * ln(alpha_tok))
  const tokenAlpha = Number((0.998 - clampedGate * 0.025).toFixed(4));
  const chunkRetention = Math.exp(effC * Math.log(tokenAlpha));

  // Representative 4-chunk visual trace with log-space cumulative decay gamma_c = exp(c * C * ln(alpha_tok))
  const chunks = Array.from({ length: demoChunks }, (_, idx) => ({
    index: idx,
    label: `C${idx}`,
    stateIn: `S_{[${idx}]}`,
    stateOut: `S_{[${idx + 1}]}`,
    status: idx < clampedChunk ? 'passed' : idx === clampedChunk ? 'active' : 'pending',
    retention: Number(Math.pow(chunkRetention, idx + 1).toFixed(3)),
  }));

  return {
    N,
    C: effC,
    requestedC: C,
    numChunks,
    activeChunk: clampedChunk,
    serialSequentialHops,
    chunkSequentialHops,
    hopReduction,
    intraChunkOps,
    interChunkOps,
    totalChunkOps,
    fullSoftmaxOps,
    opSpeedup,
    tokenAlpha,
    chunkRetention: Number(chunkRetention.toFixed(3)),
    chunks,
  };
}

// 2. Exact 2D Row-Vector Numerical Associative-Recall Comparison: Additive GLA vs Gated DeltaNet
// Row-vector convention (matches the rest of LinearAttention):
//   GLA:      S_t = alpha * S_{t-1} + k_t^T v_t        (k_t: 1x2, v_t: 1x2, S_t: 2x2)
//   DeltaNet: S_t = alpha * S_{t-1} + beta * k_t^T (v_t - alpha * k_t S_{t-1})
//                 = alpha * S_{t-1} (I - beta * k_t^T k_t)^T ... wait: for row vectors:
//             k_t S_t = alpha (1 - beta ||k_t||^2) (k_t S_{t-1}) + beta ||k_t||^2 v_t
//             Since ||k_t|| = 1:
//             k_t S_t = alpha (1 - beta) (k_t S_{t-1}) + beta v_t.
//             At beta = 1, k_t S_t === v_t (EXACT targeted overwrite!), while orthogonal k_2 S_t = alpha (k_2 S_{t-1})!
const outer = (k, v) => [
  [k[0] * v[0], k[0] * v[1]],
  [k[1] * v[0], k[1] * v[1]],
];
const matVecLeft = (k, S) => [
  k[0] * S[0][0] + k[1] * S[1][0],
  k[0] * S[0][1] + k[1] * S[1][1],
];
const l2Dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function deriveDeltaRecallModel({ alpha = 0.85, beta = 0.9 } = {}) {
  const a = Math.max(0.4, Math.min(1.0, Number(alpha) || 0.85));
  const b = Math.max(0.2, Math.min(1.0, Number(beta) || 0.9));

  // Sequence: (k1, v1_old), (k2, v2), (k1, v1_new) with orthonormal k1=[1,0], k2=[0,1]
  const events = [
    { id: 't1', keyName: 'k₁', k: [1, 0], v: [1.0, 0.2], role: 'write_k1' },
    { id: 't2', keyName: 'k₂', k: [0, 1], v: [0.1, 1.0], role: 'write_k2' },
    { id: 't3', keyName: 'k₁', k: [1, 0], v: [-0.8, 0.4], role: 'overwrite_k1' },
  ];

  let sGla = [[0, 0], [0, 0]];
  let sDelta = [[0, 0], [0, 0]];

  for (const ev of events) {
    // GLA: S_t = a * S_{t-1} + k^T v
    const add = outer(ev.k, ev.v);
    sGla = sGla.map((row, r) => row.map((val, c) => a * val + add[r][c]));

    // Gated DeltaNet:
    // predicted_old = a * (k_t S_{t-1})
    // delta = v_t - predicted_old
    // S_t = a * S_{t-1} + b * k_t^T delta
    const predOld = matVecLeft(ev.k, sDelta).map((x) => a * x);
    const delta = [ev.v[0] - predOld[0], ev.v[1] - predOld[1]];
    const deltaOuter = outer(ev.k, delta);
    sDelta = sDelta.map((row, r) => row.map((val, c) => a * val + b * deltaOuter[r][c]));
  }

  const targetK1 = events[2].v;
  const targetK2 = events[1].v;
  const glaReadK1 = matVecLeft([1, 0], sGla);
  const deltaReadK1 = matVecLeft([1, 0], sDelta);
  const glaReadK2 = matVecLeft([0, 1], sGla);
  const deltaReadK2 = matVecLeft([0, 1], sDelta);

  return {
    alpha: a,
    beta: b,
    events,
    targetK1,
    targetK2,
    gla: {
      state: sGla,
      readK1: glaReadK1,
      readK2: glaReadK2,
      errorK1: l2Dist(glaReadK1, targetK1),
      errorK2: l2Dist(glaReadK2, targetK2),
    },
    delta: {
      state: sDelta,
      readK1: deltaReadK1,
      readK2: deltaReadK2,
      errorK1: l2Dist(deltaReadK1, targetK1),
      errorK2: l2Dist(deltaReadK2, targetK2),
    },
  };
}

// 3. Hybrid Layer Ratio Total-Model Memory Crossover (32 layers, 8 KV heads for Full Softmax, 16 linear heads, FP32 state + conv1d)
export function deriveHybridMemoryModel({ ratio = 'hybrid_3_1', contextLength = 1024, batchSize = 8, dk = 64, dv = 64 } = {}) {
  const safeRatio = HYBRID_RATIOS.includes(ratio) ? ratio : 'hybrid_3_1';
  const N = Math.max(16, Number(contextLength) || 1024);
  const B = BATCH_SIZES.includes(batchSize) ? batchSize : 8;
  const spec = RATIO_SPEC[safeRatio];

  // Full Softmax GQA layer (8 KV heads, BF16 = 2 bytes, K + V):
  // bytesPerLayer = B * N * 8 * (dk + dv) * 2
  const fullLayerBytes = B * N * 8 * (dk + dv) * 2;

  // Linear / Gated DeltaNet layer (16 heads, FP32 recurrent state S: dk*dv*4 bytes + conv1d width 4: (dk+dv)*4*2 bytes):
  // Independent of N! Scales with B.
  const linearStatePerLayer = B * 16 * (dk * dv * 4 + 4 * (dk + dv) * 2);

  const fullBytes = spec.fullLayers * fullLayerBytes;
  const linearBytes = spec.linearLayers * linearStatePerLayer;
  const totalBytes = fullBytes + linearBytes;
  const baselinePureSoftmaxBytes = 32 * fullLayerBytes;
  const savingsRatio = baselinePureSoftmaxBytes / Math.max(1, totalBytes);

  // Exact crossover sequence length N* where 1 linear layer state === 1 full Softmax layer KV
  const crossoverN = Math.round((16 * (dk * dv * 4 + 4 * (dk + dv) * 2)) / (8 * (dk + dv) * 2));

  return {
    ratio: safeRatio,
    fullLayers: spec.fullLayers,
    linearLayers: spec.linearLayers,
    N,
    B,
    fullBytes,
    linearBytes,
    totalBytes,
    baselinePureSoftmaxBytes,
    savingsRatio,
    crossoverN,
    linearExceedsSoftmax: N < crossoverN,
  };
}
