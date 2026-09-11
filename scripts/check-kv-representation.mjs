import assert from 'node:assert/strict';
import { deriveKvRepresentationModel as derive, KV_MODES } from '../src/components/llm-inference/kv-representation-model.js';

// Independent payload counts and ownership invariants over the complete legal input space.
let checked = 0;
for (const mode of KV_MODES) for (const groups of [1, 2, 4, 8]) for (const latent of [32, 64, 128, 256]) {
  for (let tokens = 1; tokens <= 16; tokens++) for (let head = 0; head < 8; head++) {
    const m = derive({ mode, groups, latent, tokens, head, token: tokens - 1 });
    const fieldBytes = m.fields.reduce((sum, f) => sum + f.bytes, 0);
    assert.equal(fieldBytes * m.records.length * tokens, m.totalBytes);
    assert.deepEqual(m.records.flatMap(g => g.consumers), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.ok(m.records[m.selectedGroup].consumers.includes(head));
    assert.equal(m.rows.length, tokens);
    assert.equal(m.rows.filter(r => r.selected).length, 1);
    assert.equal(m.records.filter(r => r.selected).length, 1);
    assert.equal(m.totalBytes, m.perToken * tokens);
    assert.ok(m.comparisons.every(c => c.fraction > 0 && c.fraction <= 1));
    if (mode === 'mla') {
      assert.equal(m.groupCount, 1);
      assert.equal(m.fields[1].bytes, 64); // Decoupled RoPE key is never omitted.
      assert.equal(m.perToken, 2 * latent + 64);
    }
    if (mode === 'gqa' && groups === 8) assert.equal(m.perToken, derive({ mode: 'mha' }).perToken);
    if (mode === 'gqa' && groups === 1) assert.equal(m.perToken, 256);
    assert.equal(derive({ mode, groups, latent, tokens, head: (head + 1) % 8 }).totalBytes, m.totalBytes);
    checked++;
  }
}
assert.equal(derive().perToken, 2048);
assert.equal(derive({ mode: 'gqa' }).perToken, 512);
assert.equal(derive({ mode: 'mla' }).perToken, 320);
assert.ok(derive({ mode: 'mla', latent: 256 }).perToken > derive({ mode: 'gqa', groups: 1 }).perToken); // MLA is not universally smallest.
const bad = derive({ mode: 'bad', groups: 3, latent: 17, tokens: -5, token: 99, head: 100 });
assert.equal(bad.mode, 'mha'); assert.equal(bad.groups, 2); assert.equal(bad.latent, 128);
assert.equal(bad.tokens, 1); assert.equal(bad.token, 0); assert.equal(bad.head, 7);
assert.equal(derive({ tokens: NaN }).tokens, 8);
console.log(`KV representation: ${checked} states passed; payload, head ownership, RoPE, endpoints, and invalid inputs verified.`);
