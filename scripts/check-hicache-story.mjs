import assert from 'node:assert/strict';
import {deriveHiCacheStoryState,REQUESTS,PAGE_TOKENS,TOKENS_PER_PAGE,requestSharedPrefix} from '../src/components/radix-cache/hicache-story.js';
const final=deriveHiCacheStoryState(Infinity); // non-finite clamps to final
const {history}=deriveHiCacheStoryState(0);
assert.deepEqual(REQUESTS.map((_,i)=>requestSharedPrefix(i)*TOKENS_PER_PAGE),[0,4,2,6]);
for(const words of Object.values(PAGE_TOKENS))assert.equal(words.length,TOKENS_PER_PAGE);
assert.equal(PAGE_TOKENS.A[1],PAGE_TOKENS.B[1]); // Same suffix word does not imply identical KV.
assert.notEqual(PAGE_TOKENS.A[0],PAGE_TOKENS.B[0]);
for(let i=1;i<history.length;i++){
 const s=history[i],before=history[i-1];
 for(const tier of ['gpu','host','storage'])assert.equal(new Set(s.pools[tier].filter(Boolean)).size,s.pools[tier].filter(Boolean).length);
 if(s.from&&s.to){for(const id of s.ids){assert(before.pools[s.from].includes(id));assert(s.pools[s.to].includes(id));}assert.equal(s.traffic,before.traffic+s.ids.length);}
 if(s.kind==='evict'){assert(!before.locked.includes(s.ids[0]));assert(before.pools.storage.includes(s.ids[0]));}
 if(s.kind==='split')assert.deepEqual(s.pools,before.pools,'metadata split must not copy KV');
 if(s.kind==='arrive')assert.deepEqual(s.pools,before.pools,'new requests retain the same cache');
 if(s.kind==='release')for(const id of REQUESTS[s.request].ids)assert(s.pools.gpu.includes(id));
}
const matches=history.filter(s=>s.kind==='match');
assert.deepEqual(matches[3].routes.map(r=>r.source),['gpu','host','storage','miss']);
const branched=history.find(s=>s.request===1&&s.kind==='complete').tree;
assert.equal(branched.find(n=>n.id==='A').parent,branched.find(n=>n.id==='B').parent);
assert.equal(history.at(-1).locked.length,0);
assert.equal(deriveHiCacheStoryState(-2).step,0);
console.log(`HiCache request stream: ${history.length} snapshots; continuity, branching, mixed hits, transfer sources, protected eviction passed.`);
