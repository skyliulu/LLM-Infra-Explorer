import assert from 'node:assert/strict';
import {getKernelBuffers,getDecodeRouting,DECODE_CANDIDATES} from '../src/components/deepinfer/mechanism-model.js';

const t3=getKernelBuffers(3),serial=t3.paths[0],fused=t3.paths[1];
assert.equal(serial.blocks[1].input,'readable','B has arrived but waits for shared compute');
assert.equal(fused.blocks[0].output,'writing','A writes a partial contribution into the source slot');
assert.equal(fused.blocks[1].compute,'computing','B computes concurrently with A return');
assert.equal(fused.blocks[2].input,'readable','C input waits without being discarded');
assert.equal(getKernelBuffers(8).paths[0].blocks[0].output,'empty','No remote contribution is written before the serial return stage');
// Independent source-path oracle: GEMM2 remote stores precede owner-rank
// readiness, selected-peer wait, and final reduction. Arrival is not output.
const handoff=t=>getKernelBuffers(t).paths.find(p=>p.id==='fused');
assert.equal(handoff(4).blocks[0].partialWritten,true);
assert.equal(handoff(4).blocks[0].returned,false);
assert.equal(handoff(4).blocks[0].output,'written');
assert.equal(handoff(4).blocks[1].compute,'computing');
assert.equal(handoff(7).rankReady,false,'Owner cannot publish while its last remote store is active');
assert.equal(handoff(8).completion,'awaitPeers');
assert.equal(handoff(9).completion,'reducing');
assert.ok(handoff(10).blocks.every(b=>b.returned));
assert.equal(getKernelBuffers(12).paths[0].completion,'awaitPeers','Serial stores alone do not complete the output');
assert.equal(getKernelBuffers(13).paths[0].completion,'reducing');
for(let tick=0;tick<=14;tick++)for(const path of getKernelBuffers(tick).paths){
 assert.equal(path.blocks.length,3);
 assert.equal(new Set(path.blocks.map(b=>b.id)).size,3);
 for(const block of path.blocks){
  if(block.input==='reading')assert.ok(tick>=block.dispatch.end,'no read before dispatch write completion');
  if(['reading','written'].includes(block.output))assert.ok(tick>=block.combine.end,'partial slot is not filled before remote stores finish');
  if(block.output==='reading')assert.ok(path.rankReady&&tick>=path.final.reduceStart,'no final read before owner readiness and peer wait');
  if(block.returned)assert.ok(path.blocks.every(b=>b.partialWritten)&&tick>=path.final.end,'final output needs every selected owner write and reduction');
 }
}
assert.ok(getKernelBuffers(14).paths.every(p=>p.blocks.every(b=>b.returned)));
assert.equal(getKernelBuffers(-5).time,0);assert.equal(getKernelBuffers(Infinity).time,0);assert.equal(getKernelBuffers(19).time,14);
for(const request of ['short','long'])for(const method of ['count','dual']){
 const m=getDecodeRouting(request,method),sum=(rows,key)=>rows.reduce((n,r)=>n+r[key],0);
 assert.equal(sum(m.after,'requests')-sum(m.before,'requests'),1);
 assert.equal(sum(m.after,'kv')-sum(m.before,'kv'),request==='long'?64:8);
 assert.equal(m.after.filter((r,i)=>r.requests!==m.before[i].requests).length,1);
 assert.deepEqual(m.before,DECODE_CANDIDATES);
}
assert.equal(getDecodeRouting('long','count').target,'A');
assert.equal(getDecodeRouting('long','dual').target,'B');
assert.equal(getDecodeRouting('short','dual').target,'A');
assert.equal(getDecodeRouting('long','count').after[0].kv,160);
assert.equal(getDecodeRouting('long','dual').after[1].kv,88);
console.log('PASS DeepInfer mechanism panels: partial-writeback / owner-ready / peer-wait / reduction source oracles at 15 times, same-input routing conservation and long/short counterexamples.');
