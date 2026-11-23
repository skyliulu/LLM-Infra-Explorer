import assert from 'node:assert/strict';
import {
  deriveProjectorModel,
  deriveTilingModel,
  deriveVideoKvModel,
  normalizeVlmConfig,
} from '../src/components/vlm-vision/model.js';
import { i18n } from '../src/components/vlm-vision/content.js';

const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'VlmVision zh/en i18n keys must match');

const norm = normalizeVlmConfig({ resId: 'bad', durationSec: 999 });
assert.equal(norm.resId, 'r1080');
assert.equal(norm.durationSec, 60);

// §2 Dynamic tiling: 4K AnyRes > fixed resize; 2x2 merge cuts tokens by 4x
const fixed4k = deriveTilingModel({ resId: 'r4k', tiling: 'fixed_resize', merge4x: false });
const anyres4k = deriveTilingModel({ resId: 'r4k', tiling: 'anyres_tiles', merge4x: false });
const anyres4kMerge = deriveTilingModel({ resId: 'r4k', tiling: 'anyres_tiles', merge4x: true });
assert.equal(fixed4k.ocrPreserved, false);
assert.equal(anyres4k.ocrPreserved, true);
assert.ok(anyres4k.llmTokens > fixed4k.llmTokens * 5);
assert.equal(Math.round(anyres4k.llmTokens / anyres4kMerge.llmTokens), 4);

// §3 Projector compression
const mlp = deriveProjectorModel('mlp_1x');
const ps = deriveProjectorModel('pixel_shuffle_4x');
assert.equal(ps.selected.outTokens, mlp.selected.outTokens / 4);

// §5 Video KV blowup & 8x pooling rescue
const vidRaw = deriveVideoKvModel({ durationSec: 300, fps: 1, poolMode: 'none_1x' });
const vidPool = deriveVideoKvModel({ durationSec: 300, fps: 1, poolMode: 'spatiotemporal_8x' });
assert.equal(vidRaw.oomWarn, true);
assert.equal(vidPool.oomWarn, false);
assert.equal(Math.round(vidRaw.totalVisTokens / vidPool.totalVisTokens), 8);

console.log('VlmVision checks passed:', {
  keys: zhKeys.length,
  anyres4kTokens: anyres4k.llmTokens,
  merged4kTokens: anyres4kMerge.llmTokens,
  vidRawGB: vidRaw.kvGB,
  vidPoolGB: vidPool.kvGB,
});
