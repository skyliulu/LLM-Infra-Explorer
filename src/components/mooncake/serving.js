// Pure model for Mooncake's architecture: four technical difficulties, the
// control/data planes that answer them, and the request walk through both.
import {KV_BYTES_PER_TOKEN, READOUT} from './model.js';

export const CHALLENGES = ['prefill', 'transfer', 'placement', 'overload'];
export const POLICIES = ['reuse', 'slo'];
export const CHUNK_TOKENS = 1024;
export const PREFILL_NODES = 2;
export const SLO_MS = 300;
export const TCP_GBPS = 12.5;

const RATE = READOUT.prefillRate;
const FABRIC = READOUT.fabricGBps;
export const CHUNK_MS = (CHUNK_TOKENS / RATE) * 1000;
const msForBytes = (tokens, gbps = FABRIC) => (tokens * KV_BYTES_PER_TOKEN) / 1e9 / gbps * 1000;
const stagesFor = tokens => Math.ceil(Math.ceil(tokens / CHUNK_TOKENS) / PREFILL_NODES);

const buildCandidate = (id, prompt, hit, queue) => {
  const compute = prompt - hit;
  const stages = stagesFor(compute);
  return {
    id,
    hit,
    compute,
    chunks: Math.ceil(compute / CHUNK_TOKENS),
    stages,
    queue,
    loadMs: msForBytes(hit),
    prefillMs: stages * CHUNK_MS,
    streamMs: msForBytes(compute),
    ttft: READOUT.lookupMs + msForBytes(hit) + stages * CHUNK_MS + queue,
  };
};

const PROMPT = 16384;
const plan = challenge => {
  const overload = challenge === 'overload';
  return {
    overload,
    prompt: PROMPT,
    candidates: [
      buildCandidate('A', PROMPT, 12288, overload ? 400 : 120),
      buildCandidate('B', PROMPT, 11264, overload ? 350 : 0),
    ],
  };
};

export function deriveArchitectureState({challenge = 'prefill', policy = 'reuse', step = 0} = {}) {
  const safeChallenge = CHALLENGES.includes(challenge) ? challenge : 'prefill';
  const safePolicy = POLICIES.includes(policy) ? policy : 'reuse';
  const {overload, prompt, candidates} = plan(safeChallenge);
  const ranked = [...candidates].sort((a, b) => (safePolicy === 'reuse' ? b.hit - a.hit : a.ttft - b.ttft));
  const chosen = ranked[0];
  const admitted = !(overload && chosen.ttft > SLO_MS);
  const steps = admitted
    ? [
      {id: 'arrive', active: 'conductor'},
      {id: 'index', active: 'index'},
      {id: 'choose', active: 'conductor'},
      {id: 'load', active: 'load'},
      {id: 'prefill', active: 'prefill'},
      {id: 'stream', active: 'stream'},
      {id: 'decode', active: 'decode'},
    ]
    : [
      {id: 'arrive', active: 'conductor'},
      {id: 'index', active: 'index'},
      {id: 'choose', active: 'conductor'},
      {id: 'reject', active: 'reject'},
    ];
  const limit = steps.length;
  const at = Math.max(0, Math.min(limit, Number.isFinite(step) ? Math.floor(step) : 0));
  const reached = id => {
    const index = steps.findIndex(entry => entry.id === id);
    return index >= 0 && at >= index + 1;
  };
  const planned = reached('choose');
  const total = {
    reused: planned && admitted ? chosen.hit : 0,
    computed: planned && admitted ? chosen.compute : 0,
    chunks: planned && admitted ? chosen.chunks : 0,
    stages: planned && admitted ? chosen.stages : 0,
    loadBytes: reached('load') ? chosen.hit * KV_BYTES_PER_TOKEN : 0,
    loadMs: reached('load') ? chosen.loadMs : 0,
    prefillMs: reached('prefill') ? chosen.prefillMs : 0,
    streamBytes: reached('stream') ? chosen.compute * KV_BYTES_PER_TOKEN : 0,
    streamMs: reached('stream') ? chosen.streamMs : 0,
    ttft: planned ? chosen.ttft : 0,
  };
  const saved = overload
    ? {prefillMs: candidates[0].prefillMs, loadBytes: candidates[0].hit * KV_BYTES_PER_TOKEN, streamBytes: candidates[0].compute * KV_BYTES_PER_TOKEN}
    : {prefillMs: 0, loadBytes: 0, streamBytes: 0};
  const singleNodeMs = (chosen.compute / RATE) * 1000;
  const budget = {
    singleNodeMs,
    cppMs: chosen.prefillMs,
    savedByCpp: singleNodeMs - chosen.prefillMs,
    peakFullBytes: prompt * KV_BYTES_PER_TOKEN,
    peakChunkBytes: CHUNK_TOKENS * KV_BYTES_PER_TOKEN,
    loadMs: msForBytes(chosen.hit),
    streamMs: msForBytes(chosen.compute),
    tcpLoadMs: msForBytes(chosen.hit, TCP_GBPS),
    tcpStreamMs: msForBytes(chosen.compute, TCP_GBPS),
    fabric: FABRIC,
    tcp: TCP_GBPS,
  };
  return {
    challenge: safeChallenge,
    policy: safePolicy,
    overload,
    prompt,
    candidates,
    chosen,
    admitted,
    steps,
    step: at,
    limit,
    phase: at === 0 ? 'idle' : at === limit ? 'done' : 'running',
    planned,
    total,
    saved,
    budget,
    slo: SLO_MS,
    chunkTokens: CHUNK_TOKENS,
    prefillNodes: PREFILL_NODES,
    chunkMs: CHUNK_MS,
    active: at > 0 ? steps[at - 1].active : null,
    current: at > 0 ? steps[at - 1].id : null,
    reason: !planned ? 'pending' : !admitted ? 'overload' : safePolicy === 'reuse' ? 'reuse' : 'slo',
    decodeBatch: {tokens: admitted ? 96 : 128, capacity: 128},
  };
}
