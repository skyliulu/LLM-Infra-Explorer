import {RECORD_BYTES} from './canvas-model.js';

// A pedagogical dependency schedule over already-resident caches, not GPU timing.
export function deriveExecution(m, progress=null) {
 const events=[{id:'project'}];
 if(m.indexed) events.push({id:'index'}, {id:'select'});
 for(let i=0;i<m.reads.length;i+=4) events.push({id:'read',ids:m.reads.slice(i,i+4).map(r=>r.id)});
 events.push({id:'score'},{id:'normalize'},{id:'output'});
 const enabled=progress!==null, completed=enabled?Math.max(0,Math.min(events.length,Math.trunc(Number.isFinite(progress)?progress:0))):events.length;
 const passed=events.slice(0,completed), ready=id=>passed.some(e=>e.id===id);
 const readIds=passed.filter(e=>e.id==='read').flatMap(e=>e.ids), readSet=new Set(readIds);
 const current=events[completed]??null, done=completed===events.length;
 const globalReads=m.global.filter(r=>readSet.has(r.id)).length,localReads=m.local.filter(r=>readSet.has(r.id)).length;
 const indexReads=m.indexed&&ready('index')?m.indexReads:0;
 const selectionReady=!m.indexed||ready('select');
 const readBytes=globalReads*RECORD_BYTES.global+localReads*RECORD_BYTES.local+indexReads*RECORD_BYTES.index;
 const phases=[...new Set(events.map(e=>e.id))].map(id=>({id,status:events.map((e,i)=>e.id===id?i:-1).filter(i=>i>=0).every(i=>i<completed)?'passed':current?.id===id?'active':'pending'}));
 return {enabled,completed,total:events.length,events,phases,current,done,phase:current?.id??'done',
  queryReady:ready('project'),indexReady:ready('index'),selectionReady,scoreReady:ready('score'),weightsReady:ready('normalize'),outputReady:ready('output'),
  activeGlobal:(current?.ids??[]).some(id=>m.global.some(r=>r.id===id)),activeLocal:(current?.ids??[]).some(id=>m.local.some(r=>r.id===id)),
  readIds,activeIds:current?.ids??[],globalReads,localReads,indexReads,readBytes,targetBytes:m.resources.readBytes};
}

export function executionView(m,e) {
 if(!e.enabled) return m;
 const read=new Set(e.readIds),active=new Set(e.activeIds),chosen=new Set(e.selectionReady?m.matrices.selection.globalIds:[]);
 const mark=rows=>rows.map(r=>({...r,read:read.has(r.id),chosen:chosen.has(r.id),transferring:active.has(r.id)}));
 const reads=m.matrices.reads.filter(r=>read.has(r.id)).map(r=>({...r,read:true,cells:r.cells.map((v,i)=>(i===2&&!e.scoreReady)||(i===3&&!e.weightsReady)?null:v)}));
 return {...m,globalReads:e.globalReads,mainReads:e.globalReads+e.localReads,indexReads:e.indexReads,
  matrices:{...m.matrices,global:mark(m.matrices.global),local:mark(m.matrices.local),reads,
   selection:{...m.matrices.selection,globalIds:e.selectionReady?m.matrices.selection.globalIds:[],localRange:e.localReads?[m.local.filter(r=>read.has(r.id))[0].id,m.local.filter(r=>read.has(r.id)).at(-1).id]:[]}}};
}
