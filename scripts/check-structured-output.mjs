import assert from 'node:assert/strict';
import {
  deriveFsmStep,
  deriveJumpForwardModel,
  deriveMaskCostModel,
  deriveOverlapPipeline,
  normalizeStructuredConfig,
} from '../src/components/structured-output/model.js';
import { i18n } from '../src/components/structured-output/content.js';

const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'StructuredOutput zh/en i18n keys must match');

const norm = normalizeStructuredConfig({ maskEngine: 'bad', vocabSize: 999 });
assert.equal(norm.maskEngine, 'xgrammar');
assert.equal(norm.vocabSize, 128256);

// §3 XGrammar > 100x faster than naive 128K scan; Outlines pre-indexed FSM does 0% runtime regex checks
const xg = deriveMaskCostModel({ maskEngine: 'xgrammar', vocabSize: 128256 });
const fsmEntry = xg.entries.find((e) => e.id === 'fsm_index');
assert.ok(xg.speedupVsNaive > 100);
assert.ok(xg.selected.maskMs < 0.1);
assert.equal(fsmEntry.runtimeCheckPct, 0, 'Outlines offline FSM index must have 0% runtime regex checks');

// §3 FSM masking sets all invalid tokens to 0% prob and valid sum to ~100%
for (let s = 0; s < 5; s += 1) {
  const f = deriveFsmStep(s);
  assert.ok(f.candidates.filter((c) => !c.valid).every((c) => c.maskedProbPct === 0));
  const sumValid = f.candidates.filter((c) => c.valid).reduce((acc, c) => acc + c.maskedProbPct, 0);
  assert.ok(sumValid >= 98 && sumValid <= 102);
}

// §4 Jump-Forward reduces steps dramatically
const jf = deriveJumpForwardModel('jump_forward');
assert.ok(jf.jumpSteps < jf.serialSteps / 2);
assert.ok(jf.speedup >= 3);

// §5 Async overlap hides >95% of CPU masking
const ser = deriveOverlapPipeline('serial');
const asy = deriveOverlapPipeline('async_overlap');
assert.ok(asy.exposedMs < ser.exposedMs / 10);

console.log('StructuredOutput checks passed:', {
  keys: zhKeys.length,
  xgSpeedup: xg.speedupVsNaive,
  jumpSpeedup: jf.speedup,
  asyncExposedMs: asy.exposedMs,
});
