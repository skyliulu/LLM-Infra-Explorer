export const RES_PRESETS = [
  { id: 'r336', label: '336×336', w: 336, h: 336 },
  { id: 'r1080', label: '1080p (1920×1080)', w: 1920, h: 1080 },
  { id: 'r4k', label: '4K (3840×2160)', w: 3840, h: 2160 },
];
export const TILING_SCHEMES = ['fixed_resize', 'anyres_tiles', 'navit_native'];
export const PROJECTOR_MODES = ['mlp_1x', 'pixel_shuffle_4x', 'qformer_64'];
export const ROPE_MODES = ['rope_1d', 'mrope_3d'];
export const VIDEO_DURATIONS = [10, 60, 300];
export const VIDEO_FPS_OPTS = [0.5, 1, 2];
export const VIDEO_POOL_MODES = ['none_1x', 'spatial_4x', 'spatiotemporal_8x'];

export function normalizeVlmConfig(input = {}) {
  const resId = RES_PRESETS.some((r) => r.id === input.resId) ? input.resId : 'r1080';
  const tiling = TILING_SCHEMES.includes(input.tiling) ? input.tiling : 'navit_native';
  const merge4x = input.merge4x !== undefined ? Boolean(input.merge4x) : true;
  const projector = PROJECTOR_MODES.includes(input.projector) ? input.projector : 'pixel_shuffle_4x';
  const ropeMode = ROPE_MODES.includes(input.ropeMode) ? input.ropeMode : 'mrope_3d';
  const durationSec = VIDEO_DURATIONS.includes(Number(input.durationSec)) ? Number(input.durationSec) : 60;
  const fps = VIDEO_FPS_OPTS.includes(Number(input.fps)) ? Number(input.fps) : 1;
  const poolMode = VIDEO_POOL_MODES.includes(input.poolMode) ? input.poolMode : 'spatial_4x';
  return { resId, tiling, merge4x, projector, ropeMode, durationSec, fps, poolMode };
}

// §2 Dynamic Tiling & Visual Token Count (consistent 336x336 AnyRes tiles; 3.6M px NaViT cap so 1080p vs 4K differentiate)
export function deriveTilingModel({ resId = 'r1080', tiling = 'navit_native', merge4x = true } = {}) {
  const res = RES_PRESETS.find((r) => r.id === resId) || RES_PRESETS[1];
  const patch = 14;
  const divisor = merge4x ? 4 : 1;

  let tiles = 1;
  let cols = 1;
  let rows = 1;
  let rawPatches = 576; // 336/14 = 24 -> 24*24 = 576
  let ocrPreserved = false;

  if (tiling === 'fixed_resize') {
    tiles = 1;
    rawPatches = (336 / patch) * (336 / patch); // 576
    ocrPreserved = res.w <= 448;
  } else if (tiling === 'anyres_tiles') {
    // Consistent 336x336 grid tiles (576 patches/tile) + 1 global thumbnail (capped at 12 local tiles)
    cols = Math.min(4, Math.max(1, Math.ceil(res.w / 336)));
    rows = Math.min(3, Math.max(1, Math.ceil(res.h / 336)));
    tiles = cols * rows + 1;
    rawPatches = tiles * 576;
    ocrPreserved = true;
  } else {
    // NaViT native dynamic resolution (cap at 3.6M pixels so 1080p=2.07M runs native while 4K=8.29M scales cleanly)
    const maxPixels = 3600000;
    const scale = res.w * res.h > maxPixels ? Math.sqrt(maxPixels / (res.w * res.h)) : 1;
    const effW = Math.max(28, Math.round((res.w * scale) / 28) * 28);
    const effH = Math.max(28, Math.round((res.h * scale) / 28) * 28);
    tiles = 1;
    rawPatches = Math.round((effW / patch) * (effH / patch));
    ocrPreserved = true;
  }

  const llmTokens = Math.max(16, Math.round(rawPatches / divisor));
  const attnCostRatio = Number(((llmTokens / 144) ** 2).toFixed(1));
  // 70B GQA BF16 full-model KV = 0.3125 MiB/tok
  const kvMB = Number((llmTokens * 0.3125).toFixed(1));

  // True O(N) + O(N^2) ViT latency model (32 layers):
  // - Full 2D ViT: all 32 layers pay O(N^2) attention
  // - Qwen2.5-VL Windowed ViT: 28 layers run 8x8 local window O(N) + only 4 layers run full O(N^2)
  const k = rawPatches / 1000;
  const linearTerm = 1.2 + k * 1.1;
  const quadFullTerm = k * k * 0.42;
  const vitFullMs = Math.max(3, Math.round(linearTerm + quadFullTerm));
  const vitWindowMs = Math.max(2, Math.round(linearTerm + (4 / 32) * quadFullTerm));
  const vitSpeedup = Number((vitFullMs / Math.max(1, vitWindowMs)).toFixed(1));

  return {
    res,
    tiling,
    merge4x,
    tiles,
    cols,
    rows,
    rawPatches,
    llmTokens,
    attnCostRatio,
    kvMB,
    ocrPreserved,
    vitWindowMs,
    vitFullMs,
    vitSpeedup,
  };
}

// §3 Projector Compression Comparison (anchored to 2,304 raw patches)
export function deriveProjectorModel(projector = 'pixel_shuffle_4x') {
  const raw = 2304;
  const rows = [
    { id: 'mlp_1x', ratio: '1:1', outTokens: raw, kvMB: Number((raw * 0.3125).toFixed(0)), prefillMs: 112, ocr: 'high' },
    { id: 'pixel_shuffle_4x', ratio: '4:1', outTokens: raw / 4, kvMB: Number(((raw / 4) * 0.3125).toFixed(0)), prefillMs: 31, ocr: 'high' },
    { id: 'qformer_64', ratio: '36:1', outTokens: 64, kvMB: Number((64 * 0.3125).toFixed(0)), prefillMs: 8, ocr: 'low' },
  ];
  const selected = rows.find((r) => r.id === projector) || rows[1];
  return { raw, rows, selected };
}

// §5 Video Frame Sampling & KV Cache Ledger (explicit 70B BF16 on TP=4: 140 GB/4 = 35 GB weights/GPU, KV sharded /4)
export function deriveVideoKvModel({ durationSec = 60, fps = 1, poolMode = 'spatial_4x' } = {}) {
  const frames = Math.max(1, Math.round(durationSec * fps));
  const rawPerFrame = 576; // 336x336 @ patch 14
  const factor = poolMode === 'spatiotemporal_8x' ? 8 : poolMode === 'spatial_4x' ? 4 : 1;
  const tokensPerFrame = Math.round(rawPerFrame / factor);
  const totalVisTokens = frames * tokensPerFrame;
  // Cluster-total 70B GQA BF16 KV (0.3125 MiB/tok) and per-GPU TP=4 shard (0.078125 MiB/tok)
  const kvGB = Number(((totalVisTokens * 0.3125) / 1024).toFixed(2));
  const perGpuKvGB = Number((kvGB / 4).toFixed(2));
  const perGpuWeightGB = 35; // 70B BF16 = 140 GB across TP=4
  const perGpuReserveGB = 6; // activations + runtime buffers
  const perGpuTotalGB = Number((perGpuWeightGB + perGpuReserveGB + perGpuKvGB).toFixed(2));
  const gpuCapGB = 80;
  const gpuOverflow = perGpuTotalGB > gpuCapGB;
  const vitMs = Number((frames * 3.8).toFixed(0));
  const oomWarn = kvGB > 8.0 || gpuOverflow;

  return {
    durationSec,
    fps,
    poolMode,
    frames,
    tokensPerFrame,
    totalVisTokens,
    kvGB,
    perGpuKvGB,
    perGpuWeightGB,
    perGpuReserveGB,
    perGpuTotalGB,
    gpuCapGB,
    gpuOverflow,
    vitMs,
    oomWarn,
  };
}
