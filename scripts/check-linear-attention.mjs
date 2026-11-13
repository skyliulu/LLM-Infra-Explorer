import assert from 'node:assert/strict';
import { getAttentionState } from '../src/components/linear-attention/model.js';
const args = { step: 3, n: 128, dk: 64, dv: 64, gateStrength: 0.6 };
const round = x => Math.round(x * 100) / 100;
for (const mode of ['linear', 'gla']) {
  let old = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let tokenIndex = 0; tokenIndex < 8; tokenIndex++) {
    const m = getAttentionState({ ...args, mode, tokenIndex });
    assert.deepEqual(m.previousState, old);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      assert.equal(m.gateMatrix[i][j], round(m.retentionKey[i] * m.retentionValue[j]));
      const expectedWrite = round((mode === 'gla' ? m.key[i] : m.phiKey[i]) * m.value[j]);
      assert.equal(m.update[i][j], expectedWrite);
      assert.equal(m.state[i][j], round(round(old[i][j] * m.gateMatrix[i][j]) + expectedWrite));
    }
    assert.equal(m.recurrentBytes, (mode === 'gla' ? 64 * 64 : 64 * 64 + 64) * 2);
    old = m.state;
  }
}
const first = getAttentionState({ ...args, mode: 'gla', tokenIndex: 0 });
assert.deepEqual(first.state, first.plainState, 'no previous memory exists at first token');
const later = getAttentionState({ ...args, mode: 'gla', tokenIndex: 7 });
assert.notDeepEqual(later.state, later.plainState, 'gates must affect actual accumulated history');
assert.equal(later.normalizer, null, 'GLA reads qS without kernel-linear z normalizer');
console.log('Linear/GLA state-write, decay, first-token and resource checks passed.');
