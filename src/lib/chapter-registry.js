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

const routes = [
  { id: 'llm', icon: CHAPTER_ICONS.llm, component: LLMInference },
  { id: 'parallel', icon: CHAPTER_ICONS.parallel, component: ParallelStrategies },
  { id: 'flash', icon: CHAPTER_ICONS.flash, component: FlashAttention },
  { id: 'sparseattn', icon: CHAPTER_ICONS.sparseattn, component: SparseAttention },
  { id: 'cachearch', icon: CHAPTER_ICONS.cachearch, component: CacheArchitecture },
  { id: 'flashdecode', icon: CHAPTER_ICONS.flashdecode, component: FlashDecode },
  { id: 'speculative', icon: CHAPTER_ICONS.speculative, component: SpeculativeDecoding },
  { id: 'quantization', icon: CHAPTER_ICONS.quantization, component: Quantization },
  { id: 'engram', icon: CHAPTER_ICONS.engram, component: Engram },
  { id: 'radixcache', icon: CHAPTER_ICONS.radixcache, component: RadixCache },
  { id: 'dpattention', icon: CHAPTER_ICONS.dpattention, component: DpAttention },
  { id: 'linearattn', icon: CHAPTER_ICONS.linearattn, component: LinearAttention },
];

const descriptions = [
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
];
const aliases={llm:'推理 预填充 生成 token moe dense kv',parallel:'并行 dp tp pp cp ep etp gpu helix',flash:'fa fa2 fa3 fa4 分块 注意力 sram hbm',sparseattn:'dsa csa hca swa 稀疏 压缩 注意力',cachearch:'ced csa2 deepseek 缓存 共享 编码 解码',flashdecode:'解码 split 分块 reduction',speculative:'投机解码 draft target eagle dspark',quantization:'量化 精度 int4 fp4 fp8 bf16 awq gptq smoothquant',engram:'记忆 ngram 预取',radixcache:'前缀缓存 基数树 sglang lru hicache 分层存储 预取 host gpu',linearattn:'线性注意力 gla 递归 状态',dpattention:'dp tp mla attention 数据并行'};
const related={llm:['quantization','speculative'],parallel:['dpattention','flashdecode'],flash:['sparseattn','flashdecode'],sparseattn:['flash','cachearch'],cachearch:['sparseattn','quantization'],flashdecode:['flash','dpattention'],speculative:['llm','radixcache'],quantization:['llm','cachearch'],engram:['llm','radixcache'],radixcache:['llm','cachearch'],dpattention:['parallel','flashdecode'],linearattn:['flash','sparseattn']};
export const CHAPTERS=routes.map(route=>({...descriptions.find(item=>item.id===route.id),...route,title:getModuleLabel(route.id),aliases:aliases[route.id],related:related[route.id]}));
export function matchesChapter(chapter, query){return query.trim().toLowerCase().split(/\s+/).every(word=>[chapter.title,chapter.id,chapter.aliases,...Object.values(chapter.description)].join(' ').toLowerCase().includes(word));}
