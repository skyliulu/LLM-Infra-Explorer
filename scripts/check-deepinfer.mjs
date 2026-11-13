import assert from 'node:assert/strict';
import { derivePerformance, PERFORMANCE_DEFAULTS } from '../src/components/deepinfer/performance-model.js';
import { performanceI18n } from '../src/components/deepinfer/performance-content.js';

assert.deepEqual(Object.keys(performanceI18n.zh).sort(),Object.keys(performanceI18n.en).sort());
for(const hit of [0,5,50,95,100]) for(const balanced of [false,true]) {
 const p=derivePerformance({...PERFORMANCE_DEFAULTS,hit,balanced});
 assert.equal(p.reused+p.remaining,1000,'Reuse conserves input positions');
 assert.equal(p.loads.reduce((a,b)=>a+b),32,'Rebalancing must conserve total work');
 assert.ok(p.loads.every((v,i)=>v+p.waiting[i]===p.slowest),'Every rank completes before the batch ends');
 assert.equal(p.slowest,balanced?9:16);
}
const economic=derivePerformance();
assert.equal(economic.hourlyRevenue,38);
assert.equal(economic.dailyNet,720);
assert.ok(Math.abs(economic.days-30000/720)<1e-10,'Recovery uses net operating cash, not gross revenue');
assert.equal(economic.requiredHourlyNet,30000/720);
assert.equal(derivePerformance({revenue:0}).days,null);
assert.equal(derivePerformance({cost:38}).days,null);
assert.equal(derivePerformance({cost:50}).days,null);
assert.ok(derivePerformance({revenue:50}).days>economic.days);
assert.ok(derivePerformance({capital:60000}).days===2*economic.days);
assert.ok(derivePerformance({cost:0}).days>30,'At the illustrative $30k CAPEX, even gross recovery exceeds 30 days');
assert.equal(derivePerformance({hit:Infinity}).config.hit,80);
assert.equal(derivePerformance({hit:-20}).config.hit,0);
assert.deepEqual(derivePerformance({traffic:'prefill'}).pools,[6,2]);
assert.deepEqual(derivePerformance({traffic:'decode'}).pools,[2,6]);
for(const ep of [2,8]) {
 const p=derivePerformance({ep});
 assert.equal(p.wide.ranks.length,8);
 assert.equal(p.wide.tokensPerGroup*p.wide.groups,32,'Same global token input at both EP sizes');
 assert.equal(p.wide.tokensPerExpert*8*p.wide.groups,32,'Expert work is conserved across EP topology');
 assert.equal(p.wide.expertsPerRank*p.wide.tokensPerExpert,4,'Uniform per-rank compute remains fixed');
 assert.equal(p.wide.totalWeightUnits,p.wide.ranks.reduce((sum,rank)=>sum+rank.experts.length,0));
 for(let group=0;group<p.wide.groups;group++) assert.deepEqual(p.wide.ranks.filter(rank=>rank.group===group).flatMap(rank=>rank.experts).sort((a,b)=>a-b),[0,1,2,3,4,5,6,7],'Each EP group owns one complete model expert set');
}
import { buildRequestTrace, deriveDeepInferState, deriveOverlapModel, normalizeConfig, SCENARIOS } from '../src/components/deepinfer/model.js';
import { i18n } from '../src/components/deepinfer/content.js';
import { FRAMEWORK, RELATED_TOPICS, deriveFrameworkView } from '../src/components/deepinfer/system-model.js';
import { systemI18n } from '../src/components/deepinfer/system-content.js';

assert.deepEqual(Object.keys(systemI18n.zh).sort(),Object.keys(systemI18n.en).sort());
for(const level of ['service','engine','execution']) {
  const view=deriveFrameworkView(level,'missing');
  assert.equal(view.level,level);
  assert.ok(view.children.includes(view.selected));
  assert.equal(view.trail.at(-1),level);
  for(const child of view.children){
    assert.equal(FRAMEWORK[child].parent,level);
    assert.equal(deriveFrameworkView(level,child).selected,child);
    for(const lang of ['zh','en'])for(const suffix of ['','Tag','Input','Action','Output','Why'])assert.ok(systemI18n[lang][child+suffix]);
  }
}
assert.deepEqual(deriveFrameworkView('execution','sampling').trail,['service','engine','execution']);
assert.deepEqual(deriveFrameworkView('engine','execution').children,['queue','scheduler','execution','results']);
assert.equal(deriveFrameworkView('missing','missing').level,'engine');
assert.deepEqual(deriveFrameworkView('execution','sampling').related,['speculative']);
assert.ok(RELATED_TOPICS.speculative.startsWith('#speculative'));
console.log('Framework hierarchy: parent/child containment, three levels, selection normalization and chapter ownership pass.');

assert.deepEqual(Object.keys(i18n.zh).sort(), Object.keys(i18n.en).sort());
assert.deepEqual(normalizeConfig({scenario:'invalid',prefillBudget:0,overlap:null}), {scenario:'mixed',prefillBudget:8,overlap:true});
let snapshots = 0;
for (const scenario of Object.keys(SCENARIOS)) for (const prefillBudget of [4,8,12]) for (const overlap of [false,true]) {
  const input={scenario,prefillBudget,overlap};
  const trace=buildRequestTrace(input);
  assert.ok(trace.events.length < 120);
  let previous=trace.events[0];
  for (let step=0;step<trace.events.length;step++) {
    const s=deriveDeepInferState(input,step);
    const event=s.event;
    assert.ok(event.rows.every(row=>row.computed>=0&&row.computed<=row.prompt&&row.output<=row.target));
    assert.ok(event.rows.every(row=>row.computed>=previous.rows.find(other=>other.id===row.id).computed));
    assert.ok(event.rows.every(row=>row.output>=previous.rows.find(other=>other.id===row.id).output));
    if (event.kind==='prefill') assert.ok(event.tokens<=prefillBudget);
    if (event.kind==='decode') assert.ok(event.selected.length<=2&&event.selected.every(item=>item.count===1));
    if (event.stage==='sample') for(const row of event.rows) {
      if(row.computed<row.prompt) assert.equal(row.pending,0,'Partial prefill cannot emit');
    }
    if(event.stage!=='commit') for(const row of event.rows) assert.equal(row.output,previous.rows.find(other=>other.id===row.id).output,'Only commit advances output');
    if(event.stage==='forward') assert.ok(event.rows.every(row=>row.pending===0));
    previous=event;snapshots++;
  }
  const final=trace.events.at(-1);
  assert.ok(final.rows.every(row=>row.status==='done'&&row.output===row.target&&row.pending===0));
  const totalPrompt=SCENARIOS[scenario].reduce((sum,[prompt])=>sum+prompt,0);
  const decodeWork=SCENARIOS[scenario].reduce((sum,[,target])=>sum+target-1,0);
  assert.equal(final.workload,totalPrompt+decodeWork,'First output is sampled from final prefill');
  assert.equal(deriveDeepInferState(input,1e6).step,trace.maxStep);
  assert.equal(deriveDeepInferState(input,-1).phase,'idle');
  assert.equal(deriveDeepInferState(input,trace.maxStep).phase,'done');
}
const mixed=buildRequestTrace({scenario:'mixed',prefillBudget:8});
assert.equal(deriveDeepInferState({scenario:'mixed',prefillBudget:8},1,'A').requestInspector.reason,'requestScheduled','Scheduling must not describe not-yet-computed input as a completed partial chunk');
assert.equal(deriveDeepInferState({scenario:'mixed',prefillBudget:8},2,'B').requestInspector.reason,'requestPartial','After computation an unfinished prompt is a partial chunk');
assert.deepEqual(mixed.events[1].selected.map(({id,count})=>[id,count]),[['A',6],['B',2]]);
assert.deepEqual(mixed.events[4].rows.map(({output})=>output),[1,0,0]);
for(let rounds=1;rounds<=5;rounds++) for(const overlap of [false,true]) {
  const m=deriveOverlapModel(overlap,rounds);
  assert.equal(m.total,overlap?5*rounds+3:8*rounds);
  for(const lane of ['cpu','device']) {
    const ops=m.operations.filter(op=>op.lane===lane).sort((a,b)=>a.start-b.start);
    for(let i=1;i<ops.length;i++) assert.ok(ops[i].start>=ops[i-1].end,'Same resource operations cannot overlap');
  }
  for(let i=0;i<rounds;i++) {
    const op=type=>m.operations.find(op=>op.type===type&&op.round===i);
    assert.ok(op('forward').start>=op('schedule').end);
    assert.ok(op('sample').start>=op('forward').end);
    const commit=op('commit')||op('flush');
    assert.ok(commit.start>=op('sample').end,'Commit waits sampled data');
    if(i+1<rounds) assert.ok(m.operations.find(op=>op.type==='forward'&&op.round===i+1).start>=op('sample').end,'Autoregressive device dependency retained');
  }
}
assert.equal(deriveOverlapModel(true,1).total,deriveOverlapModel(false,1).total);
const syncInspection=deriveDeepInferState({},0,'A',{track:'baseline',id:'commit-2'}).timingInspection;
assert.equal(syncInspection.operation.start,22);
assert.equal(syncInspection.operation.end,24);
assert.equal(syncInspection.track,'baseline');
assert.equal(syncInspection.overlap,false);
const asyncInspection=deriveDeepInferState({},0,'A',{track:'candidate',id:'commit-1'}).timingInspection;
assert.equal(asyncInspection.operation.start,11);
assert.equal(asyncInspection.operation.end,13);
const decodeStep=mixed.events.findIndex(e=>e.stage==='schedule'&&e.kind==='decode');
const excluded=deriveDeepInferState({},decodeStep,'C');
assert.equal(excluded.requestInspector.inBatch,false);
assert.equal(excluded.requestInspector.reason,'requestExcluded');
assert.ok(excluded.event.selected.every(row=>Number.isInteger(row.inputIndex)&&row.inputIndex>=0));
assert.equal(deriveDeepInferState({scenario:'mixed'},0,'D').requestInspector.row.id,'A');
console.log(`PASS DeepInfer: ${snapshots} trace snapshots, 18 settings, 10 resource/dependency schedules, partial-prefill and first-token oracles; bilingual keys match.`);
