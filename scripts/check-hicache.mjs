import assert from 'node:assert/strict';
import {deriveHiCacheState,HC_SCENARIOS,HC_PREFETCH,HC_WRITE,HC_REQUEST} from '../src/components/radix-cache/hicache-model.js';
let count=0;
for(const storageMode of ['hierarchical','gpu'])for(const scenario of HC_SCENARIOS)for(const prefetch of HC_PREFETCH)for(const write of HC_WRITE){
 const params={scenario,prefetch,write,storageMode},plan=deriveHiCacheState(params);
 for(let step=0;step<=plan.limit;step++){
  const m=deriveHiCacheState({...params,step});
  for(const tier of ['gpu','host','storage'])assert.ok(m.pools[tier].length<=m.capacity[tier]);
  assert.equal(m.reused+m.computed,5);
  assert.equal(new Set(m.pools.gpu.filter(Boolean)).size,m.pools.gpu.filter(Boolean).length);
  if(m.event?.kind==='compute')assert.ok(HC_REQUEST.every(id=>m.pools.gpu.includes(id)));
  if(m.event?.kind==='evict'){assert.ok(m.pools.gpu.includes('P0'));assert.ok(!m.pools.gpu.includes('X'));assert.equal(m.pools.gpu.indexOf('Y'),2,'eviction must not relocate other physical pages');if(m.hierarchical&&write==='write_back')assert.ok(m.pools.host.includes('X'));}
  if(m.event?.to)assert.ok(m.event.ids.every(id=>m.pools[m.event.to].includes(id)));
  if(m.done){assert.ok(HC_REQUEST.every(id=>m.pools.gpu.includes(id)));assert.ok(m.pages.every(p=>!p.locked));}
  if(!m.hierarchical){assert.equal(m.pools.host.length,0);assert.equal(m.pools.storage.length,0);assert.equal(m.transfers,0);assert.equal(m.recomputeTokens,m.baselineTokens);}
  const previous=step?deriveHiCacheState({...params,step:step-1}):null;
  if(previous&&m.event?.from&&m.event?.to)assert.ok(m.event.ids.every(id=>previous.pools[m.event.from].includes(id)),'copy sources exist before transfer');
  count++;
 }
}
assert.equal(deriveHiCacheState({prefetch:'wait_complete'}).reused,4);
assert.equal(deriveHiCacheState({prefetch:'timeout'}).reused,3);
assert.equal(deriveHiCacheState({prefetch:'best_effort'}).reused,2);
assert.equal(deriveHiCacheState({scenario:'miss'}).reused,0);
console.log(`HiCache: ${count} snapshots passed: prefix continuity, sources, capacities, protection, acknowledgments and policies.`);

assert.equal(deriveHiCacheState({scenario:'peer'}).localPrefix,0);
assert.equal(deriveHiCacheState({scenario:'peer'}).reused,4);
assert.equal(deriveHiCacheState({scenario:'peer'}).loadingPages,8);

for(const storageMode of ['hierarchical','gpu']){const initial=deriveHiCacheState({scenario:'split',storageMode});const splitStep=initial.events.findIndex(e=>e.kind==='split')+1;const after=deriveHiCacheState({scenario:'split',storageMode,step:splitStep});assert.deepEqual(after.pools,initial.pools,'split cannot copy or relocate KV');assert.deepEqual(initial.tree[0].pages,['P0','P1','A']);assert.deepEqual(after.tree.find(n=>n.id==='shared').pages,['P0','P1']);assert.equal(after.tree.find(n=>n.id==='A').parent,'shared');assert.equal(after.tree.find(n=>n.id==='P2').parent,'shared');assert.ok(after.pages.find(p=>p.id==='P0').locked);assert.ok(!after.pages.find(p=>p.id==='A').locked);}
