import assert from 'node:assert/strict';
import {
  H100_RIDGE_AI,
  ROOFLINE_BATCHES,
  SCHEDULER_MODES,
  TOKEN_BUDGET,
  deriveRooflineState,
  deriveSchedulerSnapshot,
} from '../src/components/llm-inference/scheduler-model.js';

// Roofline invariants: Prefill is compute-bound; small-batch Decode is memory-bound and moves right with B.
const prefill = deriveRooflineState({ phase: 'prefill', batchSize: 1 });
const decodeB1 = deriveRooflineState({ phase: 'decode', batchSize: 1 });
const decodeB128 = deriveRooflineState({ phase: 'decode', batchSize: 128 });
assert.equal(prefill.bound, 'compute', 'Prefill exceeds H100 BF16 ridge point');
assert.ok(prefill.activeAi > H100_RIDGE_AI);
assert.equal(decodeB1.bound, 'memory', 'Decode B=1 sits far below ridge point');
assert.ok(decodeB128.decodeAi > decodeB1.decodeAi && decodeB128.decodePct > decodeB1.decodePct);
assert.equal(ROOFLINE_BATCHES.length, 3);

// Scheduler invariants: Continuous + Chunked Prefill eliminates PAD bubbles & HoL stalls and lowers makespan.
for (const mode of SCHEDULER_MODES) {
  const snap = deriveSchedulerSnapshot({ mode, tick: 3 });
  assert.equal(snap.mode, mode);
  assert.ok(snap.currentTick.cells.length === 4);
}
const cont = deriveSchedulerSnapshot({ mode: 'continuous', tick: 3 });
assert.equal(cont.comparison.continuous.padSlotTotal, 0, 'Continuous batching eliminates PAD bubbles');
assert.equal(cont.comparison.continuous.maxDecodeStall, 0, 'Chunked prefill eliminates decode HoL stalls');
assert.ok(cont.comparison.continuous.makespan < cont.comparison.static.makespan);
assert.ok(cont.comparison.continuous.utilizationPct > cont.comparison.static.utilizationPct);
assert.ok(cont.currentTick.activePrefillTokens > 0 && cont.currentTick.activeDecodeTokens > 0, 'tick 3 fuses prefill chunk and decode tokens into one ragged batch');
assert.ok(cont.activeRun.ticks.every((t) => t.totalBatchTokens <= TOKEN_BUDGET), 'every continuous chunked iteration stays within the 512-token budget');

console.log('LLM Inference Roofline and Continuous Batching + Chunked Prefill checks passed.');
