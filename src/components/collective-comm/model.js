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

export const ALGO_MODES = ['ring', 'tree', 'nvls'];
export const ALGO_WORLD_SIZES = [4, 8, 16, 64];
export const ALGO_MSG_SIZES = [1, 8, 64, 256];
export const RDMA_MODES = ['tcp_host', 'gpudirect_rdma', 'roce_pfc_storm'];
export const COMM_DIAG_IDS = ['tp_small_batch', 'ep_skew_tail', 'cross_rail_cliff', 'sm_starvation'];

export function normalizeCollectiveConfig(input = {}) {
  const op = COLLECTIVE_OPS.includes(input.op) ? input.op : 'allreduce';
  const routingSkew = input.routingSkew === 'hot' ? 'hot' : 'uniform';
  const algo = ALGO_MODES.includes(input.algo) ? input.algo : 'ring';
  const algoP = ALGO_WORLD_SIZES.includes(Number(input.algoP)) ? Number(input.algoP) : 8;
  const algoMsgMB = ALGO_MSG_SIZES.includes(Number(input.algoMsgMB)) ? Number(input.algoMsgMB) : 8;
  const interconnect = INTERCONNECTS.some((x) => x.id === input.interconnect) ? input.interconnect : 'nvlink4';
  const msgMB = MSG_SIZES_MB.includes(Number(input.msgMB)) ? Number(input.msgMB) : 16;
  const rdmaMode = RDMA_MODES.includes(input.rdmaMode) ? input.rdmaMode : 'gpudirect_rdma';
  const overlapMode = OVERLAP_MODES.includes(input.overlapMode) ? input.overlapMode : 'ibgda_overlap';
  const diagId = COMM_DIAG_IDS.includes(input.diagId) ? input.diagId : 'tp_small_batch';
  return { op, routingSkew, algo, algoP, algoMsgMB, interconnect, msgMB, rdmaMode, overlapMode, diagId };
}

// §1 Step-by-step shard state on P=4 GPUs
export function deriveCollectiveStep({ op = 'allreduce', routingSkew = 'uniform', step = 0 } = {}) {
  const safeOp = COLLECTIVE_OPS.includes(op) ? op : 'allreduce';
  const P = WORLD_SIZE;
  const maxStep = safeOp === 'allreduce' ? 2 * (P - 1) : safeOp === 'alltoall' ? 2 : (P - 1);
  const s = Math.max(0, Math.min(maxStep, Math.trunc(Number(step) || 0)));

  if (safeOp === 'alltoall') {
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

  const gpus = [0, 1, 2, 3].map((id) => {
    const shards = [0, 1, 2, 3].map((idx) => {
      if (safeOp === 'allgather') {
        const dist = (id - idx + P) % P;
        const owned = dist <= s;
        const fresh = s > 0 && dist === s;
        return { idx, label: owned ? `S${idx}` : '·', state: fresh ? 'inflight' : owned ? 'ready' : 'empty' };
      }
      if (safeOp === 'reducescatter') {
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

// §2 NCCL Algorithm Comparison: Ring vs Double-Binary Tree vs NVLS SHARP (In-Switch)
export function deriveAlgoComparison({ algo = 'ring', algoP = 8, algoMsgMB = 8 } = {}) {
  const safeAlgo = ALGO_MODES.includes(algo) ? algo : 'ring';
  const P = ALGO_WORLD_SIZES.includes(Number(algoP)) ? Number(algoP) : 8;
  const M = ALGO_MSG_SIZES.includes(Number(algoMsgMB)) ? Number(algoMsgMB) : 8;
  const alphaUs = P <= 8 ? 2.5 : 8.5; // intra-node NVLink vs cross-node IB
  const bwGBps = P <= 8 ? 450 : 200;

  // Ring: 2(P-1) hops, 2(P-1)/P * M bandwidth-optimal
  const ringHops = 2 * (P - 1);
  const ringFactor = (2 * (P - 1)) / P;
  const ringUs = ringHops * alphaUs + ((M * ringFactor * 1024 * 1024) / (bwGBps * 1e9)) * 1e6;

  // Double-Binary Tree: 2*log2(P) latency hops, ~2.0*M effective traffic (slightly lower peak utilization on huge msgs)
  const treeHops = 2 * Math.round(Math.log2(P));
  const treeFactor = 2.0;
  const treeUs = treeHops * alphaUs + ((M * treeFactor * 1024 * 1024) / (bwGBps * 0.9 * 1e9)) * 1e6;

  // NVLS / SHARP In-Switch Reduction: O(1) switch hops (2), 1.0*M sent + 1.0*M received (switch sums in-flight!)
  const nvlsHops = 2;
  const nvlsFactor = 1.0; // GPU sends M once to NVSwitch SHARP, receives reduced M once (half link load vs Ring!)
  const nvlsBw = P <= 8 ? 450 : 360; // NVL72 / SHARP switch fabric
  const nvlsUs = nvlsHops * (P <= 8 ? 2.2 : 4.5) + ((M * nvlsFactor * 1024 * 1024) / (nvlsBw * 1e9)) * 1e6;

  const entries = [
    { id: 'ring', hops: ringHops, factor: Number(ringFactor.toFixed(2)), totalUs: Number(ringUs.toFixed(1)), smLoad: '8–16 SMs' },
    { id: 'tree', hops: treeHops, factor: Number(treeFactor.toFixed(2)), totalUs: Number(treeUs.toFixed(1)), smLoad: '8–16 SMs' },
    { id: 'nvls', hops: nvlsHops, factor: Number(nvlsFactor.toFixed(2)), totalUs: Number(nvlsUs.toFixed(1)), smLoad: '2–4 SMs (Switch)' },
  ];
  const winner = entries.reduce((best, item) => (item.totalUs < best.totalUs ? item : best), entries[0]);
  const selected = entries.find((e) => e.id === safeAlgo) || entries[0];
  const maxUs = Math.max(...entries.map((e) => e.totalUs));

  return { algo: safeAlgo, P, M, entries, selected, winner, maxUs };
}

// §3 Alpha-Beta interconnect latency model
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

// §4 Inter-Node Transport: TCP Host-Bounce vs GPUDirect RDMA vs RoCEv2 PFC Storm
export function deriveRdmaModel(rdmaMode = 'gpudirect_rdma') {
  const mode = RDMA_MODES.includes(rdmaMode) ? rdmaMode : 'gpudirect_rdma';
  const profiles = {
    tcp_host: {
      id: 'tcp_host',
      cpuCopies: 4,
      p99Us: 420,
      effBwGBps: 14,
      zeroCopy: false,
      healthy: false,
    },
    gpudirect_rdma: {
      id: 'gpudirect_rdma',
      cpuCopies: 0,
      p99Us: 19,
      effBwGBps: 47,
      zeroCopy: true,
      healthy: true,
    },
    roce_pfc_storm: {
      id: 'roce_pfc_storm',
      cpuCopies: 0,
      p99Us: 980,
      effBwGBps: 9,
      zeroCopy: true,
      healthy: false,
    },
  };
  return profiles[mode];
}

// §5 Host-proxy serial vs IBGDA + Micro-batch overlap
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
