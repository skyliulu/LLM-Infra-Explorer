import { deriveOverlapModel, COMMIT } from './model.js';

export const LESSON_DEFAULTS = { history: 6, replica: 'A', ep: 8, batch: 4, routing: 'uniform', balance: true, split: true, async: true };
export const LESSON_SOURCE = `https://github.com/deepseek-ai/DeepInfer/blob/${COMMIT}/doc/inference_deployment_qa.md`;
export const GEMM_SOURCE = 'https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/deep_gemm/include/deep_gemm/impls/sm100_fp8_fp4_mega_moe.cuh#L1410-L1441';
export const VIEW_PARENT = { overview: null, cache: 'overview', prefill: 'overview', decode: 'overview', kernel: 'decode', coordination: 'overview', overlap: 'coordination' };
export function normalizeLesson(input = {}) {
 return Object.fromEntries(Object.entries(LESSON_DEFAULTS).map(([key,fallback])=>[key,({history:[0,3,6],replica:['A','B'],ep:[2,8],batch:[1,4],routing:['uniform','hot'],balance:[true,false],split:[true,false],async:[true,false]}[key].includes(input[key])?input[key]:fallback)]));
}
export function lessonPath(view) {
 if(!Object.hasOwn(VIEW_PARENT,view))view='overview';
 const path=[];for(let id=view;id;id=VIEW_PARENT[id])path.unshift(id);return path;
}
export function deriveCache(config, step=0) {
 const c=normalizeLesson(config),phase=Math.max(0,Math.min(3,Math.trunc(step)||0));
 const blocks=Array.from({length:8},(_,i)=>({id:i,label:i<6?`H${i+1}`:`N${i-5}`,hit:i<c.history,kind:i<6?'history':'new',computed:phase===3&&i>=c.history}));
 return {phase,blocks,matched:blocks.filter(b=>b.hit),suffix:blocks.filter(b=>!b.hit),store:blocks.slice(0,c.history),host:phase>=1?blocks.filter(b=>b.hit):[],device:phase>=2?blocks.filter(b=>b.hit||phase===3):[],newPositions:(8-c.history)*128,reusedPositions:c.history*128,total:1024,replica:c.replica};
}
export function deriveMoe(config,step=0,tokenId=0) {
 const c=normalizeLesson(config),phase=Math.max(0,Math.min(3,Math.trunc(step)||0));
 const tokens=Array.from({length:8*c.batch},(_,id)=>({id,origin:Math.floor(id/c.batch),expert:c.routing==='hot'&&id%8<4?0:id%8}));
 const ranks=Array.from({length:8},(_,id)=>({id,group:Math.floor(id/c.ep),weights:Array.from({length:8/c.ep},(_,i)=>({expert:(id%c.ep)*(8/c.ep)+i,replica:false})),jobs:[]}));
 // DeepInfer reserves equal physical-slot capacity on every EP rank. Eight
 // logical experts + any redundancy under EP8 rounds up to sixteen slots.
 const needReplica=c.ep===8&&c.balance;
 const replicaMap=[4,0,0,0,7,1,2,3];
 if(needReplica)for(const rank of ranks)rank.weights.push({expert:replicaMap[rank.id],replica:true});
 const counts=new Map();
 for(const token of tokens) {
  // Illustrative assignment: keep primary copies for ordinary traffic; spread
  // hot E1 across its four slots. This is not the production EPLB policy.
  const group=Math.floor(token.origin/c.ep),owners=ranks.filter(rank=>rank.group===group&&rank.weights.some(w=>w.expert===token.expert&&(!w.replica||(c.routing==='hot'&&token.expert===0))));
  const key=`${group}:${token.expert}`,count=counts.get(key)||0;
  token.owner=owners[count%owners.length].id;counts.set(key,count+1);ranks[token.owner].jobs.push(token);
 }
 for(const rank of ranks)for(const weight of rank.weights)weight.tokens=rank.jobs.filter(token=>token.expert===weight.expert);
 const reads=ranks.reduce((n,rank)=>n+rank.weights.filter(w=>w.tokens.length).length,0),maxJobs=Math.max(...ranks.map(rank=>rank.jobs.length));
 const selected=tokens.find(token=>token.id===tokenId)||tokens[0];
 return {phase,tokens,ranks,groups:8/c.ep,reads,maxJobs,jobs:tokens.length,copies:needReplica?8:0,physicalSlots:ranks.reduce((n,r)=>n+r.weights.length,0),selected,selectedWeight:ranks[selected.owner].weights.find(w=>w.expert===selected.expert),config:c};
}
export function deriveFusion() {
 const serial=[],fused=[];
 for(let i=0;i<3;i++) {
  serial.push({id:`d${i}`,tile:i,type:'dispatch',lane:'link',start:i,end:i+1},{id:`c${i}`,tile:i,type:'compute',lane:'compute',start:3+2*i,end:5+2*i},{id:`r${i}`,tile:i,type:'combine',lane:'link',start:9+i,end:10+i});
  fused.push({id:`d${i}`,tile:i,type:'dispatch',lane:'link',start:i,end:i+1},{id:`c${i}`,tile:i,type:'compute',lane:'compute',start:1+2*i,end:3+2*i},{id:`r${i}`,tile:i,type:'combine',lane:'link',start:3+2*i,end:4+2*i});
 }
 return {serial,fused,total:12,serialEnd:12,fusedEnd:8};
}
export function tileStage(operations,tile,time) {
 const d=operations.find(op=>op.tile===tile&&op.type==='dispatch'),c=operations.find(op=>op.tile===tile&&op.type==='compute'),r=operations.find(op=>op.tile===tile&&op.type==='combine');
 if(time<d.start)return 'pending';if(time<d.end)return 'dispatch';
 if(time<c.start)return 'waitingCompute';if(time<c.end)return 'compute';
 if(time<r.start)return 'waitingCombine';if(time<r.end)return 'combine';return 'ready';
}
export function deriveCoordination(config) {
 const c=normalizeLesson(config),jobs=[];
 if(c.split) {
  for(let i=0;i<4;i++)jobs.push({id:`P${i+1}`,type:'prefill',lane:0,start:i*2,end:i*2+2},{id:`D${i+1}`,type:'decode',lane:1,start:i,end:i+1});
 } else {
  for(let lane=0;lane<2;lane++)jobs.push({id:`P${lane+1}`,type:'prefill',lane,start:0,end:2},{id:`D${lane+1}`,type:'decode',lane,start:2,end:3},{id:`P${lane+3}`,type:'prefill',lane,start:3,end:5},{id:`D${lane+3}`,type:'decode',lane,start:5,end:6});
 }
 return {jobs,totalWork:jobs.reduce((n,j)=>n+j.end-j.start,0),firstDecode:Math.min(...jobs.filter(j=>j.type==='decode').map(j=>j.end)),lastPrefill:Math.max(...jobs.filter(j=>j.type==='prefill').map(j=>j.end)),end:Math.max(...jobs.map(j=>j.end)),split:c.split};
}
export function deriveLesson(config,view='overview',step=0,token=0) {
 const c=normalizeLesson(config),path=lessonPath(view),actual=path.at(-1);
 const moe=deriveMoe(c,step,token),fusion=deriveFusion();
 fusion.tiles=Array.from({length:3},(_,i)=>moe.tokens.slice(Math.floor(i*moe.tokens.length/3),Math.floor((i+1)*moe.tokens.length/3)));
 return {config:c,view:actual,path,rootSelection:actual==='kernel'?'decode':actual==='overlap'?'coordination':actual,cache:deriveCache(c,step),moe,fusion,coordination:deriveCoordination(c),overlap:deriveOverlapModel(c.async,3)};
}
