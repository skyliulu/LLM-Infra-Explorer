// Pure canonical model for Hybrid Linear/Mamba State Prefix Cache (MambaRadixCache / vLLM Hybrid)
// and Cache-Aware LPM vs FCFS Scheduling.

export const HYBRID_MODES = ['align', 'extra', 'evict_state'];
export const SCHED_POLICIES = ['fcfs', 'lpm'];

export const HYBRID_CONFIG = {
  kvCapacityPages: 8,
  mambaCapacitySlots: 3,
  tokensPerPage: 2,
  alignIntervalTokens: 4,
};

export const HYBRID_REQUESTS = [
  { id: 'R1', key: 'req1', tokens: ['You', 'are', 'a', 'helpful', 'coding', 'assistant', 'Explain', 'caching'], pages: ['K0', 'K1', 'K2', 'K3'], branchAt: 0 },
  { id: 'R2', key: 'req2', tokens: ['You', 'are', 'a', 'helpful', 'coding', 'assistant', 'Write', 'tests'], pages: ['K0', 'K1', 'K2', 'K4'], branchAt: 6 },
  { id: 'R3', key: 'req3', tokens: ['You', 'are', 'a', 'helpful', 'coding', 'assistant', 'Fix', 'bugs'], pages: ['K0', 'K1', 'K2', 'K5'], branchAt: 6 },
];

const cloneState = (s) => ({
  ...s,
  nodes: s.nodes.map((n) => ({ ...n, pages: [...n.pages] })),
  kvPool: s.kvPool.map((x) => (x ? { ...x } : null)),
  mambaPool: s.mambaPool.map((x) => (x ? { ...x } : null)),
  rollback: s.rollback ? { ...s.rollback } : null,
  cow: s.cow ? { ...s.cow } : null,
  metrics: { ...s.metrics },
});

export function buildHybridHistory(mode = 'align') {
  const safeMode = HYBRID_MODES.includes(mode) ? mode : 'align';
  const steps = [];

  const kvPool = Array(HYBRID_CONFIG.kvCapacityPages).fill(null);
  const mambaPool = Array(HYBRID_CONFIG.mambaCapacitySlots).fill(null);
  let nodes = [{ id: 'root', parent: null, label: 'ROOT', tokenRange: [0, 0], pages: [], mambaSlot: null, stateStatus: 'root', kvRef: 0, mambaRef: 0 }];
  const metrics = { kvMatched: 0, hybridHit: 0, rollbackRecompute: 0, totalKvMatched: 0, totalHybridHit: 0, totalRollback: 0, cowClones: 0, stateEvictions: 0 };

  const push = (event) => {
    // Enforce invariants on every snapshot
    const liveMambaSlots = new Set(mambaPool.map((slot, idx) => (slot ? idx : -1)).filter((i) => i >= 0));
    for (const n of nodes) {
      if (n.mambaSlot !== null && !liveMambaSlots.has(n.mambaSlot)) {
        throw new Error(`Invariant violated: node ${n.id} points to empty MambaPool slot M${n.mambaSlot}`);
      }
    }
    steps.push(cloneState({
      mode: safeMode,
      step: steps.length,
      ...event,
      nodes,
      kvPool,
      mambaPool,
      metrics,
    }));
  };

  // Step 0: Idle
  push({
    requestIndex: 0,
    kind: 'idle',
    activeNodeIds: [],
    rollback: null,
    cow: null,
    mutabilityPos: 0,
  });

  // Step 1: R1 computes "You are a helpful" -> K0, K1 + checkpoint M0 at t=4
  kvPool[0] = { id: 'K0', tokens: 'You are', nodeId: 'n4', locked: true };
  kvPool[1] = { id: 'K1', tokens: 'a helpful', nodeId: 'n4', locked: true };
  mambaPool[0] = { id: 'M0', label: 'S@4', nodeId: 'n4', locked: true, role: 'checkpoint' };
  nodes = [
    nodes[0],
    { id: 'n4', parent: 'root', label: 'You are a helpful', tokenRange: [1, 4], pages: ['K0', 'K1'], mambaSlot: 0, stateStatus: 'checkpoint', kvRef: 1, mambaRef: 1 },
  ];
  push({
    requestIndex: 0,
    kind: 'r1_grid4',
    activeNodeIds: ['n4'],
    rollback: null,
    cow: null,
    mutabilityPos: 4,
  });

  // Step 2: R1 advances "coding assistant Explain caching" -> K2, K3 + checkpoint M1 at t=8, releases locks
  kvPool[0].locked = false;
  kvPool[1].locked = false;
  kvPool[2] = { id: 'K2', tokens: 'coding assistant', nodeId: 'n8a', locked: false };
  kvPool[3] = { id: 'K3', tokens: 'Explain caching', nodeId: 'n8a', locked: false };
  mambaPool[0].locked = false;
  mambaPool[1] = { id: 'M1', label: 'S@8(R1)', nodeId: 'n8a', locked: false, role: 'checkpoint' };
  nodes[1].kvRef = 0;
  nodes[1].mambaRef = 0;
  nodes.push({ id: 'n8a', parent: 'n4', label: 'coding assistant · Explain caching', tokenRange: [5, 8], pages: ['K2', 'K3'], mambaSlot: 1, stateStatus: 'checkpoint', kvRef: 0, mambaRef: 0 });
  push({
    requestIndex: 0,
    kind: 'r1_done',
    activeNodeIds: ['n8a'],
    rollback: null,
    cow: null,
    mutabilityPos: 8,
  });

  // Step 3: R2 arrives, matches 6 KV tokens -> splits edge into KV-only "coding assistant" + "Explain caching"
  const n8a = nodes.find((n) => n.id === 'n8a');
  n8a.parent = 'n6';
  n8a.label = 'Explain caching';
  n8a.tokenRange = [7, 8];
  n8a.pages = ['K3'];
  kvPool[2].nodeId = 'n6';
  nodes.splice(2, 0, {
    id: 'n6', parent: 'n4', label: 'coding assistant', tokenRange: [5, 6], pages: ['K2'],
    mambaSlot: null, stateStatus: 'kv_only', kvRef: 0, mambaRef: 0,
  });
  metrics.kvMatched = 6;
  metrics.hybridHit = 4;
  metrics.rollbackRecompute = 2;
  metrics.totalKvMatched += 6;
  metrics.totalHybridHit += 4;
  metrics.totalRollback += 2;
  push({
    requestIndex: 1,
    kind: 'r2_split_rollback',
    activeNodeIds: ['n6', 'n4'],
    rollback: { fromTokens: 6, toTokens: 4, fromNode: 'n6', toNode: 'n4', reason: 'kv_only_split' },
    cow: null,
    mutabilityPos: 6,
  });

  // Step 4: R2 CoW-clones M0 -> M2 so cached S@4 is never overwritten in-place
  nodes.find((n) => n.id === 'n4').kvRef = 1;
  nodes.find((n) => n.id === 'n4').mambaRef = 1;
  kvPool[0].locked = true;
  kvPool[1].locked = true;
  mambaPool[0].locked = true;
  mambaPool[2] = { id: 'M2', label: 'Work(R2)', nodeId: null, locked: true, role: 'working', clonedFrom: 0 };
  metrics.cowClones += 1;
  push({
    requestIndex: 1,
    kind: 'r2_cow_clone',
    activeNodeIds: ['n4'],
    rollback: { fromTokens: 6, toTokens: 4, fromNode: 'n6', toNode: 'n4', reason: 'kv_only_split' },
    cow: { from: 0, to: 2 },
    mutabilityPos: 4,
  });

  if (safeMode === 'align') {
    // Step 5 (align): R2 recomputes T5..T6 + computes B7..B8 in M2, stores M2 at t=8(B); n6 stays KV-only
    nodes.find((n) => n.id === 'n4').kvRef = 0;
    nodes.find((n) => n.id === 'n4').mambaRef = 0;
    kvPool[0].locked = false;
    kvPool[1].locked = false;
    mambaPool[0].locked = false;
    kvPool[4] = { id: 'K4', tokens: 'Write tests', nodeId: 'n8b', locked: false };
    mambaPool[2] = { id: 'M2', label: 'S@8(R2)', nodeId: 'n8b', locked: false, role: 'checkpoint' };
    nodes.push({
      id: 'n8b', parent: 'n6', label: 'Write tests', tokenRange: [7, 8], pages: ['K4'],
      mambaSlot: 2, stateStatus: 'checkpoint', kvRef: 0, mambaRef: 0,
    });
    push({
      requestIndex: 1,
      kind: 'r2_done_align',
      activeNodeIds: ['n8b'],
      rollback: null,
      cow: null,
      mutabilityPos: 8,
    });

    // Step 6 (align): R3 arrives, matches 6 KV tokens, n6 is STILL KV-only -> rolls back to t=4 again!
    metrics.kvMatched = 6;
    metrics.hybridHit = 4;
    metrics.rollbackRecompute = 2;
    metrics.totalKvMatched += 6;
    metrics.totalHybridHit += 4;
    metrics.totalRollback += 2;
    push({
      requestIndex: 2,
      kind: 'r3_rollback_again',
      activeNodeIds: ['n6', 'n4'],
      rollback: { fromTokens: 6, toTokens: 4, fromNode: 'n6', toNode: 'n4', reason: 'still_kv_only' },
      cow: null,
      mutabilityPos: 6,
    });

    // Step 7 (align): MambaPool full (3/3) -> evict cold leaf M1 (S@8(A)), CoW-clone M0 -> M1, compute C7..C8
    const n8aNode = nodes.find((n) => n.id === 'n8a');
    n8aNode.mambaSlot = null;
    n8aNode.stateStatus = 'evicted';
    metrics.stateEvictions += 1;
    metrics.cowClones += 1;
    kvPool[5] = { id: 'K5', tokens: 'Fix bugs', nodeId: 'n8c', locked: false };
    mambaPool[1] = { id: 'M1', label: 'S@8(R3)', nodeId: 'n8c', locked: false, role: 'checkpoint', clonedFrom: 0 };
    nodes.push({
      id: 'n8c', parent: 'n6', label: 'Fix bugs', tokenRange: [7, 8], pages: ['K5'],
      mambaSlot: 1, stateStatus: 'checkpoint', kvRef: 0, mambaRef: 0,
    });
    push({
      requestIndex: 2,
      kind: 'r3_done_align',
      activeNodeIds: ['n8c', 'n8a'],
      rollback: null,
      cow: { from: 0, to: 1 },
      mutabilityPos: 8,
    });
  } else {
    // Both 'extra' and 'evict_state' save extra shared-prefix checkpoint S@6 at n6!
    // Step 5: R2 recomputes [T5..T6], snapshots S@6 in M2 on n6, evicts cold leaf M1 (S@8(A)) for R2 suffix B7..B8
    nodes.find((n) => n.id === 'n4').kvRef = 0;
    nodes.find((n) => n.id === 'n4').mambaRef = 0;
    kvPool[0].locked = false;
    kvPool[1].locked = false;
    mambaPool[0].locked = false;
    const n6Node = nodes.find((n) => n.id === 'n6');
    n6Node.mambaSlot = 2;
    n6Node.stateStatus = 'checkpoint';
    mambaPool[2] = { id: 'M2', label: 'S@6 ★', nodeId: 'n6', locked: false, role: 'extra_checkpoint' };

    const n8aNode = nodes.find((n) => n.id === 'n8a');
    n8aNode.mambaSlot = null;
    n8aNode.stateStatus = 'evicted';
    metrics.stateEvictions += 1;

    kvPool[4] = { id: 'K4', tokens: 'Write tests', nodeId: 'n8b', locked: false };
    mambaPool[1] = { id: 'M1', label: 'S@8(R2)', nodeId: 'n8b', locked: false, role: 'checkpoint' };
    nodes.push({
      id: 'n8b', parent: 'n6', label: 'Write tests', tokenRange: [7, 8], pages: ['K4'],
      mambaSlot: 1, stateStatus: 'checkpoint', kvRef: 0, mambaRef: 0,
    });
    push({
      requestIndex: 1,
      kind: 'r2_done_extra',
      activeNodeIds: ['n6', 'n8b'],
      rollback: null,
      cow: null,
      mutabilityPos: 8,
    });

    if (safeMode === 'extra') {
      // Step 6 (extra): R3 hits 6/6 KV AND live checkpoint S@6 (M2) -> ZERO rollback!
      metrics.kvMatched = 6;
      metrics.hybridHit = 6;
      metrics.rollbackRecompute = 0;
      metrics.totalKvMatched += 6;
      metrics.totalHybridHit += 6;
      push({
        requestIndex: 2,
        kind: 'r3_hit_extra',
        activeNodeIds: ['n6'],
        rollback: null,
        cow: null,
        mutabilityPos: 6,
      });

      // Step 7 (extra): Evict cold leaf M1 (S@8(B)), CoW-clone M2 (S@6) -> M1, compute only C7..C8!
      const n8bNode = nodes.find((n) => n.id === 'n8b');
      n8bNode.mambaSlot = null;
      n8bNode.stateStatus = 'evicted';
      metrics.stateEvictions += 1;
      metrics.cowClones += 1;
      kvPool[5] = { id: 'K5', tokens: 'Fix bugs', nodeId: 'n8c', locked: false };
      mambaPool[1] = { id: 'M1', label: 'S@8(R3)', nodeId: 'n8c', locked: false, role: 'checkpoint', clonedFrom: 2 };
      nodes.push({
        id: 'n8c', parent: 'n6', label: 'Fix bugs', tokenRange: [7, 8], pages: ['K5'],
        mambaSlot: 1, stateStatus: 'checkpoint', kvRef: 0, mambaRef: 0,
      });
      push({
        requestIndex: 2,
        kind: 'r3_done_extra',
        activeNodeIds: ['n6', 'n8c'],
        rollback: null,
        cow: { from: 2, to: 1 },
        mutabilityPos: 8,
      });
    } else {
      // 'evict_state': MambaPool pressure reclaims internal checkpoint M2 (S@6) while KV page K2 remains resident!
      // Step 6: Asymmetric state eviction on n6 (before R3 matches at step 7 -> reset per-request counters)
      const n6 = nodes.find((n) => n.id === 'n6');
      n6.mambaSlot = null;
      n6.stateStatus = 'evicted';
      mambaPool[2] = null;
      metrics.kvMatched = 0;
      metrics.hybridHit = 0;
      metrics.rollbackRecompute = 0;
      metrics.stateEvictions += 1;
      push({
        requestIndex: 2,
        kind: 'state_pressure_evict',
        activeNodeIds: ['n6'],
        rollback: null,
        cow: null,
        mutabilityPos: 6,
      });

      // Step 7: R3 matches 6 KV tokens (K0,K1,K2 still resident!) but n6 state was evicted -> must roll back to M0 (t=4)!
      metrics.kvMatched = 6;
      metrics.hybridHit = 4;
      metrics.rollbackRecompute = 2;
      metrics.totalKvMatched += 6;
      metrics.totalHybridHit += 4;
      metrics.totalRollback += 2;
      metrics.cowClones += 1;
      kvPool[5] = { id: 'K5', tokens: 'Fix bugs', nodeId: 'n8c', locked: false };
      mambaPool[2] = { id: 'M2', label: 'S@8(R3)', nodeId: 'n8c', locked: false, role: 'checkpoint', clonedFrom: 0 };
      nodes.push({
        id: 'n8c', parent: 'n6', label: 'Fix bugs', tokenRange: [7, 8], pages: ['K5'],
        mambaSlot: 2, stateStatus: 'checkpoint', kvRef: 0, mambaRef: 0,
      });
      push({
        requestIndex: 2,
        kind: 'r3_evicted_rollback',
        activeNodeIds: ['n6', 'n4', 'n8c'],
        rollback: { fromTokens: 6, toTokens: 4, fromNode: 'n6', toNode: 'n4', reason: 'state_evicted' },
        cow: { from: 0, to: 2 },
        mutabilityPos: 8,
      });
    }
  }

  return steps;
}

export function deriveHybridState(mode = 'align', step = 0) {
  const history = buildHybridHistory(mode);
  const clamped = Math.max(0, Math.min(history.length - 1, Math.floor(Number(step) || 0)));
  const current = history[clamped];
  return {
    ...current,
    limit: history.length - 1,
    done: clamped >= history.length - 1,
    kvUsed: current.kvPool.filter(Boolean).length,
    mambaUsed: current.mambaPool.filter(Boolean).length,
    kvCapacity: HYBRID_CONFIG.kvCapacityPages,
    mambaCapacity: HYBRID_CONFIG.mambaCapacitySlots,
    history,
  };
}

// Cache-Aware Scheduling Counterfactual: FCFS thrashing vs LPM (Longest-Prefix-Match)
const SCHED_REQUESTS = [
  { id: 'A1', prefix: 'A', pages: ['A0', 'A1', 'qa1', 'qa2'] },
  { id: 'B1', prefix: 'B', pages: ['B0', 'B1', 'qb1', 'qb2'] },
  { id: 'A2', prefix: 'A', pages: ['A0', 'A1', 'qa3', 'qa4'] },
  { id: 'B2', prefix: 'B', pages: ['B0', 'B1', 'qb3', 'qb4'] },
];

export function deriveSchedulingComparison(policy = 'fcfs') {
  const safePolicy = SCHED_POLICIES.includes(policy) ? policy : 'fcfs';
  const capacity = 4;
  const order = safePolicy === 'lpm'
    ? [SCHED_REQUESTS[0], SCHED_REQUESTS[2], SCHED_REQUESTS[1], SCHED_REQUESTS[3]]
    : [...SCHED_REQUESTS];

  let cache = []; // Resident entries { id, depth, lastUsed }
  let tick = 0;
  let totalHit = 0;
  let totalCompute = 0;
  let totalEvicted = 0;

  const trace = order.map((req) => {
    tick += 1;
    // Prefix hit must be contiguous from index 0
    let hitPages = 0;
    for (const p of req.pages) {
      if (cache.some((entry) => entry.id === p)) hitPages += 1;
      else break;
    }
    const computePages = req.pages.length - hitPages;
    // Touch hit pages to MRU
    const hitSet = new Set(req.pages.slice(0, hitPages));
    cache = cache.map((entry) => (hitSet.has(entry.id) ? { ...entry, lastUsed: tick } : entry));
    // Evict coldest LEAF pages first (lowest lastUsed, then deepest depth first -> leaf before parent!)
    const needed = Math.max(0, cache.length + computePages - capacity);
    const evicted = [];
    for (let k = 0; k < needed; k += 1) {
      const evictOrder = [...cache]
        .filter((e) => !hitSet.has(e.id))
        .sort((a, b) => (a.lastUsed - b.lastUsed) || (b.depth - a.depth));
      const victim = evictOrder[0];
      if (!victim) break;
      evicted.push(victim.id);
      cache = cache.filter((e) => e.id !== victim.id);
    }
    for (let idx = hitPages; idx < req.pages.length; idx += 1) {
      cache.push({ id: req.pages[idx], depth: idx, lastUsed: tick });
    }

    totalHit += hitPages;
    totalCompute += computePages;
    totalEvicted += evicted.length;
    return {
      id: req.id,
      prefix: req.prefix,
      pages: req.pages,
      hitPages,
      computePages,
      evicted,
      residentAfter: cache.map((e) => e.id),
      thrashed: hitPages === 0 && (req.id === 'A2' || req.id === 'B2'),
    };
  });

  const totalPages = order.length * 4;
  return {
    policy: safePolicy,
    capacity,
    trace,
    totalHit,
    totalCompute,
    totalEvicted,
    totalPages,
    hitRate: totalHit / totalPages,
  };
}
