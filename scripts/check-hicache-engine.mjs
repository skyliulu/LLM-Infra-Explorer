import assert from 'node:assert/strict';
import {deriveHiCacheEngineState} from '../src/components/radix-cache/hicache-engine.js';
import {deriveHiCacheLayoutState} from '../src/components/radix-cache/hicache-layout-model.js';
let snapshots=0,configs=0;
for(const pool of ['mha','mla'])for(const prefetch of ['wait_complete','timeout','best_effort'])for(const write of ['write_through','write_through_selective','write_back'])for(const fault of ['none','host_pressure','gpu_pressure','partial_read','rank_lag'])for(const concurrent of [true,false])for(const minLoad of [2,4]){
 const {history}=deriveHiCacheEngineState(0,{pool,prefetch,write,fault,concurrent,minLoad});configs++;
 for(let i=0;i<history.length;i++){
  snapshots++;const s=history[i],prev=history[i-1];
  for(const tier of ['gpu','host','storage']){assert.equal(new Set(s.pools[tier].filter(Boolean)).size,s.pools[tier].filter(Boolean).length);for(const id of s.ready[tier])assert(s.pools[tier].includes(id));}
  for(const n of s.tree)for(const id of n.pages)assert(s.ready.gpu.includes(id)||s.ready.host.includes(id)||s.kind==='evict'&&s.ids.includes(id),'only local ready pages appear in tree');
  if(['allocate','queued','inflight'].includes(s.kind)){const tx=s.transfer;assert(s.ready[tx.from].includes(tx.id));assert(!s.ready[tx.to].includes(tx.id));if(tx.from!=='storage')assert((tx.from==='gpu'?s.gpuRefs:s.hostRefs)[tx.id]>0);}
  if(s.kind==='evict'){const id=s.ids[0];assert.equal((s.from==='gpu'?prev.gpuRefs:prev.hostRefs)[id]||0,0);if(s.from==='host')assert(!s.ready.gpu.includes(id));}
  if(s.kind==='match')assert(s.routes.every(r=>['gpu','host','unknown'].includes(r.source)));
  if(s.kind==='prune')assert(!s.tree.some(n=>n.pages.includes(s.ids[0])));
  if(s.kind==='chunk'){assert(s.tail);assert(!s.ready.gpu.includes(s.tail.id));assert(!s.tree.some(n=>n.pages.includes(s.tail.id))||s.ready.host.includes(s.tail.id));}
  if(s.kind==='consensus'){assert.equal(s.committed,Math.floor(Math.min(...s.rankResult)/2)*2);assert(!s.ready.host.includes(s.ids[0]));}
  if(s.kind==='load')assert(s.gpuRefs[s.ids[0]]>0);
  if(s.kind==='split')assert.deepEqual(s.pools,prev.pools);
 }
 const final=history.at(-1);assert(Object.values(final.gpuRefs).every(n=>n===0));assert(Object.values(final.hostRefs).every(n=>n===0));
}
const normal=deriveHiCacheEngineState(9999);assert.deepEqual(normal.routes.map(r=>r.source),['gpu','host','storage','miss']);
assert(normal.history.some(s=>s.kind==='reader_acquire'&&s.gpuRefs.P0===2));
assert(normal.history.some(s=>s.kind==='prune'&&s.ids.includes('A')));
assert(normal.history.some(s=>s.kind==='prefetch'&&s.tree.some(n=>n.pages.includes('A'))));
for(const pool of ['mha','mla'])for(const layout of ['layer_first','page_first','page_first_direct'])for(const operation of ['layer','page'])for(const page of ['P0','P1','A','B','C','X','Y','Z'])for(const storage of ['scatter','file','direct_file'])for(const registered of [true,false]){
 const m=deriveHiCacheLayoutState({pool,layout,operation,page,storage,registered,step:9999});
 assert.equal(new Set(m.cells.map(c=>c.id)).size,m.cells.length);assert(m.cells.every((c,i)=>c.offset===i*32));
 assert.equal(m.selected.length*32,m.requestedBytes);assert.equal(m.segments.reduce((sum,s)=>sum+s.end-s.start,0),m.requestedBytes);
 assert.equal(m.completedBytes,m.eligible?m.requestedBytes:0);assert.equal(m.totalBytes,m.perPageBytes*3);assert(m.overlapTime<=m.serialTime);
 for(const s of m.schedule)assert(s.computeStart>=s.transferEnd);
}
assert.deepEqual(['layer_first','page_first','page_first_direct'].map(layout=>deriveHiCacheLayoutState({layout}).segments.length),[2,12,6]);
assert.deepEqual(['layer_first','page_first','page_first_direct'].map(layout=>deriveHiCacheLayoutState({layout,operation:'page'}).segments.length),[6,2,2]);
console.log(`HiCache engine: ${configs} configurations / ${snapshots} snapshots; 576 layout configurations passed.`);


// Presentation can skip bookkeeping, but never the transfer or publication evidence.
const {nextVisualStep}=await import('../src/components/radix-cache/hicache-playback.js');
const playback=deriveHiCacheEngineState(0);
const visited=new Set();let checkpoint=0;
while(checkpoint<playback.limit){const next=nextVisualStep(playback.history,checkpoint);assert(next>checkpoint);visited.add(next);checkpoint=next;}
assert.equal(checkpoint,playback.limit);
playback.history.forEach((event,index)=>{if(['inflight','prefetch','load','split','prune','compute','complete'].includes(event.kind))assert(visited.has(index));});
console.log(`Presentation playback: ${visited.size} visible actions; transfer and publication evidence preserved.`);
