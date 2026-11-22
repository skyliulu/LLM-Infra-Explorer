import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  deriveDpAttentionSnapshot,
  getMaxStep,
  getPipeline,
  normalizeDpAttentionState,
} from '../src/components/dp-attention/model.js';

const combinations = [
  ['tp', 'tp'],
  ['dp', 'tp'],
  ['dp', 'ep'],
];

for (const [mode, moeTopology] of combinations) {
  const pipeline = getPipeline(mode, moeTopology);
  for (let step = 0; step <= getMaxStep(mode, moeTopology); step += 1) {
    const snapshot = deriveDpAttentionSnapshot({ mode, moeTopology, step });
    assert.equal(snapshot.operation, pipeline[step]);
    assert.equal(snapshot.phase, step === 0 ? 'idle' : step === pipeline.length - 1 ? 'done' : 'running');
    assert.equal(snapshot.tensors.querySource, 'hidden');
    assert.equal(snapshot.tensors.kvSource, 'hidden');
    assert.ok(snapshot.cache.perRankPercent >= 0);
    assert.ok(snapshot.cache.clusterPercent >= 0);
  }
}

const tpAttention = deriveDpAttentionSnapshot({ mode: 'tp', step: 2 });
assert.deepEqual(
  [tpAttention.cache.perRankPercent, tpAttention.cache.clusterPercent, tpAttention.cache.replicationFactor],
  [100, 400, 4],
);
assert.match(tpAttention.cache.shapeLatex, /d_c\+d_h\^R/);

for (const topology of ['tp', 'ep']) {
  const dpAttention = deriveDpAttentionSnapshot({ mode: 'dp', moeTopology: topology, step: 2 });
  assert.deepEqual(
    [dpAttention.cache.perRankPercent, dpAttention.cache.clusterPercent, dpAttention.cache.replicationFactor],
    [25, 100, 1],
  );
}

assert.ok(getPipeline('dp', 'tp').includes('gather'));
assert.ok(getPipeline('dp', 'tp').includes('reduceScatter'));
assert.ok(!getPipeline('dp', 'tp').includes('expertDispatch'));
assert.ok(getPipeline('dp', 'ep').includes('expertDispatch'));
assert.ok(getPipeline('dp', 'ep').includes('expertCombine'));
assert.ok(!getPipeline('dp', 'ep').includes('gather'));

assert.deepEqual(
  normalizeDpAttentionState({ mode: 'tp', moeTopology: 'ep', step: 999 }),
  { mode: 'tp', moeTopology: 'tp', step: 5, maxStep: 5 },
);

const componentSource = readFileSync(new URL('../src/components/DpAttention.jsx', import.meta.url), 'utf8');
assert.ok(componentSource.includes('min-w-[520px]'), 'dense four-rank canvas keeps the compact width contract');
assert.ok(!componentSource.includes('min-w-[760px]'), 'legacy oversized canvas width must not return');
assert.ok(componentSource.includes("mode === 'localMatrix'"), 'returned DP shards use a visible matrix encoding');
assert.ok(componentSource.includes("mode === 'routed'"), 'EP-MoE dispatched tokens render mixed cross-rank colors');
assert.ok(componentSource.includes("tReturnedOutput"), 'returned matrices keep an explicit semantic label');
assert.ok(componentSource.indexOf('data-testid="ep-router-row"') < componentSource.indexOf("'tDispatch' : 'tGather'"), 'EP-MoE Router/Top-k runs before All-to-All Dispatch');
assert.ok(!componentSource.includes('H\\times\\frac{EH}{4}'), 'TP-FFN up-projection uses E x (H x H_E/4), not H x (EH/4)');
assert.ok(!componentSource.includes('<Scissors'), 'Reduce-Scatter renders cross-rank collective lines, not local slice scissors');
assert.ok(componentSource.includes('data-testid="tp-all-reduce-badge"'), 'Standard TP depicts cross-rank All-Reduce before final output');
assert.ok(componentSource.includes('H\\times(d_c+d_h^R)'), 'KV compression projection includes decoupled RoPE key dim d_h^R');
assert.ok(componentSource.includes('attn_global = tp_all_reduce(o_proj(attn_local))'), 'Standard TP pseudocode exposes W_O + All-Reduce');

for (const mode of ['dp', 'tp']) {
  const short = deriveDpAttentionSnapshot({ mode, step: 2, historyLength: 128 });
  const long = deriveDpAttentionSnapshot({ mode, step: 2, historyLength: 1024 });
  assert.equal(short.queryLength, 1);
  assert.equal(long.queryLength, 1);
  assert.equal(long.historyLength / short.historyLength, 8);
  assert.deepEqual(long.tensors, short.tensors, 'longer KV history does not expand current Decode activations');
  assert.equal(long.cache.replicationFactor, short.cache.replicationFactor);
  assert.ok(long.cache.shapeLatex.includes('T_{\\mathrm{KV}}'));
  assert.ok(long.tensors.inputShapeLatex.includes('1,H'));
}
console.log('DP Attention model and independent Decode query/history checks passed.');
