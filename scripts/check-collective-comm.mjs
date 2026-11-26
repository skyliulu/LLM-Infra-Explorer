import assert from 'node:assert/strict';
import {
  deriveAlgoComparison,
  deriveCollectiveStep,
  deriveInterconnectLatency,
  deriveOverlapModel,
  deriveRdmaModel,
  normalizeCollectiveConfig,
} from '../src/components/collective-comm/model.js';
import { i18n } from '../src/components/collective-comm/content.js';

const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'CollectiveComm zh/en i18n keys must match');

const norm = normalizeCollectiveConfig({ op: 'bad', msgMB: 999, algoP: 999 });
assert.equal(norm.op, 'allreduce');
assert.equal(norm.msgMB, 16);
assert.equal(norm.algoP, 8);

// §1 Ring All-Reduce = 6 hops, 1.5x; RS/AG = 3 hops, 0.75x; A2A skew = 2.5x
const arDone = deriveCollectiveStep({ op: 'allreduce', step: 6 });
assert.equal(arDone.maxStep, 6);
assert.equal(arDone.volumeFactor, 1.5);
assert.ok(arDone.gpus.every((g) => g.shards.every((s) => s.label.startsWith('Σ'))));

const arStep2 = deriveCollectiveStep({ op: 'allreduce', step: 2 });
assert.equal(arStep2.gpus[1].shards[0].label, 'p2(0)', 'Ring Reduce-Scatter step 2 must retain step-1 partial sum instead of reverting to x1,0');

const a2aUniform = deriveCollectiveStep({ op: 'alltoall', routingSkew: 'uniform', step: 2 });
const a2aHot = deriveCollectiveStep({ op: 'alltoall', routingSkew: 'hot', step: 2 });
assert.equal(a2aUniform.volumeFactor, 0.75);
assert.equal(a2aHot.volumeFactor, 1.875, 'Hot All-to-All bottleneck wire factor must scale with ingress skew');
assert.equal(a2aHot.imbalance, 2.5);
assert.equal(a2aHot.gpus[1].isHot, true);

// §2 Ring vs Tree vs NVLS SHARP crossover
const algo64Small = deriveAlgoComparison({ algo: 'ring', algoP: 64, algoMsgMB: 1 });
const ring64 = algo64Small.entries.find((e) => e.id === 'ring');
const tree64 = algo64Small.entries.find((e) => e.id === 'tree');
const nvls64 = algo64Small.entries.find((e) => e.id === 'nvls');
assert.equal(ring64.hops, 126);
assert.equal(tree64.hops, 12);
assert.equal(nvls64.hops, 2);
assert.ok(nvls64.totalUs < tree64.totalUs && tree64.totalUs < ring64.totalUs);

// §3 Alpha-Beta latency vs bandwidth flip
const smallNvl = deriveInterconnectLatency({ op: 'allreduce', interconnect: 'nvlink4', msgMB: 1 });
const largeNvl = deriveInterconnectLatency({ op: 'allreduce', interconnect: 'nvlink4', msgMB: 128 });
assert.equal(smallNvl.selected.dominant, 'latency');
assert.equal(largeNvl.selected.dominant, 'bandwidth');

// §4 GPUDirect RDMA vs TCP vs RoCEv2 PFC Storm
const tcp = deriveRdmaModel('tcp_host');
const rdma = deriveRdmaModel('gpudirect_rdma');
const storm = deriveRdmaModel('roce_pfc_storm');
assert.equal(rdma.cpuCopies, 0);
assert.ok(tcp.cpuCopies > 0);
assert.ok(rdma.p99Us < tcp.p99Us && rdma.p99Us < storm.p99Us);
assert.ok(rdma.effBwGBps > storm.effBwGBps * 4);

// §5 IBGDA Overlap
const ibgda = deriveOverlapModel('ibgda_overlap');
assert.equal(ibgda.active.cpuHops, 0);
assert.ok(ibgda.speedup > 1.7);

console.log('CollectiveComm checks passed:', {
  keys: zhKeys.length,
  ring64Hops: ring64.hops,
  tree64Hops: tree64.hops,
  rdmaP99Us: rdma.p99Us,
  stormP99Us: storm.p99Us,
  overlapSpeedup: ibgda.speedup,
});
