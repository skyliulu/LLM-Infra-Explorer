import assert from 'node:assert/strict';
import {
  deriveDitTokenModel,
  deriveDitParallelModel,
  deriveDitCacheModel,
  deriveDitVaeModel,
  deriveDitQuantModel,
} from '../src/components/diffusion-dit/model.js';
import { i18n } from '../src/components/diffusion-dit/content.js';

// 1. i18n alignment
const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'zh and en i18n keys must match exactly');
assert.ok(zhKeys.length >= 75, `expected rich copy (>=75 keys), got ${zhKeys.length}`);

// 2. 3D Patchify & Quadratic Attention Wall
const img512 = deriveDitTokenModel('img512', 2, 28, false);
const vid720 = deriveDitTokenModel('vid720p', 2, 50, true);
const vid1080 = deriveDitTokenModel('vid1080p', 2, 50, true);
assert.equal(img512.seqLen, 1024, '512^2 / 8 / 2 => 32x32 = 1024 tokens');
assert.equal(vid720.seqLen, 75600, '81f -> 21 * 45 * 80 = 75,600 tokens');
assert.ok(vid720.attnSharePct > img512.attnSharePct, '720p video must be far more attention-dominated than 512px image');
assert.ok(vid1080.totalTflops > vid720.totalTflops * 3, '1080p quadratic attention must explode TFLOPs > 3x of 720p');

// 3. Parallelism: Single vs CFG vs USP
const singleP = deriveDitParallelModel('single', 1, 'nvlink', 75600);
const cfgP = deriveDitParallelModel('cfg', 2, 'nvlink', 75600);
const uspNv = deriveDitParallelModel('usp', 8, 'nvlink', 75600);
const uspPcie = deriveDitParallelModel('usp', 8, 'pcie', 75600);
assert.ok(cfgP.speedup > 1.85, `CFG 2-GPU should achieve near-linear speedup, got ${cfgP.speedup}`);
assert.ok(uspNv.stepSec < cfgP.stepSec, '8-GPU USP on NVLink must beat 2-GPU CFG');
assert.ok(uspNv.commSharePct < uspPcie.commSharePct, 'NVLink must have lower exposed comm than PCIe');

// 4. TeaCache & Distillation
const baseC = deriveDitCacheModel('baseline', 0.15);
const teaC = deriveDitCacheModel('teacache', 0.15);
const distC = deriveDitCacheModel('distill', 0.15);
assert.equal(baseC.fullSteps, 20);
assert.ok(teaC.reusedSteps >= 8 && teaC.speedup > 1.6, `TeaCache should reuse >=8 steps, got reused=${teaC.reusedSteps}, speedup=${teaC.speedup}`);
assert.equal(distC.fullSteps, 4);
assert.equal(distC.speedup, 5);

// 5. 3D Tiled VAE
const vaeFull = deriveDitVaeModel('v1080p', 'full', 48);
const vaeTiled = deriveDitVaeModel('v1080p', 'spatiotemporal', 48);
assert.equal(vaeFull.oomRisk, true, '1080p full 3D VAE must OOM on 48GB GPU');
assert.equal(vaeTiled.oomRisk, false, '1080p spatio-temporal tiled VAE must fit in 48GB GPU');
assert.ok(vaeTiled.memReductionX >= 6, 'spatio-temporal tiling should reduce activation memory >= 6x');

// 6. Quantization
const qBf16 = deriveDitQuantModel('bf16');
const qSvd = deriveDitQuantModel('svdquant');
assert.ok(qSvd.weightGB < qBf16.weightGB / 3 && qSvd.stepSpeedup > 2);

console.log('DiffusionDit checks passed:', {
  keys: zhKeys.length,
  vid720Tokens: vid720.seqLen,
  vid720AttnPct: vid720.attnSharePct,
  usp8Speedup: uspNv.speedup,
  teaSpeedup: teaC.speedup,
  vaeCutX: vaeTiled.memReductionX,
});
