import assert from 'node:assert/strict';
import {deriveCache,deriveMoe,deriveFusion,deriveCoordination,deriveLesson,lessonPath,normalizeLesson,LESSON_DEFAULTS,tileStage} from '../src/components/deepinfer/lesson-model.js';
import {i18n} from '../src/components/deepinfer/lesson-content.js';

assert.deepEqual(Object.keys(i18n.zh).sort(),Object.keys(i18n.en).sort());
assert.deepEqual(normalizeLesson({ep:64,history:100,replica:'C',batch:-1}),LESSON_DEFAULTS);
for(const history of [0,3,6])for(const replica of ['A','B'])for(let step=0;step<=3;step++){
 const m=deriveCache({history,replica},step);
 assert.equal(m.reusedPositions+m.newPositions,1024);
 assert.equal(m.store.length,history);
 assert.deepEqual(m.matched.map(b=>b.id),Array.from({length:history},(_,i)=>i));
 assert.equal(m.suffix.length,8-history);
 assert.equal(m.host.length,step>=1?history:0);
 assert.equal(m.device.length,step===3?8:step>=2?history:0);
 assert.equal(m.replica,replica);
 if(step===3)assert.deepEqual(m.device.map(b=>b.id),[0,1,2,3,4,5,6,7]);
}
let moeStates=0;
for(const ep of [2,8])for(const batch of [1,4])for(const routing of ['uniform','hot'])for(const balance of [false,true])for(let step=0;step<=3;step++){
 const m=deriveMoe({ep,batch,routing,balance},step,999);
 assert.equal(m.jobs,8*batch);
 // Source constraint: EP ranks reserve equal physical expert capacities.
 const groupSlots=8+(ep===8&&balance?8:0);
 for(let g=0;g<8/ep;g++){
  const ranks=m.ranks.filter(r=>r.group===g);
  assert.deepEqual(ranks.map(r=>r.weights.length),Array(ep).fill(groupSlots/ep));
 }
 assert.equal(m.physicalSlots,(8/ep)*groupSlots);
 assert.equal(m.selected.id,0);
 assert.deepEqual(m.ranks.flatMap(r=>r.jobs).map(t=>t.id).sort((a,b)=>a-b),Array.from({length:8*batch},(_,i)=>i));
 for(const token of m.tokens){
  const rank=m.ranks[token.owner];
  assert.equal(rank.group,Math.floor(token.origin/ep));
  assert.ok(rank.weights.some(w=>w.expert===token.expert));
 }
 for(let group=0;group<8/ep;group++)assert.deepEqual(m.ranks.filter(r=>r.group===group).flatMap(r=>r.weights.filter(w=>!w.replica).map(w=>w.expert)).sort((a,b)=>a-b),[0,1,2,3,4,5,6,7]);
 assert.equal(m.reads,m.ranks.reduce((n,r)=>n+r.weights.filter(w=>w.tokens.length>0).length,0));
 assert.equal(m.ranks.reduce((n,r)=>n+r.jobs.length,0),8*batch);
 moeStates++;
}
assert.equal(deriveMoe({ep:2,batch:4}).reads,32);
assert.equal(deriveMoe({ep:8,batch:4}).reads,8);
assert.equal(deriveMoe({ep:2,batch:1}).reads,deriveMoe({ep:8,batch:1}).reads,'Low-load routing has no duplicate weight reads to eliminate');
const hot=deriveMoe({ep:8,batch:4,routing:'hot',balance:false}),balanced=deriveMoe({ep:8,batch:4,routing:'hot',balance:true});
assert.equal(hot.maxJobs,16);assert.equal(balanced.maxJobs,4);
assert.equal(hot.jobs,balanced.jobs);assert.equal(balanced.copies,8);
assert.equal(balanced.physicalSlots,16,'8 logical + minimum 3 redundant slots must round to 16 under EP8');
assert.equal(deriveMoe({ep:8,batch:1,routing:'uniform',balance:true}).physicalSlots,16,'Idle redundancy stays resident even at low load');
assert.equal(hot.reads,5);assert.equal(balanced.reads,8,'Replica balancing has an explicit weight-read/storage cost');

const f=deriveFusion();
for(const ops of [f.serial,f.fused]){
 assert.equal(ops.reduce((n,op)=>n+op.end-op.start,0),12);
 for(const lane of ['link','compute']){
  const sorted=ops.filter(op=>op.lane===lane).sort((a,b)=>a.start-b.start);
  for(let i=1;i<sorted.length;i++)assert.ok(sorted[i].start>=sorted[i-1].end,'A physical lane cannot process overlapping operations');
 }
 for(let tile=0;tile<3;tile++){
  const op=type=>ops.find(op=>op.tile===tile&&op.type===type);
  assert.ok(op('compute').start>=op('dispatch').end);
  assert.ok(op('combine').start>=op('compute').end);
 }
}
assert.equal(Math.max(...f.serial.map(op=>op.end)),12);assert.equal(Math.max(...f.fused.map(op=>op.end)),8);
assert.equal(tileStage(f.serial,0,8),'waitingCombine');
assert.equal(tileStage(f.fused,2,3),'waitingCompute');
for(const ops of [f.serial,f.fused])for(let tile=0;tile<3;tile++)assert.equal(tileStage(ops,tile,12),'ready');
for(const batch of [1,4])assert.deepEqual(deriveLesson({batch},'kernel').fusion.tiles.flat().map(t=>t.id),Array.from({length:batch*8},(_,i)=>i),'Kernel data blocks preserve every parent Token exactly once');
for(const split of [false,true]){
 const m=deriveCoordination({split});assert.equal(m.totalWork,12);
 assert.deepEqual(m.jobs.map(j=>j.id).sort(),['D1','D2','D3','D4','P1','P2','P3','P4']);
 for(const lane of [0,1]){const ops=m.jobs.filter(j=>j.lane===lane).sort((a,b)=>a.start-b.start);for(let i=1;i<ops.length;i++)assert.ok(ops[i].start>=ops[i-1].end);}
 assert.equal(m.firstDecode,split?1:3);assert.equal(m.lastPrefill,split?8:5);
}
assert.deepEqual(lessonPath('kernel'),['overview','decode','kernel']);
assert.deepEqual(lessonPath('overlap'),['overview','coordination','overlap']);
assert.equal(deriveLesson({},'kernel').rootSelection,'decode');
assert.equal(deriveLesson({},'overlap').rootSelection,'coordination');
assert.equal(deriveLesson({},'invalid').view,'overview');
console.log(`PASS DeepInfer lesson: 24 cache positions/ownership cases, ${moeStates} expert snapshots, exact token/weight/replica invariants, fair low-load boundary, pipeline dependency/resource oracles, stage-allocation tradeoff and parent mapping. Bilingual keys match.`);
