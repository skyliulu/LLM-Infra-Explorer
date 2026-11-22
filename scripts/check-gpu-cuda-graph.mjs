import assert from 'node:assert/strict';
import {
  FUSION_MODES,
  GPU_SPECS,
  LAUNCH_BATCHES,
  LAUNCH_MODES,
  deriveFusionModel,
  deriveLaunchComparison,
  deriveRooflineModel,
  normalizeGpuRuntimeConfig,
} from '../src/components/gpu-runtime/model.js';
import { i18n } from '../src/components/gpu-runtime/content.js';

// i18n parity
assert.deepEqual(Object.keys(i18n.zh).sort(), Object.keys(i18n.en).sort(), 'GpuCudaGraph zh/en i18n keys must match');

// Normalization bounds
assert.deepEqual(normalizeGpuRuntimeConfig({ launchMode: 'bad', batchSize: 999, fusionMode: 'x', gpu: 'x', dtype: 'x' }), {
  launchMode: 'eager',
  batchSize: 1,
  fusionMode: 'unfused',
  gpu: 'h100',
  dtype: 'bf16',
});

// §1 Launch wall invariants
const b1Eager = deriveLaunchComparison({ launchMode: 'eager', batchSize: 1 }, 8);
const b1Full = deriveLaunchComparison({ launchMode: 'full_graph', batchSize: 1 }, 8);
const b1Piece = deriveLaunchComparison({ launchMode: 'piecewise_graph', batchSize: 1 }, 8);
assert.ok(b1Eager.active.idlePct > 40, 'Eager at B=1 suffers heavy CPU launch bubbles');
assert.ok(b1Full.active.totalUs < b1Eager.active.totalUs, 'Full CUDA Graph beats Eager at B=1');
assert.ok(b1Piece.active.totalUs < b1Eager.active.totalUs, 'Piecewise Graph beats Eager at B=1');
assert.equal(b1Full.active.hostCalls, 1);
assert.equal(b1Piece.active.hostCalls, 3);
assert.equal(b1Eager.active.hostCalls, 8);

const b64Eager = deriveLaunchComparison({ launchMode: 'eager', batchSize: 64 }, 8);
assert.ok(b64Eager.active.idlePct < b1Eager.active.idlePct, 'Larger batch amortizes CPU launch overhead');

// §2 Operator fusion invariants
const unfused = deriveFusionModel({ fusionMode: 'unfused', batchSize: 16 });
const fused = deriveFusionModel({ fusionMode: 'fused', batchSize: 16 });
assert.ok(fused.activeBytes < unfused.activeBytes, 'Fusing SwiGLU + AddNorm cuts HBM round-trips');
assert.ok(fused.savedPct >= 25);
assert.equal(fused.kernelCount, 2);
assert.equal(unfused.kernelCount, 4);

// §3 Roofline invariants
const h100Bf16 = deriveRooflineModel({ gpu: 'h100', dtype: 'bf16', batchSize: 1 });
const h100Fp8 = deriveRooflineModel({ gpu: 'h100', dtype: 'fp8', batchSize: 1 });
const b200Fp8 = deriveRooflineModel({ gpu: 'b200', dtype: 'fp8', batchSize: 64 });
assert.ok(h100Fp8.ridgeAi > h100Bf16.ridgeAi, 'FP8 doubles peak FLOPs at fixed HBM BW, raising the ridge point');
assert.equal(h100Bf16.kernels.find((k) => k.id === 'decode_b1').bound, 'memory');
assert.equal(h100Bf16.kernels.find((k) => k.id === 'prefill').bound, 'compute');
assert.ok(b200Fp8.peakTflops > h100Fp8.peakTflops);

console.log(`PASS GpuCudaGraph checks: ${LAUNCH_MODES.length}×${LAUNCH_BATCHES.length} launch states, ${FUSION_MODES.length} fusion modes, ${Object.keys(GPU_SPECS).length} GPU rooflines, ${Object.keys(i18n.zh).length} aligned i18n keys.`);
