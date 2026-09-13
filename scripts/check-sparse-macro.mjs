import assert from 'node:assert/strict';
import {deriveCanvasModel} from '../src/components/sparse-attention/canvas-model.js';
import {deriveComparisonExecution} from '../src/components/sparse-attention/comparison-model.js';
let cases=0;
for(const mode of ['dsa','csa','hca']) for(const tokens of [1,2,8,9,29,64]) for(const topK of [1,2,4,8]) for(const query of [0,1]) {
 const m=deriveCanvasModel({mode,tokens,topK,query});
 const done=deriveComparisonExecution(m);
 for(let cursor=0;cursor<=done.total;cursor++){
  const e=deriveComparisonExecution(m,cursor);
  assert.ok(e.indexCount<=tokens);
  assert.ok(e.full.scored<=tokens && e.sparse.scored<=m.mainReads);
  if(!e.gathered) assert.equal(e.sparse.scored,0);
  for(const lane of [e.full,e.sparse]) if(!lane.normalized) assert.equal(lane.valued,0);
  if(cursor===1){assert.equal(e.full.phase,'score');assert.equal(e.sparse.phase,m.indexReads?'index':'gather');}
  assert.equal(e.full.storedBytes,m.resources.baselineBytes);
  assert.equal(e.sparse.storedBytes,m.resources.storedBytes);
  if(e.phase==='score') assert.equal(e.indexCount,m.indexReads);
  if(e.done){assert.equal(e.full.readBytes,2*m.resources.baselineBytes);assert.equal(e.sparse.readBytes,2*m.resources.readBytes);}
  if(e.done) for(const [name,model] of [['full',m.baseline],['sparse',m]]) {
   assert.equal(e[name].scored,model.reads.length);
   assert.equal(e[name].valued,model.reads.length);
   assert.equal(e[name].partial.length,2);
   e.queries.forEach((q,b)=>{
    assert.equal(e[name].partial[b].length,3);
    q[name].output.forEach((v,d)=>assert.ok(Math.abs(v-e[name].partial[b][d])<1e-10));
    assert.equal(q[name].reads[0].value.length,3);
    assert.ok(Math.abs(q[name].reads.reduce((sum,r)=>sum+r.weight,0)-1)<1e-10);
   });
  }
  cases++;
 }
}
console.log(`PASS ${cases} macro execution snapshots: scan, gather, scores, normalization, partial sums and final outputs.`);
