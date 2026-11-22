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
  { id: 'engram', icon: CHAPTER_ICONS.engram, component: Engram },
  { id: 'radixcache', icon: CHAPTER_ICONS.radixcache, component: RadixCache },
  { id: 'mooncake', icon: CHAPTER_ICONS.mooncake, component: MooncakeL3 },
  { id: 'dpattention', icon: CHAPTER_ICONS.dpattention, component: DpAttention },
  { id: 'commcollective', icon: CHAPTER_ICONS.commcollective, component: CollectiveComm },
  { id: 'pdrouter', icon: CHAPTER_ICONS.pdrouter, component: PdDisaggregation },
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
      en: 'Visualize CPU kernel launch overhead, Full vs Piecewise CUDA Graphs, operator fusion HBM savings, and H100/B200 rooflines.',
      zh: '可视化 CPU 发射墙、全图与分段 CUDA Graph、算子融合的 HBM 读写节省，以及 H100/B200 Roofline 拐点。',
    },
    iconClass: 'text-amber-300',
  },
  {
    id: 'commcollective',
    description: {
      en: 'Trace Ring All-Reduce/RS/AG and MoE All-to-All skew, NVLink vs InfiniBand latency cliffs, and IBGDA micro-batch overlap.',
      zh: '追踪 Ring All-Reduce/RS/AG 与 MoE All-to-All 热点倾斜、NVLink 与 IB 带宽断层，以及 IBGDA 双微批交叠。',
    },
    iconClass: 'text-purple-300',
  },
  {
    id: 'pdrouter',
    description: {
      en: 'Explore Prefill–Decode disaggregation vs chunked prefill, cluster cache-aware routing, and dynamic P:D pool Goodput.',
      zh: '对比混布、Chunked Prefill 与 PD 分离边界，演练集群缓存感知路由，并求解动态 P:D 配比下的 SLO Goodput。',
    },
    iconClass: 'text-emerald-300',
  },
];
const aliases={deepinfer:'deepseek offline engine scheduler async cpu device overlap request dspark distributed 离线引擎 调度 异步 请求 运行时',llm:'推理 预填充 生成 token moe dense kv',gpucudagraph:'gpu cuda graph piecewise kernel launch fusion roofline h100 b200 sram hbm 发射墙 算子融合 图捕获',parallel:'并行 dp tp pp cp ep etp gpu helix',commcollective:'collective nccl ring allreduce reducescatter allgather alltoall nvlink nvl72 ib infiniband roce ibgda deepep overlap 集合通信 互联 带宽',pdrouter:'pd disaggregation distserve splitwise dynamo router cache aware prefix goodput slo ttft tpot prefill decode 分离 路由 负载均衡',flash:'fa fa2 fa3 fa4 分块 注意力 sram hbm',sparseattn:'dsa csa hca swa 稀疏 压缩 注意力',cachearch:'ced csa2 deepseek 缓存 共享 编码 解码',flashdecode:'解码 split 分块 reduction',speculative:'投机解码 draft target eagle dspark',quantization:'量化 精度 int4 fp4 fp8 bf16 awq gptq smoothquant',engram:'记忆 ngram 预取',radixcache:'前缀缓存 基数树 sglang lru hicache 分层存储 预取 host gpu',mooncake:'mooncake conductor prefill decode 分离式 cpp 分块流水 调度 过载 提前拒绝 kimi 共享缓存 kv store rdma transfer engine 命中率 池化',linearattn:'线性注意力 gla 递归 状态',dpattention:'dp tp mla attention 数据并行'};
const related={deepinfer:['llm','speculative','cachearch','parallel'],llm:['gpucudagraph','quantization','speculative'],gpucudagraph:['llm','flash','quantization'],parallel:['dpattention','commcollective','flashdecode'],commcollective:['parallel','dpattention','pdrouter'],pdrouter:['mooncake','radixcache','deepinfer'],flash:['sparseattn','flashdecode','gpucudagraph'],sparseattn:['flash','cachearch'],cachearch:['sparseattn','quantization','radixcache'],flashdecode:['flash','dpattention'],speculative:['llm','radixcache'],quantization:['llm','cachearch','gpucudagraph'],engram:['llm','radixcache'],radixcache:['llm','cachearch','pdrouter'],mooncake:['radixcache','pdrouter','cachearch'],dpattention:['parallel','commcollective','flashdecode'],linearattn:['flash','sparseattn']};
export const CHAPTERS=READING_ORDER.map(id=>routes.find(route=>route.id===id)).map(route=>({...descriptions.find(item=>item.id===route.id),...route,title:getModuleLabel(route.id),aliases:aliases[route.id],related:related[route.id],learning:LEARNING_PATHS[route.id]}));
export function matchesChapter(chapter, query){return query.trim().toLowerCase().split(/\s+/).every(word=>[chapter.title,chapter.id,chapter.aliases,...Object.values(chapter.description)].join(' ').toLowerCase().includes(word));}
