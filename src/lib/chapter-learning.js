import {MODULE_GROUPS} from './module-groups.js';

export const READING_ORDER = MODULE_GROUPS.flatMap(group=>group.chapters);
const topic = (chapter,section,zh,en) => ({chapter,section,label:{zh,en}});
const inference = topic('llm','llminference-1','Prefill 与逐 Token 生成','Prefill and token generation');
const kv = topic('llm','llminference-2','KV Cache 的生命周期','KV cache lifecycle');
const flash = topic('flash','flashattention-1','注意力的数据搬运','Attention data movement');
export const LEARNING_PATHS = {
  llm:{before:[],next:'flash'},
  flash:{before:[inference,kv],next:'flashdecode'},
  flashdecode:{before:[inference,flash],next:'sparseattn'},
  sparseattn:{before:[kv,flash],next:'quantization'},
  linearattn:{before:[kv,flash],next:'quantization'},
  quantization:{before:[kv],next:'radixcache'},
  radixcache:{before:[inference,kv],next:'cachearch'},
  parallel:{before:[inference],next:'dpattention'},
  dpattention:{before:[topic('parallel','parallelstrategies-1','多卡并行与 GPU 映射','Parallelism and GPU mapping')],next:'speculative'},
  speculative:{before:[inference,kv],next:'engram'},
  engram:{before:[inference],next:'cachearch'},
  cachearch:{before:[
    topic('sparseattn','sparse-overview','SWA、稀疏选择与压缩历史','SWA, sparse selection and compressed history'),
    topic('quantization','quant-numeric','数值表示与量化误差','Number formats and quantization error'),
    topic('radixcache','radix-hicache','前缀复用与分层缓存','Prefix reuse and tiered caches'),
  ],next:null},
};
export const learningHref = ({chapter,section}) => `#${chapter}${section?`?section=${encodeURIComponent(section)}`:''}`;
