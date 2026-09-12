import assert from 'node:assert/strict';
import {deriveCacheArchitectureModel} from '../src/components/cache-architecture/model.js';
import {deriveCedExecution} from '../src/components/cache-architecture/execution.js';
for(const tokens of [1,32,128,129,4096,1000000]) for(const phase of ['prefill','decode']) {
 const m=deriveCacheArchitectureModel({tokens,phase});
 let last=0;
 for(let step=0;step<=10;step++){
  const s=deriveCedExecution(m,step);
  assert(s.work>=last);last=s.work;
  assert.equal(s.written,step<5?0:phase==='decode'?1:tokens);
  assert.equal(s.existing,phase==='decode'?tokens-1:0);
  assert.equal(s.resident,s.existing+s.written);
  assert.equal(s.bytes,s.resident*356);
  if(step<5)assert.equal(s.decoderLayers,0);
  assert.equal(s.done,step===10);
 }
 const end=deriveCedExecution(m,10);
 assert.equal(end.work,m.encoderWork+m.decoderWork);
 assert.equal(end.resident,tokens);
 assert.equal(end.decoderLayers,20);
 assert.equal(deriveCedExecution(m,6).bytes,end.bytes);
}
console.log('PASS 132 execution snapshots: causality, retained history, single allocation, decoder work and final readiness');
