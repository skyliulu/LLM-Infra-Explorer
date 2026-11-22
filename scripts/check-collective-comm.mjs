import assert from 'node:assert/strict';
import {
  deriveCollectiveStep,
  deriveInterconnectLatency,
  deriveOverlapModel,
  normalizeCollectiveConfig,
} from '../src/components/collective-comm/model.js';
import { i18n } from '../src/components/collective-comm/content.js';

const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'CollectiveComm zh/en i18n keys must match');

// Normalization
const norm = normalizeCollectiveConfig({ op: 'bad', msgMB: 999 });
assert.equal(norm.op, 'allreduce');
assert.equal(norm.msgMB, 16);

// §1 Ring All-Reduce = 6 hops, 2(P-1)/P = 1.5x; RS/AG = 3 hops, 0.75x
const arDone = deriveCollectiveStep({ op: 'allreduce', step: 6 });
assert.equal(arDone.maxStep, 6);
assert.equal(arDone.volumeFactor, 1.5);
assert.equal(arDone.phase, 'done');
assert.ok(arDone.gpus.every((g) => g.shards.every((s) => s.label.startsWith('Σ'))));

const rsDone = deriveCollectiveStep({ op: 'reducescatter', step: 3 });
assert.equal(rsDone.maxStep, 3);
assert.equal(rsDone.volumeFactor, 0.75);

const agDone = deriveCollectiveStep({ op: 'allgather', step: 3 });
assert.equal(agDone.maxStep, 3);
assert.ok(agDone.gpus.every((g) => g.shards.every((s) => s.state === 'ready' || s.state === 'inflight')));

// All-to-All hot expert skew
const a2aUniform = deriveCollectiveStep({ op: 'alltoall', routingSkew: 'uniform', step: 2 });
const a2aHot = deriveCollectiveStep({ op: 'alltoall', routingSkew: 'hot', step: 2 });
assert.equal(a2aUniform.imbalance, 1);
assert.equal(a2aHot.imbalance, 2.5);
assert.equal(a2aHot.gpus[1].isHot, true);

// §2 Alpha-Beta latency vs bandwidth regime flip & NVLink vs IB cliff
const smallNvl = deriveInterconnectLatency({ op: 'allreduce', interconnect: 'nvlink4', msgMB: 1 });
const largeNvl = deriveInterconnectLatency({ op: 'allreduce', interconnect: 'nvlink4', msgMB: 128 });
assert.equal(smallNvl.selected.dominant, 'latency');
assert.equal(largeNvl.selected.dominant, 'bandwidth');

const ib1 = deriveInterconnectLatency({ op: 'allreduce', interconnect: 'ib1x', msgMB: 16 });
const nvl = deriveInterconnectLatency({ op: 'allreduce', interconnect: 'nvlink4', msgMB: 16 });
assert.ok(ib1.selected.totalUs > nvl.selected.totalUs * 4, 'Single IB should be far slower than NVLink4');

// §3 IBGDA + Overlap speedup
const proxy = deriveOverlapModel('proxy_serial');
const ibgda = deriveOverlapModel('ibgda_overlap');
assert.equal(ibgda.active.cpuHops, 0);
assert.ok(proxy.active.totalUs > ibgda.active.totalUs);
assert.ok(ibgda.speedup > 1.7);

console.log('CollectiveComm checks passed:', {
  keys: zhKeys.length,
  arFactor: arDone.volumeFactor,
  a2aHotSkew: a2aHot.imbalance,
  nvl16Us: nvl.selected.totalUs,
  ib16Us: ib1.selected.totalUs,
  overlapSpeedup: ibgda.speedup,
});
