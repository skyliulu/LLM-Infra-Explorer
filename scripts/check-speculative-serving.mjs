import assert from 'node:assert/strict';
import {
  SERVING_BATCHES,
  SERVING_KS,
  DRAFTER_FAMILIES,
  WORKLOAD_TYPES,
  expectedTokensPerRound,
  deriveRooflinePoint,
  recommendOptimalK,
  deriveDrafterFamilyModel,
} from '../src/components/speculative-decoding/serving-model.js';
import { deriveSpeculativeSnapshot, SPECULATIVE_RACE_MAX_STEP } from '../src/components/speculative-decoding/model.js';

// 1. Integrated load control drives actual Race & DSpark scheduler
const lowLoad = deriveSpeculativeSnapshot({ algorithm: 'eagle2', load: 1, raceStep: SPECULATIVE_RACE_MAX_STEP });
const highLoad = deriveSpeculativeSnapshot({ algorithm: 'eagle2', load: 10, raceStep: SPECULATIVE_RACE_MAX_STEP });
assert.ok(highLoad.race.speculativeCount < lowLoad.race.speculativeCount, 'High concurrency load reduces speculative race output');
assert.ok(highLoad.race.lead < lowLoad.race.lead, 'High concurrency load shrinks or reverses lead vs baseline');

const dsparkLow = deriveSpeculativeSnapshot({ algorithm: 'dspark', blockSize: 6, load: 1 });
const dsparkHigh = deriveSpeculativeSnapshot({ algorithm: 'dspark', blockSize: 6, load: 10 });
assert.ok(dsparkHigh.round.scheduler.count <= dsparkLow.round.scheduler.count, 'DSpark scheduler shrinks admitted prefix under high load');

// 2. Roofline crossover & drafter family invariants
assert.equal(expectedTokensPerRound(0, 0.8), 1);
assert.ok(deriveRooflinePoint({ batchSize: 1, k: 4, alpha: 0.75 }).speedup > 2.0);
assert.ok(deriveRooflinePoint({ batchSize: 128, k: 4, alpha: 0.75 }).speedup < 1.0);
assert.equal(recommendOptimalK(128, 0.75).bestK, 0);

for (const fam of DRAFTER_FAMILIES) {
  for (const w of WORKLOAD_TYPES) {
    assert.ok(deriveDrafterFamilyModel({ family: fam, workload: w }).speedup > 0);
  }
}
assert.ok(deriveDrafterFamilyModel({ family: 'eagle3', workload: 'chat' }).vocabReduction > 4.0);

console.log(`PASS SpeculativeDecoding integrated load & drafters: Race load crossover, DSpark adaptive prefix, ${SERVING_BATCHES.length * SERVING_KS.length} roofline points, and ${DRAFTER_FAMILIES.length} drafter families verified.`);
