import assert from 'node:assert/strict';
import {deriveCacheArchitectureModel,LAYERS,KV_SOURCES,INDEX_SOURCES} from '../src/components/cache-architecture/model.js';
assert.equal(LAYERS.filter(l=>l.mode==='full').length,4);
assert.equal(LAYERS.filter(l=>l.mode==='reindex').length,4);
assert.equal(LAYERS.filter(l=>l.mode==='reuse').length,30);
assert.equal(LAYERS.filter(l=>l.mode==='local').length,2);
for(const tokens of [1,2,32,129,4096,1000000]) for(const phase of ['prefill','decode']) for(let layer=0;layer<40;layer++) {
 const m=deriveCacheArchitectureModel({tokens,layer,phase,entry:9999999});
 assert.equal(m.total,(3*Math.floor(tokens/2)+tokens)*356);
 assert.equal(m.pending,3*(tokens%2));
 assert.equal(m.localRecords,40*Math.min(tokens,128));
 assert.equal(m.total,m.mainBytes+m.indexBytes);
 assert.equal(m.globalEnd,tokens);
 assert.equal(m.globalEnd-m.globalStart+1,phase==='prefill'?tokens:1);
 assert.equal(m.globalEnd-m.tailStart+1,phase==='prefill'?Math.min(tokens,128):1);
 assert.ok(m.total<m.shared16 && m.shared16<m.unshared16);
 if(layer>=2){assert.ok(KV_SOURCES.includes(m.selected.owner));assert.ok(INDEX_SOURCES.includes(m.selected.indexOwner));assert.ok(m.selected.owner<=m.selected.indexOwner && m.selected.indexOwner<=layer);}
 if(m.group?.count){assert.ok(m.sourceTokens.every(v=>v<=tokens));assert.ok(m.entry<m.group.count);}
 if(phase==='decode') assert.equal(m.encoderWork+m.decoderWork,40);
 else assert.equal(m.encoderWork+m.decoderWork,20*tokens+20*Math.min(tokens,128));
}
assert.equal(deriveCacheArchitectureModel({tokens:1000000}).total,890000000);
assert.equal(deriveCacheArchitectureModel({layer:25}).selected.owner,20);
assert.equal(deriveCacheArchitectureModel({layer:25}).selected.indexOwner,24);
assert.equal(deriveCacheArchitectureModel({tokens:1,layer:2}).group.count,0);
console.log('Cache architecture: 480 snapshots; owners, index sources, odd groups, record bounds, budgets and CED work passed.');

for(const n of [1,32,128,129,4096,1000000]) for(const phase of ['prefill','decode']) {
 const m=deriveCacheArchitectureModel({tokens:n,phase}),b=m.benefits;
 assert.equal(b.workAfter,m.encoderWork+m.decoderWork);
 assert.equal(b.workBefore,m.baselineWork);
 assert.ok(b.workReduction>=0 && b.workReduction<.5);
 assert.equal(b.boundedReplay,Math.min(n,128));
 assert.ok(b.exactReplay>=b.boundedReplay);
 if(phase==='decode'||n<=128) assert.equal(b.workReduction,0);
 assert.equal(b.globalBefore/b.globalAfter,b.capacityRatio);
}
console.log('Business comparisons: phase, short prompts, replay bounds and resource units passed.');

for(const tokens of [1,32,128,129,4096,1000000]) for(const phase of ['prefill','decode']) {
 const m=deriveCacheArchitectureModel({tokens,phase}),v=m.technical;
 assert.equal(v.decoderRows+v.skippedRows,v.inputRows);
 assert.equal(v.projectionRows,v.inputRows);
 assert.equal(v.windowEnd-v.windowStart+1,v.decoderRows);
 assert.equal(v.firstHalfWork+v.secondHalfWork,m.benefits.workAfter);
 if(phase==='decode') assert.equal(v.skippedRows,0);
}
const {technicalCopy}=await import('../src/components/cache-architecture/technical-content.js');
assert.deepEqual(Object.keys(technicalCopy.zh).sort(),Object.keys(technicalCopy.en).sort());
for(const lang of ['zh','en']) for(const stage of ['baseline','encoder','projection','window','generation']) {
 for(const suffix of ['Why','Input','Operation','Output','Boundary']) assert.ok(technicalCopy[lang][stage+suffix]);
}
console.log('CED technical flow: global/full versus local/tail positions, no decode bypass, inspector copy parity passed.');

for(const lang of ['zh','en']) for(const suffix of ['Why','Input','Operation','Output','Boundary']) assert.ok(technicalCopy[lang]['windowDecode'+suffix]);
