export const PD_MODES = ['collocated', 'chunked', 'disaggregated'];
export const PD_LINKS = ['rdma', 'eth10g'];
export const CHUNK_SIZES = [512, 1024, 2048, 4096];
export const KV_PIPE_MODES = ['bulk_blocking', 'layerwise_pipelined'];
export const KV_LAYOUT_MODES = ['symmetric', 'asymmetric'];
export const ROUTER_POLICIES = ['load_only', 'cache_only', 'cache_aware'];
export const OPS_FAIL_IDS = ['short_starvation', 'decode_jitter', 'kv_collapse', 'over_disagg', 'priority_inversion'];
export const STACK_LAYERS = ['gateway', 'router', 'runtime', 'cluster', 'obs'];
export const TOTAL_GPUS = 16;

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
  const failId = OPS_FAIL_IDS.includes(input.failId) ? input.failId : 'short_starvation';
  return { pdMode, link, chunkSize, kvPipe, kvLayout, routerPolicy, isl, osl, cacheHitPct, pNodes, failId };
}

// §2 Prefill-Decode interference, Chunked Prefill time budget & transfer boundary
export function deriveInterferenceModel({ pdMode = 'disaggregated', link = 'rdma', chunkSize = 2048 } = {}) {
  const safeMode = PD_MODES.includes(pdMode) ? pdMode : 'disaggregated';
  const safeLink = PD_LINKS.includes(link) ? link : 'rdma';
  const c = CHUNK_SIZES.includes(Number(chunkSize)) ? Number(chunkSize) : 2048;
  const ttftSloMs = 500;
  const tpotSloMs = 30;
  const kvSizeGB = 1.28;

  const transferMs = safeMode === 'disaggregated'
    ? (safeLink === 'rdma' ? 18 : Math.round((kvSizeGB / 1.25) * 1000))
    : 0;

  // Dynamic Chunked Prefill math for 8K prompt cut into chunks of size c:
  // Smaller c -> lower TPOT jitter (T_chunk(c) = 6 + c/22 ms), but more chunks -> slightly higher launch/KV contention -> longer TTFT
  const numChunks = Math.max(1, Math.round(8192 / c));
  const chunkTpotMs = Math.round(14 + (c / 2048) * 98); // c=512 -> 39ms, c=1024 -> 63ms, c=2048 -> 112ms, c=4096 -> 210ms
  const chunkTtftMs = Math.round(455 + numChunks * 18.5); // c=512 -> 751ms, c=2048 -> 529ms, c=4096 -> 492ms

  const chunkSegs = [];
  const visChunks = Math.min(4, numChunks);
  const pPct = Math.round(72 / visChunks);
  const dPct = Math.round(28 / visChunks);
  for (let i = 0; i < visChunks; i += 1) {
    chunkSegs.push({ id: `chp${i}`, label: `P${i + 1}`, kind: 'prefill', pct: pPct });
    chunkSegs.push({ id: `chd${i}`, label: 'D', kind: 'decode', pct: dPct });
  }

  const scenarios = {
    collocated: {
      ttftMs: 420,
      p99TpotMs: 420,
      transferMs: 0,
      pLane: [
        { id: 'c0', label: 'D1..D3', kind: 'decode', pct: 10 },
        { id: 'c1', label: '8K Prefill (blocks GPU 420 ms)', kind: 'prefill', pct: 65 },
        { id: 'c2', label: 'D1..D3 resume', kind: 'decode', pct: 25 },
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
      ttftMs: 360 + transferMs,
      p99TpotMs: 19,
      transferMs,
      pLane: [
        { id: 'dp0', label: '8K Prefill on P-Pool (360 ms)', kind: 'prefill', pct: safeLink === 'rdma' ? 60 : 28 },
        { id: 'dp1', label: 'Next Prefill', kind: 'idle', pct: safeLink === 'rdma' ? 40 : 72 },
      ],
      kvLane: safeLink === 'rdma'
        ? [
            { id: 'kv0', label: 'Layer-wise RDMA KV (18 ms exposed)', kind: 'rdma', pct: 46 },
            { id: 'kv1', label: 'Ready on D', kind: 'idle', pct: 54 },
          ]
        : [
            { id: 'kv0', label: '10GbE Bottleneck: 1.28 GB KV (1024 ms!)', kind: 'stall', pct: 94 },
            { id: 'kv1', label: '', kind: 'idle', pct: 6 },
          ],
      dLane: [
        { id: 'dd0', label: 'D1..D3 steady 19 ms/tok', kind: 'decode', pct: 62 },
        { id: 'dd1', label: 'D1..D4 (new req joins)', kind: 'decode', pct: 38 },
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
export function deriveKvTransferModel({ kvPipe = 'layerwise_pipelined', kvLayout = 'asymmetric' } = {}) {
  const isPipelined = kvPipe === 'layerwise_pipelined';
  const isAsym = kvLayout === 'asymmetric';
  const kvSizeGB = 1.28; // 8K prompt, 80 layers, 70B GQA
  const computeMs = 360;
  const rawTransferMs = isAsym ? 104 : 96; // small head-gather overhead when P:TP4 -> D:TP2
  const exposedTransferMs = isPipelined ? (isAsym ? 21 : 18) : rawTransferMs;
  const overlapPct = isPipelined ? Math.round(((rawTransferMs - exposedTransferMs) / rawTransferMs) * 100) : 0;
  const totalTtftMs = computeMs + exposedTransferMs;

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
    fanIn: isAsym ? '2P → 1D (Head Gather)' : '1P → 1D (Direct Copy)',
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
export function derivePdRatioModel({ isl = 4096, osl = 512, cacheHitPct = 40, pNodes = 8 } = {}) {
  const safeIsl = Math.max(512, Math.min(16384, Number(isl) || 4096));
  const safeOsl = Math.max(64, Math.min(8192, Number(osl) || 512));
  const hit = Math.max(0, Math.min(85, Number(cacheHitPct) || 0)) / 100;
  const p = Math.max(2, Math.min(TOTAL_GPUS - 2, Math.round(Number(pNodes) || 8)));

  const effIsl = Math.max(256, safeIsl * (1 - hit));
  const prefillPerGpuReqS = 18000 / effIsl;
  const decodePerGpuReqS = 1900 / safeOsl;
  const rdmaCapReqS = 220000 / safeIsl;

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

// §6 Failure mode -> primary stack layer mapping
export const FAIL_LAYER_MAP = {
  short_starvation: 'runtime',
  decode_jitter: 'runtime',
  kv_collapse: 'cluster',
  over_disagg: 'router',
  priority_inversion: 'gateway',
};
