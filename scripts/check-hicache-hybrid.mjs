import assert from 'node:assert/strict';
import {
  HYBRID_MODES,
  SCHED_POLICIES,
  HYBRID_CONFIG,
  buildHybridHistory,
  deriveHybridState,
  deriveSchedulingComparison,
} from '../src/components/radix-cache/hybrid-state-model.js';
import { hybridCopy } from '../src/components/radix-cache/hybrid-state-content.js';

// 1. Bilingual i18n key parity
const zhKeys = Object.keys(hybridCopy.zh).sort();
const enKeys = Object.keys(hybridCopy.en).sort();
assert.deepEqual(zhKeys, enKeys, 'Hybrid state cache ZH and EN keys must match exactly');

// 2. Verify all 3 hybrid modes & every step invariant
let totalSnapshots = 0;
for (const mode of HYBRID_MODES) {
  const history = buildHybridHistory(mode);
  assert.ok(history.length >= 8, `mode ${mode} has full multi-request trace`);
  for (let step = 0; step < history.length; step++) {
    const s = deriveHybridState(mode, step);
    totalSnapshots++;
    assert.ok(s.kvUsed <= HYBRID_CONFIG.kvCapacityPages, 'KV capacity never exceeded');
    assert.ok(s.mambaUsed <= HYBRID_CONFIG.mambaCapacitySlots, 'MambaPool capacity never exceeded');
    assert.ok(s.metrics.hybridHit <= s.metrics.kvMatched, 'Hybrid reusable prefix never exceeds KV matched prefix');
    assert.equal(
      s.metrics.hybridHit + s.metrics.rollbackRecompute,
      s.metrics.kvMatched,
      `mode=${mode} step=${step}: hybridHit + rollbackRecompute === kvMatched`
    );
    // Every node claiming a Mamba checkpoint must point to an occupied slot in MambaPool
    for (const n of s.nodes) {
      if (n.stateStatus === 'checkpoint') {
        assert.notEqual(n.mambaSlot, null);
        assert.ok(s.mambaPool[n.mambaSlot], `slot M${n.mambaSlot} must be populated for ${n.id}`);
      } else if (n.stateStatus === 'kv_only' || n.stateStatus === 'evicted') {
        assert.equal(n.mambaSlot, null, `${n.id} with status ${n.stateStatus} must have null mambaSlot`);
      }
    }
    assert.ok(hybridCopy.zh[s.kind] && hybridCopy.en[s.kind], `Step kind ${s.kind} has bilingual copy`);
  }
}

// 3. Mode-specific causal differentiation
const alignEnd = deriveHybridState('align', 99);
const extraEnd = deriveHybridState('extra', 99);
const evictEnd = deriveHybridState('evict_state', 99);

// Align rolls back TWICE (R2 + R3 = 4 rollback tokens); Extra rolls back ONCE (R2 only = 2 rollback tokens, R3 hits 6/6!)
assert.equal(alignEnd.metrics.totalRollback, 4);
assert.equal(alignEnd.metrics.totalHybridHit, 8);
assert.equal(extraEnd.metrics.totalRollback, 2);
assert.equal(extraEnd.metrics.totalHybridHit, 10);
assert.equal(deriveHybridState('extra', 6).metrics.hybridHit, 6, 'Extra mode R3 gets 6/6 hybrid hit');
assert.equal(deriveHybridState('extra', 6).metrics.rollbackRecompute, 0, 'Extra mode R3 has 0 rollback');

// Asymmetric state eviction: KV K2 still resident, but n6 state evicted -> R3 must roll back to t=4
const evictStep6 = deriveHybridState('evict_state', 6);
assert.equal(evictStep6.nodes.find((n) => n.id === 'n6').stateStatus, 'evicted');
assert.equal(evictStep6.metrics.kvMatched, 0, 'Step 6 background eviction must not carry stale R2 match counters');
assert.ok(evictStep6.kvPool.some((p) => p?.id === 'K2'), 'KV page K2 remains resident during state-only eviction');
assert.equal(evictEnd.metrics.hybridHit, 4, 'After state eviction, R3 falls back to t=4');
assert.equal(evictEnd.metrics.rollbackRecompute, 2);

// 4. Scheduling counterfactual: FCFS thrashes (0 hits) vs LPM reuses 4 pages on same 4-page pool (leaf-first LRU)
const fcfs = deriveSchedulingComparison('fcfs');
const lpm = deriveSchedulingComparison('lpm');
assert.deepEqual(fcfs.trace[1].evicted, ['qa2', 'qa1', 'A1', 'A0'], 'Radix LRU must evict leaves before ancestors');
assert.deepEqual(lpm.trace[1].evicted, ['qa2', 'qa1'], 'LPM retains shared prefix and evicts leaf suffix first');
assert.equal(fcfs.totalHit, 0);
assert.equal(fcfs.totalCompute, 16);
assert.equal(lpm.totalHit, 4);
assert.equal(lpm.totalCompute, 12);
assert.ok(lpm.hitRate > fcfs.hitRate);
assert.equal(lpm.totalHit + lpm.totalCompute, fcfs.totalHit + fcfs.totalCompute);

// Invalid inputs normalize deterministically
assert.equal(deriveHybridState('unknown', -5).mode, 'align');
assert.equal(deriveHybridState('unknown', -5).step, 0);
assert.equal(deriveSchedulingComparison('unknown').policy, 'fcfs');

console.log(`PASS Hybrid Mamba/Linear RadixCache: ${totalSnapshots} snapshots across ${HYBRID_MODES.length} modes + ${SCHED_POLICIES.length} scheduling policies + ${zhKeys.length} bilingual keys verified.`);
