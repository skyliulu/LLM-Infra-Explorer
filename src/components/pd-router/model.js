export const PD_MODES = ['collocated', 'chunked', 'disaggregated'];
export const PD_LINKS = ['rdma', 'eth10g'];
export const ROUTER_POLICIES = ['load_only', 'cache_only', 'cache_aware'];
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
  const routerPolicy = ROUTER_POLICIES.includes(input.routerPolicy) ? input.routerPolicy : 'cache_aware';
  const isl = Math.max(512, Math.min(16384, Math.round(Number(input.isl) || 4096)));
  const osl = Math.max(64, Math.min(8192, Math.round(Number(input.osl) || 512)));
  const cacheHitPct = Math.max(0, Math.min(85, Math.round(Number(input.cacheHitPct ?? 40))));
  const pNodes = Math.max(2, Math.min(TOTAL_GPUS - 2, Math.round(Number(input.pNodes) || 8)));
  return { pdMode, link, routerPolicy, isl, osl, cacheHitPct, pNodes };
}

// §1 Prefill-Decode interference & transfer boundary
// Concrete scenario: 3 active Decode users + 1 bursty 8K Prefill (~1.28 GB KV cache)
// SLO targets: TTFT <= 500 ms, P99 TPOT <= 30 ms
export function deriveInterferenceModel({ pdMode = 'disaggregated', link = 'rdma' } = {}) {
  const safeMode = PD_MODES.includes(pdMode) ? pdMode : 'disaggregated';
  const safeLink = PD_LINKS.includes(link) ? link : 'rdma';
  const ttftSloMs = 500;
  const tpotSloMs = 30;
  const kvSizeGB = 1.28; // 8K prompt KV for 70B-class GQA model

  const transferMs = safeMode === 'disaggregated'
    ? (safeLink === 'rdma' ? 18 : Math.round((kvSizeGB / 1.25) * 1000)) // 18ms pipelined RDMA vs ~1024ms over 10GbE
    : 0;

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
      ttftMs: 530,
      p99TpotMs: 112,
      transferMs: 0,
      pLane: [
        { id: 'ch0', label: 'P1', kind: 'prefill', pct: 18 },
        { id: 'ch1', label: 'D', kind: 'decode', pct: 7 },
        { id: 'ch2', label: 'P2', kind: 'prefill', pct: 18 },
        { id: 'ch3', label: 'D', kind: 'decode', pct: 7 },
        { id: 'ch4', label: 'P3', kind: 'prefill', pct: 18 },
        { id: 'ch5', label: 'D', kind: 'decode', pct: 7 },
        { id: 'ch6', label: 'P4', kind: 'prefill', pct: 18 },
        { id: 'ch7', label: 'D', kind: 'decode', pct: 7 },
      ],
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
    ttftSloMs,
    tpotSloMs,
    ...active,
    ttftPass,
    tpotPass,
    sloPass: ttftPass && tpotPass,
  };
}

// §2 Cluster Cache-Aware Router Trilemma
// 4 workers: W0 (warm SysA, base load 1), W1 (warm SysB, base load 1), W2 (cold, base load 0), W3 (cold, base load 0)
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

  const threshold = 3; // spill hot prefix when candidate worker load >= 3
  const events = [];
  let hits = 0;

  for (let i = 0; i < s; i += 1) {
    const req = ROUTER_REQUESTS[i];
    let target;
    let reason = 'least_load';
    const warmCandidates = workers.filter((w) => w.warm.includes(req.prefix));

    if (policy === 'load_only') {
      // Strictly lowest active load (tie-break by highest free KV -> W2, W3 first)
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
      // cache_aware: use warm worker below threshold, else spill to lowest-load worker and warm it
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
  // Stylized P99 TTFT: hit saves prefill (~110 ms), miss recomputes (~340 ms), queue > 3 adds severe queueing penalty
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

// §3 Dynamic P:D Ratio & Cluster Goodput Q_SLO
export function derivePdRatioModel({ isl = 4096, osl = 512, cacheHitPct = 40, pNodes = 8 } = {}) {
  const safeIsl = Math.max(512, Math.min(16384, Number(isl) || 4096));
  const safeOsl = Math.max(64, Math.min(8192, Number(osl) || 512));
  const hit = Math.max(0, Math.min(85, Number(cacheHitPct) || 0)) / 100;
  const p = Math.max(2, Math.min(TOTAL_GPUS - 2, Math.round(Number(pNodes) || 8)));

  // Anchored 70B-class FP8 per-GPU throughput rates under SLO:
  // Prefill GPU: ~18,000 effective input tok/s under TTFT SLO
  // Decode GPU: ~1,900 output tok/s aggregate across concurrent batch under TPOT <= 30ms SLO
  // RDMA fabric cap across cluster: ~48 req/s equivalent for 4K KV
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
