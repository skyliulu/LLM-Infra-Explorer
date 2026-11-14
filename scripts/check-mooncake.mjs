import assert from 'node:assert/strict';
import {
  INSTANCES,
  KV_BYTES_PER_TOKEN,
  L2_PAGES,
  MOVE_CLIENT,
  MOVE_ROUND,
  PAGE_BYTES,
  PAGE_TOKENS,
  POOL_DEFAULT,
  POOL_MIN,
  READOUT,
  buildTrace,
  deriveEconomics,
  deriveHitScenario,
  deriveMooncakeState,
  pageSegments,
  simulateTrace,
} from '../src/components/mooncake/model.js';
import {CHUNK_MS, CHUNK_TOKENS, PREFILL_NODES, SLO_MS, deriveArchitectureState} from '../src/components/mooncake/serving.js';

// --- Sizes anchor on the documented 40 GB / 128k-token LLaMA3-70B figure -----
assert.equal(PAGE_BYTES, 20 * 2 ** 20, 'one 64-token page is 20 MiB');
assert.equal(KV_BYTES_PER_TOKEN * 131072, 40 * 2 ** 30, '320 KiB/token reproduces 40 GiB per 128k tokens');
assert.deepEqual(pageSegments(POOL_DEFAULT).reduce((a, b) => a + b, 0), POOL_DEFAULT);
assert.equal(pageSegments(POOL_DEFAULT).length, INSTANCES);

// --- Trace shape ------------------------------------------------------------
const trace = buildTrace();
assert.equal(trace.length, 48);
assert.equal(new Set(trace.flatMap(request => request.pages)).size, 49);
for (const request of trace) {
  assert.equal(request.pages.length, request.round + 1, 'round r carries r history pages plus the new one');
  assert.equal(request.pages[0], 'S0');
  assert.equal(request.pages.at(-1), `C${request.client}R${request.round}`);
}
const moved = trace.filter(request => request.moved);
assert.equal(moved.length, 4, 'client 0 is rebalanced for the last four rounds');
assert.equal(moved[0].index, (MOVE_ROUND - 1) * 6 + MOVE_CLIENT);
assert.equal(moved[0].instance, 1, 'rebalanced off instance 0');

// --- Both cache scopes are complete runs ------------------------------------
const cluster = simulateTrace('cluster');
const instance = simulateTrace('instance');
assert.equal(cluster.snapshots.length, trace.length + 1);
assert.equal(instance.snapshots.length, trace.length + 1);
assert.equal(cluster.totals.baselineMs, instance.totals.baselineMs, 'the same work is requested in both scopes');
assert.ok(cluster.totals.reusedTokens > instance.totals.reusedTokens, 'the shared pool reuses more');
assert.ok(cluster.totals.computedTokens < instance.totals.computedTokens, 'the shared pool recomputes less');
assert.ok(cluster.totals.timeMs < instance.totals.timeMs, 'reuse lowers the accumulated prefill path');

// The cross-instance claim: the shared page is computed once for the cluster.
const computedShared = run => run.snapshots
  .flatMap(snapshot => snapshot.decisions)
  .filter(entry => entry.id === 'S0' && entry.source === 'miss').length;
assert.equal(computedShared(cluster), 1, 'S0 is computed once in cluster scope');
assert.equal(computedShared(instance), INSTANCES, 'S0 is computed once per instance without L3');

// Round 1 stays identical except for that shared page; the split appears after host capacity.
assert.ok(cluster.curves[0].hitRate > instance.curves[0].hitRate);
assert.equal(cluster.curves[2].hitRate, instance.curves[2].hitRate, 'round 3 still fits in host memory');
assert.ok(cluster.curves.at(-1).hitRate > instance.curves.at(-1).hitRate + 0.5, 'later rounds separate sharply');

// --- Capacity invariants ----------------------------------------------------
for (const snapshot of [...cluster.snapshots, ...instance.snapshots]) {
  snapshot.l2.forEach(row => assert.ok(row.filter(Boolean).length <= L2_PAGES));
  snapshot.segments.forEach(row => {
    assert.equal(row.length, Math.ceil(POOL_DEFAULT / INSTANCES), 'segment capacity follows the pool size');
    assert.ok(row.filter(Boolean).length <= row.length);
  });
  snapshot.decisions.forEach(entry => assert.ok(['l2', 'pool', 'miss'].includes(entry.source)));
  assert.ok(snapshot.decisions.filter(entry => entry.source !== 'miss').length <= snapshot.decisions.length);
}

// Shrinking the pool must cost hit rate, not silently succeed.
const tight = simulateTrace('cluster', POOL_MIN);
assert.ok(tight.totals.reusedTokens < cluster.totals.reusedTokens, 'a smaller pool reuses less');
assert.ok(tight.totals.computedTokens > cluster.totals.computedTokens, 'a smaller pool recomputes more');
assert.ok(tight.totals.poolReadBytes <= cluster.totals.poolReadBytes);

// --- Reference hit path -----------------------------------------------------
const hit = deriveHitScenario();
assert.equal(hit.local.length, 1, 'only the shared page is local');
assert.equal(hit.remote.length, 4, 'four prefix pages come from node 0');
assert.equal(hit.computed.length, 1, 'only the new page is computed');
assert.ok(hit.objects.every(object => object.segment === 0), 'the prefix objects live on the writing node');
assert.equal(hit.bytes.prefetch, 4 * PAGE_BYTES);
assert.equal(hit.bytes.load, 5 * PAGE_BYTES);
const expectedTotal = READOUT.lookupMs
  + (4 * PAGE_BYTES) / 1e9 / READOUT.fabricGBps * 1000
  + (5 * PAGE_BYTES) / 1e9 / READOUT.hostGBps * 1000
  + (1 * PAGE_TOKENS) / READOUT.prefillRate * 1000;
assert.ok(Math.abs(hit.ms.total - expectedTotal) < 1e-9, 'hit time composes lookup + prefetch + load + compute');
assert.ok(Math.abs(hit.ms.baseline - (6 * PAGE_TOKENS) / READOUT.prefillRate * 1000) < 1e-9);
assert.ok(hit.ms.l3Saved > 0 && hit.ratio > 3);
assert.ok(hit.ms.lookup === READOUT.lookupMs);
// L3-only baseline: keep the local L2 hit, recompute the four remote pages.
const expectedWithoutL3 = (1 * PAGE_BYTES) / 1e9 / READOUT.hostGBps * 1000
  + (6 - 1) * PAGE_TOKENS / READOUT.prefillRate * 1000;
assert.ok(Math.abs(hit.ms.withoutL3 - expectedWithoutL3) < 1e-9, 'L3 baseline keeps L2 and recomputes the remote pages');
assert.ok(Math.abs(hit.ms.l3Saved - (hit.ms.withoutL3 - hit.ms.total)) < 1e-9);
assert.ok(hit.ratioL3 > 3.1 && hit.ratioL3 < 3.3, 'L3 alone contributes about 3.2x on this request');
assert.ok(hit.ratioL3 < hit.ratio, 'the L3-only ratio is smaller than the full-recompute ratio');

// --- Economics --------------------------------------------------------------
const rdma = deriveEconomics({medium: 'rdma', hitTokens: 2048, prefillRate: 11000});
const slow = deriveEconomics({medium: 'slow', hitTokens: 2048, prefillRate: 11000});
const ssdFast = deriveEconomics({medium: 'ssd', hitTokens: 2048, prefillRate: 24000});
const ssd = deriveEconomics({medium: 'ssd', hitTokens: 2048, prefillRate: 11000});
const tcpFast = deriveEconomics({medium: 'tcp', hitTokens: 512, prefillRate: 24000});
assert.ok(rdma.fetchUs < rdma.computeUs);
assert.ok(rdma.breakEvenTokens > 0 && rdma.breakEvenTokens < PAGE_TOKENS, 'break-even sits below one page on RDMA');
assert.ok(rdma.bandwidthFloor > 3 && rdma.bandwidthFloor < 5, 'bandwidth floor near 3.9 GB/s at 11k tokens/s');
assert.equal(rdma.verdict, 'gain');
assert.equal(slow.verdict, 'loss', '10GbE cannot beat recomputation');
assert.equal(slow.breakEvenTokens, Infinity);
assert.equal(ssd.verdict, 'gain');
assert.equal(ssdFast.verdict, 'loss', 'SSD flips once the GPU is fast enough');
assert.equal(tcpFast.verdict, 'marginal');
assert.ok(ssdFast.bandwidthFloor > 7 && ssd.bandwidthFloor < 7, 'floor crosses the SSD bandwidth between the two rates');
assert.ok(slow.fetchMs > rdma.fetchMs && ssd.fetchMs > rdma.fetchMs, 'slower media cost more');
assert.ok(Math.abs(rdma.computeMs - 2048 / 11000 * 1000) < 1e-9);
assert.ok(rdma.savingMs + rdma.fetchMs - rdma.computeMs < 1e-9);
assert.ok(rdma.belowDefaultThreshold === false);
assert.ok(deriveEconomics({hitTokens: 128}).belowDefaultThreshold);

// --- State normalization ----------------------------------------------------
const clamped = deriveMooncakeState({mode: 'cluster', step: 999});
assert.equal(clamped.step, clamped.limit);
assert.equal(clamped.phase, 'done');
assert.equal(clamped.done, true);
assert.equal(clamped.nextRequest, null);
const invalid = deriveMooncakeState({mode: 'nope', step: -5});
assert.equal(invalid.mode, 'cluster');
assert.equal(invalid.step, 0);
assert.equal(invalid.phase, 'idle');
assert.ok(invalid.nextRequest);

// --- Per-token chart and policy gate ---------------------------------------
assert.ok(rdma.series.every(point => point.compute === rdma.computeUs), 'per-token compute is flat');
assert.ok(rdma.series[0].fetch > rdma.series.at(-1).fetch, 'lookup amortizes as the hit grows');
assert.ok(rdma.series[0].tokens === 8 && rdma.series.at(-1).tokens === 8192);
assert.ok(rdma.maxUs >= rdma.computeUs);
assert.ok(rdma.breakEvenTokens >= rdma.series[0].tokens, 'the crossing sits inside the plotted range');
assert.equal(deriveEconomics({hitTokens: 8}).verdict, 'skipped');
assert.equal(deriveEconomics({hitTokens: 128}).verdict, 'skipped');
assert.equal(deriveEconomics({hitTokens: 256}).verdict, 'gain');
assert.equal(deriveEconomics({hitTokens: 256}).belowDefaultThreshold, false);

// --- L3 gain is measured against the same trace without L3 -------------------
const state = deriveMooncakeState({mode: 'cluster', step: 48});
assert.equal(state.l3GainMs, state.instanceTotals.timeMs - state.clusterTotals.timeMs);
assert.ok(state.l3GainMs > 0);
const smallPool = deriveMooncakeState({mode: 'cluster', poolPages: POOL_MIN, step: 48});
assert.ok(smallPool.l3GainMs < state.l3GainMs, 'a small pool erodes the L3 advantage');

// --- The hit tour shows the real inventory, not only the four objects -------
assert.equal(hit.l2Slots.length, L2_PAGES);
assert.ok(hit.segmentAll.length >= hit.objects.length);
assert.equal(hit.segmentMore, hit.segmentAll.length - hit.objects.length);
assert.ok(hit.l2Slots.includes('S0'));

// --- Mooncake architecture: four difficulties --------------------------------
const prefill = deriveArchitectureState({challenge: 'prefill', policy: 'reuse', step: 7});
const transfer = deriveArchitectureState({challenge: 'transfer', policy: 'reuse', step: 7});
const longReuse = deriveArchitectureState({challenge: 'placement', policy: 'reuse', step: 7});
const longSlo = deriveArchitectureState({challenge: 'placement', policy: 'slo', step: 7});
const overload = deriveArchitectureState({challenge: 'overload', policy: 'reuse', step: 4});
assert.equal(prefill.chosen.id, 'A');
assert.ok(Math.abs(prefill.budget.singleNodeMs - (4096 / 11000) * 1000) < 1e-9, 'single-node prefill time');
assert.ok(Math.abs(prefill.budget.cppMs - prefill.chosen.stages * CHUNK_MS) < 1e-9, 'pipeline time uses stages');
assert.equal(prefill.budget.peakFullBytes, 16384 * KV_BYTES_PER_TOKEN);
assert.equal(prefill.budget.peakChunkBytes, 1024 * KV_BYTES_PER_TOKEN);
assert.ok(prefill.budget.savedByCpp > 180 && prefill.budget.savedByCpp < 190, 'CPP saves about half a single-node prefill');
assert.ok(transfer.budget.tcpLoadMs > 10 * transfer.budget.loadMs, 'TCP is far slower than RDMA');
assert.ok(transfer.budget.tcpStreamMs > 10 * transfer.budget.streamMs);
assert.equal(longReuse.chosen.id, 'A', 'reuse preference picks the longest prefix');
assert.equal(longSlo.chosen.id, 'B', 'TTFT preference avoids the hot queue');
assert.ok(longReuse.chosen.ttft > SLO_MS, 'the reuse choice misses the SLO on this case');
assert.ok(longSlo.chosen.ttft <= SLO_MS, 'the TTFT choice meets the SLO');
assert.equal(longReuse.reason, 'reuse');
assert.equal(longSlo.reason, 'slo');
assert.equal(overload.admitted, false, 'overload rejects early');
assert.equal(overload.reason, 'overload');
assert.equal(overload.limit, 4, 'overload stops before prefill');
assert.ok(overload.saved.prefillMs > 0, 'rejection saves prefill work');
assert.equal(prefill.limit, 7);
for (const state of [prefill, transfer, longReuse, longSlo, overload]) {
  for (const candidate of state.candidates) {
    assert.equal(candidate.chunks, Math.ceil(candidate.compute / CHUNK_TOKENS));
    assert.equal(candidate.stages, Math.ceil(candidate.chunks / PREFILL_NODES));
    assert.ok(candidate.hit + candidate.compute === state.prompt);
    assert.ok(candidate.ttft > candidate.prefillMs);
  }
}
const clampedServing = deriveArchitectureState({challenge: 'prefill', policy: 'reuse', step: 99});
assert.equal(clampedServing.step, clampedServing.limit);
assert.equal(clampedServing.phase, 'done');
assert.equal(deriveArchitectureState({challenge: 'nope', policy: 'nope'}).challenge, 'prefill');
console.log('Mooncake architecture and pool model: sizes, 48-request trace, capacity invariants, cross-instance shared page, hit path, serving placement, policy gate and break-even boundaries pass.');
