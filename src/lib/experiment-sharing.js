// Public share schema: accept only known configuration fields and legal ranges.
const one=(...choices)=>value=>choices.includes(value);
const number=(lo,hi)=>value=>typeof value==='number'&&Number.isFinite(value)&&value>=lo&&value<=hi;
const bool=value=>typeof value==='boolean';
const object=fields=>value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>Object.hasOwn(fields,key)&&fields[key](value[key]))&&Object.keys(fields).every(key=>Object.hasOwn(value,key));
const range=number;
export const SHARE_SCHEMA={
 llm:{'LLMInference.modelType':one('moe','dense'),'LLMInference.temperature':range(.1,.9),'LLMInference.topK':one(1,2,3),'LLMInference.topP':range(.5,1)},
 parallel:{'ParallelStrategies.degrees':value=>object(Object.fromEntries(['dp','tp','pp','cp','ep','etp'].map(k=>[k,one(1,2,4)])))(value)&&Object.values(value).reduce((a,b)=>a*b,1)<=32,'ParallelStrategies.contextMode':one('prefill','decode'),'ParallelStrategies.mappingModel':one('orthogonal','dcpReuse'),'ParallelStrategies.componentProfile':one('standard','wideEp','helix'),'ParallelStrategies.attentionMode':one('standard','dpAttention'),'ParallelStrategies.attentionType':one('mha','gqa','mla'),'ParallelStrategies.servingMode':one('unified','pdDisaggregated'),'ParallelStrategies.moeTransport':one('tokenA2a','dwdp')},
 flash:{'FlashAttention.config':object({modelType:one('standard','flash'),version:one('v1','v2','v3','v4'),direction:one('forward','backward'),causal:bool,sequenceLength:one(512,2048,8192),headDim:one(64,128),dtype:one('bf16')})},
 flashdecode:{'FlashDecode.algorithm':one('simple','optimized'),'FlashDecode.execution':one('unsplit','split'),'FlashDecode.kvLayout':one('contiguous','paged'),'FlashDecode.headMode':one('mha','gqa','mqa'),'FlashDecode.splitSetting':one('auto','2','4','6','8')},
 dpattention:{'DpAttention.modelType':one('dp','tp'),'DpAttention.moeTopology':one('tp','ep')},
 linearattn:{'LinearAttention.targetMode':one('linear','gla'),'LinearAttention.detailMode':one('exact','linear','gla'),'LinearAttention.contextMode':one('prefill','decode'),'LinearAttention.contextLength':one(16,64,256,1024,4096,16384),'LinearAttention.dk':one(16,32,64,128),'LinearAttention.dv':one(16,32,64,128),'LinearAttention.gateStrength':range(0,1)},
 sparseattn:{'SparseAttention.input':value=>value&&typeof value==='object'&&['dsa','csa','hca'].includes(value.mode)&&Object.entries(value).every(([k,v])=>({mode:one('dsa','csa','hca'),tokens:range(1,64),query:one(0,1),topK:range(1,64),window:range(1,64),csaRatio:one(2,4,8),hcaRatio:one(4,8,16),inspect:range(0,63),channel:one(0,1),budgetKiB:one(32,64,128),traceId:v=>typeof v==='string'&&v.length<80}[k]?.(v)))},
 cachearch:{'CacheArchitecture.tokens':one(1,32,129,4096,1000000),'CacheArchitecture.layer':value=>Number.isInteger(value)&&value>=0&&value<40,'CacheArchitecture.phase':one('prefill','decode')},
 quantization:{'Quantization.config':object({mode:one('bf16','w4','fp4','w8','fp8'),batch:range(1,8),context:range(256,8192),kv:one('bf16','fp8','fp4'),prefill:bool}),'quantization/SGLangWorkbench.preset':one('bf16','load-fp8','saved-dynamic','saved-static'),'quantization/SGLangWorkbench.kv':one('auto','fp8-unit','fp8-file'),'Quantization.outliers':bool,'Quantization.algorithm':one('rtn','awq','gptq','smoothquant'),'Quantization.alpha':range(0,1)},
 speculative:{'SpeculativeDecoding.config':object({algorithm:one('eagle2','dspark'),depth:range(1,5),width:range(1,3),budget:range(2,16),blockSize:range(1,8)})},
 engram:{'Engram.systemMode':one('inference','training'),'Engram.slideIdx':one(2,3,4,5)},
 radixcache:{},
};
export function sanitizeSettings(chapter, values){
 if(!values||typeof values!=='object'||Array.isArray(values)) return {};
 return Object.fromEntries(Object.entries(SHARE_SCHEMA[chapter]||{}).filter(([key,valid])=>Object.hasOwn(values,key)&&valid(values[key])).map(([key])=>[key,values[key]]));
}
export function readSharedSettings(chapter,hash){
 try{const raw=new URLSearchParams(hash.split('?')[1]).get('setup');if(!raw||raw.length>12000)return null;const data=JSON.parse(raw);return data.v===1?sanitizeSettings(chapter,data.values):null;}catch{return null;}
}
export function createShareHash(chapter,values,section=''){
 const params=new URLSearchParams();if(section)params.set('section',section);
 params.set('setup',JSON.stringify({v:1,values:sanitizeSettings(chapter,values)}));
 return `#${chapter}?${params}`;
}
