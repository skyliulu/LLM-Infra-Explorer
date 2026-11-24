import {MODULE_GROUPS} from './module-groups.js';

export const READING_ORDER = MODULE_GROUPS.flatMap(group=>group.chapters);
const topic = (chapter,section,zh,en) => ({chapter,section,label:{zh,en}});
const inference = topic('llm','llminference-1','Prefill 与逐 Token 生成','Prefill and token generation');
const kv = topic('llm','llminference-2','KV Cache 的生命周期','KV cache lifecycle');
const flash = topic('flash','flashattention-1','注意力的数据搬运','Attention data movement');
export const LEARNING_PATHS = {
  llm:{before:[],next:'gpucudagraph'},
  gpucudagraph:{before:[inference],next:'flash'},
  flash:{before:[inference,kv],next:'flashdecode'},
  flashdecode:{before:[inference,flash],next:'sparseattn'},
  sparseattn:{before:[kv,flash],next:'quantization'},
  linearattn:{before:[kv,flash],next:'quantization'},
  quantization:{before:[kv],next:'pagedkv'},
  pagedkv:{before:[kv],next:'radixcache'},
  radixcache:{before:[inference,kv],next:'mooncake'},
  mooncake:{before:[topic('radixcache','radix-hicache','前缀复用与分层缓存','Prefix reuse and tiered caches'),kv],next:'cachearch'},
  parallel:{before:[inference],next:'dpattention'},
  dpattention:{before:[topic('parallel','parallelstrategies-1','多卡并行与 GPU 映射','Parallelism and GPU mapping')],next:'commcollective'},
  commcollective:{before:[topic('parallel','parallelstrategies-1','多卡并行与 GPU 映射','Parallelism and GPU mapping')],next:'scheduler'},
  scheduler:{before:[inference,kv],next:'pdrouter'},
  pdrouter:{before:[
    topic('scheduler','sched-chunk','连续批处理与 Chunked Prefill 预算','Continuous batching and chunked prefill'),
    topic('radixcache','radix-hicache','前缀复用与分层缓存','Prefix reuse and tiered caches'),
    topic('mooncake','mooncake-tiers','共享 L3 KV 池与 RDMA 传输','Shared L3 KV pool and RDMA transport'),
    inference,
  ],next:'structuredoutput'},
  structuredoutput:{before:[inference],next:'vlmvision'},
  vlmvision:{before:[inference,kv],next:'epdserving'},
  epdserving:{before:[
    topic('vlmvision','vlm-arch','VLM 视觉编码与 Token 压缩','VLM vision encoding and token compression'),
    topic('pdrouter','pd-arch','PD 分离架构与请求状态机','P/D disaggregated architecture'),
  ],next:'diffusiondit'},
  diffusiondit:{before:[
    flash,
    topic('parallel','parallelstrategies-1','多卡并行与 GPU 映射','Parallelism and GPU mapping'),
  ],next:'speculative'},
  speculative:{before:[inference,kv],next:'engram'},
  engram:{before:[inference],next:'cachearch'},
  cachearch:{before:[
    topic('sparseattn','sparse-overview','SWA、稀疏选择与压缩历史','SWA, sparse selection and compressed history'),
    topic('quantization','quant-numeric','数值表示与量化误差','Number formats and quantization error'),
    topic('radixcache','radix-hicache','前缀复用与分层缓存','Prefix reuse and tiered caches'),
  ],next:'deepinfer'},
  deepinfer:{before:[inference,kv],next:null},
};
export const learningHref = ({chapter,section}) => `#${chapter}${section?`?section=${encodeURIComponent(section)}`:''}`;
