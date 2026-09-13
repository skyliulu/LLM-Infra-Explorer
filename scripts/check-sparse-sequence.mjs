import assert from 'node:assert/strict';
import {deriveCanvasModel} from '../src/components/sparse-attention/canvas-model.js';
import {deriveExecution,advanceSequence} from '../src/components/sparse-attention/execution-model.js';
let checks=0;
for(const mode of ['dsa','csa','hca']) for(const limit of [1,8,24]) {
 let state={position:null,progress:null},previous=null;
 state=advanceSequence(state,limit,0);
 const visited=new Set(),queries=new Set();
 for(let guard=0;guard<2000;guard++) {
  const m=deriveCanvasModel({mode,tokens:state.position,queryPosition:state.position-1,followLatest:true,traceId:'T3'});
  const e=deriveExecution(m,state.progress);
  assert.deepEqual(m.tracedRecord,m.local.at(-1)??m.global.at(-1)??null);
  visited.add(state.position);queries.add(JSON.stringify(m.mainQuery));
  assert.ok(m.global.every(r=>r.sources.every(p=>p<state.position)));
  if(previous&&previous.position===state.position-1){
   for(const old of previous.model.global) assert.deepEqual(m.global.find(r=>r.id===old.id)?.key,old.key);
  }
  const next=advanceSequence(state,limit,e.total);
  if(next.position!==state.position){assert.ok(e.outputReady);assert.equal(next.progress,0);}
  else if(!e.done) assert.equal(next.progress,state.progress+1);
  checks++;
  if(e.done&&state.position===limit){assert.deepEqual(next,state);break;}
  previous={position:state.position,model:m};state=next;
 }
 assert.equal(visited.size,limit);assert.equal(queries.size,limit);
}
console.log(`PASS ${checks} sequence steps: all positions, causal cache, varying queries, output-before-advance latest trace and final stop.`);
