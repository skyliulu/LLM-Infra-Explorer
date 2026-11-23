// Canonical domain model for Diffusion & DiT Infra (Chapter 5 of Tier-2 + Multimodal expansion)

export const ARCH_STAGE_IDS = ['textenc', 'patchify', 'ditloop', 'vaedec'];

export const TASK_PRESETS = {
  img512: {
    id: 'img512',
    isVideo: false,
    frames: 1,
    height: 512,
    width: 512,
    vaeT: 1,
    vaeS: 8,
    defaultSteps: 28,
    modelHidden: 3072,
    layers: 38,
    heads: 24,
    cfgFactor: 1, // FLUX guidance-distilled or optional 2
  },
  img1024: {
    id: 'img1024',
    isVideo: false,
    frames: 1,
    height: 1024,
    width: 1024,
    vaeT: 1,
    vaeS: 8,
    defaultSteps: 30,
    modelHidden: 3072,
    layers: 38,
    heads: 24,
    cfgFactor: 2,
  },
  vid720p: {
    id: 'vid720p',
    isVideo: true,
    frames: 81, // 5s @ 16fps (standard Wan2.1 / CogVideoX 4k+1 frames)
    height: 720,
    width: 1280,
    vaeT: 4,
    vaeS: 8,
    defaultSteps: 50,
    modelHidden: 5120,
    layers: 40,
    heads: 40,
    cfgFactor: 2,
  },
  vid1080p: {
    id: 'vid1080p',
    isVideo: true,
    frames: 81,
    height: 1088, // padded to multiple of 16
    width: 1920,
    vaeT: 4,
    vaeS: 8,
    defaultSteps: 50,
    modelHidden: 5120,
    layers: 40,
    heads: 40,
    cfgFactor: 2,
  },
};

export const PATCH_SIZES = [2, 4];

export function deriveDitTokenModel(presetId = 'vid720p', patchSize = 2, steps = 50, cfgEnabled = true) {
  const preset = TASK_PRESETS[presetId] || TASK_PRESETS.vid720p;
  const p = PATCH_SIZES.includes(patchSize) ? patchSize : 2;
  const nSteps = Math.max(4, Math.min(100, Number(steps) || preset.defaultSteps));
  const cfgMul = cfgEnabled ? 2 : 1;

  // 3D VAE latent dimensions (causal temporal stride: (F-1)/vaeT + 1 for video, 1 for image)
  const latentT = preset.isVideo ? Math.floor((preset.frames - 1) / preset.vaeT) + 1 : 1;
  const latentH = Math.ceil(preset.height / preset.vaeS);
  const latentW = Math.ceil(preset.width / preset.vaeS);

  // Patchify (1 x p x p)
  const patchT = latentT;
  const patchH = Math.ceil(latentH / p);
  const patchW = Math.ceil(latentW / p);
  const seqLen = patchT * patchH * patchW;

  // FLOPs per single DiT forward pass (Batch=1):
  // Attention (bidirectional full 3D): 4 * L * N^2 * D
  // Projections + FFN (approx 4x SwiGLU/GELU): 24 * L * N * D^2
  const L = preset.layers;
  const D = preset.modelHidden;
  const attnFlopsOne = 4 * L * seqLen * seqLen * D;
  const ffnFlopsOne = 24 * L * seqLen * D * D;
  const totalFlopsOne = attnFlopsOne + ffnFlopsOne;

  const attnSharePct = Math.round((attnFlopsOne / totalFlopsOne) * 100);
  const ffnSharePct = 100 - attnSharePct;

  const totalTflops = Number(((totalFlopsOne * cfgMul * nSteps) / 1e12).toFixed(1));
  // H100 BF16 effective ~550 TFLOPS (with FlashAttention-3 / SageAttention)
  const estSingleGpuSec = Number((totalTflops / 550).toFixed(1));

  // Arithmetic intensity (FLOPs / byte of model weights ~ 14B * 2B = 28 GB)
  const weightBytes = (preset.isVideo ? 14e9 : 12e9) * 2;
  const arithIntensity = Math.round((totalFlopsOne * cfgMul) / weightBytes);
  const regime = arithIntensity > 350 ? 'compute_bound' : 'mixed';

  return {
    presetId: preset.id,
    isVideo: preset.isVideo,
    frames: preset.frames,
    height: preset.height,
    width: preset.width,
    patchSize: p,
    steps: nSteps,
    cfgEnabled,
    cfgMul,
    latentT,
    latentH,
    latentW,
    patchT,
    patchH,
    patchW,
    seqLen,
    attnSharePct,
    ffnSharePct,
    totalTflops,
    estSingleGpuSec,
    arithIntensity,
    regime,
  };
}

export const PARALLEL_MODES = ['single', 'cfg', 'usp'];

export function deriveDitParallelModel(mode = 'usp', gpuCount = 8, interconnect = 'nvlink', seqLen = 75600, singleGpuStepSec = null) {
  const normalizedMode = PARALLEL_MODES.includes(mode) ? mode : 'usp';
  const gpus =
    normalizedMode === 'single'
      ? 1
      : normalizedMode === 'cfg'
        ? 2
        : [2, 4, 8].includes(gpuCount)
          ? gpuCount
          : 8;

  // Baseline 1-GPU step time synced with §2 single-GPU model when provided
  const baseStepSec = Number((singleGpuStepSec && singleGpuStepSec > 0 ? singleGpuStepSec : (seqLen / 75600) * 23.9).toFixed(2));
  const bwGBs = interconnect === 'nvlink' ? 450 : 50; // effective bidirectional per-GPU GB/s

  let cfgRanks = 1;
  let ulyssesRanks = 1;
  let ringRanks = 1;
  let commVolumeMB = 0;
  let commOverheadSec = 0;

  if (normalizedMode === 'single') {
    cfgRanks = 1;
  } else if (normalizedMode === 'cfg') {
    cfgRanks = 2;
    // Exchange 1 latent noise prediction tensor at end of step (~30 MB for 720p latent)
    commVolumeMB = Math.round((seqLen * 16 * 2) / 1e6);
    commOverheadSec = Number(((commVolumeMB / 1000) / bwGBs + 0.008).toFixed(3));
  } else {
    // USP: 2-way CFG if gpus >= 2, remaining split across Ulysses (intra-node) + Ring (outer)
    cfgRanks = gpus >= 2 ? 2 : 1;
    const spRanks = Math.max(1, gpus / cfgRanks);
    if (spRanks <= 4) {
      ulyssesRanks = spRanks;
      ringRanks = 1;
    } else {
      ulyssesRanks = 2;
      ringRanks = spRanks / 2;
    }
    // Ulysses All-to-All Q,K,V,O across 40 layers: 4 * 2 bytes * (N/sp) * D * L
    const spSeq = seqLen / spRanks;
    const allToAllMB = ulyssesRanks > 1 ? Math.round((40 * 4 * 2 * spSeq * 5120 * ((ulyssesRanks - 1) / ulyssesRanks)) / 1e6) : 0;
    // Ring Attention overlaps ~80% of P2P KV transfer with FlashAttention compute
    const ringExposedMB = ringRanks > 1 ? Math.round((40 * 2 * 2 * spSeq * 5120 * 0.22) / 1e6) : 0;
    commVolumeMB = allToAllMB + ringExposedMB;
    commOverheadSec = Number(((commVolumeMB / 1000) / bwGBs + 0.015 * spRanks).toFixed(3));
  }

  const computeSec = Number((baseStepSec / gpus).toFixed(3));
  const stepSec = Number((computeSec + commOverheadSec).toFixed(2));
  const speedup = Number((baseStepSec / Math.max(0.01, stepSec)).toFixed(2));
  const efficiencyPct = Math.min(99, Math.round((speedup / gpus) * 100));
  const commSharePct = Math.min(80, Math.round((commOverheadSec / Math.max(0.01, stepSec)) * 100));
  const total50StepsSec = Number((stepSec * 50).toFixed(1));

  return {
    mode: normalizedMode,
    gpus,
    interconnect,
    cfgRanks,
    ulyssesRanks,
    ringRanks,
    baseStepSec,
    computeSec,
    commVolumeMB,
    commOverheadSec,
    stepSec,
    speedup,
    efficiencyPct,
    commSharePct,
    total50StepsSec,
  };
}

// 20-step normalized trajectory for TeaCache / Step Distillation visualization
// Characteristic relative embedding/residual L1 delta curve across denoising progress:
// High change at early composition steps (0..3) and late high-freq detail steps (16..19), flat valley in middle (4..15)
const BASE_STEP_DELTAS = [
  0.34, 0.26, 0.19, 0.14,
  0.09, 0.07, 0.06, 0.05, 0.05, 0.06, 0.06, 0.07, 0.07, 0.08, 0.09, 0.11,
  0.15, 0.21, 0.28, 0.36,
];

export const CACHE_STRATEGIES = ['baseline', 'teacache', 'distill'];

export function deriveDitCacheModel(strategy = 'teacache', threshold = 0.15) {
  const strat = CACHE_STRATEGIES.includes(strategy) ? strategy : 'teacache';
  const thresh = Math.max(0.05, Math.min(0.35, Number(threshold) || 0.15));

  const timeline = [];
  let accumDelta = 0;
  let fullSteps = 0;
  let reusedSteps = 0;

  if (strat === 'distill') {
    // 4-step LCM / DMD distillation maps 20 logical steps into 4 giant solver jumps
    const activeIndices = new Set([0, 6, 13, 19]);
    for (let i = 0; i < 20; i++) {
      const isCompute = activeIndices.has(i);
      if (isCompute) fullSteps += 1;
      timeline.push({
        step: i + 1,
        delta: BASE_STEP_DELTAS[i],
        status: isCompute ? 'compute' : 'skipped',
        accum: 0,
      });
    }
  } else {
    for (let i = 0; i < 20; i++) {
      const d = BASE_STEP_DELTAS[i];
      if (strat === 'baseline' || i === 0 || i === 19) {
        accumDelta = 0;
        fullSteps += 1;
        timeline.push({ step: i + 1, delta: d, status: 'compute', accum: 0 });
      } else {
        accumDelta = Number((accumDelta + d).toFixed(3));
        if (accumDelta < thresh) {
          reusedSteps += 1;
          timeline.push({ step: i + 1, delta: d, status: 'reuse', accum: accumDelta });
        } else {
          accumDelta = 0;
          fullSteps += 1;
          timeline.push({ step: i + 1, delta: d, status: 'compute', accum: 0 });
        }
      }
    }
  }

  // Cost per full step = 1.0, reused step = 0.04 (embedding + residual add only)
  const baselineCost = 20;
  const effectiveCost = fullSteps * 1.0 + reusedSteps * 0.04;
  const speedup = Number((baselineCost / Math.max(1, effectiveCost)).toFixed(2));

  // Quality risk heuristic
  let qualityRisk = 'none';
  if (strat === 'teacache') {
    qualityRisk = thresh >= 0.24 ? 'high' : thresh >= 0.14 ? 'low' : 'minimal';
  } else if (strat === 'distill') {
    qualityRisk = 'medium';
  }

  return {
    strategy: strat,
    threshold: thresh,
    timeline,
    fullSteps,
    reusedSteps,
    skippedSteps: 20 - fullSteps - reusedSteps,
    speedup,
    qualityRisk,
  };
}

export const VAE_RES_PRESETS = {
  v720p: { id: 'v720p', frames: 81, height: 720, width: 1280, fullActGB: 19.4 },
  v1080p: { id: 'v1080p', frames: 81, height: 1088, width: 1920, fullActGB: 41.8 },
  v4k: { id: 'v4k', frames: 81, height: 2160, width: 3840, fullActGB: 158.0 },
};

export function deriveDitVaeModel(resId = 'v1080p', tilingMode = 'spatiotemporal', gpuVramGB = 80) {
  const res = VAE_RES_PRESETS[resId] || VAE_RES_PRESETS.v1080p;
  const mode = ['full', 'spatial', 'spatiotemporal'].includes(tilingMode) ? tilingMode : 'spatiotemporal';
  const residentWeightsGB = 29.5; // 14B DiT BF16 (28GB) + 3D VAE (1.5GB)

  let tileFactor = 1;
  let tilesCount = 1;
  let overlapOverheadPct = 0;

  if (mode === 'spatial') {
    tileFactor = 3.4; // 2x2 spatial tiles with overlap
    tilesCount = 4;
    overlapOverheadPct = 14;
  } else if (mode === 'spatiotemporal') {
    tileFactor = 7.2; // 2x2 spatial x 3 temporal chunks with causal conv cache
    tilesCount = 12;
    overlapOverheadPct = 22;
  }

  const vaePeakActGB = Number((res.fullActGB / tileFactor).toFixed(1));
  const totalPeakGB = Number((residentWeightsGB + vaePeakActGB).toFixed(1));
  const oomRisk = totalPeakGB > gpuVramGB;
  const memReductionX = Number((res.fullActGB / Math.max(0.1, vaePeakActGB)).toFixed(1));

  return {
    resId: res.id,
    frames: res.frames,
    height: res.height,
    width: res.width,
    tilingMode: mode,
    gpuVramGB,
    residentWeightsGB,
    fullActGB: res.fullActGB,
    vaePeakActGB,
    totalPeakGB,
    oomRisk,
    memReductionX,
    tilesCount,
    overlapOverheadPct,
  };
}

export const QUANT_PRESETS = {
  bf16: { id: 'bf16', weightGB: 28.0, stepSpeedup: 1.0, fidDelta: 0.0, adalnPrecision: 'BF16' },
  fp8: { id: 'fp8', weightGB: 14.6, stepSpeedup: 1.55, fidDelta: 0.18, adalnPrecision: 'BF16 (Protected)' },
  svdquant: { id: 'svdquant', weightGB: 7.9, stepSpeedup: 2.35, fidDelta: 0.32, adalnPrecision: 'BF16 + Rank-32 LoRA Branch' },
};

export function deriveDitQuantModel(quantId = 'fp8') {
  return QUANT_PRESETS[quantId] || QUANT_PRESETS.fp8;
}
