import assert from 'node:assert/strict';
import {
  GPU_GENERATIONS,
  OVERVIEW_NODES,
  OVERVIEW_TRACE_STEPS,
  SW_HW_MAPPING,
  deriveFusionModel,
  deriveGpuOverview,
  deriveLaunchComparison,
  deriveMemoryDataflow,
  deriveRooflineModel,
  deriveSmOccupancy,
  exactGemmAi,
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

// §0 Whole-GPU Architecture Blueprint
assert.equal(OVERVIEW_NODES.length, 11);
assert.equal(SW_HW_MAPPING.length, 4);
assert.equal(OVERVIEW_TRACE_STEPS.length, 5);
const ovDefault = deriveGpuOverview();
assert.equal(ovDefault.node.id, 'sm_array');
assert.deepEqual(ovDefault.highlightedIds, ['sm_array']);
assert.equal(ovDefault.activeFlow, null);

const ovInvalid = deriveGpuOverview({ activeNode: 'nonexistent', traceStep: 99 });
assert.equal(ovInvalid.node.id, 'sm_array');
assert.equal(ovInvalid.trace.step, 0);

const ovTrace3 = deriveGpuOverview({ activeNode: 'hbm', traceStep: 3 });
assert.equal(ovTrace3.node.id, 'tensor_core');
assert.equal(ovTrace3.activeFlow, 'compute');
assert.ok(ovTrace3.highlightedIds.includes('warp_sched'));
assert.ok(ovTrace3.highlightedIds.includes('tensor_core'));

const ovMapWarp = deriveGpuOverview({ activeNode: 'warp_sched', activeMapId: 'warp', traceStep: 0 });
assert.equal(ovMapWarp.activeMapId, 'warp');
assert.ok(ovMapWarp.highlightedIds.includes('warp_sched'));
assert.ok(ovMapWarp.highlightedIds.includes('tensor_core'));

for (const n of OVERVIEW_NODES) {
  for (const prefix of ['ovNodeTitle_', 'ovNodeWhat_', 'ovNodeLlm_', 'ovShort_']) {
    assert.ok(i18n.zh[`${prefix}${n.id}`], `Missing zh ${prefix}${n.id}`);
    assert.ok(i18n.en[`${prefix}${n.id}`], `Missing en ${prefix}${n.id}`);
  }
  assert.ok(i18n.zh[`ovAnchor_${n.anchor}`], `Missing zh anchor label for ${n.anchor}`);
  assert.ok(i18n.en[`ovAnchor_${n.anchor}`], `Missing en anchor label for ${n.anchor}`);
}
for (const m of SW_HW_MAPPING) {
  for (const prefix of ['ovMapSw_', 'ovMapHw_', 'ovMapDesc_']) {
    assert.ok(i18n.zh[`${prefix}${m.id}`], `Missing zh ${prefix}${m.id}`);
    assert.ok(i18n.en[`${prefix}${m.id}`], `Missing en ${prefix}${m.id}`);
  }
}

// §1 SM Occupancy, Register Spill & Warp Divergence
const smLowReg = deriveSmOccupancy({ regsPerThread: 32, smemKB: 16, blockSize: 256, divergent: false });
const smHighReg = deriveSmOccupancy({ regsPerThread: 255, smemKB: 16, blockSize: 256, divergent: false });
const smSmemLim = deriveSmOccupancy({ regsPerThread: 32, smemKB: 164, blockSize: 256, divergent: false });
const smDiv = deriveSmOccupancy({ regsPerThread: 64, smemKB: 48, blockSize: 256, divergent: true });

assert.equal(smLowReg.occupancyPct, 100);
assert.equal(smLowReg.stallCycles, 0);
assert.equal(smLowReg.cycles.length, 10);
assert.equal(smLowReg.cycles[0].warpStates.length, 5);
assert.equal(smLowReg.residentSlots, 5);
assert.equal(smHighReg.registerSpill, true);
assert.ok(smHighReg.occupancyPct < smLowReg.occupancyPct);
assert.ok(smHighReg.stallCycles > 0);
assert.equal(smHighReg.residentSlots, 2);
assert.equal(smSmemLim.limiter, 'smem');
assert.equal(smDiv.simtEfficiencyPct, 50);
assert.ok(smDiv.cycles.some((c) => c.pass === 'passA') && smDiv.cycles.some((c) => c.pass === 'passB'));

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
assert.ok(fullB1.active.totalUs < pwB1.active.totalUs, 'Full CUDA Graph must not be slower than Piecewise Graph');
assert.ok(pwB1.active.totalUs < eagerB1.active.totalUs);

// §4 Fusion
const unfused = deriveFusionModel({ fusionMode: 'unfused', batchSize: 8 });
const fused = deriveFusionModel({ fusionMode: 'fused', batchSize: 8 });
assert.equal(unfused.kernelCount, 4);
assert.equal(fused.kernelCount, 2);
assert.ok(fused.savedPct >= 30);

// §5 Multi-Gen Roofline (A100 / H100 / B200 Dense SXM × BF16 / FP8 / FP4) + Exact GEMM AI oracle
const aiPrefill1024Bf16 = exactGemmAi(1024, 4096, 4096, 2);
assert.ok(Math.abs(aiPrefill1024Bf16 - (2 * 1024 * 4096 * 4096) / ((1024 * 4096 + 4096 * 4096 + 1024 * 4096) * 2)) < 1e-6);
assert.ok(aiPrefill1024Bf16 < 700 && aiPrefill1024Bf16 > 680, 'Exact GEMM AI at T=1024, K=N=4096, BF16 must be ~682.7 (not naive 1024)');

const a100Fp8 = deriveRooflineModel({ gpu: 'a100', dtype: 'fp8', batchSize: 1 });
assert.equal(a100Fp8.fallback, true);
assert.equal(a100Fp8.dtype, 'bf16');
assert.equal(a100Fp8.ridgeAi, Math.round(312 / 2.04));

const h100Fp8 = deriveRooflineModel({ gpu: 'h100', dtype: 'fp8', batchSize: 512 });
const b200Fp4 = deriveRooflineModel({ gpu: 'b200', dtype: 'fp4', batchSize: 64 });
assert.equal(h100Fp8.fallback, false);
assert.equal(b200Fp4.fallback, false);
assert.ok(b200Fp4.ridgeAi > h100Fp8.ridgeAi);
assert.ok(h100Fp8.criticalBatch > 256 && h100Fp8.criticalBatch < 400);

// §6 Generations (Volta -> Rubin) + 4 numbered improvements each
assert.equal(GPU_GENERATIONS.length, 5);
assert.equal(GPU_GENERATIONS.at(-1).isPlatformSpec, true);
assert.equal(GPU_GENERATIONS.at(-1).hbmGBps, 22000);
for (const gen of GPU_GENERATIONS) {
  for (const num of [1, 2, 3, 4]) {
    assert.ok(i18n.zh[`evoImp${num}Title_${gen.id}`], `Missing zh title ${num} for ${gen.id}`);
    assert.ok(i18n.zh[`evoImp${num}Desc_${gen.id}`], `Missing zh desc ${num} for ${gen.id}`);
    assert.ok(i18n.en[`evoImp${num}Title_${gen.id}`], `Missing en title ${num} for ${gen.id}`);
    assert.ok(i18n.en[`evoImp${num}Desc_${gen.id}`], `Missing en desc ${num} for ${gen.id}`);
  }
}

console.log('PASS GpuCudaGraph checks:', {
  keys: zhKeys.length,
  smLowOcc: smLowReg.occupancyPct,
  smSpillOcc: smHighReg.occupancyPct,
  coalEff: memCoal.busEfficiencyPct,
  strideEff: memStrided.busEfficiencyPct,
  b200Fp4Ridge: b200Fp4.ridgeAi,
  gens: GPU_GENERATIONS.length,
});
