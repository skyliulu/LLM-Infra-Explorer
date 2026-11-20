import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  deriveTopologyComparison,
  pageSegments,
  simulateTrace,
} from '../src/components/mooncake/model.js';
import {ALL_NODES, CODE, STEPS, TOPOLOGIES, stepAt} from '../src/components/mooncake/stack.js';
import {i18n} from '../src/components/mooncake/content.js';

// --- Stack architecture & topology counterfactual invariants ---------------
assert.equal(STEPS.length, 7);
for (let s = 1; s <= STEPS.length; s += 1) {
  const st = stepAt(s);
  assert.ok(ALL_NODES.includes(st.node), `step ${s} node ${st.node} exists`);
  assert.ok(st.lines.length >= 1, `step ${s} highlights at least one code line`);
  for (const line of st.lines) {
    assert.ok(line >= 1 && line <= CODE.length, `step ${s} line ${line} is in bounds`);
    assert.ok(CODE[line - 1].trim().length > 0, `step ${s} line ${line} is not blank`);
  }
}
const decodeStep = stepAt(7);
assert.equal(decodeStep.active.id, 'decode');
assert.deepEqual(decodeStep.lines, [11]);
assert.ok(CODE[10].includes('decode()'));
const coveredLines = new Set(STEPS.flatMap(s => s.lines));
CODE.forEach((line, idx) => {
  if (line.trim()) assert.ok(coveredLines.has(idx + 1), `CODE line ${idx + 1} is covered`);
});
const topo = deriveTopologyComparison();
assert.deepEqual(Object.keys(topo), TOPOLOGIES);
assert.equal(topo.mooncake.masterBytes, 0);
assert.equal(topo.proxy.masterBytes, 4 * PAGE_BYTES);
assert.ok(topo.mooncake.totalMs < topo.local.totalMs, 'Mooncake beats local-only recompute');
assert.ok(topo.proxy.totalMs > topo.local.totalMs, '10GbE central proxy is slower than recomputing');

// --- i18n parity and zero duplicate keys -----------------------------------
const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'zh and en i18n keys must match exactly');
const rawContent = fs.readFileSync('src/components/mooncake/content.js', 'utf8');
for (const [label, slice] of [
  ['zh', rawContent.slice(rawContent.indexOf('zh: {'), rawContent.indexOf('  en: {'))],
  ['en', rawContent.slice(rawContent.indexOf('  en: {'))],
]) {
  const seen = new Set();
  for (const m of slice.matchAll(/^\s+([a-zA-Z0-9_]+):/gm)) {
    assert.ok(!seen.has(m[1]), `duplicate i18n key ${m[1]} in ${label}`);
    seen.add(m[1]);
  }
}
const jsxSources = [
  'src/components/MooncakeL3.jsx',
  'src/components/mooncake/ServingArchitecture.jsx',
  'src/components/mooncake/TierCanvas.jsx',
  'src/components/mooncake/HitPath.jsx',
  'src/components/mooncake/Economics.jsx',
].map(file => fs.readFileSync(file, 'utf8')).join('\n');
for (const m of jsxSources.matchAll(/t\('([a-zA-Z0-9_]+)'\)/g)) {
  assert.ok(m[1] in i18n.zh, `missing i18n key ${m[1]} in zh`);
  assert.ok(m[1] in i18n.en, `missing i18n key ${m[1]} in en`);
}

// --- Sizes anchor on the documented 40 GB / 128k-token LLaMA3-70B figure ---
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

// Regression: simulateTrace respects custom seconds.prefillRate for baselineMs too.
const fasterGpu = simulateTrace('cluster', POOL_DEFAULT, {...READOUT, prefillRate: 22000});
assert.ok(Math.abs(fasterGpu.totals.baselineMs - cluster.totals.baselineMs / 2) < 1e-6);

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
assert.equal(hit.writeSegment, 1, 'new page is published into node 1 segment');
assert.equal(hit.nicLinks, 8, '190 GB/s benchmark uses 8×400GbE links');
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
const ssdLookupLoss = deriveEconomics({medium: 'ssd', hitTokens: 256, prefillRate: 18000});
const tcpFast = deriveEconomics({medium: 'tcp', hitTokens: 512, prefillRate: 24000});
assert.ok(rdma.fetchUs < rdma.computeUs);
assert.ok(rdma.breakEvenTokens > 0 && rdma.breakEvenTokens < PAGE_TOKENS, 'break-even sits below one page on RDMA');
assert.ok(rdma.bandwidthFloor > 3 && rdma.bandwidthFloor < 5, 'bandwidth floor near 3.9 GB/s at 11k tokens/s');
assert.equal(rdma.verdict, 'gain');
assert.equal(slow.verdict, 'loss', '10GbE cannot beat recomputation');
assert.equal(slow.lossCause, 'bandwidth');
assert.equal(slow.breakEvenTokens, Infinity);
assert.equal(ssd.verdict, 'gain');
assert.equal(ssdFast.verdict, 'loss', 'SSD flips once the GPU is fast enough');
assert.equal(ssdFast.lossCause, 'bandwidth');
// Regression: savingMs < 0 due to unamortized lookup must be verdict 'loss' with lossCause 'lookup'.
assert.ok(ssdLookupLoss.savingMs < 0);
assert.equal(ssdLookupLoss.verdict, 'loss');
assert.equal(ssdLookupLoss.lossCause, 'lookup');
assert.equal(tcpFast.verdict, 'marginal');
assert.ok(ssdFast.bandwidthFloor > 7 && ssd.bandwidthFloor < 7, 'floor crosses the SSD bandwidth between the two rates');
assert.ok(slow.fetchMs > rdma.fetchMs && ssd.fetchMs > rdma.fetchMs, 'slower media cost more');
assert.ok(Math.abs(rdma.computeMs - 2048 / 11000 * 1000) < 1e-9);
assert.ok(Math.abs(rdma.savingMs + rdma.fetchMs - rdma.computeMs) < 1e-9);
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

// --- L3 gain is measured against the same trace without L3 -----------------
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

console.log('Mooncake checks pass: stack steps/lines, i18n parity, 48-request trace, capacity invariants, cross-instance shared page, hit path, policy gate, lookup-loss & bandwidth-floor boundaries.');
