import assert from 'node:assert/strict';
import {
  GPU_GENERATIONS,
  deriveFusionModel,
  deriveLaunchComparison,
  deriveMemoryDataflow,
  deriveRooflineModel,
  deriveSmOccupancy,
  normalizeGpuRuntimeConfig,
} from '../src/components/gpu-runtime/model.js';
import { i18n } from '../src/components/gpu-runtime/content.js';

const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'GpuCudaGraph zh/en i18n keys must match');

const norm = normalizeGpuRuntimeConfig({ regsPerThread: 999, gpu: 'bad', archGen: 'unknown' });
assert.equal(norm.regsPerThread, 64);
assert.equal(norm.gpu, 'h100');
assert.equal(norm.archGen, 'hopper');

// §1 SM Occupancy, Register Spill & Warp Divergence
const smLowReg = deriveSmOccupancy({ regsPerThread: 32, smemKB: 16, blockSize: 256, divergent: false });
const smHighReg = deriveSmOccupancy({ regsPerThread: 255, smemKB: 16, blockSize: 256, divergent: false });
const smSmemLim = deriveSmOccupancy({ regsPerThread: 32, smemKB: 164, blockSize: 256, divergent: false });
const smDiv = deriveSmOccupancy({ regsPerThread: 64, smemKB: 48, blockSize: 256, divergent: true });

assert.equal(smLowReg.occupancyPct, 100);
assert.equal(smLowReg.stallCycles, 0);
assert.equal(smHighReg.registerSpill, true);
assert.ok(smHighReg.occupancyPct < smLowReg.occupancyPct);
assert.ok(smHighReg.stallCycles > 0);
assert.equal(smSmemLim.limiter, 'smem');
assert.equal(smDiv.simtEfficiencyPct, 50);

// §2 Memory Coalescing & Tensor Core Tiling
const memCoal = deriveMemoryDataflow({ memView: 'coalescing', stride: 1 });
const memStrided = deriveMemoryDataflow({ memView: 'coalescing', stride: 32 });
assert.equal(memCoal.transactions, 1);
assert.equal(memCoal.busEfficiencyPct, 100);
assert.equal(memStrided.transactions, 32);
assert.ok(memStrided.busEfficiencyPct < 4);

const memNaive = deriveMemoryDataflow({ memView: 'tiling', tiled: false });
const memTiled = deriveMemoryDataflow({ memView: 'tiling', tiled: true });
assert.equal(memTiled.reuseFactor, 128);
assert.ok(memTiled.activeHbmMB < memNaive.activeHbmMB / 100);

// §3 Launch Wall & CUDA Graph
const eagerB1 = deriveLaunchComparison({ launchMode: 'eager', batchSize: 1 });
const fullB1 = deriveLaunchComparison({ launchMode: 'full_graph', batchSize: 1 });
const pwB1 = deriveLaunchComparison({ launchMode: 'piecewise_graph', batchSize: 1 });
assert.ok(eagerB1.active.idlePct > 40);
assert.ok(fullB1.active.totalUs < eagerB1.active.totalUs);
assert.ok(pwB1.active.totalUs < eagerB1.active.totalUs);

// §4 Fusion
const unfused = deriveFusionModel({ fusionMode: 'unfused', batchSize: 8 });
const fused = deriveFusionModel({ fusionMode: 'fused', batchSize: 8 });
assert.equal(unfused.kernelCount, 4);
assert.equal(fused.kernelCount, 2);
assert.ok(fused.savedPct >= 30);

// §5 Multi-Gen Roofline (A100 / H100 / B200 × BF16 / FP8 / FP4)
const a100Fp8 = deriveRooflineModel({ gpu: 'a100', dtype: 'fp8', batchSize: 1 });
assert.equal(a100Fp8.fallback, true);
assert.equal(a100Fp8.dtype, 'bf16');

const h100Fp8 = deriveRooflineModel({ gpu: 'h100', dtype: 'fp8', batchSize: 1 });
const b200Fp4 = deriveRooflineModel({ gpu: 'b200', dtype: 'fp4', batchSize: 1 });
assert.equal(h100Fp8.fallback, false);
assert.equal(b200Fp4.fallback, false);
assert.ok(b200Fp4.ridgeAi > h100Fp8.ridgeAi);

// §6 Generations (Volta -> Rubin)
assert.equal(GPU_GENERATIONS.length, 5);
assert.equal(GPU_GENERATIONS.at(-1).isPlatformSpec, true);

console.log('PASS GpuCudaGraph checks:', {
  keys: zhKeys.length,
  smLowOcc: smLowReg.occupancyPct,
  smSpillOcc: smHighReg.occupancyPct,
  coalEff: memCoal.busEfficiencyPct,
  strideEff: memStrided.busEfficiencyPct,
  b200Fp4Ridge: b200Fp4.ridgeAi,
  gens: GPU_GENERATIONS.length,
});
