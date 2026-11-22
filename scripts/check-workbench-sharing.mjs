import assert from 'node:assert/strict';
import {SHARE_SCHEMA, sanitizeSettings, createShareHash, readSharedSettings} from '../src/lib/experiment-sharing.js';
import {LESSON_DEFAULTS} from '../src/components/deepinfer/lesson-model.js';
const lessonSettings={'DeepInfer.routeRequest':'short','DeepInfer.lesson':{...LESSON_DEFAULTS,history:0,batch:1,ep:2,split:false}};
assert.deepEqual(readSharedSettings('deepinfer',createShareHash('deepinfer',lessonSettings)),lessonSettings);
assert.deepEqual(sanitizeSettings('deepinfer',{'DeepInfer.lesson':{...LESSON_DEFAULTS,history:9}}),{});
assert.deepEqual(sanitizeSettings('deepinfer',{'DeepInfer.lesson':{...LESSON_DEFAULTS,step:3}}),{});
const examples={
 llm:{'LLMInference.modelType':'dense','LLMInference.topK':2},
 parallel:{'ParallelStrategies.degrees':{dp:2,tp:2,pp:1,cp:1,ep:1,etp:1},'ParallelStrategies.mappingModel':'dcpReuse','ParallelStrategies.attentionMode':'dpAttention'},
 flash:{'FlashAttention.config':{modelType:'flash',version:'v4',direction:'forward',causal:true,sequenceLength:8192,headDim:128,dtype:'bf16'}},
 flashdecode:{'FlashDecode.algorithm':'optimized','FlashDecode.splitSetting':'4'},
 dpattention:{'DpAttention.modelType':'dp','DpAttention.moeTopology':'ep'},
 linearattn:{'LinearAttention.detailMode':'exact','LinearAttention.contextLength':16384,'LinearAttention.modern':{chunkSize:128,alpha:.9,beta:1,ratio:'hybrid_7_1',batchSize:32}},
 sparseattn:{'SparseAttention.input':{mode:'hca',tokens:64,query:1,topK:2,window:8,csaRatio:4,hcaRatio:8,inspect:2,channel:0,budgetKiB:64}},
 cachearch:{'CacheArchitecture.tokens':1000000,'CacheArchitecture.phase':'decode','CacheArchitecture.layer':39},
 quantization:{'Quantization.config':{mode:'fp4',batch:8,context:8192,kv:'fp4',prefill:true},'quantization/SGLangWorkbench.preset':'saved-static','Quantization.algorithm':'quarot'},
 speculative:{'SpeculativeDecoding.config':{algorithm:'dspark',depth:3,width:2,budget:8,blockSize:8},'SpeculativeDecoding.load':10},
 engram:{'Engram.systemMode':'training','Engram.samplePreset':'collision','Engram.sampleQuery':'orthogonal'},
 radixcache:{'RadixCache.story':{prefetch:'timeout',write:'write_back',fault:'host_pressure'},'RadixCache.hybrid':{mode:'extra',sched:'lpm'},'RadixCache.layoutPool':'mla','RadixCache.layout':{layout:'page_first_direct',operation:'page',layer:2,backend:'direct',storage:'direct_file',registered:true,copyTime:4,computeTime:6}},
 mooncake:{'Mooncake.mode':'instance','Mooncake.poolPages':48,'Mooncake.cost':{medium:'ssd',hitTokens:4096,prefillRate:12000}},
 deepinfer:lessonSettings,
};
assert.deepEqual(Object.keys(examples).sort(),Object.keys(SHARE_SCHEMA).sort());
for(const [chapter,values] of Object.entries(examples)){
 assert.deepEqual(sanitizeSettings(chapter,values),values,chapter);
 const hash=createShareHash(chapter,values,'stable-section');
 assert.deepEqual(readSharedSettings(chapter,hash),values);
 assert.equal(new URLSearchParams(hash.split('?')[1]).get('section'),'stable-section');
 assert.deepEqual(sanitizeSettings(chapter,{unknown:true}),{});
 assert.equal(readSharedSettings(chapter,`#${chapter}?setup=garbage`),null);
 assert.equal(readSharedSettings(chapter,`#${chapter}?setup=${'x'.repeat(12001)}`),null);
}
assert.deepEqual(sanitizeSettings('quantization',{'Quantization.config':{mode:'invalid'}}),{});
assert.deepEqual(sanitizeSettings('cachearch',{'CacheArchitecture.layer':40,'CacheArchitecture.tokens':Infinity}),{});
assert.deepEqual(sanitizeSettings('parallel',{'ParallelStrategies.degrees':{dp:4,tp:4,pp:4,cp:4,ep:4,etp:4}}),{});
assert.deepEqual(readSharedSettings('llm','#llm?setup='+encodeURIComponent('{"v":1,"values":{"__proto__":{"polluted":true}}}')),{});
assert.equal({}.polluted,undefined);
assert.deepEqual(sanitizeSettings('deepinfer',{'DeepInfer.scenario':'unknown','DeepInfer.prefillBudget':6,'DeepInfer.overlap':'true','DeepInfer.step':3,'DeepInfer.playing':true}),{});
console.log('Sharing schema: all 14 chapters round-trip; malformed, oversized, unknown and out-of-range settings rejected.');

assert.deepEqual(sanitizeSettings('radixcache',{'HiCache.scenario':'unknown','HiCache.prefetch':'forever','HiCache.write':true}),{});

assert.deepEqual(sanitizeSettings('deepinfer',{'DeepInfer.scenario':'mixed','DeepInfer.verificationBudget':9,'DeepInfer.kernelGpu':true,'DeepInfer.cacheFormat':'index'}),{},'Retired dependency experiments are ignored in older share links');

assert.deepEqual(sanitizeSettings('deepinfer',{'DeepInfer.performance':{hit:80},'DeepInfer.scenario':'mixed'}),{},'Old chapter settings are retired rather than mapped into unrelated lessons');
