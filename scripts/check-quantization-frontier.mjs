import assert from 'node:assert/strict';
import {
  FRONTIER_FORMATS,
  ROOFLINE_TOKENS,
  hadamard8,
  deriveHadamardLab,
  deriveFormatSpec,
  deriveQuantRoofline,
} from '../src/components/quantization/frontier-model.js';
import { ALGORITHMS, deriveAlgorithmModel } from '../src/components/quantization/model.js';

// 1. QuaRot integrated cleanly into Card 03 ALGORITHMS
assert.ok(ALGORITHMS.includes('quarot'));
const qrRotate = deriveAlgorithmModel('quarot', true, 2);
assert.ok(qrRotate.error < 1e-10, `Hadamard rotation must preserve exact product before quantization, got ${qrRotate.error}`);
const rawMaxX = Math.max(...qrRotate.x[0].map(Math.abs));
const rotMaxX = Math.max(...qrRotate.visibleX[0].map(Math.abs));
assert.ok(rotMaxX < rawMaxX * 0.7, `Rotation must flatten outlier spike (${rotMaxX} vs ${rawMaxX})`);

// 2. Exact orthogonality of H8: H8(H8(v)) === v
const sample = [16, 0.45, -0.35, 0.55, -0.25, 0.4, -0.5, 0.3];
const back = hadamard8(hadamard8(sample));
for (let i = 0; i < 8; i++) assert.ok(Math.abs(back[i] - sample[i]) < 1e-12);

// 3. Hadamard lab MSE reduction & microscaling format specs
const lab = deriveHadamardLab({ outlierPeak: 16 });
assert.ok(lab.peakSuppression > 2.3 && lab.mseReduction > 2.0);
for (const f of FRONTIER_FORMATS) assert.ok(deriveFormatSpec(f).effectiveWeightBits > deriveFormatSpec(f).payloadBits);

// 4. Roofline crossover: W4A16 wins at M=1 (decode) and loses to BF16 at M=512 (prefill)
assert.equal(deriveQuantRoofline(1).w4a16SlowerThanBf16, false);
const rPrefill = deriveQuantRoofline(512);
assert.equal(rPrefill.w4a16SlowerThanBf16, true);
assert.equal(rPrefill.bestId, 'nvfp4');
for (const m of ROOFLINE_TOKENS) assert.equal(deriveQuantRoofline(m).rows.length, 4);

console.log('PASS Quantization integrated frontier: QuaRot in ALGORITHMS, H8 orthogonality, microscaling specs, and Card 01 roofline crossover verified.');
