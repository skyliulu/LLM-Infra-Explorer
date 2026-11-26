// Pure canonical model for Frontier Quantization:
// 1) Blockwise FP8 (1x128 / 128x128) & Hardware Microscaling W4A4 (NVFP4 vs MXFP4)
// 2) Exact 8-point Walsh-Hadamard Rotation (QuaRot / SpinQuant) outlier suppression
// 3) Roofline Crossover: BF16 vs W4A16 vs Block FP8 vs NVFP4 W4A4 across batch/token load

export const FRONTIER_FORMATS = ['block_fp8', 'nvfp4', 'mxfp4'];
export const ROOFLINE_TOKENS = [1, 8, 32, 128, 512, 2048];

// Normalized 8x8 Walsh-Hadamard matrix (H^T H = I)
const H8_SIGN = [
  [ 1,  1,  1,  1,  1,  1,  1,  1],
  [ 1, -1,  1, -1,  1, -1,  1, -1],
  [ 1,  1, -1, -1,  1,  1, -1, -1],
  [ 1, -1, -1,  1,  1, -1, -1,  1],
  [ 1,  1,  1,  1, -1, -1, -1, -1],
  [ 1, -1,  1, -1, -1,  1, -1,  1],
  [ 1,  1, -1, -1, -1, -1,  1,  1],
  [ 1, -1, -1,  1, -1,  1,  1, -1],
];
const INV_SQRT8 = 1 / Math.sqrt(8);

export function hadamard8(vec) {
  return H8_SIGN.map((row) => row.reduce((acc, s, j) => acc + s * vec[j], 0) * INV_SQRT8);
}

// Symmetric 4-bit uniform quantization (q in [-7, 7]) for clean MSE comparison
function quantDequantInt4(vec) {
  const maxVal = Math.max(...vec.map(Math.abs), 1e-8);
  const scale = maxVal / 7;
  return vec.map((v) => Math.max(-7, Math.min(7, Math.round(v / scale))) * scale);
}

const mse = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length;

export function deriveHadamardLab({ outlierPeak = 16 } = {}) {
  const peak = Math.max(2, Math.min(24, Number(outlierPeak) || 16));
  const raw = [peak, 0.45, -0.35, 0.55, -0.25, 0.40, -0.50, 0.30];

  // Unrotated 4-bit quantization
  const rawQuant = quantDequantInt4(raw);
  const rawMse = mse(raw, rawQuant);
  const rawPeak = Math.max(...raw.map(Math.abs));

  // QuaRot / SpinQuant: x' = x H, quantize x' in 4-bit, reconstruct x_hat = q(x') H^T (H^T = H)
  const rotated = hadamard8(raw);
  const rotatedQuant = quantDequantInt4(rotated);
  const reconstructed = hadamard8(rotatedQuant);
  const rotatedMse = mse(raw, reconstructed);
  const rotatedPeak = Math.max(...rotated.map(Math.abs));

  return {
    peak,
    raw,
    rawQuant,
    rawPeak,
    rawMse,
    rotated,
    rotatedQuant,
    reconstructed,
    rotatedPeak,
    rotatedMse,
    peakSuppression: rawPeak / Math.max(1e-8, rotatedPeak),
    mseReduction: rawMse / Math.max(1e-12, rotatedMse),
  };
}

export const FORMAT_SPECS = {
  block_fp8: {
    id: 'block_fp8',
    payloadBits: 8,
    actTile: '1×128',
    weightBlock: '128×128',
    scaleType: 'FP32 / tile',
    effectiveWeightBits: 8 + 32 / (128 * 128),
    effectiveActBits: 8 + 32 / 128,
    tensorCoreGain: 2.0,
    accumulatorNoteKey: 'accumFp8',
  },
  nvfp4: {
    id: 'nvfp4',
    payloadBits: 4,
    actTile: '1×16',
    weightBlock: '1×16 (2-level)',
    scaleType: 'FP8 E4M3 / 16 + FP32 tensor',
    effectiveWeightBits: 4 + 8 / 16,
    effectiveActBits: 4 + 8 / 16,
    tensorCoreGain: 4.0,
    accumulatorNoteKey: 'accumNvfp4',
  },
  mxfp4: {
    id: 'mxfp4',
    payloadBits: 4,
    actTile: '1×32',
    weightBlock: '1×32',
    scaleType: 'E8M0 (pow2) / 32',
    effectiveWeightBits: 4 + 8 / 32,
    effectiveActBits: 4 + 8 / 32,
    tensorCoreGain: 4.0,
    accumulatorNoteKey: 'accumMxfp4',
  },
};

export function deriveFormatSpec(format = 'block_fp8') {
  const safe = FRONTIER_FORMATS.includes(format) ? format : 'block_fp8';
  return FORMAT_SPECS[safe];
}

// Roofline crossover across active tokens per GEMM step (M = Batch * q_len)
// H100 SXM5 BF16 anchor: 989 TFLOPS / 3.35 TB/s = 295 FLOP/B -> M_ridge = 295 tokens (memory-bound for M < 295, compute-bound for M > 295).
// - BF16:  memTime = 1.0,    compTime = M / 295
// - W4A16: memTime = 0.28,   compTime = (M / 295) * 1.15 (FP16 TC + unpack ALU overhead!)
// - FP8:   memTime = 0.52,   compTime = (M / 295) / 1.90 (2x FP8 TC minus block-scale / FP32-accum overhead)
// - NVFP4: memTime = 0.29,   compTime = (M / 295) / 3.40 (4x FP4 TC minus two-level microscaling overhead)
const ROOFLINE_PROFILES = [
  { id: 'bf16', mem: 1.0, compDiv: 1.0 },
  { id: 'w4a16', mem: 0.28, compDiv: 1 / 1.15 },
  { id: 'block_fp8', mem: 0.52, compDiv: 1.9 },
  { id: 'nvfp4', mem: 0.29, compDiv: 3.4 },
];

export function deriveQuantRoofline(tokensPerStep = 32) {
  const raw = Number(tokensPerStep);
  const M = Number.isFinite(raw) && raw > 0 ? Math.max(1, Math.min(4096, Math.round(raw))) : 32;
  const ridge = 295;
  const bf16Time = Math.max(1.0, M / ridge);

  const rows = ROOFLINE_PROFILES.map((p) => {
    const memTime = p.mem;
    const compTime = (M / ridge) / p.compDiv;
    const stepTime = Math.max(memTime, compTime);
    const speedup = bf16Time / stepTime;
    const bound = memTime >= compTime ? 'memory' : 'compute';
    return {
      id: p.id,
      memTime,
      compTime,
      stepTime,
      speedup,
      bound,
    };
  });

  const best = rows.reduce((a, b) => (b.speedup > a.speedup ? b : a), rows[0]);
  return {
    tokensPerStep: M,
    ridge,
    rows,
    bestId: best.id,
    w4a16SlowerThanBf16: rows.find((r) => r.id === 'w4a16').speedup < 1.0,
  };
}
