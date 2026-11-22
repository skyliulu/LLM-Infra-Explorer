import assert from 'node:assert/strict';
import {
  FRONTIER_FORMATS,
  ROOFLINE_TOKENS,
  hadamard8,
  deriveHadamardLab,
  deriveFormatSpec,
  deriveQuantRoofline,
} from '../src/components/quantization/frontier-model.js';
import { frontierCopy } from '../src/components/quantization/frontier-content.js';

// 1. Bilingual key parity
assert.deepEqual(Object.keys(frontierCopy.zh).sort(), Object.keys(frontierCopy.en).sort());

// 2. Exact orthogonality of H8: H8(H8(v)) === v and L2 norm preserved
const sample = [16, 0.45, -0.35, 0.55, -0.25, 0.4, -0.5, 0.3];
const rot = hadamard8(sample);
const back = hadamard8(rot);
for (let i = 0; i < 8; i++) {
  assert.ok(Math.abs(back[i] - sample[i]) < 1e-12, `H8 must be exact involution at index ${i}`);
}
const normIn = sample.reduce((s, x) => s + x * x, 0);
const normOut = rot.reduce((s, x) => s + x * x, 0);
assert.ok(Math.abs(normIn - normOut) < 1e-9, 'H8 preserves L2 energy');

// 3. Hadamard outlier suppression: suppresses peak by >2.3x and reduces 4-bit MSE sharply
const lab = deriveHadamardLab({ outlierPeak: 16 });
assert.ok(lab.peakSuppression > 2.3, `Expected peak suppression >2.3x, got ${lab.peakSuppression}`);
assert.ok(lab.rotatedMse < lab.rawMse, `Expected rotated MSE (${lab.rotatedMse}) < raw MSE (${lab.rawMse})`);
assert.ok(lab.mseReduction > 2.0, `Expected >2x MSE reduction at peak=16, got ${lab.mseReduction}`);

// 4. Format specs
for (const f of FRONTIER_FORMATS) {
  const s = deriveFormatSpec(f);
  assert.ok(s.effectiveWeightBits > s.payloadBits);
}
assert.equal(deriveFormatSpec('nvfp4').effectiveWeightBits, 4.5);
assert.equal(deriveFormatSpec('mxfp4').effectiveWeightBits, 4.25);

// 5. Roofline crossover: W4A16 wins at M=1 (decode memory-bound), loses to BF16 at M=512 (compute-bound) while FP8 & NVFP4 dominate
const rDecode = deriveQuantRoofline(1);
assert.equal(rDecode.w4a16SlowerThanBf16, false);
assert.ok(rDecode.rows.find((r) => r.id === 'w4a16').speedup > 3.0);

const rPrefill = deriveQuantRoofline(512);
assert.equal(rPrefill.w4a16SlowerThanBf16, true, 'W4A16 must be slower than BF16 in compute-bound regime');
assert.ok(rPrefill.rows.find((r) => r.id === 'block_fp8').speedup > 1.7);
assert.ok(rPrefill.rows.find((r) => r.id === 'nvfp4').speedup > 3.0);
assert.equal(rPrefill.bestId, 'nvfp4');

for (const m of ROOFLINE_TOKENS) {
  const r = deriveQuantRoofline(m);
  assert.equal(r.rows.length, 4);
}

console.log('PASS Quantization frontier: H8 orthogonality, QuaRot MSE reduction, NVFP4/MXFP4/Block-FP8 specs, roofline crossover, and bilingual parity verified.');
