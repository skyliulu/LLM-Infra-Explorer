import {READING_ORDER, LEARNING_PATHS} from './chapter-learning';
import {lazy} from 'react';
import {CHAPTER_ICONS} from './chapter-icons';
import {getModuleLabel} from './module-titles';
const LLMInference = lazy(() => import('../components/LLMInference.jsx'));
const DpAttention = lazy(() => import('../components/DpAttention.jsx'));
const FlashAttention = lazy(() => import('../components/FlashAttention.jsx'));
const FlashDecode = lazy(() => import('../components/FlashDecode.jsx'));
const SpeculativeDecoding = lazy(() => import('../components/SpeculativeDecoding.jsx'));
const ParallelStrategies = lazy(() => import('../components/ParallelStrategies.jsx'));
const Engram = lazy(() => import('../components/Engram.jsx'));
const RadixCache = lazy(() => import('../components/RadixCache.jsx'));
const LinearAttention = lazy(() => import('../components/LinearAttention.jsx'));
const Quantization = lazy(() => import('../components/Quantization.jsx'));
const SparseAttention = lazy(() => import('../components/SparseAttention.jsx'));
const CacheArchitecture = lazy(() => import('../components/CacheArchitecture.jsx'));
const DeepInfer = lazy(() => import('../components/DeepInfer.jsx'));
const MooncakeL3 = lazy(() => import('../components/MooncakeL3.jsx'));
const GpuCudaGraph = lazy(() => import('../components/GpuCudaGraph.jsx'));
const CollectiveComm = lazy(() => import('../components/CollectiveComm.jsx'));
const PdDisaggregation = lazy(() => import('../components/PdDisaggregation.jsx'));
const PagedAttention = lazy(() => import('../components/PagedAttention.jsx'));
const StructuredOutput = lazy(() => import('../components/StructuredOutput.jsx'));
const VlmVision = lazy(() => import('../components/VlmVision.jsx'));
const EpdServing = lazy(() => import('../components/EpdServing.jsx'));
const DiffusionDit = lazy(() => import('../components/DiffusionDit.jsx'));

const routes = [
  { id: 'llm', icon: CHAPTER_ICONS.llm, component: LLMInference },
  { id: 'gpucudagraph', icon: CHAPTER_ICONS.gpucudagraph, component: GpuCudaGraph },
  { id: 'parallel', icon: CHAPTER_ICONS.parallel, component: ParallelStrategies },
  { id: 'flash', icon: CHAPTER_ICONS.flash, component: FlashAttention },
  { id: 'sparseattn', icon: CHAPTER_ICONS.sparseattn, component: SparseAttention },
  { id: 'cachearch', icon: CHAPTER_ICONS.cachearch, component: CacheArchitecture },
  { id: 'flashdecode', icon: CHAPTER_ICONS.flashdecode, component: FlashDecode },
  { id: 'speculative', icon: CHAPTER_ICONS.speculative, component: SpeculativeDecoding },
  { id: 'quantization', icon: CHAPTER_ICONS.quantization, component: Quantization },
  { id: 'pagedkv', icon: CHAPTER_ICONS.pagedkv, component: PagedAttention },
  { id: 'engram', icon: CHAPTER_ICONS.engram, component: Engram },
  { id: 'radixcache', icon: CHAPTER_ICONS.radixcache, component: RadixCache },
  { id: 'mooncake', icon: CHAPTER_ICONS.mooncake, component: MooncakeL3 },
  { id: 'dpattention', icon: CHAPTER_ICONS.dpattention, component: DpAttention },
  { id: 'commcollective', icon: CHAPTER_ICONS.commcollective, component: CollectiveComm },
  { id: 'pdrouter', icon: CHAPTER_ICONS.pdrouter, component: PdDisaggregation },
  { id: 'structuredoutput', icon: CHAPTER_ICONS.structuredoutput, component: StructuredOutput },
  { id: 'vlmvision', icon: CHAPTER_ICONS.vlmvision, component: VlmVision },
  { id: 'epdserving', icon: CHAPTER_ICONS.epdserving, component: EpdServing },
  { id: 'diffusiondit', icon: CHAPTER_ICONS.diffusiondit, component: DiffusionDit },
  { id: 'linearattn', icon: CHAPTER_ICONS.linearattn, component: LinearAttention },
  { id: 'deepinfer', icon: CHAPTER_ICONS.deepinfer, component: DeepInfer },
];

const descriptions = [
  {
    id: 'deepinfer',
    description: {
      en: 'Explain DeepInfer performance and cost through cache reuse, parallel execution, kernels and service-wide resource allocation.',
      zh: '从缓存复用、并行与内核、整套服务的资源安排，理解 DeepInfer 的性能与成本。',
    },
    iconClass: 'text-orange-300',
  },
  {
    id: 'llm',
    description: {
      en: 'Understand prefill/decode stages, KV cache usage, and token generation flow.',
      zh: '理解 Prefill/Decode 阶段、KV Cache 使用方式与 Token 生成流程。',
    },
    iconClass: 'text-cyan-300',
  },
  {
    id: 'parallel',
    description: {
      en: 'Explore tensor, pipeline, and data parallelism trade-offs visually.',
      zh: '交互式探索张量并行、流水并行、数据并行等策略权衡。',
    },
    iconClass: 'text-fuchsia-300',
  },
  {
    id: 'flash',
    description: {
      en: 'See how tiled attention cuts memory access and boosts throughput.',
      zh: '了解分块注意力如何减少显存访问并提升吞吐。',
    },
    iconClass: 'text-emerald-300',
  },
  {
    id: 'sparseattn',
    description: {
      en: 'Compare full attention with sparse reads and compressed history, then zoom into cooperating branches inside one canvas.',
      zh: '先对照普通 Attention 的读取与缓存成本，再在同一画布逐层放大稀疏选择、压缩历史与局部窗口。',
    },
    iconClass: 'text-indigo-300',
  },
  {
    id: 'cachearch',
    description: {
      zh: '为什么读长材料慢、保留历史贵、旧会话恢复会卡？从业务收益下钻上下文构建、共享与恢复。',
      en: 'Explore slow prompt processing, costly history and session recovery, then trace context construction, sharing and replay.',
    },
    iconClass: 'text-blue-300',
  },
  {
    id: 'flashdecode',
    description: {
      en: 'Dive into low-latency decoding optimizations for real-time responses.',
      zh: '深入低时延解码优化路径，理解实时生成性能提升。',
    },
    iconClass: 'text-amber-300',
  },
  {
    id: 'speculative',
    description: {
      en: 'See why Draft–Verify reduces serial Target work, then compare EAGLE-2 dynamic trees with DSpark confidence scheduling.',
      zh: '先理解 Draft–Verify 如何减少 Target 串行前向，再比较 EAGLE-2 动态树与 DSpark 置信度调度。',
    },
    iconClass: 'text-blue-300',
  },
  {
    id: 'quantization',
    description: { en: 'Explore offline weight preparation, online activation / KV quantization, numerical error and runtime execution.', zh: '探索离线权重量化、在线激活与 KV 量化，以及数值误差和真实执行路径。' },
    iconClass: 'text-teal-300',
  },
  {
    id: 'engram',
    description: {
      en: 'Explore how Engram augments Transformer layers with n-gram memory modules for efficient long-context modeling.',
      zh: '了解 Engram 如何通过 n-gram 记忆模块增强 Transformer 层，以更高效地建模长上下文。',
    },
    iconClass: 'text-rose-300',
  },
  {
    id: 'radixcache',
    description: {
      en: 'Trace prefix reuse and KV movement across GPU, host memory and external storage with Radix HiCache.',
      zh: '用 Radix HiCache 追踪前缀共享、分层存储，以及 KV 页的预取、加载、写回与淘汰。',
    },
    iconClass: 'text-indigo-300',
  },
  {
    id: 'mooncake',
    description: {
      en: 'Understand Mooncake’s open-source KV stack: control/data-plane split, Conductor prefix index, shared L3 pool, zero-copy RDMA fetch and reuse economics.',
      zh: '从控制/数据面分工理解 Mooncake 开源 KV 栈：前缀索引、L3 共享缓存池、零拷贝 RDMA 取数，以及复用何时划算。',
    },
    iconClass: 'text-violet-300',
  },
  {
    id: 'linearattn',
    description: {
      en: 'Compare full attention with fixed-size recurrent state, then inspect kernel features and gated updates.',
      zh: '对照完整注意力与固定大小的递归状态，深入核函数特征与门控更新。',
    },
    iconClass: 'text-violet-300',
  },
  {
    id: 'dpattention',
    description: {
      en: 'Understand hybrid DP/TP attention flow, KV cache sharding, and cross-rank communication trade-offs.',
      zh: '理解 DP/TP 混合并行中的 Attention 流程、KV Cache 切分方式与跨卡通信权衡。',
    },
    iconClass: 'text-sky-300',
  },
  {
    id: 'gpucudagraph',
    description: {
      en: 'Explore SM occupancy, warp latency hiding, coalescing & Tensor Core tiling, CUDA Graphs, operator fusion, A100–B200 rooflines, and Volta–Rubin evolution.',
      zh: '贯通 SM 占用率与 Warp 延迟隐藏、访存合并与 Tensor Core 分块、CUDA Graph 发射墙、算子融合、A100–B200 Roofline 诊断与 Volta–Rubin 演进。',
    },
    iconClass: 'text-amber-300',
  },
  {
    id: 'commcollective',
    description: {
      en: 'Explore Ring/Tree/NVLS SHARP topologies, MoE All-to-All skew, NVLink vs IB cliffs, GPUDirect RDMA / RoCEv2 PFC, IBGDA overlap, and placement.',
      zh: '贯通 Ring/Tree/NVLS SHARP 算法拓扑、MoE All-to-All 倾斜、NVLink 与 IB 断层、GPUDirect RDMA / RoCEv2 拥塞、IBGDA 交叠与排障。',
    },
    iconClass: 'text-purple-300',
  },
  {
    id: 'pdrouter',
    description: {
      en: 'Inspect end-to-end P/D architecture, Chunked Prefill budgets, layer-wise KV pipelining & resharding, cache-aware routing, Goodput, and SLO ops.',
      zh: '贯通端到端 PD 分离架构与状态机、Chunked Prefill 预算、逐层 KV 流水与非对称重排、缓存感知路由、动态 P:D Goodput 与生产可观测性。',
    },
    iconClass: 'text-emerald-300',
  },
  {
    id: 'pagedkv',
    description: {
      en: 'Explore KV fragmentation, Block Table virtual-to-physical translation, Copy-on-Write sharing, Swap vs Recompute preemption, vAttention, and KV sizing.',
      zh: '贯通 KV 显存碎片、Block Table 虚拟到物理寻址、写时复制共享、Swap 与 Recompute 抢占权衡、vAttention 虚拟内存及容量速算。',
    },
    iconClass: 'text-cyan-300',
  },
  {
    id: 'structuredoutput',
    description: {
      en: 'Trace JSON Schema / CFG compilation, XGrammar split bitmasking, FSM logits masking, Jump-Forward decoding, CPU/GPU async overlap, and BPE pitfalls.',
      zh: '贯通 JSON Schema / CFG 语法编译、XGrammar 掩码拆分、FSM 逐词掩码、Jump-Forward 跳步加速、CPU/GPU 异步交叠与 BPE 排障。',
    },
    iconClass: 'text-amber-300',
  },
  {
    id: 'vlmvision',
    description: {
      en: 'Analyze ViT dynamic tiling (AnyRes / NaViT), Projector token compression, 3D M-RoPE coordinates, video frame KV budgets, and VLM serving bottlenecks.',
      zh: '贯通 ViT 动态分块（AnyRes / NaViT）、Projector 视觉 Token 压缩、3D M-RoPE 坐标编码、长视频帧采样 KV 账本与 VLM 排障。',
    },
    iconClass: 'text-sky-300',
  },
  {
    id: 'epdserving',
    description: {
      en: 'Explore Encode–Prefill–Decode disaggregation, 80× smaller E→P embedding transfer, async nvJPEG preprocessing, content-addressed caching, and E:P:D ratios.',
      zh: '贯通 EPD 三阶段分离架构、80× 轻量视觉特征传输、异步 nvJPEG 预处理、内容寻址多模态缓存、动态 E:P:D 配比与生产运维。',
    },
    iconClass: 'text-teal-300',
  },
  {
    id: 'diffusiondit',
    description: {
      en: 'Trace end-to-end DiT & video pipelines, 3D patchify quadratic attention wall, CFG + USP parallelism, TeaCache reuse, 3D Tiled VAE OOM, and FP8/SVDQuant.',
      zh: '贯通 DiT / 视频生成端到端流水线、3D Patchify 注意力墙、CFG + USP 序列并行、TeaCache 动态复用、3D 分块 VAE 与 FP8/SVDQuant 排障。',
    },
    iconClass: 'text-rose-300',
  },
];
const aliases={deepinfer:'deepseek offline engine scheduler async cpu device overlap request dspark distributed 离线引擎 调度 异步 请求 运行时',llm:'推理 预填充 生成 token moe dense kv',gpucudagraph:'gpu cuda sm warp occupancy register spill simt divergence coalescing tiling tensor core mma graph piecewise kernel launch fusion roofline nsight stall volta ampere hopper blackwell rubin a100 h100 b200 sram hbm 发射墙 算子融合 图捕获 占用率 访存合并 架构演进',parallel:'并行 dp tp pp cp ep etp gpu helix',commcollective:'collective nccl ring allreduce reducescatter allgather alltoall nvlink nvl72 ib infiniband roce ibgda deepep overlap 集合通信 互联 带宽',pdrouter:'pd disaggregation distserve splitwise dynamo router cache aware prefix goodput slo ttft tpot prefill decode 分离 路由 负载均衡',pagedkv:'pagedattention vllm block table fragmentation cow copy on write swap recompute preemption vattention kv sizing prefix key 分页 碎片 抢占 块表',structuredoutput:'structured output json schema grammar fsm pda cfg xgrammar outlines guidance jump forward compressed fsm async mask overlap bpe healing 结构化输出 语法约束 掩码 跳步',vlmvision:'vlm vision multimodal vit patchify anyres navit dynamic resolution projector pixel shuffle qformer mrope 3d rope video kv cache ocr 多模态 视觉 编码 压缩 视频',epdserving:'epd disaggregation encode prefill decode multimodal serving nvjpeg dali preprocess embedding cache ratio goodput 多模态服务 分离 预处理 特征缓存',diffusiondit:'diffusion dit video generation sora flux wan cogvideox flow matching cfg parallel usp ulysses ring attention teacache distillation tiled vae 3d vae svdquant fp8 nvfp4 扩散 视频生成 去噪 序列并行 分块解码',flash:'fa fa2 fa3 fa4 分块 注意力 sram hbm',sparseattn:'dsa csa hca swa 稀疏 压缩 注意力',cachearch:'ced csa2 deepseek 缓存 共享 编码 解码',flashdecode:'解码 split 分块 reduction',speculative:'投机解码 draft target eagle dspark',quantization:'量化 精度 int4 fp4 fp8 bf16 awq gptq smoothquant',engram:'记忆 ngram 预取',radixcache:'前缀缓存 基数树 sglang lru hicache 分层存储 预取 host gpu',mooncake:'mooncake conductor prefill decode 分离式 cpp 分块流水 调度 过载 提前拒绝 kimi 共享缓存 kv store rdma transfer engine 命中率 池化',linearattn:'线性注意力 gla 递归 状态',dpattention:'dp tp mla attention 数据并行'};
const related={deepinfer:['llm','speculative','cachearch','parallel'],llm:['gpucudagraph','quantization','speculative'],gpucudagraph:['llm','flash','quantization'],parallel:['dpattention','commcollective','flashdecode'],commcollective:['parallel','dpattention','pdrouter'],pdrouter:['mooncake','radixcache','epdserving','structuredoutput'],pagedkv:['radixcache','quantization','flashdecode'],structuredoutput:['pdrouter','speculative','llm'],vlmvision:['epdserving','diffusiondit','pagedkv'],epdserving:['vlmvision','pdrouter','radixcache'],diffusiondit:['vlmvision','parallel','flash','quantization'],flash:['sparseattn','flashdecode','gpucudagraph'],sparseattn:['flash','cachearch'],cachearch:['sparseattn','quantization','radixcache'],flashdecode:['flash','dpattention','pagedkv'],speculative:['llm','radixcache','structuredoutput'],quantization:['llm','cachearch','gpucudagraph','diffusiondit'],engram:['llm','radixcache'],radixcache:['pagedkv','llm','cachearch','pdrouter'],mooncake:['radixcache','pdrouter','cachearch'],dpattention:['parallel','commcollective','flashdecode'],linearattn:['flash','sparseattn']};
export const CHAPTERS=READING_ORDER.map(id=>routes.find(route=>route.id===id)).map(route=>({...descriptions.find(item=>item.id===route.id),...route,title:getModuleLabel(route.id),aliases:aliases[route.id],related:related[route.id],learning:LEARNING_PATHS[route.id]}));
export function matchesChapter(chapter, query){return query.trim().toLowerCase().split(/\s+/).every(word=>[chapter.title,chapter.id,chapter.aliases,...Object.values(chapter.description)].join(' ').toLowerCase().includes(word));}
