import assert from 'node:assert/strict';
import {
  CHUNK_SIZES,
  HYBRID_RATIOS,
  BATCH_SIZES,
  deriveChunkwiseModel,
  deriveDeltaRecallModel,
  deriveHybridMemoryModel,
} from '../src/components/linear-attention/modern-model.js';
import { modernCopy } from '../src/components/linear-attention/modern-content.js';

// 1. Bilingual key parity
assert.deepEqual(Object.keys(modernCopy.zh).sort(), Object.keys(modernCopy.en).sort());

// 2. Chunkwise parallel prefill invariants
for (const N of [16, 64, 1024, 16384]) {
  for (const chunkSize of CHUNK_SIZES) {
    const m = deriveChunkwiseModel({ contextLength: N, chunkSize, dk: 64, dv: 64 });
    assert.equal(m.chunkSequentialHops, Math.ceil(N / Math.min(chunkSize, N)));
    assert.ok(m.hopReduction >= 1);
    assert.equal(m.serialSequentialHops, N);
  }
}
const c64 = deriveChunkwiseModel({ contextLength: 16384, chunkSize: 64, gateStrength: 0.45 });
assert.equal(c64.chunkSequentialHops, 256);
assert.equal(c64.hopReduction, 64);
const c128 = deriveChunkwiseModel({ contextLength: 16384, chunkSize: 128, gateStrength: 0.45 });
assert.ok(c128.chunks[0].retention < c64.chunks[0].retention, 'Larger chunk C must accumulate stronger chunk decay');
const c64StrongGate = deriveChunkwiseModel({ contextLength: 16384, chunkSize: 64, gateStrength: 0.85 });
assert.ok(c64StrongGate.chunks[0].retention < c64.chunks[0].retention, 'Higher gateStrength must reduce chunk retention');

// 3. Gated DeltaNet exact targeted overwrite oracle vs Additive GLA interference
const exactBeta = deriveDeltaRecallModel({ alpha: 0.9, beta: 1.0 });
assert.ok(exactBeta.delta.errorK1 < 1e-9, `DeltaNet beta=1 must overwrite k1 with zero error, got ${exactBeta.delta.errorK1}`);
assert.ok(exactBeta.gla.errorK1 > 0.5, `Additive GLA must retain stale k1 interference, got ${exactBeta.gla.errorK1}`);
// Orthogonal k2 retention is identical across GLA and DeltaNet (both decay by alpha^1 from t2 -> t3)
assert.ok(Math.abs(exactBeta.delta.readK2[0] - exactBeta.gla.readK2[0]) < 1e-9);
assert.ok(Math.abs(exactBeta.delta.readK2[1] - exactBeta.gla.readK2[1]) < 1e-9);

// 4. Hybrid memory crossover: linear state > short-context KV when N < N*, and saves strongly at long N
const shortHybrid = deriveHybridMemoryModel({ ratio: 'hybrid_7_1', contextLength: 64, batchSize: 32, dk: 64, dv: 64 });
assert.equal(shortHybrid.linearExceedsSoftmax, true, 'At N=64, fixed FP32 state exceeds short-context KV');
assert.ok(shortHybrid.totalBytes > shortHybrid.baselinePureSoftmaxBytes);

const longHybrid = deriveHybridMemoryModel({ ratio: 'hybrid_7_1', contextLength: 16384, batchSize: 32, dk: 64, dv: 64 });
assert.equal(longHybrid.linearExceedsSoftmax, false);
assert.ok(longHybrid.savingsRatio > 5.0, `Expected >5x savings at 16K for 7:1 hybrid, got ${longHybrid.savingsRatio}`);

for (const ratio of HYBRID_RATIOS) {
  for (const batchSize of BATCH_SIZES) {
    const h = deriveHybridMemoryModel({ ratio, contextLength: 4096, batchSize });
    assert.equal(h.fullLayers + h.linearLayers, 32);
    assert.equal(h.totalBytes, h.fullBytes + h.linearBytes);
  }
}

console.log('PASS LinearAttention modern: chunkwise prefill, Gated DeltaNet exact overwrite vs GLA, hybrid memory crossover, and bilingual keys verified.');
