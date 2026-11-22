// Pure teaching model for Mooncake as the shared L3 KV tier.
// One page = 64 tokens; one token = 320 KiB of BF16 KV for the 70B-class
// reference model (80 layers x 8 KV heads x 128 dim x 2 x 2 B = 327,680 B),
// which reproduces the documented "40 GB for a 128k-token LLaMA3-70B context".

export const PAGE_TOKENS = 64;
export const KV_BYTES_PER_TOKEN = 327680;
export const PAGE_BYTES = PAGE_TOKENS * KV_BYTES_PER_TOKEN; // 20,971,520 B = 20 MiB
export const INSTANCES = 3;
export const CLIENTS = 6;
export const ROUNDS = 8;
export const L2_PAGES = 12;
export const POOL_MIN = 24;
export const POOL_MAX = 192;
export const POOL_DEFAULT = 114; // 3.17 x the 36 host pages, matching 760 GB : 240 GB
export const POOL_SEGMENTS = 3;
export const MOVE_CLIENT = 0;
export const MOVE_ROUND = 5;
// The deployment default is 256 tokens; the trace lowers it to one page so that
// single-page reuse stays visible at this scale. Section 3 keeps the real default.
export const PREFETCH_THRESHOLD_PAGES = 1;
export const DEFAULT_PREFETCH_TOKENS = 256;
export const LEASE_SECONDS = 10;

// Analytical readout, not a measured TTFT: no queueing, no batching, serial
// prefetch then load, one metadata query per request.
export const READOUT = {prefillRate: 11000, hostGBps: 50, fabricGBps: 190, lookupMs: 0.8};

export const MEDIA = [
  {id: 'rdma', gbps: 190},
  {id: 'tcp', gbps: 12.5},
  {id: 'ssd', gbps: 7},
  {id: 'slow', gbps: 1.25},
];

export const KV_PROFILES = [
  {id: 'dense_bf16', bytes: KV_BYTES_PER_TOKEN},
  {id: 'dense_fp8', bytes: KV_BYTES_PER_TOKEN / 2},
  {id: 'mla', bytes: 70 * 1024},
  {id: 'ced_csa2', bytes: 890},
];

export const CONCURRENCY_LEVELS = [1, 4, 8];

export const SERIES_TOKENS = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];

export const pageSegments = pages => {
  const base = Math.floor(pages / POOL_SEGMENTS);
  const extra = pages % POOL_SEGMENTS;
  return Array.from({length: POOL_SEGMENTS}, (_, index) => base + (index < extra ? 1 : 0));
};

export function buildTrace({clients = CLIENTS, rounds = ROUNDS} = {}) {
  const requests = [];
  for (let round = 1; round <= rounds; round += 1) {
    for (let client = 0; client < clients; client += 1) {
      const pages = ['S0'];
      for (let k = 1; k <= round; k += 1) pages.push(`C${client}R${k}`);
      const moved = client === MOVE_CLIENT && round >= MOVE_ROUND;
      const instance = moved ? (client + 1) % INSTANCES : client % INSTANCES;
      requests.push({index: requests.length, round, client, pages, instance, moved});
    }
  }
  return requests;
}

const requestTiming = (poolHits, l2Hits, computed, seconds = READOUT) => {
  const lookup = poolHits > 0 ? seconds.lookupMs : 0;
  const fabric = (poolHits * PAGE_BYTES) / 1e9 / seconds.fabricGBps * 1000;
  const load = ((poolHits + l2Hits) * PAGE_BYTES) / 1e9 / seconds.hostGBps * 1000;
  const compute = (computed * PAGE_TOKENS) / seconds.prefillRate * 1000;
  return {lookup, fabric, load, compute, total: lookup + fabric + load + compute};
};

export function simulateTrace(mode = 'cluster', poolPages = POOL_DEFAULT, seconds = READOUT, hotReplicas = 1) {
  const trace = buildTrace();
  const capacity = pageSegments(poolPages);
  const l2 = Array.from({length: INSTANCES}, () => Array(L2_PAGES).fill(null));
  const l2Order = Array.from({length: INSTANCES}, () => []);
  const segments = capacity.map(size => Array(size).fill(null));
  const segmentOrder = capacity.map(() => []);

  const touch = (slots, order, id) => {
    const at = order.indexOf(id);
    if (at >= 0) order.splice(at, 1);
    order.push(id);
  };
  const evictFrom = (slots, order, pinned) => {
    const victim = order.find(id => !pinned.has(id));
    if (victim === undefined) return false;
    slots[slots.indexOf(victim)] = null;
    order.splice(order.indexOf(victim), 1);
    return true;
  };
  const putLocal = (instance, id, pinned) => {
    const slots = l2[instance], order = l2Order[instance];
    if (slots.includes(id)) { touch(slots, order, id); return true; }
    if (!slots.includes(null) && !evictFrom(slots, order, pinned)) return false;
    slots[slots.indexOf(null)] = id;
    touch(slots, order, id);
    return true;
  };
  const findPool = id => {
    for (let index = 0; index < segments.length; index += 1) {
      if (segments[index].includes(id)) {
        touch(segments[index], segmentOrder[index], id);
        return index;
      }
    }
    return -1;
  };
  const putPool = (id, segment, pinned) => {
    const found = findPool(id);
    if (found >= 0) { touch(segments[found], segmentOrder[found], id); return false; }
    const target = segment;
    if (segments[target].includes(null) || evictFrom(segments[target], segmentOrder[target], pinned)) {
      segments[target][segments[target].indexOf(null)] = id;
      touch(segments[target], segmentOrder[target], id);
      return true;
    }
    for (let index = 1; index < segments.length; index += 1) {
      const alt = (target + index) % segments.length;
      if (segments[alt].includes(null) || evictFrom(segments[alt], segmentOrder[alt], pinned)) {
        segments[alt][segments[alt].indexOf(null)] = id;
        touch(segments[alt], segmentOrder[alt], id);
        return true;
      }
    }
    return false;
  };

  const totals = {requests: 0, reusedTokens: 0, computedTokens: 0, l2Hits: 0, poolHits: 0, misses: 0, poolReadBytes: 0, newObjectBytes: 0, writeBytes: 0, savedMs: 0, timeMs: 0, baselineMs: 0};
  const roundStats = Array.from({length: ROUNDS}, (_, index) => ({round: index + 1, requests: 0, reused: 0, computed: 0, time: 0, baseline: 0}));
  const snapshots = [{step: 0, request: null, decisions: [], l2: l2.map(row => [...row]), segments: segments.map(row => [...row]), totals: {...totals}, roundStats: roundStats.map(row => ({...row})), timing: {lookup: 0, fabric: 0, load: 0, compute: 0, total: 0}, basis: {localPages: 0, poolPages: 0, computedPages: 0, newPages: 0}}];

  for (const request of trace) {
    const pinned = new Set(request.pages);
    const decisions = [];
    let missed = false;
    let poolPagesHit = 0;
    let localPagesHit = 0;
    let computedPages = 0;
    for (const id of request.pages) {
      let source = 'miss';
      if (!missed) {
        if (l2[request.instance].includes(id)) source = 'l2';
        else if (mode === 'cluster' && findPool(id) >= 0) source = 'pool';
        else missed = true;
      }
      decisions.push({id, source});
      if (source === 'l2') { localPagesHit += 1; touch(l2[request.instance], l2Order[request.instance], id); }
      else if (source === 'pool') { poolPagesHit += 1; putLocal(request.instance, id, pinned); }
      else computedPages += 1;
    }
    if (poolPagesHit > 0 && poolPagesHit < PREFETCH_THRESHOLD_PAGES) {
      // Policy guard kept explicit even though the teaching threshold is one page.
      decisions.forEach(entry => { if (entry.source === 'pool') entry.source = 'miss'; });
      poolPagesHit = 0;
      computedPages = request.pages.length - localPagesHit;
    }

    let newPages = 0;
    for (const id of request.pages) {
      putLocal(request.instance, id, pinned);
      if (mode === 'cluster' && findPool(id) < 0) {
        if (putPool(id, request.instance, pinned)) newPages += 1;
      }
      if (mode === 'cluster' && hotReplicas >= 2 && id === 'S0') {
        const replicaSeg = 1;
        if (!segments[replicaSeg].includes(id) && (segments[replicaSeg].includes(null) || evictFrom(segments[replicaSeg], segmentOrder[replicaSeg], pinned))) {
          segments[replicaSeg][segments[replicaSeg].indexOf(null)] = id;
          touch(segments[replicaSeg], segmentOrder[replicaSeg], id);
        }
      }
    }

    const timing = requestTiming(poolPagesHit, localPagesHit, computedPages, seconds);
    totals.requests += 1;
    totals.reusedTokens += (poolPagesHit + localPagesHit) * PAGE_TOKENS;
    totals.computedTokens += computedPages * PAGE_TOKENS;
    totals.l2Hits += localPagesHit;
    totals.poolHits += poolPagesHit;
    totals.misses += computedPages;
    totals.poolReadBytes += poolPagesHit * PAGE_BYTES;
    totals.newObjectBytes += newPages * PAGE_BYTES;
    totals.writeBytes += (computedPages + poolPagesHit) * PAGE_BYTES;
    const baselineMs = (request.pages.length * PAGE_TOKENS) / seconds.prefillRate * 1000;
    totals.timeMs += timing.total;
    totals.baselineMs += baselineMs;
    totals.savedMs += baselineMs - timing.total;

    const round = roundStats[request.round - 1];
    round.requests += 1;
    round.reused += (poolPagesHit + localPagesHit) * PAGE_TOKENS;
    round.computed += computedPages * PAGE_TOKENS;
    round.time += timing.total;
    round.baseline += baselineMs;

    snapshots.push({
      step: request.index + 1,
      request,
      decisions,
      l2: l2.map(row => [...row]),
      segments: segments.map(row => [...row]),
      totals: {...totals},
      roundStats: roundStats.map(row => ({...row})),
      timing,
      basis: {localPages: localPagesHit, poolPages: poolPagesHit, computedPages, newPages},
    });
  }

  const curves = roundStats.map(row => ({
    round: row.round,
    hitRate: row.reused + row.computed ? row.reused / (row.reused + row.computed) : 0,
    reused: row.reused,
    computed: row.computed,
  }));

  return {mode, poolPages, capacity, snapshots, trace, curves, totals, roundStats};
}

export function localPrefix(snapshot) {
  const pages = [];
  for (const entry of snapshot.decisions) {
    if (entry.source === 'miss') break;
    pages.push(entry);
  }
  return pages;
}

export function deriveMooncakeState({mode = 'cluster', poolPages = POOL_DEFAULT, step = 0, hotReplicas = 1} = {}) {
  const safeReplicas = hotReplicas === 2 ? 2 : 1;
  const clusters = {instance: simulateTrace('instance', poolPages, READOUT, 1), cluster: simulateTrace('cluster', poolPages, READOUT, safeReplicas)};
  const active = clusters[mode] || clusters.cluster;
  const limit = active.snapshots.length - 1;
  const safeMode = clusters[mode] ? mode : 'cluster';
  const at = Math.max(0, Math.min(limit, Number.isFinite(step) ? Math.floor(step) : 0));
  const snapshot = active.snapshots[at];
  const previousRound = snapshot.request ? snapshot.request.round : 0;
  const rounds = snapshot.roundStats.map(row => ({...row, hitRate: row.reused + row.computed ? row.reused / (row.reused + row.computed) : 0}));
  const currentRound = rounds[previousRound - 1] || null;
  return {
    mode: safeMode,
    poolPages: active.poolPages,
    hotReplicas: safeReplicas,
    peakHotFanout: safeMode === 'cluster' ? (safeReplicas === 2 ? 1.5 : 3) : 0,
    step: at,
    limit,
    phase: at === 0 ? 'idle' : at === limit ? 'done' : 'running',
    done: at === limit,
    snapshot,
    rounds,
    curves: {instance: clusters.instance.curves, cluster: clusters.cluster.curves},
    otherTotals: clusters[safeMode === 'cluster' ? 'instance' : 'cluster'].totals,
    totals: snapshot.totals,
    l3GainMs: clusters.instance.snapshots[at].totals.timeMs - snapshot.totals.timeMs,
    instanceTotals: clusters.instance.totals,
    clusterTotals: clusters.cluster.totals,
    currentRound,
    round: previousRound,
    capacity: active.capacity,
    traceLength: active.trace.length,
    nextRequest: active.trace[at] || null,
  };
}

// Reference hit: client 0 is load-balanced onto instance 1 at round 5, so its
// prefix sits in the pool on node 0 and has to be read from another machine.
export function deriveHitScenario(poolPages = POOL_DEFAULT) {
  const run = simulateTrace('cluster', poolPages);
  const snapshot = run.snapshots.find(entry => entry.request?.moved) || run.snapshots.at(-1);
  const request = snapshot.request;
  const local = snapshot.decisions.filter(entry => entry.source === 'l2');
  const remote = snapshot.decisions.filter(entry => entry.source === 'pool');
  const computed = snapshot.decisions.filter(entry => entry.source === 'miss');
  const segmentOf = id => snapshot.segments.findIndex(row => row.includes(id));
  const objects = remote.map(entry => ({id: entry.id, segment: segmentOf(entry.id), bytes: PAGE_BYTES}));
  const segment = objects[0]?.segment ?? 0;
  const writeSegment = computed[0] ? Math.max(0, segmentOf(computed[0].id)) : request.instance;
  const segmentAll = (snapshot.segments[segment] || []).filter(Boolean);
  const l2Slots = [...snapshot.l2[request.instance]];
  const prefetchMs = (objects.length * PAGE_BYTES) / 1e9 / READOUT.fabricGBps * 1000;
  const loadMs = ((local.length + remote.length) * PAGE_BYTES) / 1e9 / READOUT.hostGBps * 1000;
  const computeMs = (computed.length * PAGE_TOKENS) / READOUT.prefillRate * 1000;
  const lookupMs = objects.length ? READOUT.lookupMs : 0;
  const totalMs = lookupMs + prefetchMs + loadMs + computeMs;
  const baselineMs = (request.pages.length * PAGE_TOKENS) / READOUT.prefillRate * 1000;
  // Keep the local L2 hit and remove only L3: the four remote pages become recompute work.
  const withoutL3Ms = (local.length * PAGE_BYTES) / 1e9 / READOUT.hostGBps * 1000
    + (request.pages.length - local.length) * PAGE_TOKENS / READOUT.prefillRate * 1000;
  return {
    request,
    objects,
    segment,
    writeSegment,
    nicLinks: 8,
    segmentAll,
    segmentMore: Math.max(0, segmentAll.length - objects.length),
    l2Slots,
    local,
    remote,
    computed,
    bytes: {prefetch: objects.length * PAGE_BYTES, load: (local.length + remote.length) * PAGE_BYTES, write: computed.length * PAGE_BYTES},
    tokens: {reused: (local.length + remote.length) * PAGE_TOKENS, computed: computed.length * PAGE_TOKENS, total: request.pages.length * PAGE_TOKENS},
    ms: {lookup: lookupMs, prefetch: prefetchMs, load: loadMs, compute: computeMs, total: totalMs, baseline: baselineMs, withoutL3: withoutL3Ms, l3Saved: withoutL3Ms - totalMs},
    ratio: totalMs > 0 ? baselineMs / totalMs : 0,
    ratioL3: totalMs > 0 ? withoutL3Ms / totalMs : 0,
  };
}

// Architecture-level counterfactuals on the same Round-5 cross-node request
// (1 local page S0 + 4 remote pages C0R1..C0R4 + 1 new page C0R5).
export function deriveTopologyComparison(poolPages = POOL_DEFAULT) {
  const hit = deriveHitScenario(poolPages);
  const remoteBytes = hit.bytes.prefetch;
  const slowGBps = MEDIA.find(item => item.id === 'slow').gbps;
  const proxyTransferMs = (remoteBytes / 1e9 / slowGBps) * 1000;
  const proxyTotalMs = hit.ms.lookup + proxyTransferMs + hit.ms.load + hit.ms.compute;
  const localLoadMs = (hit.local.length * PAGE_BYTES) / 1e9 / READOUT.hostGBps * 1000;
  const localComputeMs = (hit.request.pages.length - hit.local.length) * PAGE_TOKENS / READOUT.prefillRate * 1000;
  return {
    mooncake: {
      id: 'mooncake',
      masterBytes: 0,
      transferBytes: remoteBytes,
      transferMs: hit.ms.prefetch,
      computePages: hit.computed.length,
      computeMs: hit.ms.compute,
      loadMs: hit.ms.load,
      lookupMs: hit.ms.lookup,
      totalMs: hit.ms.total,
      cpuCopies: 0,
      bottleneck: null,
    },
    local: {
      id: 'local',
      masterBytes: 0,
      transferBytes: 0,
      transferMs: 0,
      computePages: hit.request.pages.length - hit.local.length,
      computeMs: localComputeMs,
      loadMs: localLoadMs,
      lookupMs: 0,
      totalMs: hit.ms.withoutL3,
      cpuCopies: 0,
      bottleneck: 'compute',
    },
    proxy: {
      id: 'proxy',
      masterBytes: remoteBytes,
      transferBytes: remoteBytes,
      transferMs: proxyTransferMs,
      computePages: hit.computed.length,
      computeMs: hit.ms.compute,
      loadMs: hit.ms.load,
      lookupMs: hit.ms.lookup,
      totalMs: proxyTotalMs,
      cpuCopies: 2,
      bottleneck: 'proxy',
    },
  };
}

export function deriveEconomics({medium = 'rdma', hitTokens = 2048, prefillRate = READOUT.prefillRate, kvProfile = 'dense_bf16', concurrency = 1} = {}) {
  const entry = MEDIA.find(item => item.id === medium) || MEDIA[0];
  const profile = KV_PROFILES.find(item => item.id === kvProfile) || KV_PROFILES[0];
  const safeConc = CONCURRENCY_LEVELS.includes(concurrency) ? concurrency : 1;
  const kvBytes = profile.bytes;
  const bandwidth = entry.gbps / safeConc;
  const computeUs = 1e6 / prefillRate;
  const fetchUs = (kvBytes / 1e9) * (1 / bandwidth + 1 / READOUT.hostGBps) * 1e6;
  const computeMs = hitTokens / prefillRate * 1000;
  const transferMs = fetchUs * hitTokens / 1000;
  const fetchMs = READOUT.lookupMs + transferMs;
  const savingMs = computeMs - fetchMs;
  const ratio = fetchMs > 0 ? computeMs / fetchMs : 0;
  const margin = computeUs - fetchUs;
  const breakEvenTokens = margin > 0 ? (READOUT.lookupMs * 1000) / margin : Infinity;
  const hostOnlyUs = (kvBytes / 1e9 / READOUT.hostGBps) * 1e6;
  const bandwidthFloor = computeUs > hostOnlyUs
    ? 1 / ((computeUs * 1e-6) / (kvBytes / 1e9) - 1 / READOUT.hostGBps)
    : Infinity;
  const verdict = hitTokens < DEFAULT_PREFETCH_TOKENS
    ? 'skipped'
    : (fetchUs >= computeUs || savingMs <= 0)
      ? 'loss'
      : ratio < 1.25
        ? 'marginal'
        : 'gain';
  const lossCause = verdict === 'loss' ? (fetchUs >= computeUs ? 'bandwidth' : 'lookup') : null;
  // Per-token view: the lookup is amortized over the hit while the transfer stays flat.
  const series = SERIES_TOKENS.map(tokens => ({tokens, compute: computeUs, fetch: (READOUT.lookupMs * 1000) / tokens + fetchUs}));
  const maxUs = Math.max(...series.map(point => Math.max(point.compute, point.fetch)));
  return {
    medium,
    kvProfile: profile.id,
    kvBytes,
    concurrency: safeConc,
    rawBandwidth: entry.gbps,
    bandwidth,
    hitTokens,
    prefillRate,
    computeMs,
    fetchMs,
    transferMs,
    savingMs,
    ratio,
    computeUs,
    fetchUs,
    breakEvenTokens,
    bandwidthFloor,
    verdict,
    lossCause,
    belowDefaultThreshold: hitTokens < DEFAULT_PREFETCH_TOKENS,
    series,
    maxUs,
  };
}
