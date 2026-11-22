import assert from 'node:assert/strict';
import {
  SERVING_BATCHES,
  SERVING_KS,
  DRAFTER_FAMILIES,
  WORKLOAD_TYPES,
  expectedTokensPerRound,
  deriveRooflinePoint,
  recommendOptimalK,
  deriveRooflineSweep,
  deriveDrafterFamilyModel,
} from '../src/components/speculative-decoding/serving-model.js';
import { servingCopy } from '../src/components/speculative-decoding/serving-content.js';

// 1. Bilingual key parity
assert.deepEqual(Object.keys(servingCopy.zh).sort(), Object.keys(servingCopy.en).sort());

// 2. Expected tokens per round formula check (K=0 -> 1, K=3 alpha=0.8 -> 1 + 0.8 + 0.64 + 0.512 = 2.952)
assert.equal(expectedTokensPerRound(0, 0.8), 1);
assert.ok(Math.abs(expectedTokensPerRound(3, 0.8) - 2.952) < 1e-9);

// 3. Roofline crossover invariant: low batch wins strongly, high batch regresses (< 1.0x)
const lowB = deriveRooflinePoint({ batchSize: 1, k: 4, alpha: 0.75 });
const highB = deriveRooflinePoint({ batchSize: 128, k: 4, alpha: 0.75 });
assert.equal(lowB.regime, 'memory_bound');
assert.ok(lowB.speedup > 2.0, `Expected >2x speedup at B=1, got ${lowB.speedup}`);
assert.equal(highB.regime, 'compute_bound');
assert.ok(highB.speedup < 1.0, `Expected regression (<1x) at B=128 K=4 alpha=0.75, got ${highB.speedup}`);
assert.equal(highB.regresses, true);

// Adaptive K recommends K > 0 at low batch and K = 0 (disable) at B=128
assert.ok(recommendOptimalK(1, 0.75).bestK > 0);
assert.equal(recommendOptimalK(128, 0.75).bestK, 0, 'High concurrency compute-bound regime recommends disabling speculation');

// 4. Sweep coverage & drafter family differentiation
const sweep = deriveRooflineSweep({ batchSize: 64, k: 4, alpha: 0.75 });
assert.equal(sweep.curve.length, SERVING_BATCHES.length);
assert.ok(sweep.curve[0].speedup > sweep.curve[sweep.curve.length - 1].speedup);

for (const fam of DRAFTER_FAMILIES) {
  for (const w of WORKLOAD_TYPES) {
    const fm = deriveDrafterFamilyModel({ family: fam, workload: w });
    assert.ok(fm.alpha > 0 && fm.alpha < 1);
    assert.ok(fm.speedup > 0);
  }
}
// N-gram thrives on agent/code and lags on open chat
const ngramCode = deriveDrafterFamilyModel({ family: 'ngram', workload: 'agent_code' });
const ngramChat = deriveDrafterFamilyModel({ family: 'ngram', workload: 'chat' });
assert.ok(ngramCode.speedup > ngramChat.speedup + 1.5);
// EAGLE-3 vocab trim > 4x reduction
const eagle3 = deriveDrafterFamilyModel({ family: 'eagle3', workload: 'chat' });
assert.ok(eagle3.vocabReduction > 4.0);

console.log(`PASS SpeculativeDecoding serving boundaries: ${SERVING_BATCHES.length * SERVING_KS.length} batch×K points, ${DRAFTER_FAMILIES.length * WORKLOAD_TYPES.length} drafter×workload cases, and bilingual parity verified.`);
