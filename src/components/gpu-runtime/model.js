export const LAUNCH_MODES = ['eager', 'full_graph', 'piecewise_graph'];
export const LAUNCH_BATCHES = [1, 8, 64];
export const FUSION_MODES = ['unfused', 'fused'];
export const GPU_SPECS = {
  h100: { id: 'h100', name: 'H100 SXM', bf16Tflops: 989, fp8Tflops: 1979, hbmTBps: 3.35, smCount: 132, sramMB: 33 },
  b200: { id: 'b200', name: 'B200 SXM', bf16Tflops: 2250, fp8Tflops: 4500, hbmTBps: 8.0, smCount: 160, sramMB: 40 },
};

// One representative Transformer Decode layer (8 logical operators).
// GPU durations (µs) scale with batch size; CPU launch overhead is ~13 µs per eager kernel launch.
export const LAYER_KERNELS = [
  { id: 'norm1', label: 'RMSNorm', shortLabel: 'N1', kind: 'elementwise', baseGpuUs: { 1: 3.5, 8: 4.5, 64: 9.0 }, piece: 1 },
  { id: 'qkv', label: 'QKV GEMM', shortLabel: 'QKV', kind: 'gemm', baseGpuUs: { 1: 8.5, 8: 11.0, 64: 28.0 }, piece: 1 },
  { id: 'rope', label: 'RoPE + KV Write', shortLabel: 'RoPE', kind: 'elementwise', baseGpuUs: { 1: 3.2, 8: 4.2, 64: 8.5 }, piece: 1 },
  { id: 'attn', label: 'PagedAttn', shortLabel: 'Attn', kind: 'attention', baseGpuUs: { 1: 9.0, 8: 16.0, 64: 44.0 }, piece: 0, dynamic: true },
  { id: 'oproj', label: 'O Proj GEMM', shortLabel: 'OPrj', kind: 'gemm', baseGpuUs: { 1: 6.5, 8: 8.5, 64: 21.0 }, piece: 2 },
  { id: 'norm2', label: 'RMSNorm', shortLabel: 'N2', kind: 'elementwise', baseGpuUs: { 1: 3.5, 8: 4.5, 64: 9.0 }, piece: 2 },
  { id: 'ffn_up', label: 'Gate/Up + SwiGLU', shortLabel: 'Up', kind: 'gemm', baseGpuUs: { 1: 11.0, 8: 15.0, 64: 38.0 }, piece: 2 },
  { id: 'ffn_down', label: 'Down GEMM', shortLabel: 'Down', kind: 'gemm', baseGpuUs: { 1: 9.5, 8: 12.5, 64: 32.0 }, piece: 2 },
];

export const CPU_EAGER_LAUNCH_US = 13.0;
export const GRAPH_REPLAY_LAUNCH_US = 11.0;
export const PIECE_REPLAY_LAUNCH_US = 8.5;

export function normalizeGpuRuntimeConfig(input = {}) {
  const launchMode = LAUNCH_MODES.includes(input.launchMode) ? input.launchMode : 'eager';
  const batchSize = LAUNCH_BATCHES.includes(Number(input.batchSize)) ? Number(input.batchSize) : 1;
  const fusionMode = FUSION_MODES.includes(input.fusionMode) ? input.fusionMode : 'unfused';
  const gpu = GPU_SPECS[input.gpu] ? input.gpu : 'h100';
  const dtype = input.dtype === 'fp8' ? 'fp8' : 'bf16';
  return { launchMode, batchSize, fusionMode, gpu, dtype };
}

function simulateLaunchMode(mode, batchSize) {
  const cpuOps = [];
  const gpuOps = [];
  let cpuCursor = 0;
  let gpuCursor = 0;

  if (mode === 'eager') {
    LAYER_KERNELS.forEach((k, idx) => {
      const cpuStart = cpuCursor;
      const cpuEnd = cpuStart + CPU_EAGER_LAUNCH_US;
      cpuOps.push({ id: `cpu_${k.id}`, kernelId: k.id, label: `Launch ${k.label}`, shortLabel: `L${idx + 1}`, start: cpuStart, end: cpuEnd, kind: 'launch', stepIndex: idx + 1 });
      cpuCursor = cpuEnd;

      const gpuStart = Math.max(gpuCursor, cpuEnd);
      const gpuDur = k.baseGpuUs[batchSize];
      const gpuEnd = gpuStart + gpuDur;
      gpuOps.push({ id: k.id, label: k.label, shortLabel: k.shortLabel, start: gpuStart, end: gpuEnd, kind: k.kind, dynamic: Boolean(k.dynamic), stepIndex: idx + 1 });
      gpuCursor = gpuEnd;
    });
  } else if (mode === 'full_graph') {
    cpuOps.push({ id: 'cpu_graph', kernelId: 'graph', label: 'cudaGraphLaunch (8 ops)', shortLabel: 'Graph', start: 0, end: GRAPH_REPLAY_LAUNCH_US, kind: 'graph', stepIndex: 1 });
    gpuCursor = GRAPH_REPLAY_LAUNCH_US;
    LAYER_KERNELS.forEach((k, idx) => {
      const gpuDur = k.baseGpuUs[batchSize];
      const gpuStart = gpuCursor;
      const gpuEnd = gpuStart + gpuDur;
      gpuOps.push({ id: k.id, label: k.label, shortLabel: k.shortLabel, start: gpuStart, end: gpuEnd, kind: k.kind, dynamic: Boolean(k.dynamic), stepIndex: idx + 1 });
      gpuCursor = gpuEnd;
    });
  } else {
    // Piecewise CUDA Graph: Piece 1 (norm1, qkv, rope) -> Eager PagedAttn -> Piece 2 (oproj, norm2, ffn_up, ffn_down)
    cpuOps.push({ id: 'cpu_p1', kernelId: 'piece1', label: 'Graph Piece 1 (3 ops)', shortLabel: 'P1', start: 0, end: PIECE_REPLAY_LAUNCH_US, kind: 'graph', stepIndex: 1 });
    cpuCursor = PIECE_REPLAY_LAUNCH_US;
    gpuCursor = PIECE_REPLAY_LAUNCH_US;
    LAYER_KERNELS.forEach((k, idx) => {
      if (k.dynamic) {
        const cpuStart = cpuCursor;
        const cpuEnd = cpuStart + CPU_EAGER_LAUNCH_US;
        cpuOps.push({ id: `cpu_${k.id}`, kernelId: k.id, label: `Eager ${k.label}`, shortLabel: 'Attn', start: cpuStart, end: cpuEnd, kind: 'launch', stepIndex: idx + 1 });
        cpuCursor = cpuEnd;
        const gpuStart = Math.max(gpuCursor, cpuEnd);
        const gpuDur = k.baseGpuUs[batchSize];
        gpuOps.push({ id: k.id, label: k.label, shortLabel: k.shortLabel, start: gpuStart, end: gpuStart + gpuDur, kind: k.kind, dynamic: true, stepIndex: idx + 1 });
        gpuCursor = gpuStart + gpuDur;
      } else {
        if (idx === 4) {
          const cpuStart = cpuCursor;
          const cpuEnd = cpuStart + PIECE_REPLAY_LAUNCH_US;
          cpuOps.push({ id: 'cpu_p2', kernelId: 'piece2', label: 'Graph Piece 2 (4 ops)', shortLabel: 'P2', start: cpuStart, end: cpuEnd, kind: 'graph', stepIndex: idx + 1 });
          cpuCursor = cpuEnd;
          gpuCursor = Math.max(gpuCursor, cpuEnd);
        }
        const gpuDur = k.baseGpuUs[batchSize];
        gpuOps.push({ id: k.id, label: k.label, shortLabel: k.shortLabel, start: gpuCursor, end: gpuCursor + gpuDur, kind: k.kind, dynamic: false, stepIndex: idx + 1 });
        gpuCursor += gpuDur;
      }
    });
  }

  const totalUs = gpuOps.at(-1).end;
  const activeGpuUs = gpuOps.reduce((sum, op) => sum + (op.end - op.start), 0);
  const idleUs = Math.max(0, totalUs - activeGpuUs);
  const idlePct = totalUs > 0 ? Math.round((idleUs / totalUs) * 100) : 0;
  const hostCalls = cpuOps.length;
  return { mode, batchSize, cpuOps, gpuOps, totalUs: Number(totalUs.toFixed(1)), activeGpuUs: Number(activeGpuUs.toFixed(1)), idleUs: Number(idleUs.toFixed(1)), idlePct, hostCalls };
}

export function deriveLaunchComparison(configInput = {}, step = 0) {
  const config = normalizeGpuRuntimeConfig(configInput);
  const runs = Object.fromEntries(LAUNCH_MODES.map((m) => [m, simulateLaunchMode(m, config.batchSize)]));
  const active = runs[config.launchMode];
  const eager = runs.eager;
  const maxStep = LAYER_KERNELS.length;
  const safeStep = Math.max(0, Math.min(maxStep, Math.trunc(Number(step) || 0)));
  const horizonUs = Math.max(eager.totalUs, runs.full_graph.totalUs, runs.piecewise_graph.totalUs);

  return {
    ...config,
    step: safeStep,
    maxStep,
    phase: safeStep === 0 ? 'idle' : safeStep === maxStep ? 'done' : 'running',
    active,
    runs,
    horizonUs,
    speedupVsEager: Number((eager.totalUs / active.totalUs).toFixed(2)),
    activeKernel: safeStep > 0 ? active.gpuOps[safeStep - 1] : null,
  };
}

// §2 Operator Fusion HBM traffic on one Decode step for B tokens (H=4096, F=14336, BF16=2B)
export function deriveFusionModel({ fusionMode = 'unfused', batchSize = 16 } = {}) {
  const safeMode = FUSION_MODES.includes(fusionMode) ? fusionMode : 'unfused';
  const B = Math.max(1, Number(batchSize) || 16);
  const H = 4096;
  const F = 14336;
  const elemBytes = 2; // BF16

  // SwiGLU epilogue + Residual RMSNorm elementwise HBM traffic:
  // Unfused (4 separate kernels):
  //   1. SiLU(gate): read gate [B,F], write s [B,F]
  //   2. Mul(s, up): read s [B,F], read up [B,F], write act [B,F]
  //   3. Residual Add: read x [B,H], read down [B,H], write r [B,H]
  //   4. RMSNorm: read r [B,H], write norm [B,H]
  const unfusedStages = [
    { id: 'silu', label: 'SiLU(gate)', reads: B * F * elemBytes, writes: B * F * elemBytes, sramOnly: false },
    { id: 'mul', label: 'Mul(s, up)', reads: 2 * B * F * elemBytes, writes: B * F * elemBytes, sramOnly: false },
    { id: 'res', label: 'Residual Add', reads: 2 * B * H * elemBytes, writes: B * H * elemBytes, sramOnly: false },
    { id: 'norm', label: 'RMSNorm', reads: B * H * elemBytes, writes: B * H * elemBytes, sramOnly: false },
  ];

  // Fused (2 kernels: Fused SiLU*Mul + Fused Add+RMSNorm):
  //   1. Fused SiLU*Mul: read gate [B,F] + up [B,F], write act [B,F] (s stays in registers!)
  //   2. Fused Add+RMSNorm: read x [B,H] + down [B,H], write r [B,H] + norm [B,H] (eliminates extra r read)
  const fusedStages = [
    { id: 'fused_swiglu', label: 'Fused SiLU ⊙ up', reads: 2 * B * F * elemBytes, writes: B * F * elemBytes, sramOnly: true },
    { id: 'fused_addnorm', label: 'Fused Add + RMSNorm', reads: 2 * B * H * elemBytes, writes: 2 * B * H * elemBytes, sramOnly: true },
  ];

  const sumTraffic = (list) => list.reduce((acc, s) => acc + s.reads + s.writes, 0);
  const unfusedBytes = sumTraffic(unfusedStages);
  const fusedBytes = sumTraffic(fusedStages);
  const activeStages = safeMode === 'fused' ? fusedStages : unfusedStages;
  const activeBytes = safeMode === 'fused' ? fusedBytes : unfusedBytes;

  return {
    fusionMode: safeMode,
    batchSize: B,
    stages: activeStages,
    unfusedBytes,
    fusedBytes,
    activeBytes,
    savedPct: Math.round(((unfusedBytes - fusedBytes) / unfusedBytes) * 100),
    kernelCount: activeStages.length,
    unfusedKernels: unfusedStages.length,
    fusedKernels: fusedStages.length,
  };
}

// §3 H100 / B200 Roofline model
export function deriveRooflineModel({ gpu = 'h100', dtype = 'bf16', batchSize = 16 } = {}) {
  const spec = GPU_SPECS[gpu] || GPU_SPECS.h100;
  const safeDtype = dtype === 'fp8' ? 'fp8' : 'bf16';
  const peakTflops = safeDtype === 'fp8' ? spec.fp8Tflops : spec.bf16Tflops;
  const hbmTBps = spec.hbmTBps;
  const ridgeAi = Number((peakTflops / hbmTBps).toFixed(0));
  const elemBytes = safeDtype === 'fp8' ? 1 : 2;
  const B = Math.max(1, Number(batchSize) || 16);

  // Linear GEMM AI ≈ (2 * B) / elemBytes (2 FLOPs per weight per token / elemBytes per weight)
  const kernels = [
    { id: 'rmsnorm', label: 'RMSNorm / RoPE', ai: 0.5, kind: 'elementwise' },
    { id: 'decode_b1', label: 'Decode GEMV (B=1)', ai: Number((2 / elemBytes).toFixed(1)), kind: 'memory' },
    { id: 'decode_cur', label: `Decode GEMM (B=${B})`, ai: Number(((2 * B) / elemBytes).toFixed(1)), kind: 'active' },
    { id: 'prefill', label: 'Prefill GEMM (T=1024)', ai: Number(((2 * 1024) / elemBytes).toFixed(0)), kind: 'compute' },
  ].map((k) => {
    const achievedTflops = Math.min(peakTflops, k.ai * hbmTBps);
    const utilPct = Math.round((achievedTflops / peakTflops) * 100);
    return { ...k, achievedTflops: Number(achievedTflops.toFixed(1)), utilPct, bound: k.ai >= ridgeAi ? 'compute' : 'memory' };
  });

  return { spec, dtype: safeDtype, peakTflops, hbmTBps, ridgeAi, kernels };
}
