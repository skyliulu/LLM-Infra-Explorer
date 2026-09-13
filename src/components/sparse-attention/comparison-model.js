import {deriveSparseModel} from './model.js';
import {RECORD_BYTES} from './canvas-model.js';

export function deriveComparisonBatch(m) {
  const lift=model=>{
    const value=r=>[...r.value,Math.sin(((r.position??r.index)+1)*0.37)];
    const reads=model.reads.map(r=>({...r,value:value(r)}));
    return {...model,global:model.global.map(r=>({...r,value:value(r)})),reads,
      output:[0,1,2].map(d=>reads.reduce((sum,r)=>sum+r.weight*r.value[d],0))};
  };
  return [0,1].map(query=>({sparse:lift(deriveSparseModel({...m,mode:m.mode,query})),full:lift(deriveSparseModel({...m,mode:'dense',query}))}));
}

export function deriveComparisonExecution(m, cursor = null) {
  const batch=8,n=m.tokens,queries=deriveComparisonBatch(m);
  const stages=sparse=>{
    const count=sparse?m.mainReads:n,events=[{phase:'ready',count:0}];
    const chunks=(phase,size)=>{for(let i=0;i<size;i+=batch) events.push({phase,count:Math.min(size,i+batch)});};
    if(sparse){if(m.indexed)chunks('index',m.global.length);events.push({phase:'gather',count});}
    chunks('score',count);events.push({phase:'normalize',count});chunks('value',count);events.push({phase:'done',count});
    return events;
  };
  const fullEvents=stages(false),sparseEvents=stages(true),total=Math.max(fullEvents.length,sparseEvents.length)-1;
  const index=cursor===null?total:Math.max(0,Math.min(total,cursor));
  const lane=(sparse,events)=>{
    const event=events[Math.min(index,events.length-1)],order=['ready','index','gather','score','normalize','value','done'];
    const reached=p=>order.indexOf(event.phase)>=order.indexOf(p),count=sparse?m.mainReads:n;
    const scored=reached('normalize')?count:event.phase==='score'?event.count:0;
    const valued=reached('done')?count:event.phase==='value'?event.count:0;
    const indexCount=sparse&&m.indexed?(reached('gather')?m.global.length:event.phase==='index'?event.count:0):0;
    const partial=queries.map(q=>[0,1,2].map(d=>q[sparse?'sparse':'full'].reads.slice(0,valued).reduce((sum,r)=>sum+r.weight*r.value[d],0)));
    return {...event,count,scored,valued,indexCount,partial,normalized:reached('normalize'),gathered:!sparse||reached('gather'),done:event.phase==='done',
      scoreStart:Math.max(0,scored-batch),valueStart:Math.max(0,valued-batch),
      readBytes:2*((scored+valued)*RECORD_BYTES.global/2+indexCount*RECORD_BYTES.index),
      storedBytes:sparse?m.resources.storedBytes:m.resources.baselineBytes};
  };
  const full=lane(false,fullEvents),sparse=lane(true,sparseEvents);
  return {index,total,batch,queries,full,sparse,done:full.done&&sparse.done,phase:sparse.phase,indexCount:sparse.indexCount,indexStart:Math.max(0,sparse.indexCount-batch),gathered:sparse.gathered};
}

