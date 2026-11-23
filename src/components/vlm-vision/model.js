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
export const VLM_DIAG_IDS = ['ocr_oom', 'vit_stall', 'image_hash_miss', 'video_kv_blowup'];

export function normalizeVlmConfig(input = {}) {
  const resId = RES_PRESETS.some((r) => r.id === input.resId) ? input.resId : 'r1080';
  const tiling = TILING_SCHEMES.includes(input.tiling) ? input.tiling : 'navit_native';
  const merge4x = input.merge4x !== undefined ? Boolean(input.merge4x) : true;
  const projector = PROJECTOR_MODES.includes(input.projector) ? input.projector : 'pixel_shuffle_4x';
  const ropeMode = ROPE_MODES.includes(input.ropeMode) ? input.ropeMode : 'mrope_3d';
  const durationSec = VIDEO_DURATIONS.includes(Number(input.durationSec)) ? Number(input.durationSec) : 60;
  const fps = VIDEO_FPS_OPTS.includes(Number(input.fps)) ? Number(input.fps) : 1;
  const poolMode = VIDEO_POOL_MODES.includes(input.poolMode) ? input.poolMode : 'spatial_4x';
  const diagId = VLM_DIAG_IDS.includes(input.diagId) ? input.diagId : 'ocr_oom';
  return { resId, tiling, merge4x, projector, ropeMode, durationSec, fps, poolMode, diagId };
}

// §2 Dynamic Tiling & Visual Token Count
export function deriveTilingModel({ resId = 'r1080', tiling = 'navit_native', merge4x = true } = {}) {
  const res = RES_PRESETS.find((r) => r.id === resId) || RES_PRESETS[1];
  const patch = 14;
  const divisor = merge4x ? 4 : 1;

  let tiles = 1;
  let rawPatches = 576; // 336/14 = 24 -> 24*24 = 576
  let ocrPreserved = false;

  if (tiling === 'fixed_resize') {
    tiles = 1;
    rawPatches = (336 / patch) * (336 / patch); // 576
    ocrPreserved = res.w <= 448;
  } else if (tiling === 'anyres_tiles') {
    // 336x336 grid tiles + 1 global thumbnail (capped at 12 tiles for 4K)
    const cols = Math.min(4, Math.max(1, Math.ceil(res.w / 448)));
    const rows = Math.min(3, Math.max(1, Math.ceil(res.h / 448)));
    tiles = cols * rows + 1; // +1 global overview
    rawPatches = tiles * 576;
    ocrPreserved = true;
  } else {
    // NaViT native dynamic resolution (capped max pixels ~1.4M for 4K efficiency)
    const scale = res.w * res.h > 1400000 ? Math.sqrt(1400000 / (res.w * res.h)) : 1;
    const effW = Math.max(28, Math.round((res.w * scale) / 28) * 28);
    const effH = Math.max(28, Math.round((res.h * scale) / 28) * 28);
    tiles = 1; // single native packed sequence
    rawPatches = Math.round((effW / patch) * (effH / patch));
    ocrPreserved = true;
  }

  const llmTokens = Math.max(16, Math.round(rawPatches / divisor));
  const attnCostRatio = Number(((llmTokens / 144) ** 2).toFixed(1));
  // 70B GQA BF16 KV = ~0.3125 MB/tok
  const kvMB = Number((llmTokens * 0.3125).toFixed(1));

  return { res, tiling, merge4x, tiles, rawPatches, llmTokens, attnCostRatio, kvMB, ocrPreserved };
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

// §5 Video Frame Sampling & KV Cache Ledger
export function deriveVideoKvModel({ durationSec = 60, fps = 1, poolMode = 'spatial_4x' } = {}) {
  const frames = Math.max(1, Math.round(durationSec * fps));
  const rawPerFrame = 576; // 336x336 @ patch 14
  const factor = poolMode === 'spatiotemporal_8x' ? 8 : poolMode === 'spatial_4x' ? 4 : 1;
  const tokensPerFrame = Math.round(rawPerFrame / factor);
  const totalVisTokens = frames * tokensPerFrame;
  const kvGB = Number(((totalVisTokens * 0.3125) / 1024).toFixed(2));
  const vitMs = Number((frames * 3.8).toFixed(0)); // ~3.8 ms per frame on H100 ViT
  const oomWarn = kvGB > 8.0;

  return { durationSec, fps, poolMode, frames, tokensPerFrame, totalVisTokens, kvGB, vitMs, oomWarn };
}
