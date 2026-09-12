import assert from 'node:assert/strict';
import {deriveHierarchicalIndexer as derive,selectCandidateBlocks} from '../src/components/cache-architecture/hierarchical.js';
let checks=0;
for(const tokens of [1,7,8,9,32,129,4096,16384,16385,1000000]){
 for(let layer=0;layer<40;layer++){
  const m=derive({tokens,layer});
  assert.equal(m.enabled,layer>=20);
  assert.ok(m.topCount<=tokens&&m.topCount<=512);
  assert.ok(m.candidateCount<=m.candidateBound&&m.candidateCount<=tokens);
  assert.ok(m.blocks.at(-1).kept);
  assert.ok(m.blocks.filter(b=>b.kept).length<=3);
  assert.equal(m.topIds.length,Math.min(2,tokens));
  assert.ok(m.topIds.every(id=>id<tokens));
  assert.ok(m.topIds.every(id=>m.rows[id].candidate)); // Pool capacity exceeds Top-K, including the pinned slot.
  if(layer>=20&&m.reuse)assert.deepEqual(m.topIds,derive({tokens,layer:m.source}).topIds);
  if(layer>=20)assert.deepEqual(m.blocks,derive({tokens,layer:20}).blocks);
  checks++;
 }
}
// Newest block wins a slot even with a much lower maximum than older blocks.
assert.deepEqual(selectCandidateBlocks([99,90,80,70,0],2,2).filter(b=>b.kept).map(b=>b.id),[0,2]);
assert.notDeepEqual(derive({layer:24}).topIds,derive({layer:28}).topIds);
assert.equal(derive({tokens:16385}).candidateCount,16377);
assert.equal(derive({tokens:1000000}).candidateBound,16384);
console.log(`Hierarchical indexer: ${checks} snapshots + block-selection invariants passed.`);
