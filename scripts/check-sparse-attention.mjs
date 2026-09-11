import assert from 'node:assert/strict';
import katex from 'katex';
import { DEFAULTS, MODES, deriveSparseModel } from '../src/components/sparse-attention/model.js';
import { i18n } from '../src/components/sparse-attention/content.js';
import { CANVAS_DEFAULTS, deriveCanvasModel } from '../src/components/sparse-attention/canvas-model.js';
import { canvasI18n } from '../src/components/sparse-attention/canvas-content.js';
import { explorerI18n } from '../src/components/sparse-attention/explorer-content.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
assert.deepEqual(Object.keys(i18n.zh).sort(), Object.keys(i18n.en).sort());
const variants = [
  { mode: 'dense' }, { mode: 'dsa' }, { mode: 'swa' },
  ...[2, 4, 8].map(csaRatio => ({ mode: 'csa', csaRatio })),
  ...[8, 16].map(hcaRatio => ({ mode: 'hca', hcaRatio })),
];
let cases = 0;
for (const variant of variants) for (let tokens = 1; tokens <= 64; tokens++) {
  for (const topK of [1, 2, 4, 8]) for (const window of [4, 8, 16]) {
    const a = deriveSparseModel({ ...variant, tokens, topK, window, query: 0, inspect: 999 });
    const b = deriveSparseModel({ ...variant, tokens, topK, window, query: 1, inspect: 999 });
    // Query changes routing, never stored records or source provenance.
    const cache = m => m.global.map(({ id, key, value, indexKey, sources }) => ({ id, key, value, indexKey, sources }));
    assert.deepEqual(cache(a), cache(b));
    assert.deepEqual(a.local, b.local);
    for (const m of [a, b]) {
      cases++;
      assert.equal(m.history.length, tokens);
      assert.equal(m.inspect, Math.max(0, m.global.length - 1));
      assert.equal(m.global.length, m.compressed ? Math.floor(tokens / m.ratio) : m.mode === 'swa' ? 0 : tokens);
      assert.equal(m.local.length, m.hasWindow ? Math.min(tokens, window) : 0);
      assert.equal(m.globalReads, m.indexed ? Math.min(topK, m.global.length) : m.global.length);
      assert.equal(m.mainReads, m.globalReads + m.local.length);
      assert.equal(m.indexReads, m.indexed ? m.global.length : 0);
      assert.equal(new Set(m.reads.map(e => e.id)).size, m.reads.length);
      assert.ok(m.reads.length > 0);
      near(m.reads.reduce((sum, e) => sum + e.weight, 0), 1);
      assert.ok(m.output.every(Number.isFinite));
      for (let c = 0; c < 2; c++) {
        const values = m.reads.map(e => e.value[c]);
        assert.ok(m.output[c] >= Math.min(...values) - 1e-10 && m.output[c] <= Math.max(...values) + 1e-10);
      }
      for (const e of m.global) {
        assert.ok(e.end < tokens);
        assert.ok(e.sources.every(p => p >= 0 && p < tokens));
        if (m.compressed) {
          assert.equal(e.sources.length, m.mode === 'csa' && e.index > 0 ? 2 * m.ratio : m.ratio);
          assert.deepEqual(e.key, e.value); // Shared K/V MQA compressed representation.
          for (const compressor of [e.main, e.indexCompression].filter(Boolean)) for (let c = 0; c < 2; c++) {
            near(compressor.rows.reduce((sum, row) => sum + row.weights[c], 0), 1);
            near(compressor.vector[c], compressor.rows.reduce((sum, row) => sum + row.weights[c] * row.values[c], 0));
          }
        }
        if (m.indexed) {
          const manual = m.queryHeads.reduce((sum, q, h) => sum + m.headWeights[h] * Math.max(0, q.reduce((v, x, c) => v + x * e.indexKey[c], 0)), 0);
          near(e.score, manual);
          assert.equal(e.read, e.rank <= Math.min(topK, m.global.length));
        } else assert.equal(e.indexKey, null);
      }
      if (m.compressed) {
        assert.equal(m.tail.length, tokens % m.ratio);
        assert.ok(m.tail.every(p => p >= m.global.length * m.ratio));
        assert.equal(m.carry.length, m.mode === 'csa' && m.global.length ? m.ratio : 0);
      }
      if (m.mode === 'swa') assert.equal(m.local[0].position, Math.max(0, tokens - window));
    }
  }
}
const csa = deriveSparseModel({ ...DEFAULTS, mode: 'csa', tokens: 25 });
assert.equal(csa.global.length, 6);
assert.deepEqual(csa.global[2].sources, [4, 5, 6, 7, 8, 9, 10, 11]);
assert.deepEqual(csa.tail, [24]);
assert.deepEqual(csa.carry, [20, 21, 22, 23]);
assert.notDeepEqual(csa.entry.key, csa.entry.indexKey);
assert.notDeepEqual(csa.entry.main.rows.map(r => r.weights[0]), csa.entry.main.rows.map(r => r.weights[1]));
assert.equal(deriveSparseModel({ ...DEFAULTS, mode: 'hca', tokens: 7 }).global.length, 0);
assert.equal(deriveSparseModel({ ...DEFAULTS, mode: 'hca', tokens: 8 }).global.length, 1);
for (const mode of ['dsa', 'csa']) {
  const readIds = query => deriveSparseModel({ ...DEFAULTS, mode, query }).global.filter(e => e.read).map(e => e.id);
  assert.notDeepEqual(readIds(0), readIds(1));
}
for (const mode of MODES) {
  const m = deriveSparseModel({ mode, tokens: NaN, inspect: -100, window: 999, topK: 0 });
  assert.equal(m.tokens, 24);
  assert.equal(m.inspect, 0);
  assert.equal(m.window, 8);
  assert.equal(m.topK, 2);
  for (const f of [m.formula, m.readFormula, m.compressionFormula, m.gateFormula, m.indexFormula, m.attentionFormula]) katex.renderToString(f, { throwOnError: true, strict: 'error' });
}
console.log(`PASS ${cases} sparse-attention snapshots; causal publication, residency, independent caches, Top-K, weighted compression, joint attention, i18n and LaTeX.`);

assert.deepEqual(Object.keys(canvasI18n.zh).sort(),Object.keys(canvasI18n.en).sort());
let navigationCases=0;
for (const mode of ['dsa','csa','hca']) for (const tokens of [1,3,4,7,8,24,25,64]) for (const focus of ['overview','query','cache','index','local','attention','invalid']) {
  const m=deriveCanvasModel({...CANVAS_DEFAULTS, mode, tokens},focus);
  assert.equal(m.baseline.tokens,m.tokens);
  assert.equal(m.baseline.query,m.query);
  assert.equal(m.baseline.mainReads,tokens);
  assert.ok(['overview',...m.nodes].includes(m.focus));
  assert.equal(m.edges.some(([a,b])=>a==='query'&&b==='index'),m.indexed);
  assert.equal(m.edges.some(([a,b])=>a==='local'&&b==='attention'),m.hasWindow);
  assert.equal(m.hasWindow,mode!=='dsa');
  assert.equal(m.mode,mode); // Zoom is presentation, never an algorithm toggle.
  if(m.next) assert.ok(m.nodes.includes(m.next));
  if(mode==='dsa') assert.deepEqual(m.global.map(e=>e.key),m.baseline.global.map(e=>e.key));
  navigationCases++;
}
const short=deriveCanvasModel({...CANVAS_DEFAULTS,tokens:4});
assert.ok(short.mainReads>short.baseline.mainReads); // Do not invent a gain on short history.
assert.equal(deriveCanvasModel({...CANVAS_DEFAULTS,mode:'hca'},'index').focus,'overview');
console.log('PASS '+navigationCases+' canvas navigation / shared baseline cases; focus isolation, connected branches, short-history overhead, bilingual content.');

// Resource estimates use declared byte assumptions, never treat heterogeneous records as equal bytes.
let resourceCases = 0;
for (const mode of ['dsa','csa','hca']) for (const window of [4,8,16]) for (const budgetKiB of [32,64,128]) for (const tokens of [1,4,24,64]) {
  const m = deriveCanvasModel({...CANVAS_DEFAULTS,mode,window,budgetKiB,tokens});
  const r = m.resources;
  assert.deepEqual(m.benefits.map(b=>b.id),['memory','traffic','context']);
  assert.equal(r.baselineBytes,tokens*1024);
  assert.equal(r.storedBytes,r.globalStoredBytes+r.localStoredBytes+r.indexStoredBytes);
  assert.equal(r.readBytes,r.mainReadBytes+r.indexReadBytes);
  assert.ok(r.capacityBytes<=r.budgetBytes);
  assert.ok(r.nextCapacityBytes>r.budgetBytes);
  assert.equal(r.baselineCapacity,budgetKiB);
  if(mode==='dsa') {
    assert.equal(r.storedBytes,tokens*1152);
    assert.ok(r.capacity<r.baselineCapacity); // Index storage consumes budget; DSA is not KV compression.
  }
  const changedTopK=deriveCanvasModel({...m,topK:8});
  assert.equal(changedTopK.resources.storedBytes,r.storedBytes);
  assert.equal(changedTopK.resources.capacity,r.capacity);
  const biggerBudget=deriveCanvasModel({...m,budgetKiB:128});
  assert.ok(biggerBudget.resources.capacity>=r.capacity);
  resourceCases++;
}
const resourceDefault=deriveCanvasModel(CANVAS_DEFAULTS).resources;
assert.equal(resourceDefault.storedBytes,14.75*1024);
assert.equal(resourceDefault.readBytes,10.75*1024);
assert.equal(resourceDefault.capacity,199);
assert.equal(resourceDefault.nextCapacityBytes,64.25*1024);
assert.equal(deriveCanvasModel({...CANVAS_DEFAULTS,budgetKiB:Infinity}).budgetKiB,64);
console.log('PASS '+resourceCases+' resource estimates; cache/read accounting, capacity inversion, budget monotonicity, Top-K isolation and DSA index overhead.');

const dsaBenefits=deriveCanvasModel({...CANVAS_DEFAULTS,mode:'dsa'}).benefits;
assert.deepEqual(dsaBenefits.map(b=>b.outcome),['worse','better','worse']);
assert.deepEqual(dsaBenefits.map(b=>b.direction),['up','down','down']);
const equalBenefits=deriveCanvasModel({...CANVAS_DEFAULTS,mode:'hca',tokens:1}).benefits;
assert.deepEqual(equalBenefits.slice(0,2).map(b=>b.outcome),['same','same']);
const shortBenefits=deriveCanvasModel({...CANVAS_DEFAULTS,tokens:4}).benefits;
assert.deepEqual(shortBenefits.slice(0,2).map(b=>b.outcome),['worse','worse']);
const budgetA=deriveCanvasModel({...CANVAS_DEFAULTS,budgetKiB:32}).benefits;
const budgetB=deriveCanvasModel({...CANVAS_DEFAULTS,budgetKiB:128}).benefits;
assert.deepEqual(budgetA.slice(0,2),budgetB.slice(0,2));
assert.ok(budgetB[2].after>budgetA[2].after);
console.log('PASS simultaneous benefit direction, good/bad/unchanged semantics, short-history costs and capacity-only budget changes.');

assert.deepEqual(Object.keys(explorerI18n.zh).sort(),Object.keys(explorerI18n.en).sort());
let explorerCases=0;
for(const variant of [{mode:'dsa'},...[2,4,8].map(csaRatio=>({mode:'csa',csaRatio})),...[8,16].map(hcaRatio=>({mode:'hca',hcaRatio}))]) for(const tokens of [1,3,4,7,8,24,25,64]) for(const query of [0,1]) for(const topK of [1,8]) {
  const {mode}=variant;
  const m=deriveCanvasModel({...CANVAS_DEFAULTS,...variant,tokens,query,topK});
  const trade=m.tradeoff;
  assert.equal(Object.values(trade.counts).reduce((a,b)=>a+b,0),tokens);
  assert.ok([...trade.fullOutput,...trade.residentOutput].every(Number.isFinite));
  for(const p of trade.coverage) {
    const direct=m.reads.some(e=>e.branch==='local'?e.position===p.position:!m.compressed&&e.sources.includes(p.position));
    const summary=m.compressed&&m.reads.some(e=>e.branch==='global'&&e.sources.includes(p.position));
    assert.equal(p.kind,direct?'direct':summary?'summary':'missing');
  }
  // Independently reconstruct the full-token reference with the declared projections.
  const raw=m.baseline.global;
  const logits=raw.map(e=>e.key.reduce((sum,v,c)=>sum+v*m.mainQuery[c],0)/Math.sqrt(2));
  const exps=logits.map(v=>Math.exp(v-Math.max(...logits))), sum=exps.reduce((a,b)=>a+b,0);
  for(let c=0;c<2;c++) near(trade.fullOutput[c],raw.reduce((total,e,i)=>total+(m.compressed?e.key[c]:e.value[c])*exps[i]/sum,0));
  if(!m.indexed||m.globalReads===m.global.length) near(trade.selectionDistance,0);
  if(mode==='dsa'&&tokens<=topK) near(trade.distance,0);
  const point=m.trends.history[tokens-1];
  assert.equal(point.memory,m.resources.storedBytes);
  assert.equal(point.traffic,m.resources.readBytes);
  assert.equal(m.trends.capacity.find(p=>p.x===m.budgetKiB).value,m.resources.capacity);
  assert.deepEqual(m.trends.history.map(p=>p.x),Array.from({length:64},(_,i)=>i+1));
  assert.ok(m.trends.history.every((p,i,all)=>!i||p.memory>=all[i-1].memory));
  assert.ok(m.tradeoff.counts.direct>=m.local.length);
  explorerCases++;
}
const traced=deriveCanvasModel({...CANVAS_DEFAULTS,inspect:3,traceId:'C4'},'cache');
for(const focus of ['cache','index','attention']) {
  const m=deriveCanvasModel({...CANVAS_DEFAULTS,inspect:3,traceId:'C4'},focus);
  assert.equal(m.tracedRecord.id,'C4');
  assert.deepEqual(m.traceSources,traced.traceSources);
}
const localTrace=deriveCanvasModel({...CANVAS_DEFAULTS,traceId:'L24'},'attention');
assert.equal(localTrace.tracedRecord.id,'L24');
assert.deepEqual(localTrace.traceSources,[23]);
assert.equal(deriveCanvasModel({...CANVAS_DEFAULTS,tokens:1,traceId:'C99'}).tracedRecord.id,'L1');
const sorted=deriveCanvasModel({...CANVAS_DEFAULTS,scoreOrder:'score',traceId:'C4',inspect:3},'index');
assert.deepEqual(sorted.scoreEntries.map(e=>e.rank),[1,2,3,4,5,6]);
assert.equal(sorted.tracedRecord.id,'C4');
const beforeK=deriveCanvasModel({...CANVAS_DEFAULTS,topK:1}), afterK=deriveCanvasModel({...CANVAS_DEFAULTS,topK:8});
assert.deepEqual(beforeK.trends.history.map(p=>p.memory),afterK.trends.history.map(p=>p.memory));
assert.deepEqual(beforeK.trends.capacity,afterK.trends.capacity);
assert.deepEqual(beforeK.tradeoff.fullOutput,afterK.tradeoff.fullOutput);
assert.deepEqual(beforeK.tradeoff.residentOutput,afterK.tradeoff.residentOutput);
console.log(`PASS ${explorerCases} explorer cases: full/resident reference, coverage partition, trends, trace identity, sort isolation and Top-K invariants.`);
