import assert from 'node:assert/strict';
import {
  RATIO_PRESETS,
  deriveInterferenceModel,
  derivePdRatioModel,
  deriveRouterTrace,
  normalizePdConfig,
} from '../src/components/pd-router/model.js';
import { i18n } from '../src/components/pd-router/content.js';

const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'PdDisaggregation zh/en i18n keys must match');

// Normalization
const norm = normalizePdConfig({ pdMode: 'invalid', pNodes: 99, isl: 10 });
assert.equal(norm.pdMode, 'disaggregated');
assert.equal(norm.pNodes, 14);
assert.equal(norm.isl, 512);

// §1 Interference & 10GbE boundary reversal
const col = deriveInterferenceModel({ pdMode: 'collocated' });
const chk = deriveInterferenceModel({ pdMode: 'chunked' });
const disRdma = deriveInterferenceModel({ pdMode: 'disaggregated', link: 'rdma' });
const disEth = deriveInterferenceModel({ pdMode: 'disaggregated', link: 'eth10g' });

assert.equal(col.sloPass, false, 'Collocated breaks TPOT SLO');
assert.equal(chk.sloPass, false, 'Chunked eases TPOT but misses strict 30ms/500ms');
assert.equal(disRdma.sloPass, true, 'Disaggregated over RDMA passes both TTFT & TPOT');
assert.equal(disEth.sloPass, false, 'Disaggregated over 10GbE breaks TTFT SLO');
assert.ok(disEth.ttftMs > 1000);

// §2 Cluster Router Trilemma
const rLoad = deriveRouterTrace({ routerPolicy: 'load_only', step: 6 });
const rCache = deriveRouterTrace({ routerPolicy: 'cache_only', step: 6 });
const rAware = deriveRouterTrace({ routerPolicy: 'cache_aware', step: 6 });

assert.ok(rLoad.hitRatePct <= 20, 'Load-only suffers very low prefix hit rate');
assert.ok(rCache.maxQueue >= 5, 'Prefix-only overloads W0');
assert.ok(rAware.hitRatePct >= 60, 'Cache-aware preserves high hit rate');
assert.ok(rAware.maxQueue <= 3, 'Cache-aware caps worker queue');
assert.ok(rAware.p99TtftMs < rLoad.p99TtftMs && rAware.p99TtftMs < rCache.p99TtftMs, 'Cache-aware achieves lowest P99 TTFT');

// §3 Dynamic P:D Ratio
const rag = derivePdRatioModel(RATIO_PRESETS.rag);
const cot = derivePdRatioModel(RATIO_PRESETS.cot);
assert.ok(rag.optimal.pNodes > cot.optimal.pNodes, 'RAG long-input needs more Prefill GPUs than CoT long-output');

const lowHit = derivePdRatioModel({ isl: 8192, osl: 512, cacheHitPct: 0, pNodes: 8 });
const highHit = derivePdRatioModel({ isl: 8192, osl: 512, cacheHitPct: 75, pNodes: 8 });
assert.ok(highHit.optimal.pNodes < lowHit.optimal.pNodes, 'High prefix cache hit lowers Prefill GPU demand');

console.log('PdDisaggregation checks passed:', {
  keys: zhKeys.length,
  rdmaTtft: disRdma.ttftMs,
  ethTtft: disEth.ttftMs,
  awareHitPct: rAware.hitRatePct,
  awareP99: rAware.p99TtftMs,
  ragOptP: rag.optimal.pNodes,
  cotOptP: cot.optimal.pNodes,
});
