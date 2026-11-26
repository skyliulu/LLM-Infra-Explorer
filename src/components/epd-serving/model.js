export const EPD_MODES = ['unified', 'pd_coupled', 'epd_split'];
export const PREPROC_MODES = ['sync_loop', 'async_nvjpeg'];
export const MM_CACHE_MODES = ['no_cache', 'emb_cache'];
export const EPD_WORKLOADS = {
  text_heavy: { id: 'text_heavy', vlmSharePct: 15, imgsPerVlm: 1, optE: 1, optP: 6, optD: 9 },
  mixed_vlm: { id: 'mixed_vlm', vlmSharePct: 45, imgsPerVlm: 3, optE: 3, optP: 6, optD: 7 },
  video_ocr: { id: 'video_ocr', vlmSharePct: 80, imgsPerVlm: 8, optE: 6, optP: 6, optD: 4 },
};
export const EPD_TOTAL_GPUS = 16;

export function normalizeEpdConfig(input = {}) {
  const epdMode = EPD_MODES.includes(input.epdMode) ? input.epdMode : 'epd_split';
  const preprocMode = PREPROC_MODES.includes(input.preprocMode) ? input.preprocMode : 'async_nvjpeg';
  const cacheMode = MM_CACHE_MODES.includes(input.cacheMode) ? input.cacheMode : 'emb_cache';
  const workload = EPD_WORKLOADS[input.workload] ? input.workload : 'mixed_vlm';
  const eNodes = Math.max(1, Math.min(8, Math.round(Number(input.eNodes) || 3)));
  const pNodes = Math.max(2, Math.min(EPD_TOTAL_GPUS - eNodes - 2, Math.round(Number(input.pNodes) || 6)));
  return { epdMode, preprocMode, cacheMode, workload, eNodes, pNodes };
}

// §2 Unified vs PD vs EPD Interference + exact E->P vs P->D payload size comparison (70B GQA BF16, 1024 visual tokens)
// - E->P Visual Embeddings: 1024 tok * d_LLM (8192) * 2 B = 16 MiB
// - P->D Full 80-Layer GQA KV: 1024 tok * 2(K,V) * 80 layers * 8 KV heads * 128 d_h * 2 B = 320 MiB (20x larger!)
export function deriveEpdModeModel(epdMode = 'epd_split') {
  const m = EPD_MODES.includes(epdMode) ? epdMode : 'epd_split';
  const epPayloadMB = 16;
  const pdPayloadMB = 320;
  const scenarios = {
    unified: {
      ttftTextMs: 390,
      ttftVlmMs: 560,
      p99TpotMs: 280,
      llmGpuWastePct: 34,
      sloPass: false,
    },
    pd_coupled: {
      ttftTextMs: 240,
      ttftVlmMs: 340,
      p99TpotMs: 20,
      llmGpuWastePct: 22,
      sloPass: false,
    },
    epd_split: {
      ttftTextMs: 115,
      ttftVlmMs: 245,
      p99TpotMs: 19,
      llmGpuWastePct: 4,
      sloPass: true,
    },
  };
  return {
    epdMode: m,
    epPayloadMB,
    pdPayloadMB,
    payloadRatio: Math.round(pdPayloadMB / epPayloadMB),
    ...scenarios[m],
  };
}

// §3 Media Decode / Resize Bottleneck
export function derivePreprocModel(preprocMode = 'async_nvjpeg') {
  const isAsync = preprocMode === 'async_nvjpeg';
  return {
    preprocMode: isAsync ? 'async_nvjpeg' : 'sync_loop',
    cpuDecodeMs: isAsync ? 12 : 48,
    gpuComputeMs: 62,
    totalMs: isAsync ? 66 : 110,
    gpuIdlePct: isAsync ? 6 : 44,
    speedup: Number((110 / 66).toFixed(2)),
  };
}

// §4 Content-Addressed Multimodal Embedding Cache
const MM_TRACE = [
  { id: 'R1', img: 'ImgA', noteKey: 'mm_r1' },
  { id: 'R2', img: 'ImgA', noteKey: 'mm_r2' },
  { id: 'R3', img: 'ImgA', noteKey: 'mm_r3' },
  { id: 'R4', img: 'ImgB', noteKey: 'mm_r4' },
];

export function deriveMmCacheTrace({ cacheMode = 'emb_cache', step = 4 } = {}) {
  const enabled = cacheMode === 'emb_cache';
  const s = Math.max(0, Math.min(MM_TRACE.length, Math.trunc(Number(step) || 0)));
  const seen = new Set();
  const items = [];
  let hits = 0;
  let vitRuns = 0;

  for (let i = 0; i < s; i += 1) {
    const req = MM_TRACE[i];
    const hit = enabled && seen.has(req.img);
    if (hit) hits += 1;
    else vitRuns += 1;
    seen.add(req.img);
    items.push({ ...req, hit, vitMs: hit ? 2 : 42 });
  }
  const hitRatePct = s === 0 ? 0 : Math.round((hits / s) * 100);
  const totalVitMs = items.reduce((acc, x) => acc + x.vitMs, 0);
  const baselineVitMs = s * 42;
  const savedMs = Math.max(0, baselineVitMs - totalVitMs);
  return {
    cacheMode,
    step: s,
    maxStep: MM_TRACE.length,
    phase: s === 0 ? 'idle' : s === MM_TRACE.length ? 'done' : 'running',
    items,
    hits,
    vitRuns,
    hitRatePct,
    totalVitMs,
    savedMs,
  };
}

// §5 Dynamic E:P:D 3-Pool Capacity Balancing & Honest Heterogeneous L40S vs H100 TCO (16 GPUs)
export function deriveEpdRatioModel({ workload = 'mixed_vlm', eNodes = 3, pNodes = 6, heteroTco = false } = {}) {
  const w = EPD_WORKLOADS[workload] || EPD_WORKLOADS.mixed_vlm;
  const e = Math.max(1, Math.min(8, Math.round(Number(eNodes) || 3)));
  const p = Math.max(2, Math.min(EPD_TOTAL_GPUS - e - 2, Math.round(Number(pNodes) || 6)));
  const d = EPD_TOTAL_GPUS - e - p;

  // Per-GPU capacities: L40S BF16 ViT throughput is ~0.42x of H100 (~362 vs 989 TFLOP/s dense)
  const ePerfScale = heteroTco ? 0.42 : 1.0;
  const imgDemandPerReq = (w.vlmSharePct / 100) * w.imgsPerVlm;
  const eCap = Number((e * ePerfScale * (16 / Math.max(0.2, imgDemandPerReq))).toFixed(1));
  const pCap = Number((p * (4.8 / (1 + imgDemandPerReq * 0.25))).toFixed(1));
  const dCap = Number((d * 3.9).toFixed(1));
  const goodput = Number(Math.min(eCap, pCap, dCap).toFixed(1));
  const bottleneck = goodput === eCap ? 'encode' : goodput === pCap ? 'prefill' : 'decode';

  // Exact hourly cost & cost per 100,000 requests:
  // requests_per_hour = goodput * 3600  =>  cost_per_100k = hourlyCost / (goodput * 3600) * 100000
  const hourlyCost = Number((heteroTco ? e * 1.2 + (p + d) * 3.5 : EPD_TOTAL_GPUS * 3.5).toFixed(1));
  const homoHourlyCost = EPD_TOTAL_GPUS * 3.5;
  const costPer100k = Number(((hourlyCost / Math.max(0.1, goodput * 3600)) * 100000).toFixed(2));
  const homoGoodput = Number(
    Math.min(
      e * (16 / Math.max(0.2, imgDemandPerReq)),
      pCap,
      dCap
    ).toFixed(1)
  );
  const homoCostPer100k = Number(((homoHourlyCost / Math.max(0.1, homoGoodput * 3600)) * 100000).toFixed(2));
  const tcoDeltaPct = Math.round(((homoCostPer100k - costPer100k) / Math.max(0.01, homoCostPer100k)) * 100);

  return {
    workload: w,
    eNodes: e,
    pNodes: p,
    dNodes: d,
    heteroTco: Boolean(heteroTco),
    eCap,
    pCap,
    dCap,
    goodput,
    bottleneck,
    hourlyCost,
    costPer100k,
    tcoDeltaPct,
  };
}
