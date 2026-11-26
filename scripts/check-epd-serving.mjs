import assert from 'node:assert/strict';
import {
  deriveEpdModeModel,
  deriveEpdRatioModel,
  deriveMmCacheTrace,
  derivePreprocModel,
  normalizeEpdConfig,
} from '../src/components/epd-serving/model.js';
import { i18n } from '../src/components/epd-serving/content.js';

const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'EpdServing zh/en i18n keys must match');

const norm = normalizeEpdConfig({ epdMode: 'bad', eNodes: 99 });
assert.equal(norm.epdMode, 'epd_split');
assert.equal(norm.eNodes, 8);

// §2 EPD passes SLO and E->P payload (16 MiB) is 20x smaller than 70B GQA P->D KV (320 MiB)
const uni = deriveEpdModeModel('unified');
const epd = deriveEpdModeModel('epd_split');
assert.equal(uni.sloPass, false);
assert.equal(epd.sloPass, true);
assert.equal(epd.payloadRatio, 20);

// §3 Async nvJPEG cuts GPU idle dramatically
const sync = derivePreprocModel('sync_loop');
const asyncP = derivePreprocModel('async_nvjpeg');
assert.ok(asyncP.gpuIdlePct < sync.gpuIdlePct / 4);

// §4 Embedding cache achieves 50% hit on repeated ImgA
const noC = deriveMmCacheTrace({ cacheMode: 'no_cache', step: 4 });
const yesC = deriveMmCacheTrace({ cacheMode: 'emb_cache', step: 4 });
assert.equal(noC.hitRatePct, 0);
assert.equal(yesC.hitRatePct, 50);
assert.ok(yesC.savedMs > 60);

// §5 E:P:D ratio sums to 16 GPUs, shifts bottleneck cleanly, models honest L40S throughput & exact cost/100K
const lowE = deriveEpdRatioModel({ workload: 'video_ocr', eNodes: 1, pNodes: 7, heteroTco: false });
assert.equal(lowE.eNodes + lowE.pNodes + lowE.dNodes, 16);
assert.equal(lowE.bottleneck, 'encode');
const homoMix = deriveEpdRatioModel({ workload: 'mixed_vlm', eNodes: 3, pNodes: 6, heteroTco: false });
const heteroMix = deriveEpdRatioModel({ workload: 'mixed_vlm', eNodes: 3, pNodes: 6, heteroTco: true });
assert.ok(heteroMix.eCap < homoMix.eCap, 'Heterogeneous L40S must have lower per-GPU ViT throughput than H100');
assert.ok(homoMix.costPer100k > 20 && homoMix.costPer100k < 300, `Cost per 100K requests should be realistic tens of dollars, got ${homoMix.costPer100k}`);

console.log('EpdServing checks passed:', {
  keys: zhKeys.length,
  payloadRatio: epd.payloadRatio,
  preprocSpeedup: asyncP.speedup,
  cacheHitPct: yesC.hitRatePct,
  lowEBottleneck: lowE.bottleneck,
});
