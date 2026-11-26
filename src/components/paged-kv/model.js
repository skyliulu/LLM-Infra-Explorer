export const ALLOC_MODES = ['contiguous', 'paged'];
export const BLOCK_SIZES = [4, 16, 32, 64];
export const PREEMPT_MODES = ['swap', 'recompute'];
export const VICTIM_LENGTHS = [256, 1024, 4096, 16384];
export const PCIE_LINKS = [
  { id: 'pcie4', label: 'PCIe Gen4 ×16 (24 GB/s)', bwGBps: 24 },
  { id: 'pcie5', label: 'PCIe Gen5 ×16 (52 GB/s)', bwGBps: 52 },
];
export const VATTN_MODES = ['pagedattention', 'vattention'];

// Grounded per-model specs with explicit deployment sharding:
// - Llama-3 8B BF16: 16 GB weights on 1x H100 (TP=1)
// - Llama-3 70B BF16: 140 GB total weights on 4x H100 (TP=4 -> 35 GB weights/GPU, 8/4 = 2 KV heads/GPU)
// - DeepSeek-V3 671B FP8: 671 GB total weights on 16x H100 (16-GPU EP/TP -> ~42 GB weights/GPU; joint compressed latent 576d per token, replicated per DP rank)
export const SIZING_MODELS = {
  llama8b: {
    id: 'llama8b',
    name: 'Llama-3 8B (GQA · TP1)',
    layers: 32,
    kvHeads: 8,
    headDim: 128,
    totalWeightGB: 16,
    tpSize: 1,
    kvShardDivisor: 1,
    isMla: false,
    deployLabel: '1× H100 80GB (TP=1, BF16 权重 16 GB)',
    deployLabelEn: '1× H100 80GB (TP=1, 16 GB BF16 weights)',
  },
  llama70b: {
    id: 'llama70b',
    name: 'Llama-3 70B (GQA · TP4)',
    layers: 80,
    kvHeads: 8,
    headDim: 128,
    totalWeightGB: 140,
    tpSize: 4,
    kvShardDivisor: 4,
    isMla: false,
    deployLabel: '4× H100 80GB (TP=4, 140 GB 权重与 8 KV 头均按 4 卡分片)',
    deployLabelEn: '4× H100 80GB (TP=4, 140 GB weights & 8 KV heads sharded /4)',
  },
  deepseek_mla: {
    id: 'deepseek_mla',
    name: 'DeepSeek-V3 671B (MLA · 16×GPU)',
    layers: 61,
    kvHeads: 1,
    headDim: 576, // d_c (512) + d_R (64) joint compressed latent
    totalWeightGB: 671, // FP8 weights
    tpSize: 16,
    kvShardDivisor: 1, // MLA latent is already 1 joint head per token (not K+V separate)
    isMla: true,
    deployLabel: '16× H100 80GB (FP8 671 GB 权重分片 ~42 GB/卡; 单卡存联合潜向量 576d)',
    deployLabelEn: '16× H100 80GB (~42 GB/GPU FP8 weights; 576d joint latent per tok)',
  },
};

export function normalizePagedConfig(input = {}) {
  const allocMode = ALLOC_MODES.includes(input.allocMode) ? input.allocMode : 'paged';
  const blockSize = BLOCK_SIZES.includes(Number(input.blockSize)) ? Number(input.blockSize) : 16;
  const tokenIdx = Math.max(0, Math.min(63, Math.trunc(Number(input.tokenIdx ?? 37))));
  const preemptMode = PREEMPT_MODES.includes(input.preemptMode) ? input.preemptMode : 'recompute';
  const victimLen = VICTIM_LENGTHS.includes(Number(input.victimLen)) ? Number(input.victimLen) : 1024;
  const pcieId = PCIE_LINKS.some((x) => x.id === input.pcieId) ? input.pcieId : 'pcie4';
  const vattnMode = VATTN_MODES.includes(input.vattnMode) ? input.vattnMode : 'pagedattention';
  const modelId = SIZING_MODELS[input.modelId] ? input.modelId : 'llama70b';
  const kvDtype = input.kvDtype === 'fp8' ? 'fp8' : 'bf16';
  const ctxLen = [2048, 8192, 32768].includes(Number(input.ctxLen)) ? Number(input.ctxLen) : 8192;
  const concurrency = [4, 16, 64].includes(Number(input.concurrency)) ? Number(input.concurrency) : 16;
  const keyChange = ['same', 'tokenizer', 'template', 'lora', 'tenant'].includes(input.keyChange) ? input.keyChange : 'same';
  return { allocMode, blockSize, tokenIdx, preemptMode, victimLen, pcieId, vattnMode, modelId, kvDtype, ctxLen, concurrency, keyChange };
}

// §1 Fragmentation: Contiguous Pre-Allocation vs PagedAttention
export function deriveFragmentationModel({ allocMode = 'paged', blockSize = 16 } = {}) {
  const S = BLOCK_SIZES.includes(Number(blockSize)) ? Number(blockSize) : 16;
  const reqs = [
    { id: 'Req A', actual: 37, maxRes: 128 },
    { id: 'Req B', actual: 22, maxRes: 128 },
    { id: 'Req C', actual: 51, maxRes: 128 },
  ];
  const totalUseful = reqs.reduce((s, r) => s + r.actual, 0); // 110 tokens

  const contigAllocated = reqs.reduce((s, r) => s + r.maxRes, 0) + 32; // 416 slots
  const contigInternalWaste = reqs.reduce((s, r) => s + (r.maxRes - r.actual), 0);
  const contigExternalWaste = 32;
  const contigUtilPct = Math.round((totalUseful / contigAllocated) * 100);

  const pagedAllocated = reqs.reduce((s, r) => s + Math.ceil(r.actual / S) * S, 0);
  const pagedInternalWaste = pagedAllocated - totalUseful;
  const pagedUtilPct = Math.round((totalUseful / pagedAllocated) * 100);

  const isPaged = allocMode === 'paged';
  const maxBatchScale = Number((contigAllocated / pagedAllocated).toFixed(2));

  return {
    allocMode: isPaged ? 'paged' : 'contiguous',
    blockSize: S,
    reqs: reqs.map((r) => ({
      ...r,
      blocksNeeded: Math.ceil(r.actual / S),
      lastBlockFill: r.actual % S === 0 ? S : r.actual % S,
      tailWaste: r.actual % S === 0 ? 0 : S - (r.actual % S),
    })),
    totalUseful,
    allocatedSlots: isPaged ? pagedAllocated : contigAllocated,
    internalWastePct: Math.round(((isPaged ? pagedInternalWaste : contigInternalWaste) / (isPaged ? pagedAllocated : contigAllocated)) * 100),
    externalWastePct: isPaged ? 0 : Math.round((contigExternalWaste / contigAllocated) * 100),
    utilPct: isPaged ? pagedUtilPct : contigUtilPct,
    maxBatchScale,
  };
}

// §2 Block Table Virtual-to-Physical Translation
const PHYSICAL_MAP = [7, 1, 11, 4, 14, 2, 9, 13, 0, 6, 15, 3, 10, 5, 12, 8];

export function deriveBlockTranslation({ blockSize = 16, tokenIdx = 37 } = {}) {
  const S = BLOCK_SIZES.includes(Number(blockSize)) ? Number(blockSize) : 16;
  const j = Math.max(0, Math.min(63, Math.trunc(Number(tokenIdx) || 0)));
  const logicalBlock = Math.floor(j / S);
  const offset = j % S;
  const totalLogicalBlocks = Math.ceil(64 / S);
  const physicalBlock = PHYSICAL_MAP[logicalBlock % PHYSICAL_MAP.length];
  const tableEntries = Array.from({ length: totalLogicalBlocks }, (_, i) => ({
    logical: i,
    physical: PHYSICAL_MAP[i % PHYSICAL_MAP.length],
    active: i === logicalBlock,
  }));
  const coalescingQuality = S >= 16 ? 'high' : 'low';
  const tailWasteRisk = S >= 64 ? 'high' : S >= 32 ? 'med' : 'low';

  return {
    blockSize: S,
    tokenIdx: j,
    logicalBlock,
    offset,
    physicalBlock,
    tableEntries,
    coalescingQuality,
    tailWasteRisk,
  };
}

// §3 Copy-on-Write (CoW) Parallel Sampling Step Machine (steps 0..3)
export function deriveCowStep(step = 3) {
  const s = Math.max(0, Math.min(3, Math.trunc(Number(step) || 0)));
  const frames = [
    {
      stage: 'cow_s0',
      candA: ['P0', 'P1'],
      candB: ['P0', 'P1'],
      blocks: [
        { id: 'P0', label: 'Sys+Prompt [0..15]', ref: 2, owner: 'shared', state: 'shared' },
        { id: 'P1', label: 'Prompt [16..27]', ref: 2, owner: 'shared', state: 'shared' },
        { id: 'P2', label: 'Free', ref: 0, owner: 'free', state: 'free' },
        { id: 'P3', label: 'Free', ref: 0, owner: 'free', state: 'free' },
        { id: 'P4', label: 'Free', ref: 0, owner: 'free', state: 'free' },
      ],
      cowCopies: 0,
      naiveBlocks: 4,
    },
    {
      stage: 'cow_s1',
      candA: ['P0', 'P1'],
      candB: ['P0', 'P2'],
      blocks: [
        { id: 'P0', label: 'Sys+Prompt [0..15]', ref: 2, owner: 'shared', state: 'shared' },
        { id: 'P1', label: 'Prompt+A_t1', ref: 1, owner: 'A', state: 'active' },
        { id: 'P2', label: 'CoW(P1)+B_t1', ref: 1, owner: 'B', state: 'cow' },
        { id: 'P3', label: 'Free', ref: 0, owner: 'free', state: 'free' },
        { id: 'P4', label: 'Free', ref: 0, owner: 'free', state: 'free' },
      ],
      cowCopies: 1,
      naiveBlocks: 4,
    },
    {
      stage: 'cow_s2',
      candA: ['P0', 'P1', 'P3'],
      candB: ['P0', 'P2', 'P4'],
      blocks: [
        { id: 'P0', label: 'Sys+Prompt [0..15]', ref: 2, owner: 'shared', state: 'shared' },
        { id: 'P1', label: 'Prompt+A_t1..4', ref: 1, owner: 'A', state: 'active' },
        { id: 'P2', label: 'CoW(P1)+B_t1..4', ref: 1, owner: 'B', state: 'active' },
        { id: 'P3', label: 'Cand A [32..47]', ref: 1, owner: 'A', state: 'active' },
        { id: 'P4', label: 'Cand B [32..47]', ref: 1, owner: 'B', state: 'active' },
      ],
      cowCopies: 1,
      naiveBlocks: 6,
    },
    {
      stage: 'cow_s3',
      candA: ['P0', 'P1', 'P3'],
      candB: [],
      blocks: [
        { id: 'P0', label: 'Sys+Prompt [0..15]', ref: 1, owner: 'A', state: 'active' },
        { id: 'P1', label: 'Prompt+A_t1..4', ref: 1, owner: 'A', state: 'active' },
        { id: 'P2', label: 'Reclaimed (ref=0)', ref: 0, owner: 'free', state: 'freed' },
        { id: 'P3', label: 'Cand A [32..47]', ref: 1, owner: 'A', state: 'active' },
        { id: 'P4', label: 'Reclaimed (ref=0)', ref: 0, owner: 'free', state: 'freed' },
      ],
      cowCopies: 1,
      // Once Cand B exits, a non-sharing engine also frees Cand B's 3 blocks -> 3 active blocks remain
      naiveBlocks: 3,
    },
  ];
  const cur = frames[s];
  const usedBlocks = cur.blocks.filter((b) => b.ref > 0).length;
  const savedPct = Math.max(0, Math.round(((cur.naiveBlocks - usedBlocks) / Math.max(1, cur.naiveBlocks)) * 100));
  return { step: s, maxStep: 3, phase: s === 0 ? 'idle' : s === 3 ? 'done' : 'running', ...cur, usedBlocks, savedPct };
}

// §4 Preemption: PCIe Swap vs Recompute Crossover (exact first-principles Llama-3 8B BF16 on 1x H100)
export function derivePreemptionModel({ preemptMode = 'recompute', victimLen = 1024, pcieId = 'pcie4' } = {}) {
  const L = VICTIM_LENGTHS.includes(Number(victimLen)) ? Number(victimLen) : 1024;
  const pcie = PCIE_LINKS.find((x) => x.id === pcieId) || PCIE_LINKS[0];

  // Llama-3 8B GQA BF16 KV = 2 * 32 layers * 8 KV heads * 128 d_h * 2B = 131,072 B/tok (0.125 MiB/tok)
  const kvMB = (L * 131072) / (1024 * 1024);

  // Non-contiguous block scatter-gather Swap out + Swap in (~55% peak PCIe + 5.0 ms host DMA/sync overhead)
  const effPcieMBps = pcie.bwGBps * 1024 * 0.55;
  const swapMs = Number((((2 * kvMB) / effPcieMBps) * 1000 + 5.0).toFixed(1));

  // Recompute Prefill on 1x H100 BF16 (~500 eff TFLOP/s):
  // - Linear projections & FFN: 2 * 8e9 = 16 GFLOP/tok -> linearMs = (16e9 * L) / 500e12 * 1000
  // - Causal Self-Attention: 0.5 * L^2 * (4 * 32 * 32 * 128) FLOPs -> attnMs = (0.5 * L^2 * 524288) / 500e12 * 1000
  const linearMs = Number((((16e9 * L) / 500e12) * 1000).toFixed(1));
  const attnMs = Number((((0.5 * L * L * 524288) / 500e12) * 1000).toFixed(1));
  const recomputeMs = Number((linearMs + attnMs).toFixed(1));

  const winner = recomputeMs <= swapMs ? 'recompute' : 'swap';
  const activeMs = preemptMode === 'swap' ? swapMs : recomputeMs;
  const altMs = preemptMode === 'swap' ? recomputeMs : swapMs;
  const deltaMs = Number((activeMs - altMs).toFixed(1));

  return {
    preemptMode,
    victimLen: L,
    pcie,
    kvMB: Number(kvMB.toFixed(1)),
    swapMs,
    linearMs,
    attnMs,
    recomputeMs,
    winner,
    activeMs,
    deltaMs,
  };
}

// §6 KV Memory Sizing & Prefix Cache Key Integrity (exact per-GPU TP/EP sharding)
export function deriveSizingModel({ modelId = 'llama70b', kvDtype = 'bf16', ctxLen = 8192, concurrency = 16, keyChange = 'same' } = {}) {
  const spec = SIZING_MODELS[modelId] || SIZING_MODELS.llama70b;
  const bytesPerElem = kvDtype === 'fp8' ? 1 : 2;

  // Full-model KV bytes per token (GQA: 2 * L * H_kv * d_h * b; MLA: L * (d_c + d_R) * b)
  const fullBytesPerTok = spec.isMla
    ? spec.layers * spec.headDim * bytesPerElem
    : 2 * spec.layers * spec.kvHeads * spec.headDim * bytesPerElem;

  // Per-GPU KV bytes per token after TP sharding of KV heads (MLA latent is 1 joint head per DP rank)
  const perGpuBytesPerTok = fullBytesPerTok / spec.kvShardDivisor;
  const perGpuWeightGB = spec.totalWeightGB / spec.tpSize;

  const kvPerReqGB = (perGpuBytesPerTok * ctxLen) / (1024 ** 3);
  const totalKvGB = kvPerReqGB * concurrency;
  const hbmCapGB = 80; // 1x H100 80GB reference per shard
  const runtimeReserveGB = 6; // activations, CUDA graph pool, NCCL buffers
  const availForKvGB = Math.max(4, hbmCapGB - perGpuWeightGB - runtimeReserveGB);
  const oomRisk = totalKvGB > availForKvGB;
  const maxSafeBatch = Math.max(1, Math.floor(availForKvGB / Math.max(0.001, kvPerReqGB)));
  const cacheReusable = keyChange === 'same';

  return {
    spec,
    kvDtype,
    ctxLen,
    concurrency,
    perGpuWeightGB: Number(perGpuWeightGB.toFixed(1)),
    fullKbPerTok: Number((fullBytesPerTok / 1024).toFixed(1)),
    kbPerTok: Number((perGpuBytesPerTok / 1024).toFixed(1)),
    kvPerReqGB: Number(kvPerReqGB.toFixed(2)),
    totalKvGB: Number(totalKvGB.toFixed(1)),
    availForKvGB: Number(availForKvGB.toFixed(1)),
    oomRisk,
    maxSafeBatch,
    keyChange,
    cacheReusable,
  };
}
