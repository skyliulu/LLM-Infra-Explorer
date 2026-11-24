import assert from 'node:assert/strict';
import {
  deriveChunkBudgetModel,
  derivePolicyModel,
  deriveWatermarkModel,
  normalizeSchedulerConfig,
} from '../src/components/serving-scheduler/model.js';
import { i18n } from '../src/components/serving-scheduler/content.js';

// 1. i18n alignment
const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'zh and en i18n keys must match exactly');
assert.ok(zhKeys.length >= 65, `expected rich copy (>=65 keys), got ${zhKeys.length}`);

// 2. Normalization
const norm = normalizeSchedulerConfig({ tokenBudget: 999999, kvUtilPct: 120 });
assert.equal(norm.tokenBudget, 1024);
assert.equal(norm.kvUtilPct, 99);

// 3. Chunked Prefill cuts Decode TPOT dramatically vs monolithic prefill
const c1024 = deriveChunkBudgetModel({ tokenBudget: 1024, promptLen: 16384, activeDecodes: 32 });
assert.ok(c1024.chunks >= 16);
assert.ok(c1024.chunkedTpotMs < 40 && c1024.unchunkedStallMs > 400);
assert.equal(c1024.tpotSloPass, true);

// 4. Queue Policies: LPM boosts prefix hit rate; SJF lowers short TTFT vs FCFS
const fcfs = derivePolicyModel('fcfs');
const sjf = derivePolicyModel('sjf');
const lpm = derivePolicyModel('lpm');
const prio = derivePolicyModel('priority_aging');
assert.ok(sjf.shortAvgTtftMs < fcfs.shortAvgTtftMs, 'SJF must cut short-query TTFT vs FCFS HoL');
assert.ok(lpm.prefixHitPct > fcfs.prefixHitPct, 'LPM must lift prefix cache hit rate vs FCFS');
assert.equal(prio.starvationRisk, 'bounded');

// 5. Watermark preemption thresholds
assert.equal(deriveWatermarkModel({ kvUtilPct: 80 }).state, 'admitting');
assert.equal(deriveWatermarkModel({ kvUtilPct: 92 }).state, 'paused');
const pre = deriveWatermarkModel({ kvUtilPct: 97 });
assert.equal(pre.state, 'preempting');
assert.ok(pre.preemptedCount >= 2);

console.log('ServingScheduler checks passed:', {
  keys: zhKeys.length,
  unchunkedMs: c1024.unchunkedStallMs,
  chunkedTpotMs: c1024.chunkedTpotMs,
  lpmHitPct: lpm.prefixHitPct,
  sjfShortMs: sjf.shortAvgTtftMs,
});
