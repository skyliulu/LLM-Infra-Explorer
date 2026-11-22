export const COLLECTIVE_OPS = ['allreduce', 'reducescatter', 'allgather', 'alltoall'];
export const INTERCONNECTS = [
  { id: 'nvl72', bwGBps: 900, alphaUs: 1.8, scope: 'intra' },
  { id: 'nvlink4', bwGBps: 450, alphaUs: 2.5, scope: 'intra' },
  { id: 'ib8x', bwGBps: 200, alphaUs: 9.0, scope: 'inter' },
  { id: 'ib1x', bwGBps: 50, alphaUs: 12.0, scope: 'inter' },
];
export const MSG_SIZES_MB = [1, 4, 16, 64, 128];
export const OVERLAP_MODES = ['proxy_serial', 'ibgda_overlap'];
export const WORLD_SIZE = 4;

export function normalizeCollectiveConfig(input = {}) {
  const op = COLLECTIVE_OPS.includes(input.op) ? input.op : 'allreduce';
  const routingSkew = input.routingSkew === 'hot' ? 'hot' : 'uniform';
  const interconnect = INTERCONNECTS.some((x) => x.id === input.interconnect) ? input.interconnect : 'nvlink4';
  const msgMB = MSG_SIZES_MB.includes(Number(input.msgMB)) ? Number(input.msgMB) : 16;
  const overlapMode = OVERLAP_MODES.includes(input.overlapMode) ? input.overlapMode : 'ibgda_overlap';
  return { op, routingSkew, interconnect, msgMB, overlapMode };
}

// §1 Step-by-step shard state on P=4 GPUs
// Each GPU i starts with 4 shards [0,1,2,3] of size M/4.
export function deriveCollectiveStep({ op = 'allreduce', routingSkew = 'uniform', step = 0 } = {}) {
  const safeOp = COLLECTIVE_OPS.includes(op) ? op : 'allreduce';
  const P = WORLD_SIZE;
  const maxStep = safeOp === 'allreduce' ? 2 * (P - 1) : safeOp === 'alltoall' ? 2 : (P - 1);
  const s = Math.max(0, Math.min(maxStep, Math.trunc(Number(step) || 0)));

  if (safeOp === 'alltoall') {
    // 4x4 send matrix: rows=src GPU, cols=dst GPU (tokens routed)
    const matrix = routingSkew === 'hot'
      ? [
          [2, 10, 2, 2],
          [2, 10, 2, 2],
          [2, 10, 2, 2],
          [2, 10, 2, 2],
        ]
      : [
          [4, 4, 4, 4],
          [4, 4, 4, 4],
          [4, 4, 4, 4],
          [4, 4, 4, 4],
        ];
    const recvTotals = [0, 1, 2, 3].map((dst) => matrix.reduce((sum, row) => sum + row[dst], 0));
    const maxRecv = Math.max(...recvTotals);
    return {
      op: safeOp,
      step: s,
      maxStep,
      phase: s === 0 ? 'idle' : s === maxStep ? 'done' : 'running',
      stageName: s === 0 ? 'idle' : s === 1 ? 'a2a_dispatch' : 'a2a_done',
      volumeFactor: (P - 1) / P,
      gpus: [0, 1, 2, 3].map((id) => ({
        id,
        shards: [0, 1, 2, 3].map((k) => ({
          idx: k,
          label: s >= 2 ? `E${id}←G${k}:${matrix[k][id]}` : `G${id}→E${k}:${matrix[id][k]}`,
          state: s === 0 ? 'local' : s === 1 ? 'inflight' : recvTotals[id] > 24 ? 'hot' : 'ready',
        })),
        recvTotal: recvTotals[id],
        isHot: recvTotals[id] > 24,
      })),
      maxRecv,
      imbalance: Number((maxRecv / 16).toFixed(2)),
    };
  }

  // Ring algorithms:
  // Reduce-Scatter (steps 1..3): at hop h (1..3), GPU g sends shard (g - h + 1 + 4)%4 to (g+1)%4 and accumulates into receiver.
  // All-Gather (steps 1..3 or 4..6 in All-Reduce): circulates finished shards so all GPUs hold all 4 complete shards.
  const gpus = [0, 1, 2, 3].map((id) => {
    const shards = [0, 1, 2, 3].map((idx) => {
      if (safeOp === 'allgather') {
        // Initially GPU id owns only shard id
        const dist = (id - idx + P) % P;
        const owned = dist <= s;
        const fresh = s > 0 && dist === s;
        return { idx, label: owned ? `S${idx}` : '·', state: fresh ? 'inflight' : owned ? 'ready' : 'empty' };
      }
      if (safeOp === 'reducescatter') {
        // After step s, shard idx has accumulated (s+1) partial contributions at the rank that is (idx + s) % 4?
        // Canonical ring RS: GPU id finishes shard (id + 1) % 4 after 3 hops.
        const ownerAtEnd = (idx + P - 1) % P;
        const distToOwner = (ownerAtEnd - id + P) % P;
        const contributions = s === 0 ? 1 : distToOwner === (P - 1 - s) ? s + 1 : 1;
        const isFinalOwner = s === P - 1 && id === ownerAtEnd;
        const activeRecv = s > 0 && distToOwner === (P - 1 - s);
        return {
          idx,
          label: isFinalOwner ? `Σ${idx}` : activeRecv ? `p${contributions}(${idx})` : s === P - 1 ? '·' : `x${id},${idx}`,
          state: isFinalOwner ? 'ready' : activeRecv ? 'inflight' : s === P - 1 ? 'empty' : 'local',
        };
      }
      // All-Reduce = RS (steps 1..3) + AG (steps 4..6)
      const ownerAfterRs = (idx + P - 1) % P;
      if (s <= P - 1) {
        const distToOwner = (ownerAfterRs - id + P) % P;
        const activeRecv = s > 0 && distToOwner === (P - 1 - s);
        const isRsDone = s === P - 1 && id === ownerAfterRs;
        return {
          idx,
          label: isRsDone ? `Σ${idx}` : activeRecv ? `p${s + 1}(${idx})` : `x${id},${idx}`,
          state: isRsDone ? 'ready' : activeRecv ? 'inflight' : 'local',
        };
      }
      const agHop = s - (P - 1);
      const distFromOwner = (id - ownerAfterRs + P) % P;
      const hasFull = distFromOwner <= agHop;
      const fresh = distFromOwner === agHop;
      return {
        idx,
        label: hasFull ? `Σ${idx}` : `x${id},${idx}`,
        state: fresh ? 'inflight' : hasFull ? 'ready' : 'local',
      };
    });
    return { id, shards, recvTotal: 16, isHot: false };
  });

  const stageName = s === 0
    ? 'idle'
    : safeOp === 'allreduce'
      ? (s <= P - 1 ? 'rs_phase' : 'ag_phase')
      : safeOp === 'reducescatter'
        ? 'rs_phase'
        : 'ag_phase';
  const volumeFactor = safeOp === 'allreduce' ? (2 * (P - 1)) / P : (P - 1) / P;

  return {
    op: safeOp,
    step: s,
    maxStep,
    phase: s === 0 ? 'idle' : s === maxStep ? 'done' : 'running',
    stageName,
    volumeFactor,
    gpus,
    maxRecv: 16,
    imbalance: 1,
  };
}

// §2 Alpha-Beta interconnect latency model
export function deriveInterconnectLatency({ op = 'allreduce', interconnect = 'nvlink4', msgMB = 16 } = {}) {
  const safeOp = COLLECTIVE_OPS.includes(op) ? op : 'allreduce';
  const link = INTERCONNECTS.find((x) => x.id === interconnect) || INTERCONNECTS[1];
  const M = Math.max(1, Number(msgMB) || 16);
  const P = WORLD_SIZE;
  const factor = safeOp === 'allreduce' ? (2 * (P - 1)) / P : (P - 1) / P;
  const hops = safeOp === 'allreduce' ? 2 * (P - 1) : safeOp === 'alltoall' ? 1 : (P - 1);

  const computeFor = (entry) => {
    const algoBytesMB = M * factor;
    const latencyUs = entry.alphaUs * hops;
    const bwUs = ((algoBytesMB * 1024 * 1024) / (entry.bwGBps * 1e9)) * 1e6;
    const totalUs = latencyUs + bwUs;
    const dominant = latencyUs >= bwUs ? 'latency' : 'bandwidth';
    return {
      id: entry.id,
      scope: entry.scope,
      bwGBps: entry.bwGBps,
      alphaUs: entry.alphaUs,
      algoBytesMB: Number(algoBytesMB.toFixed(1)),
      latencyUs: Number(latencyUs.toFixed(1)),
      bwUs: Number(bwUs.toFixed(1)),
      totalUs: Number(totalUs.toFixed(1)),
      dominant,
    };
  };

  const allLinks = INTERCONNECTS.map(computeFor);
  const selected = allLinks.find((x) => x.id === link.id) || allLinks[1];
  const maxTotalUs = Math.max(...allLinks.map((x) => x.totalUs));

  return { op: safeOp, msgMB: M, selected, allLinks, maxTotalUs };
}

// §3 Host-proxy serial vs IBGDA + Micro-batch overlap
export function deriveOverlapModel(overlapMode = 'ibgda_overlap') {
  const isIbgda = overlapMode === 'ibgda_overlap';
  const serial = {
    computeUs: 60,
    cpuProxyUs: 18,
    commUs: 46,
    totalUs: 124,
    exposedCommPct: 52,
    cpuHops: 2,
  };
  const ibgda = {
    computeUs: 60,
    cpuProxyUs: 0,
    commUs: 46,
    totalUs: 68,
    exposedCommPct: 12,
    cpuHops: 0,
  };
  return {
    mode: isIbgda ? 'ibgda_overlap' : 'proxy_serial',
    active: isIbgda ? ibgda : serial,
    serial,
    ibgda,
    speedup: Number((serial.totalUs / ibgda.totalUs).toFixed(2)),
  };
}
