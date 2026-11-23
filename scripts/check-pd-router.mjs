import assert from 'node:assert/strict';
import {
  RATIO_PRESETS,
  deriveInterferenceModel,
  deriveKvTransferModel,
  derivePdRatioModel,
  deriveRouterTrace,
  normalizePdConfig,
} from '../src/components/pd-router/model.js';
import { i18n } from '../src/components/pd-router/content.js';

const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'PdDisaggregation zh/en i18n keys must match');

const norm = normalizePdConfig({ pdMode: 'invalid', pNodes: 99, isl: 10, chunkSize: 999 });
assert.equal(norm.pdMode, 'disaggregated');
assert.equal(norm.pNodes, 14);
assert.equal(norm.isl, 512);
assert.equal(norm.chunkSize, 2048);

// §2 Interference, Chunk size tradeoff & 10GbE boundary reversal
const col = deriveInterferenceModel({ pdMode: 'collocated' });
const chkSmall = deriveInterferenceModel({ pdMode: 'chunked', chunkSize: 512 });
const chkLarge = deriveInterferenceModel({ pdMode: 'chunked', chunkSize: 4096 });
const disRdma = deriveInterferenceModel({ pdMode: 'disaggregated', link: 'rdma' });
const disEth = deriveInterferenceModel({ pdMode: 'disaggregated', link: 'eth10g' });

assert.equal(col.sloPass, false);
assert.ok(chkSmall.p99TpotMs < chkLarge.p99TpotMs, 'Smaller chunk reduces TPOT jitter');
assert.ok(chkSmall.ttftMs > chkLarge.ttftMs, 'Smaller chunk adds TTFT chunking overhead');
assert.equal(disRdma.sloPass, true);
assert.equal(disEth.sloPass, false);
assert.ok(disEth.ttftMs > 1000);

// §3 Layer-wise Pipelined KV Transfer vs Bulk Blocking
const kvBulk = deriveKvTransferModel({ kvPipe: 'bulk_blocking', kvLayout: 'asymmetric' });
const kvPipe = deriveKvTransferModel({ kvPipe: 'layerwise_pipelined', kvLayout: 'asymmetric' });
assert.equal(kvBulk.overlapPct, 0);
assert.ok(kvPipe.overlapPct >= 75);
assert.ok(kvPipe.exposedTransferMs < kvBulk.exposedTransferMs / 4);

// §4 Cluster Router Trilemma
const rLoad = deriveRouterTrace({ routerPolicy: 'load_only', step: 6 });
const rCache = deriveRouterTrace({ routerPolicy: 'cache_only', step: 6 });
const rAware = deriveRouterTrace({ routerPolicy: 'cache_aware', step: 6 });
assert.ok(rLoad.hitRatePct <= 20);
assert.ok(rCache.maxQueue >= 5);
assert.ok(rAware.hitRatePct >= 60);
assert.ok(rAware.maxQueue <= 3);
assert.ok(rAware.p99TtftMs < rLoad.p99TtftMs && rAware.p99TtftMs < rCache.p99TtftMs);

// §5 Dynamic P:D Ratio
const rag = derivePdRatioModel(RATIO_PRESETS.rag);
const cot = derivePdRatioModel(RATIO_PRESETS.cot);
assert.ok(rag.optimal.pNodes > cot.optimal.pNodes);

const lowHit = derivePdRatioModel({ isl: 8192, osl: 512, cacheHitPct: 0, pNodes: 8 });
const highHit = derivePdRatioModel({ isl: 8192, osl: 512, cacheHitPct: 75, pNodes: 8 });
assert.ok(highHit.optimal.pNodes < lowHit.optimal.pNodes);

console.log('PdDisaggregation checks passed:', {
  keys: zhKeys.length,
  chk512Tpot: chkSmall.p99TpotMs,
  chk4096Tpot: chkLarge.p99TpotMs,
  kvPipeOverlapPct: kvPipe.overlapPct,
  awareHitPct: rAware.hitRatePct,
  ragOptP: rag.optimal.pNodes,
  cotOptP: cot.optimal.pNodes,
});
