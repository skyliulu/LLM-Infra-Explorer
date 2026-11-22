import assert from 'node:assert/strict';
import {
  deriveSpeculativeSnapshot,
  SPECULATIVE_ALGORITHMS,
  SPECULATIVE_RACE_MAX_STEP,
  STREAM,
} from '../src/components/speculative-decoding/model.js';

// 1. Native MTP is a first-class algorithm with embedded architecture & linear K+1 chain
assert.ok(SPECULATIVE_ALGORITHMS.includes('mtp'), 'MTP must be in SPECULATIVE_ALGORITHMS');
const mtpIdle = deriveSpeculativeSnapshot({ algorithm: 'mtp', depth: 3, load: 1, phase: 'idle' });
assert.equal(mtpIdle.architecture.embedded, true, 'MTP heads are embedded inside Target');
assert.equal(mtpIdle.round.selected.length, 4, 'MTP depth 3 verifies anchor + 3 chain tokens');

const mtpDone = deriveSpeculativeSnapshot({ algorithm: 'mtp', depth: 3, load: 1, phase: 'done', raceStep: SPECULATIVE_RACE_MAX_STEP });
assert.deepEqual(mtpDone.race.speculativeTokens, STREAM.slice(1, mtpDone.race.speculativeCount + 1), 'MTP output matches Target stream exactly');
assert.ok(mtpDone.race.lead > 0, 'MTP accelerates under low concurrency load');

// 2. Integrated load control drives actual Race & DSpark scheduler
const lowLoad = deriveSpeculativeSnapshot({ algorithm: 'eagle2', load: 1, raceStep: SPECULATIVE_RACE_MAX_STEP });
const highLoad = deriveSpeculativeSnapshot({ algorithm: 'eagle2', load: 10, raceStep: SPECULATIVE_RACE_MAX_STEP });
assert.ok(highLoad.race.speculativeCount < lowLoad.race.speculativeCount, 'High concurrency load reduces speculative race output');
assert.ok(highLoad.race.lead < lowLoad.race.lead, 'High concurrency load shrinks or reverses lead vs baseline');

const mtpHigh = deriveSpeculativeSnapshot({ algorithm: 'mtp', depth: 3, load: 10, raceStep: SPECULATIVE_RACE_MAX_STEP });
assert.ok(mtpHigh.race.speculativeCount < mtpDone.race.speculativeCount, 'High concurrency load reduces MTP throughput too');

const dsparkLow = deriveSpeculativeSnapshot({ algorithm: 'dspark', blockSize: 6, load: 1 });
const dsparkHigh = deriveSpeculativeSnapshot({ algorithm: 'dspark', blockSize: 6, load: 10 });
assert.ok(dsparkHigh.round.scheduler.count <= dsparkLow.round.scheduler.count, 'DSpark scheduler shrinks admitted prefix under high load');

console.log('PASS SpeculativeDecoding integrated MTP + concurrency load: embedded MTP chain, exact output parity, Race load crossover, and DSpark adaptive prefix verified.');
