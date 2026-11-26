export const PD_MODES = ['collocated', 'chunked', 'disaggregated'];
export const PD_LINKS = ['rdma', 'eth10g'];
export const CHUNK_SIZES = [512, 1024, 2048, 4096];
export const KV_PIPE_MODES = ['bulk_blocking', 'layerwise_pipelined'];
export const KV_LAYOUT_MODES = ['symmetric', 'asymmetric'];
export const ROUTER_POLICIES = ['load_only', 'cache_only', 'cache_aware'];
export const TOTAL_GPUS = 16;

// Unified physical anchor: 70B GQA (80 layers, 8 KV heads, head_dim 128), FP8 KV = 0.16 MB/tok
// 8K prompt KV = 8192 * 0.16 MB = 1.28 GB (decimal)
// Single-rail 400G NDR IB effective payload = 40 GB/s; cross-pool 2x 400G IB trunk = 80 GB/s
export const KV_MB_PER_TOK = 0.16;
export const KV_8K_GB = 1.28;
export const PREFILL_8K_MS = 360;
export const RDMA_EFF_GBPS = 40;
export const CROSS_POOL_RDMA_GBPS = 80;
export const ETH10G_GBPS = 1.25;

export const ISL_OPTIONS = [1024, 2048, 4096, 8192];
export const OSL_OPTIONS = [128, 512, 2048, 4096];
export const HIT_OPTIONS = [0, 40, 75];

export const RATIO_PRESETS = {
  rag: { isl: 8192, osl: 256, cacheHitPct: 20 },
  chat: { isl: 2048, osl: 512, cacheHitPct: 40 },
  cot: { isl: 1024, osl: 4096, cacheHitPct: 40 },
};

export function normalizePdConfig(input = {}) {
  const pdMode = PD_MODES.includes(input.pdMode) ? input.pdMode : 'disaggregated';
  const link = PD_LINKS.includes(input.link) ? input.link : 'rdma';
  const chunkSize = CHUNK_SIZES.includes(Number(input.chunkSize)) ? Number(input.chunkSize) : 2048;
  const kvPipe = KV_PIPE_MODES.includes(input.kvPipe) ? input.kvPipe : 'layerwise_pipelined';
  const kvLayout = KV_LAYOUT_MODES.includes(input.kvLayout) ? input.kvLayout : 'asymmetric';
  const routerPolicy = ROUTER_POLICIES.includes(input.routerPolicy) ? input.routerPolicy : 'cache_aware';
  const isl = Math.max(512, Math.min(16384, Math.round(Number(input.isl) || 4096)));
  const osl = Math.max(64, Math.min(8192, Math.round(Number(input.osl) || 512)));
  const cacheHitPct = Math.max(0, Math.min(85, Math.round(Number(input.cacheHitPct ?? 40))));
  const pNodes = Math.max(2, Math.min(TOTAL_GPUS - 2, Math.round(Number(input.pNodes) || 8)));
  return { pdMode, link, chunkSize, kvPipe, kvLayout, routerPolicy, isl, osl, cacheHitPct, pNodes };
}

// §2 Prefill-Decode interference, Chunked Prefill time budget & transfer boundary
export function deriveInterferenceModel({ pdMode = 'disaggregated', link = 'rdma', chunkSize = 2048 } = {}) {
  const safeMode = PD_MODES.includes(pdMode) ? pdMode : 'disaggregated';
  const safeLink = PD_LINKS.includes(link) ? link : 'rdma';
  const c = CHUNK_SIZES.includes(Number(chunkSize)) ? Number(chunkSize) : 2048;
  const ttftSloMs = 500;
  const tpotSloMs = 30;

  // Anchored to §3 layer-wise pipelined 400G NDR IB (40 GB/s eff -> 32 ms raw, 6 ms exposed tail + sync)
  // vs 10GbE (1.25 GB/s -> 1024 ms serialized KV transfer)
  const rdmaExposedMs = 6;
  const ethTransferMs = Math.round((KV_8K_GB / ETH10G_GBPS) * 1000); // 1024 ms
  const transferMs = safeMode === 'disaggregated'
    ? (safeLink === 'rdma' ? rdmaExposedMs : ethTransferMs)
    : 0;

  // Dynamic Chunked Prefill math for 8K prompt cut into chunks of size c:
  const numChunks = Math.max(1, Math.round(8192 / c));
  const chunkTpotMs = Math.round(14 + (c / 2048) * 98); // c=512 -> 39ms, c=1024 -> 63ms, c=2048 -> 112ms, c=4096 -> 210ms
  const chunkTtftMs = Math.round(455 + numChunks * 18.5); // c=512 -> 751ms, c=2048 -> 529ms, c=4096 -> 492ms

  const chunkSegs = [];
  const visChunks = Math.min(4, numChunks);
  const pPct = Math.round(72 / visChunks);
  const dPct = Math.round(28 / visChunks);
  for (let i = 0; i < visChunks; i += 1) {
    chunkSegs.push({ id: `chp${i}`, labelKey: 'segChunkP', idx: i + 1, kind: 'prefill', pct: pPct });
    chunkSegs.push({ id: `chd${i}`, labelKey: 'segChunkD', kind: 'decode', pct: dPct });
  }

  // Proportional timeline window:
  // RDMA window = 600 ms (Prefill 360 ms = 60%, overlapped RDMA spans 2%..61%, exposing +6 ms = 1% past Prefill)
  // 10GbE window = 1440 ms (Prefill 360 ms = 25%, 10GbE stall 1024 ms = 71%)
  const scenarios = {
    collocated: {
      ttftMs: 420,
      p99TpotMs: 420,
      transferMs: 0,
      pLane: [
        { id: 'c0', labelKey: 'segDecodeShort', kind: 'decode', pct: 10 },
        { id: 'c1', labelKey: 'segCollocPrefill', kind: 'prefill', pct: 65 },
        { id: 'c2', labelKey: 'segDecodeResume', kind: 'decode', pct: 25 },
      ],
      dLane: null,
      kvLane: null,
    },
    chunked: {
      ttftMs: chunkTtftMs,
      p99TpotMs: chunkTpotMs,
      transferMs: 0,
      pLane: chunkSegs,
      dLane: null,
      kvLane: null,
    },
    disaggregated: {
      ttftMs: PREFILL_8K_MS + transferMs,
      p99TpotMs: 19,
      transferMs,
      pLane: [
        { id: 'dp0', labelKey: 'segDisaggPrefill', kind: 'prefill', pct: safeLink === 'rdma' ? 60 : 25 },
        { id: 'dp1', labelKey: 'segNextPrefill', kind: 'idle', pct: safeLink === 'rdma' ? 40 : 75 },
      ],
      kvLane: safeLink === 'rdma'
        ? [
            { id: 'kv_lead', labelKey: 'segEmpty', kind: 'idle', pct: 2 },
            { id: 'kv0', labelKey: 'segRdmaOverlap', kind: 'rdma', pct: 59 },
            { id: 'kv1', labelKey: 'segReadyOnD', kind: 'idle', pct: 39 },
          ]
        : [
            { id: 'kv_wait', labelKey: 'segEmpty', kind: 'idle', pct: 25 },
            { id: 'kv0', labelKey: 'segEthStall', kind: 'stall', pct: 71 },
            { id: 'kv1', labelKey: 'segEmpty', kind: 'idle', pct: 4 },
          ],
      dLane: safeLink === 'rdma'
        ? [
            { id: 'dd0', labelKey: 'segDecodeSteady', kind: 'decode', pct: 61 },
            { id: 'dd1', labelKey: 'segDecodeJoin', kind: 'decode', pct: 39 },
          ]
        : [
            { id: 'dd0', labelKey: 'segDecodeSteady', kind: 'decode', pct: 96 },
            { id: 'dd1', labelKey: 'segEmpty', kind: 'decode', pct: 4 },
          ],
    },
  };

  const active = scenarios[safeMode];
  const ttftPass = active.ttftMs <= ttftSloMs;
  const tpotPass = active.p99TpotMs <= tpotSloMs;
  return {
    pdMode: safeMode,
    link: safeLink,
    chunkSize: c,
    numChunks,
    ttftSloMs,
    tpotSloMs,
    ...active,
    ttftPass,
    tpotPass,
    sloPass: ttftPass && tpotPass,
  };
}

// §3 Layer-wise Pipelined KV Transfer & Asymmetric P->D Resharding
// Anchored to same 1x 400G NDR IB fabric (40 GB/s effective unidirectional):
// 1.28 GB / 40 GB/s = 32 ms symmetric bulk; 36 ms asymmetric (2P->1D head gather + receiver-side fan-in)
export function deriveKvTransferModel({ kvPipe = 'layerwise_pipelined', kvLayout = 'asymmetric' } = {}) {
  const isPipelined = kvPipe === 'layerwise_pipelined';
  const isAsym = kvLayout === 'asymmetric';
  const kvSizeGB = KV_8K_GB;
  const computeMs = PREFILL_8K_MS;
  const rawTransferMs = isAsym
    ? Math.round((kvSizeGB / RDMA_EFF_GBPS) * 1000 * 1.125) // 36 ms
    : Math.round((kvSizeGB / RDMA_EFF_GBPS) * 1000); // 32 ms
  // Layer-wise pipeline: L0..L79 RDMA overlaps L1..L79 compute; only final layer + fence/handoff (~6–7 ms) exposed
  const exposedTransferMs = isPipelined ? (isAsym ? 7 : 6) : rawTransferMs;
  const overlapPct = isPipelined ? Math.round(((rawTransferMs - exposedTransferMs) / rawTransferMs) * 100) : 0;
  const totalTtftMs = computeMs + exposedTransferMs;

  // Proportional timeline widths against a 400 ms window
  const windowMs = 400;
  const computePct = Math.round((computeMs / windowMs) * 100); // 90%
  const bulkTxPct = Math.max(8, Math.round((rawTransferMs / windowMs) * 100)); // 8–9%
  const pipeLeadPct = 2; // L0 compute (~4.5 ms) before first RDMA write
  const pipeExposedPct = Math.max(2, Math.round((exposedTransferMs / windowMs) * 100)); // 2%
  const pipeBarPct = computePct - pipeLeadPct + pipeExposedPct; // 90%

  return {
    kvPipe: isPipelined ? 'layerwise_pipelined' : 'bulk_blocking',
    kvLayout: isAsym ? 'asymmetric' : 'symmetric',
    isPipelined,
    isAsym,
    kvSizeGB,
    computeMs,
    rawTransferMs,
    exposedTransferMs,
    overlapPct,
    totalTtftMs,
    computePct,
    bulkTxPct,
    pipeLeadPct,
    pipeBarPct,
    fanInKey: isAsym ? 'fanInAsym' : 'fanInSym',
  };
}

// §4 Cluster Cache-Aware Router Trilemma
const ROUTER_REQUESTS = [
  { id: 'R1', prefix: 'SysA' },
  { id: 'R2', prefix: 'SysA' },
  { id: 'R3', prefix: 'SysA' },
  { id: 'R4', prefix: 'SysA' },
  { id: 'R5', prefix: 'SysB' },
  { id: 'R6', prefix: 'New' },
];

export function deriveRouterTrace({ routerPolicy = 'cache_aware', step = 6 } = {}) {
  const policy = ROUTER_POLICIES.includes(routerPolicy) ? routerPolicy : 'cache_aware';
  const maxStep = ROUTER_REQUESTS.length;
  const s = Math.max(0, Math.min(maxStep, Math.trunc(Number(step) || 0)));

  const workers = [
    { id: 'W0', baseLoad: 1, load: 1, warm: ['SysA'], assigned: [] },
    { id: 'W1', baseLoad: 1, load: 1, warm: ['SysB'], assigned: [] },
    { id: 'W2', baseLoad: 0, load: 0, warm: [], assigned: [] },
    { id: 'W3', baseLoad: 0, load: 0, warm: [], assigned: [] },
  ];

  const threshold = 3;
  const events = [];
  let hits = 0;

  for (let i = 0; i < s; i += 1) {
    const req = ROUTER_REQUESTS[i];
    let target;
    let reason = 'least_load';
    const warmCandidates = workers.filter((w) => w.warm.includes(req.prefix));

    if (policy === 'load_only') {
      target = [...workers].sort((a, b) => a.load - b.load || a.warm.length - b.warm.length)[0];
      reason = 'load_only';
    } else if (policy === 'cache_only') {
      if (warmCandidates.length > 0) {
        target = [...warmCandidates].sort((a, b) => a.load - b.load)[0];
        reason = 'cache_pin';
      } else {
        target = [...workers].sort((a, b) => a.load - b.load)[0];
        reason = 'cold_least_load';
      }
    } else {
      const healthyWarm = warmCandidates.filter((w) => w.load < threshold);
      if (healthyWarm.length > 0) {
        target = [...healthyWarm].sort((a, b) => a.load - b.load)[0];
        reason = 'cache_hit';
      } else {
        target = [...workers].sort((a, b) => a.load - b.load)[0];
        reason = warmCandidates.length > 0 ? 'spillover' : 'cold_least_load';
      }
    }

    const hit = target.warm.includes(req.prefix);
    if (hit) hits += 1;
    if (!hit && req.prefix !== 'New') {
      target.warm.push(req.prefix);
    }
    target.load += 1;
    const overloaded = target.load >= 4;
    target.assigned.push({ id: req.id, prefix: req.prefix, hit, overloaded });
    events.push({ reqId: req.id, prefix: req.prefix, workerId: target.id, hit, reason, queueAfter: target.load });
  }

  const maxQueue = Math.max(...workers.map((w) => w.load));
  const minQueue = Math.min(...workers.map((w) => w.load));
  const hitRatePct = s === 0 ? 0 : Math.round((hits / s) * 100);
  const queuePenalty = maxQueue > 3 ? (maxQueue - 2) * 165 : (maxQueue - 1) * 45;
  const basePrefill = hitRatePct >= 60 ? 155 : hitRatePct >= 30 ? 250 : 390;
  const p99TtftMs = s === 0 ? 0 : Math.round(basePrefill + queuePenalty);

  return {
    policy,
    step: s,
    maxStep,
    phase: s === 0 ? 'idle' : s === maxStep ? 'done' : 'running',
    workers: workers.map((w) => ({
      ...w,
      kvPct: Math.min(98, 22 + w.load * 16),
      overloaded: w.load >= 4,
    })),
    lastEvent: events[events.length - 1] || null,
    hits,
    hitRatePct,
    maxQueue,
    skew: maxQueue - minQueue,
    p99TtftMs,
  };
}

// §5 Dynamic P:D Ratio & Cluster Goodput Q_SLO
// Anchored to same 70B FP8 KV (0.16 MB/tok) and 2x 400G NDR IB cross-pool trunk (80 GB/s effective)
export function derivePdRatioModel({ isl = 4096, osl = 512, cacheHitPct = 40, pNodes = 8 } = {}) {
  const safeIsl = Math.max(512, Math.min(16384, Number(isl) || 4096));
  const safeOsl = Math.max(64, Math.min(8192, Number(osl) || 512));
  const hit = Math.max(0, Math.min(85, Number(cacheHitPct) || 0)) / 100;
  const p = Math.max(2, Math.min(TOTAL_GPUS - 2, Math.round(Number(pNodes) || 8)));

  const effIsl = Math.max(256, safeIsl * (1 - hit));
  const prefillPerGpuReqS = 18000 / effIsl;
  // Decode throughput depends on BOTH OSL (number of steps) AND average KV length (ISL + OSL/2) read per step
  const avgCtx = safeIsl + safeOsl * 0.5;
  const kvReadScale = 1 + avgCtx / 8192;
  const decodePerGpuReqS = 2400 / (safeOsl * kvReadScale);
  // Cross-pool RDMA cap derived directly from 80 GB/s effective trunk / (ISL * 0.16 MB/tok)
  const rdmaCapReqS = (CROSS_POOL_RDMA_GBPS * 1000) / (safeIsl * KV_MB_PER_TOK);

  const evalPoint = (pCount) => {
    const dCount = TOTAL_GPUS - pCount;
    const pCap = pCount * prefillPerGpuReqS;
    const dCap = dCount * decodePerGpuReqS;
    const goodput = Math.min(pCap, dCap, rdmaCapReqS);
    const bottleneck = goodput === rdmaCapReqS
      ? 'rdma'
      : pCap <= dCap
        ? 'prefill'
        : 'decode';
    return {
      pNodes: pCount,
      dNodes: dCount,
      pCap: Number(pCap.toFixed(1)),
      dCap: Number(dCap.toFixed(1)),
      rdmaCap: Number(rdmaCapReqS.toFixed(1)),
      goodput: Number(goodput.toFixed(1)),
      bottleneck,
    };
  };

  const curve = [];
  for (let i = 2; i <= TOTAL_GPUS - 2; i += 1) {
    curve.push(evalPoint(i));
  }
  const current = curve.find((pt) => pt.pNodes === p) || curve[0];
  const optimal = curve.reduce((best, pt) => (pt.goodput > best.goodput ? pt : best), curve[0]);
  const maxGoodput = Math.max(1, optimal.goodput);
  const efficiencyPct = Math.round((current.goodput / maxGoodput) * 100);

  return {
    isl: safeIsl,
    effIsl: Math.round(effIsl),
    osl: safeOsl,
    cacheHitPct: Math.round(hit * 100),
    current,
    optimal,
    curve,
    maxGoodput,
    efficiencyPct,
  };
}
