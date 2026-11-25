export const LAUNCH_MODES = ['eager', 'full_graph', 'piecewise_graph'];
export const LAUNCH_BATCHES = [1, 8, 64];
export const FUSION_MODES = ['unfused', 'fused'];

export const REG_OPTIONS = [32, 64, 128, 255];
export const SMEM_OPTIONS = [16, 48, 96, 164];
export const BLOCK_SIZE_OPTIONS = [128, 256, 512];
export const MEM_VIEWS = ['coalescing', 'tiling'];
export const ARCH_GENS = ['volta', 'ampere', 'hopper', 'blackwell', 'rubin'];
export const ROOF_BATCHES = [1, 16, 64, 256, 512];

// §0 Whole-GPU Architecture Blueprint (Macro Chip + Zoomed SM + CUDA SW->HW Mapping + Y=XW Trace)
export const OVERVIEW_NODES = [
  { id: 'host_cpu', tier: 'macro', tone: 'amber', anchor: 'gpucudagraph-launch', spec: 'PCIe Gen5 (64 GB/s) / C2C', prev: null, next: 'gigathread' },
  { id: 'gigathread', tier: 'macro', tone: 'blue', anchor: 'gpucudagraph-sm', spec: 'Block Dispatcher', prev: 'host_cpu', next: 'sm_array' },
  { id: 'sm_array', tier: 'macro', tone: 'indigo', anchor: 'gpucudagraph-sm', spec: 'H100: 132 SMs · B200: 160 SMs', prev: 'gigathread', next: 'l2_cache' },
  { id: 'l2_cache', tier: 'macro', tone: 'emerald', anchor: 'gpucudagraph-memory', spec: '50 MB · ~12 TB/s · ~200 cyc', prev: 'hbm', next: 'smem_l1' },
  { id: 'hbm', tier: 'macro', tone: 'amber', anchor: 'gpucudagraph-memory', spec: '80–192 GB · 3.35–8 TB/s · ~400 cyc', prev: 'nvlink', next: 'l2_cache' },
  { id: 'nvlink', tier: 'macro', tone: 'blue', anchor: 'gpucudagraph-evolution', spec: '900 GB/s – 3.6 TB/s / GPU', prev: 'hbm', next: 'l2_cache' },
  { id: 'warp_sched', tier: 'sm', tone: 'blue', anchor: 'gpucudagraph-sm', spec: '4 / SM · 64 Warps · 0-cyc switch', prev: 'sm_array', next: 'tensor_core' },
  { id: 'reg_file', tier: 'sm', tone: 'emerald', anchor: 'gpucudagraph-sm', spec: '256 KB / SM · ~80+ TB/s · ~1 cyc', prev: 'smem_l1', next: 'tensor_core' },
  { id: 'cuda_core', tier: 'sm', tone: 'blue', anchor: 'gpucudagraph-fusion', spec: '128 FP32 / SM · Scalar ALU', prev: 'reg_file', next: 'l2_cache' },
  { id: 'tensor_core', tier: 'sm', tone: 'indigo', anchor: 'gpucudagraph-memory', spec: '4 / SM · WMMA / WGMMA', prev: 'reg_file', next: 'cuda_core' },
  { id: 'smem_l1', tier: 'sm', tone: 'emerald', anchor: 'gpucudagraph-memory', spec: '228 KB / SM · ~33 TB/s · ~25 cyc', prev: 'l2_cache', next: 'reg_file' },
];

export const OVERVIEW_NODE_IDS = OVERVIEW_NODES.map((n) => n.id);

export const SW_HW_MAPPING = [
  { id: 'grid', focusNode: 'sm_array', highlightIds: ['gigathread', 'sm_array'] },
  { id: 'block', focusNode: 'smem_l1', highlightIds: ['sm_array', 'smem_l1'] },
  { id: 'warp', focusNode: 'warp_sched', highlightIds: ['warp_sched', 'tensor_core', 'cuda_core'] },
  { id: 'thread', focusNode: 'reg_file', highlightIds: ['reg_file', 'cuda_core'] },
];

export const OVERVIEW_TRACE_STEPS = [
  { step: 0, id: 'free', focusNode: null, highlightIds: [], flow: null },
  { step: 1, id: 'dispatch', focusNode: 'host_cpu', highlightIds: ['host_cpu', 'gigathread', 'sm_array'], flow: 'dispatch' },
  { step: 2, id: 'load', focusNode: 'hbm', highlightIds: ['hbm', 'l2_cache', 'smem_l1'], flow: 'load' },
  { step: 3, id: 'compute', focusNode: 'tensor_core', highlightIds: ['smem_l1', 'warp_sched', 'reg_file', 'tensor_core'], flow: 'compute' },
  { step: 4, id: 'store', focusNode: 'l2_cache', highlightIds: ['reg_file', 'cuda_core', 'l2_cache', 'hbm'], flow: 'store' },
];

export const DIE_PHILOSOPHY = {
  cpu: { controlPct: 30, cachePct: 45, computePct: 25 },
  gpu: { controlPct: 8, cachePct: 14, computePct: 78 },
};

export function deriveGpuOverview({ activeNode = 'sm_array', traceStep = 0, activeMapId = null } = {}) {
  const safeStep = Number.isInteger(traceStep) && traceStep >= 0 && traceStep < OVERVIEW_TRACE_STEPS.length ? traceStep : 0;
  const trace = OVERVIEW_TRACE_STEPS[safeStep];
  const mapEntry = SW_HW_MAPPING.find((m) => m.id === activeMapId) || null;

  const resolvedNodeId = trace.step > 0
    ? trace.focusNode
    : OVERVIEW_NODE_IDS.includes(activeNode)
      ? activeNode
      : 'sm_array';
  const node = OVERVIEW_NODES.find((n) => n.id === resolvedNodeId) || OVERVIEW_NODES[2];

  const highlightedIds = trace.step > 0
    ? trace.highlightIds
    : mapEntry
      ? mapEntry.highlightIds
      : [node.id];

  return {
    node,
    trace,
    activeMapId: trace.step > 0 ? null : mapEntry?.id || null,
    highlightedIds,
    activeFlow: trace.flow,
    nodes: OVERVIEW_NODES,
    mappings: SW_HW_MAPPING,
    traceSteps: OVERVIEW_TRACE_STEPS,
    philosophy: DIE_PHILOSOPHY,
  };
}

// Official NVIDIA SXM Dense (non-sparse, without 2:4 structured sparsity) Tensor Core & HBM datasheet specs
export const GPU_SPECS = {
  a100: {
    id: 'a100',
    name: 'A100 80GB SXM',
    bf16Tflops: 312,
    fp8Tflops: null,
    fp4Tflops: null,
    hbmTBps: 2.04, // 2,039 GB/s official A100 80GB SXM4 HBM2e
    smCount: 108,
    sramMB: 20,
    maxSmemPerSmKB: 164,
  },
  h100: {
    id: 'h100',
    name: 'H100 SXM',
    bf16Tflops: 989, // Dense (1,979 with 2:4 sparsity)
    fp8Tflops: 1979, // Dense (3,958 with 2:4 sparsity)
    fp4Tflops: null,
    hbmTBps: 3.35, // 3,350 GB/s official H100 SXM5 HBM3
    smCount: 132,
    sramMB: 33,
    maxSmemPerSmKB: 228,
  },
  b200: {
    id: 'b200',
    name: 'B200 SXM',
    bf16Tflops: 2250, // DGX B200 Dense (4,500 with 2:4 sparsity)
    fp8Tflops: 4500, // DGX B200 Dense (9,000 with 2:4 sparsity)
    fp4Tflops: 9000, // DGX B200 Dense NVFP4 (18,000 with 2:4 sparsity)
    hbmTBps: 8.0, // 8 TB/s official B200 HBM3e
    smCount: 160,
    sramMB: 40,
    maxSmemPerSmKB: 228,
  },
};

export const GPU_GENERATIONS = [
  {
    id: 'volta',
    year: '2017',
    chip: 'GV100 · V100',
    peakTf: 125,
    peakLabel: '125 TF (FP16)',
    hbmCap: '32 GB HBM2',
    hbmGBps: 900,
    nvlinkGBps: 300,
    tcGen: 'Gen 1 TC',
    precision: 'FP16 / FP32 Acc',
    isPlatformSpec: false,
  },
  {
    id: 'ampere',
    year: '2020',
    chip: 'GA100 · A100',
    peakTf: 312,
    peakLabel: '312 TF (BF16/TF32)',
    hbmCap: '80 GB HBM2e',
    hbmGBps: 2039,
    nvlinkGBps: 600,
    tcGen: 'Gen 3 TC',
    precision: 'BF16 / TF32 / 2:4',
    isPlatformSpec: false,
  },
  {
    id: 'hopper',
    year: '2022',
    chip: 'GH100 · H100',
    peakTf: 1979,
    peakLabel: '1979 TF (FP8)',
    hbmCap: '80 GB HBM3',
    hbmGBps: 3350,
    nvlinkGBps: 900,
    tcGen: 'Gen 4 TC',
    precision: 'FP8 + TE',
    isPlatformSpec: false,
  },
  {
    id: 'blackwell',
    year: '2024',
    chip: 'B200 / GB200 NVL72',
    peakTf: 9000,
    peakLabel: '9000 TF (FP4)',
    hbmCap: '192 GB HBM3e',
    hbmGBps: 8000,
    nvlinkGBps: 1800,
    tcGen: 'Gen 5 TC',
    precision: 'NVFP4 / MXFP4',
    isPlatformSpec: false,
  },
  {
    id: 'rubin',
    year: '2026+',
    chip: 'Vera Rubin NVL72',
    peakTf: 18000,
    peakLabel: 'Rack-Scale NVFP4',
    hbmCap: '288 GB HBM4 / GPU',
    hbmGBps: 22000,
    nvlinkGBps: 3600,
    tcGen: 'Rack Platform',
    precision: 'NVFP4 / FP6 / HBM4',
    isPlatformSpec: true,
  },
];

export const MEMORY_TIERS = [
  { id: 'reg', cap: '256 KB / SM', bw: '~80+ TB/s', lat: '~1 cyc', scope: 'thread' },
  { id: 'smem', cap: '228 KB / SM', bw: '~33 TB/s', lat: '~25 cyc', scope: 'block' },
  { id: 'l2', cap: '50 MB', bw: '~12 TB/s', lat: '~200 cyc', scope: 'gpu' },
  { id: 'hbm', cap: '80–192 GB', bw: '3.35–8.0 TB/s', lat: '~400 cyc', scope: 'gpu' },
  { id: 'host', cap: 'TB-class', bw: '64–900 GB/s', lat: 'µs-class', scope: 'system' },
];

// One representative Transformer Decode layer (8 logical operators).
export const LAYER_KERNELS = [
  { id: 'norm1', label: 'RMSNorm', shortLabel: 'N1', kind: 'elementwise', baseGpuUs: { 1: 3.5, 8: 4.5, 64: 9.0 }, piece: 1 },
  { id: 'qkv', label: 'QKV GEMM', shortLabel: 'QKV', kind: 'gemm', baseGpuUs: { 1: 8.5, 8: 11.0, 64: 28.0 }, piece: 1 },
  { id: 'rope', label: 'RoPE + KV Write', shortLabel: 'RoP', kind: 'elementwise', baseGpuUs: { 1: 3.2, 8: 4.2, 64: 8.5 }, piece: 1 },
  { id: 'attn', label: 'PagedAttn', shortLabel: 'Attn', kind: 'attention', baseGpuUs: { 1: 9.0, 8: 16.0, 64: 44.0 }, piece: 0, dynamic: true },
  { id: 'oproj', label: 'O Proj GEMM', shortLabel: 'OPrj', kind: 'gemm', baseGpuUs: { 1: 6.5, 8: 8.5, 64: 21.0 }, piece: 2 },
  { id: 'norm2', label: 'RMSNorm', shortLabel: 'N2', kind: 'elementwise', baseGpuUs: { 1: 3.5, 8: 4.5, 64: 9.0 }, piece: 2 },
  { id: 'ffn_up', label: 'Gate/Up + SwiGLU', shortLabel: 'Up', kind: 'gemm', baseGpuUs: { 1: 11.0, 8: 15.0, 64: 38.0 }, piece: 2 },
  { id: 'ffn_down', label: 'Down GEMM', shortLabel: 'Down', kind: 'gemm', baseGpuUs: { 1: 9.5, 8: 12.5, 64: 32.0 }, piece: 2 },
];

export const CPU_EAGER_LAUNCH_US = 13.0;
export const GRAPH_REPLAY_LAUNCH_US = 11.0;
export const PIECE_REPLAY_LAUNCH_US = 11.0;
export const DYNAMIC_ATTN_EAGER_US = 16.0;

export function normalizeGpuRuntimeConfig(input = {}) {
  const regsPerThread = REG_OPTIONS.includes(Number(input.regsPerThread)) ? Number(input.regsPerThread) : 64;
  const smemKB = SMEM_OPTIONS.includes(Number(input.smemKB)) ? Number(input.smemKB) : 48;
  const blockSize = BLOCK_SIZE_OPTIONS.includes(Number(input.blockSize)) ? Number(input.blockSize) : 256;
  const divergent = Boolean(input.divergent);
  const memView = MEM_VIEWS.includes(input.memView) ? input.memView : 'coalescing';
  const stride = Number(input.stride) === 32 ? 32 : 1;
  const tiled = input.tiled !== undefined ? Boolean(input.tiled) : true;
  const launchMode = LAUNCH_MODES.includes(input.launchMode) ? input.launchMode : 'eager';
  const batchSize = LAUNCH_BATCHES.includes(Number(input.batchSize)) ? Number(input.batchSize) : 1;
  const fusionMode = FUSION_MODES.includes(input.fusionMode) ? input.fusionMode : 'unfused';
  const gpu = GPU_SPECS[input.gpu] ? input.gpu : 'h100';
  const dtype = ['bf16', 'fp8', 'fp4'].includes(input.dtype) ? input.dtype : 'bf16';
  const archGen = ARCH_GENS.includes(input.archGen) ? input.archGen : 'hopper';
  return {
    regsPerThread,
    smemKB,
    blockSize,
    divergent,
    memView,
    stride,
    tiled,
    launchMode,
    batchSize,
    fusionMode,
    gpu,
    dtype,
    archGen,
  };
}

// §1 SM Occupancy, Register Pressure, Warp Latency Hiding & SIMT Divergence (anchored to H100 SM)
export function deriveSmOccupancy({ regsPerThread = 64, smemKB = 48, blockSize = 256, divergent = false } = {}) {
  const maxWarpsPerSm = 64;
  const maxBlocksPerSm = 32;
  const regFilePerSm = 65536; // 64K 32-bit registers per SM
  const maxSmemPerSmKB = 228; // H100 max configurable shared mem per SM
  const schedulersPerSm = 4;

  const warpsPerBlock = Math.max(1, Math.round(blockSize / 32));
  const regsPerBlock = blockSize * regsPerThread;

  const blocksByReg = Math.max(1, Math.floor(regFilePerSm / regsPerBlock));
  const blocksBySmem = Math.max(1, Math.floor(maxSmemPerSmKB / smemKB));
  const blocksByWarpCap = Math.max(1, Math.floor(maxWarpsPerSm / warpsPerBlock));

  const activeBlocks = Math.min(maxBlocksPerSm, blocksByReg, blocksBySmem, blocksByWarpCap);
  const activeWarps = Math.min(maxWarpsPerSm, activeBlocks * warpsPerBlock);
  const occupancyPct = Math.round((activeWarps / maxWarpsPerSm) * 100);
  const warpsPerScheduler = Number((activeWarps / schedulersPerSm).toFixed(1));

  let limiter = 'warp_cap';
  if (activeBlocks === blocksByReg && blocksByReg < blocksBySmem && blocksByReg < blocksByWarpCap) {
    limiter = 'registers';
  } else if (activeBlocks === blocksBySmem && blocksBySmem < blocksByReg && blocksBySmem < blocksByWarpCap) {
    limiter = 'smem';
  } else if (blocksByReg === blocksBySmem && blocksByReg < blocksByWarpCap) {
    limiter = 'registers';
  }

  const registerSpill = regsPerThread >= 255;

  // Build a 10-cycle discrete-event Warp Scheduler simulation for 1 Scheduler (up to 5 visible warp slots W0..W4)
  // Each resident warp runs a repeating instruction stream: LDG (triggers 4-cycle HBM Long Scoreboard wait) -> compute ops.
  // Staggered initial program counters model warps in steady-state execution so ready warps hide HBM waits at 0-cycle switch cost.
  const totalCycles = 10;
  const visibleSlots = 5;
  const residentSlots = Math.max(1, Math.min(visibleSlots, Math.floor(activeWarps / schedulersPerSm)));
  const hbmWaitCycles = registerSpill ? 5 : 4;

  // Per-warp memory-bound instruction stream: 1 LDG -> 1 FMA (or 2-pass divergent BR-A + BR-B)
  const program = divergent
    ? ['LDG', 'BR-A', 'BR-B']
    : ['LDG', 'FMA'];

  // W0 starts at PC=0 (LDG); W1..W4 start at PC=1 (already have loaded operand ready to compute, then loop to LDG)
  const warps = Array.from({ length: visibleSlots }, (_, idx) => ({
    id: `W${idx}`,
    allocated: idx < residentSlots,
    pc: idx === 0 ? 0 : 1,
    waitLeft: 0,
    lastIssuedAt: -1,
  }));

  let rrCursor = 0;
  const cycles = [];

  for (let c = 1; c <= totalCycles; c += 1) {
    // Decrement remaining HBM wait timers at the start of the cycle
    for (const w of warps) {
      if (w.allocated && w.waitLeft > 0) {
        w.waitLeft -= 1;
      }
    }

    // Round-robin pick the next READY allocated warp (preferring W0 on cycle 1 to trigger the first HBM load cleanly)
    let chosen = null;
    if (c === 1) {
      chosen = warps[0];
    } else {
      for (let offset = 0; offset < residentSlots; offset += 1) {
        const idx = (rrCursor + offset) % residentSlots;
        if (warps[idx].waitLeft === 0) {
          chosen = warps[idx];
          rrCursor = (idx + 1) % residentSlots;
          break;
        }
      }
    }

    const waitingWarps = warps.filter((w) => w.allocated && w.waitLeft > 0).map((w) => w.id);
    let cycleState = 'stall';
    let op = 'STALL';
    let label = 'Stall';
    let pass = 'idle';
    let issuedWarp = null;

    const warpStates = warps.map((w) => {
      if (!w.allocated) return { id: w.id, allocated: false, state: 'unalloc', label: '—' };
      if (chosen && w.id === chosen.id) {
        const instr = program[w.pc % program.length];
        return {
          id: w.id,
          allocated: true,
          state: instr === 'LDG' ? 'ldg' : 'exec',
          label: instr,
        };
      }
      if (w.waitLeft > 0) return { id: w.id, allocated: true, state: 'wait', label: 'WAIT' };
      return { id: w.id, allocated: true, state: 'ready', label: 'RDY' };
    });

    if (chosen) {
      const instr = program[chosen.pc % program.length];
      issuedWarp = chosen.id;
      op = instr;
      label = `${chosen.id} ${instr}`;
      chosen.pc += 1;
      chosen.lastIssuedAt = c;
      if (c === 1) rrCursor = 1 % residentSlots;

      if (instr === 'LDG') {
        chosen.waitLeft = hbmWaitCycles + 1; // +1 because start of next cycle decrements by 1 -> full hbmWaitCycles waiting
        cycleState = 'issue';
        pass = 'full';
      } else {
        cycleState = waitingWarps.length > 0 ? 'hide' : 'compute';
        pass = instr === 'BR-A' ? 'passA' : instr === 'BR-B' ? 'passB' : 'full';
      }
    }

    cycles.push({
      cycle: c,
      warp: issuedWarp,
      state: cycleState,
      op,
      label,
      pass,
      waitingWarps,
      switchedFrom: cycleState === 'hide' ? waitingWarps[0] : null,
      warpStates,
    });
  }

  const stallCycles = cycles.filter((x) => x.state === 'stall').length;
  const simtEfficiencyPct = divergent ? 50 : 100;
  const effectiveThroughputPct = Math.round(((totalCycles - stallCycles) / totalCycles) * simtEfficiencyPct);

  return {
    regsPerThread,
    smemKB,
    blockSize,
    divergent,
    warpsPerBlock,
    activeBlocks,
    activeWarps,
    maxWarpsPerSm,
    occupancyPct,
    warpsPerScheduler,
    residentSlots,
    hbmWaitCycles,
    blocksByReg,
    blocksBySmem,
    blocksByWarpCap,
    limiter,
    registerSpill,
    cycles,
    stallCycles,
    simtEfficiencyPct,
    effectiveThroughputPct,
  };
}

// §2 Memory Hierarchy, Coalescing & Tensor Core Tiling Dataflow
export function deriveMemoryDataflow({ memView = 'coalescing', stride = 1, tiled = true } = {}) {
  const isCoalesced = stride === 1;
  // 32 threads in 1 warp each load 1 FP32 (4 bytes) = 128 B useful data
  const usefulBytes = 128;
  const transactions = isCoalesced ? 1 : 32; // 1 x 128B cache line vs 32 separate 128B cache lines
  const fetchedBytes = transactions * 128;
  const busEfficiencyPct = Number(((usefulBytes / fetchedBytes) * 100).toFixed(1));

  // Tiled GEMM 1024x1024x1024 (FP16/BF16 = 2B) with tile B_M=B_N=128, B_K=32
  // Naive: each C[i,j] reads K elements of A + K elements of B directly from HBM -> 2*M*N*K*2B = 4 GB
  // Tiled (128x128 tile): each A/B tile reused 128x across block -> HBM traffic = (M*K*(N/128) + K*N*(M/128))*2B = 32 MB
  const naiveHbmMB = 4096;
  const tiledHbmMB = 32;
  const activeHbmMB = tiled ? tiledHbmMB : naiveHbmMB;
  const reuseFactor = tiled ? 128 : 1;

  return {
    memView,
    stride: isCoalesced ? 1 : 32,
    isCoalesced,
    usefulBytes,
    transactions,
    fetchedBytes,
    busEfficiencyPct,
    tiled,
    naiveHbmMB,
    tiledHbmMB,
    activeHbmMB,
    reuseFactor,
    tiers: MEMORY_TIERS,
  };
}

// §3 CPU Launch Wall & CUDA Graph Capture
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
    cpuOps.push({ id: 'cpu_p1', kernelId: 'piece1', label: 'Graph Piece 1 (3 ops)', shortLabel: 'P1', start: 0, end: PIECE_REPLAY_LAUNCH_US, kind: 'graph', stepIndex: 1 });
    cpuCursor = PIECE_REPLAY_LAUNCH_US;
    gpuCursor = PIECE_REPLAY_LAUNCH_US;
    LAYER_KERNELS.forEach((k, idx) => {
      if (k.dynamic) {
        const cpuStart = cpuCursor;
        const cpuEnd = cpuStart + DYNAMIC_ATTN_EAGER_US;
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
  const idleGpuUs = Math.max(0, totalUs - activeGpuUs);
  const idlePct = Math.round((idleGpuUs / totalUs) * 100);

  return {
    mode,
    batchSize,
    cpuOps,
    gpuOps,
    totalUs: Number(totalUs.toFixed(1)),
    activeGpuUs: Number(activeGpuUs.toFixed(1)),
    idleGpuUs: Number(idleGpuUs.toFixed(1)),
    idlePct,
    hostCalls: cpuOps.length,
  };
}

export function deriveLaunchComparison(config, step = 8) {
  const { launchMode, batchSize } = normalizeGpuRuntimeConfig(config);
  const eager = simulateLaunchMode('eager', batchSize);
  const full = simulateLaunchMode('full_graph', batchSize);
  const piecewise = simulateLaunchMode('piecewise_graph', batchSize);
  const runs = { eager, full_graph: full, piecewise_graph: piecewise };
  const active = runs[launchMode];
  const horizonUs = Math.max(eager.totalUs, full.totalUs, piecewise.totalUs);
  const clampedStep = Math.max(0, Math.min(LAYER_KERNELS.length, Math.trunc(Number(step) || 0)));

  return {
    launchMode,
    batchSize,
    step: clampedStep,
    maxStep: LAYER_KERNELS.length,
    phase: clampedStep === 0 ? 'idle' : clampedStep === LAYER_KERNELS.length ? 'done' : 'running',
    active,
    runs,
    horizonUs,
    speedupVsEager: Number((eager.totalUs / active.totalUs).toFixed(2)),
  };
}

// §4 Operator Fusion HBM traffic model
export function deriveFusionModel({ fusionMode = 'unfused', batchSize = 8 } = {}) {
  const tokens = Math.max(1, Number(batchSize) || 8);
  const hiddenBytes = tokens * 4096 * 2;
  const ffnBytes = tokens * 14336 * 2;

  const unfusedStages = [
    { id: 'silu', label: 'SiLU(gate)', reads: ffnBytes, writes: ffnBytes, sramOnly: false },
    { id: 'mul', label: 'Mul(s, up)', reads: ffnBytes * 2, writes: ffnBytes, sramOnly: false },
    { id: 'res', label: 'Residual Add', reads: hiddenBytes * 2, writes: hiddenBytes, sramOnly: false },
    { id: 'rms', label: 'RMSNorm', reads: hiddenBytes, writes: hiddenBytes, sramOnly: false },
  ];
  const fusedStages = [
    { id: 'swiglu', label: 'Fused SiLU ⊙ up', reads: ffnBytes * 2, writes: ffnBytes, sramOnly: true },
    { id: 'add_rms', label: 'Fused Add + RMSNorm', reads: hiddenBytes * 2, writes: hiddenBytes * 2, sramOnly: true },
  ];

  const unfusedBytes = unfusedStages.reduce((sum, s) => sum + s.reads + s.writes, 0);
  const fusedBytes = fusedStages.reduce((sum, s) => sum + s.reads + s.writes, 0);
  const isFused = fusionMode === 'fused';
  const savedPct = Math.round(((unfusedBytes - fusedBytes) / unfusedBytes) * 100);

  return {
    fusionMode: isFused ? 'fused' : 'unfused',
    stages: isFused ? fusedStages : unfusedStages,
    kernelCount: isFused ? fusedStages.length : unfusedStages.length,
    unfusedBytes,
    fusedBytes,
    activeBytes: isFused ? fusedBytes : unfusedBytes,
    savedPct,
  };
}

// Exact theoretical GEMM arithmetic intensity for Y[M,N] = X[M,K] * W[K,N] at element width b_e bytes:
// I(M,K,N) = (2 * M * K * N) / ((M*K + K*N + M*N) * b_e)
export function exactGemmAi(m, k, n, bytesPerElem) {
  const flops = 2 * m * k * n;
  const bytes = (m * k + k * n + m * n) * bytesPerElem;
  return flops / bytes;
}

// §5 Hardware Roofline & Precision (A100 / H100 / B200 Dense SXM × BF16 / FP8 / FP4)
export function deriveRooflineModel({ gpu = 'h100', dtype = 'bf16', batchSize = 64 } = {}) {
  const spec = GPU_SPECS[gpu] || GPU_SPECS.h100;
  let effectiveDtype = dtype;
  let fallback = false;
  if (effectiveDtype === 'fp4' && !spec.fp4Tflops) {
    effectiveDtype = spec.fp8Tflops ? 'fp8' : 'bf16';
    fallback = true;
  } else if (effectiveDtype === 'fp8' && !spec.fp8Tflops) {
    effectiveDtype = 'bf16';
    fallback = true;
  }

  const peakTflops = effectiveDtype === 'fp4'
    ? spec.fp4Tflops
    : effectiveDtype === 'fp8'
      ? spec.fp8Tflops
      : spec.bf16Tflops;
  const hbmTBps = spec.hbmTBps;
  const ridgeAi = Math.round(peakTflops / hbmTBps);
  const bytesPerElem = effectiveDtype === 'fp4' ? 0.5 : effectiveDtype === 'fp8' ? 1 : 2;
  const b = Math.max(1, Number(batchSize) || 1);
  const dim = 4096; // Representative Transformer Linear projection K = N = 4096

  // Critical batch size B* where exact I(B, dim, dim) reaches ridgeAi:
  // 2*B*dim / ((2*B + dim) * bytesPerElem) = ridgeAi  =>  B* = (ridgeAi * bytesPerElem * dim) / (2*dim - 2*ridgeAi*bytesPerElem)
  const denom = 2 * dim - 2 * ridgeAi * bytesPerElem;
  const criticalBatch = denom > 0 ? Math.ceil((ridgeAi * bytesPerElem * dim) / denom) : null;

  const kernels = [
    { id: 'rmsnorm', label: 'RMSNorm / RoPE', short: 'RMS', ai: Number((2 / (2 * bytesPerElem)).toFixed(2)), kind: 'elementwise' },
    { id: 'decode_gemv', label: 'Decode GEMV (B=1)', short: 'B=1', ai: Number(exactGemmAi(1, dim, dim, bytesPerElem).toFixed(1)), kind: 'memory' },
    { id: 'active_decode', label: `Decode GEMM (B=${b})`, short: `B=${b}`, ai: Number(exactGemmAi(b, dim, dim, bytesPerElem).toFixed(1)), kind: 'active' },
    { id: 'prefill_gemm', label: 'Prefill GEMM (T=2048)', short: 'T=2K', ai: Math.round(exactGemmAi(2048, dim, dim, bytesPerElem)), kind: 'compute' },
  ].map((k) => {
    const achievedTflops = Math.min(peakTflops, k.ai * hbmTBps);
    const bound = k.ai >= ridgeAi ? 'compute' : 'memory';
    return {
      ...k,
      achievedTflops: Number(achievedTflops.toFixed(1)),
      utilPct: Math.round((achievedTflops / peakTflops) * 100),
      bound,
    };
  });

  return {
    spec,
    requestedDtype: dtype,
    dtype: effectiveDtype,
    fallback,
    peakTflops,
    hbmTBps,
    ridgeAi,
    bytesPerElem,
    dim,
    batchSize: b,
    criticalBatch,
    kernels,
  };
}
