import {deriveFusion} from './lesson-model.js';

export function getKernelBuffers(time = 3) {
 const total=14;
 const tick = Math.max(0, Math.min(total, Number.isFinite(Number(time)) ? Math.floor(Number(time)) : 0));
 const fusion = deriveFusion();
 return {
  time:tick,total,
  paths:['serial','fused'].map(id=>{
   // All ABC blocks belong to one expert-owner rank. After its final remote
   // output store, publish readiness / wait for selected peers, then reduce.
   // The one-owner/top-1 example has one selected peer; durations are schematic.
   const writesEnd=Math.max(...fusion[id].filter(op=>op.type==='combine').map(op=>op.end));
   const final={ready:writesEnd,reduceStart:writesEnd+1,end:writesEnd+2};
   const completion=tick<final.ready?'awaitOwner':tick<final.reduceStart?'awaitPeers':tick<final.end?'reducing':'returned';
   return {id,final,rankReady:tick>=final.ready,completion,blocks:[0,1,2].map(tile=>{
   const ops=fusion[id],dispatch=ops.find(o=>o.tile===tile&&o.type==='dispatch'),compute=ops.find(o=>o.tile===tile&&o.type==='compute'),combine=ops.find(o=>o.tile===tile&&o.type==='combine');
   const active=op=>tick>=op.start&&tick<op.end;
   return {id:['A','B','C'][tile],
    input:tick<dispatch.start?'empty':active(dispatch)?'writing':tick<compute.start?'readable':active(compute)?'reading':'consumed',
    compute:tick<compute.start?'waiting':active(compute)?'computing':'computed',
    output:tick<combine.start?'empty':active(combine)?'writing':tick<final.reduceStart?'written':tick<final.end?'reading':'consumed',
    partialWritten:tick>=combine.end,
    rankReady:tick>=final.ready,completion,
    returned:tick>=final.end,
    active:active(dispatch)?'dispatch':active(compute)?'compute':active(combine)?'combine':completion,
    dispatch,computeOperation:compute,combine};
  })};})
 };
}

export const DECODE_CANDIDATES = Object.freeze([
 {id:'A',requests:4,kv:96},
 {id:'B',requests:8,kv:24},
 {id:'C',requests:6,kv:64},
 {id:'D',requests:9,kv:40},
]);
export function getDecodeRouting(request='long',method='dual') {
 const type=request==='short'?'short':'long',policy=method==='count'?'count':'dual',incoming=type==='short'?8:64;
 // A small counterexample, not an implementation of the production load balancer.
 const metric=policy==='count'||type==='short'?'requests':'kv';
 const target=DECODE_CANDIDATES.reduce((best,gpu)=>gpu[metric]<best[metric]?gpu:best);
 return {request:type,method:policy,incoming,target:target.id,metric,
  before:DECODE_CANDIDATES.map(gpu=>({...gpu})),
  after:DECODE_CANDIDATES.map(gpu=>({...gpu,requests:gpu.requests+(gpu.id===target.id?1:0),kv:gpu.kv+(gpu.id===target.id?incoming:0)}))};
}
