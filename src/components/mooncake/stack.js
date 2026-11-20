// Request path through the open-source stack (kvcache-ai/Mooncake@504f2ae).
// Separates control plane (Router, Conductor, Store Master) from data plane
// (Engine, Transfer Engine, Store Segments).

export const CONTROL_NODES = ['router', 'conductor', 'master'];
export const DATA_NODES = ['engine', 'te', 'segments'];
export const ALL_NODES = [...CONTROL_NODES, ...DATA_NODES];
export const TOPOLOGIES = ['mooncake', 'local', 'proxy'];

export const STEPS = [
  {id: 'request', node: 'router', secondary: [], edge: null, lines: [1]},
  {id: 'index', node: 'conductor', secondary: ['router'], edge: 'router-conductor', lines: [2]},
  {id: 'pick', node: 'router', secondary: ['engine'], edge: 'router-engine', lines: [3]},
  {id: 'lookup', node: 'master', secondary: ['engine'], edge: 'engine-master', lines: [5]},
  {id: 'load', node: 'te', secondary: ['segments', 'engine'], edge: 'data-transfer', lines: [6]},
  {id: 'prefill', node: 'engine', secondary: ['master', 'te', 'segments'], edge: 'engine-master', lines: [8, 9, 10]},
  {id: 'decode', node: 'engine', secondary: [], edge: null, lines: [11]},
];

export const CODE = [
  'req   = {input_tokens, prefix_keys}',
  'hits  = conductor.query(prefix_keys)',
  'inst  = router.pick(hits, load)',
  '',
  'reps  = master.get_replica_list(keys)   # + 10s lease TTL',
  'te.read(reps.segment -> local_buffer)   # BatchTransfer RDMA',
  '',
  'kv    = engine.prefill(suffix_tokens)',
  'dst   = master.put_start(new_keys, sizes)',
  'te.write(kv -> dst.segment); master.put_end(new_keys)',
  'engine.decode()',
];

export function stepAt(step) {
  const at = Math.max(1, Math.min(STEPS.length, Number.isFinite(step) ? Math.floor(step) : 1));
  const active = STEPS[at - 1];
  return {
    step: at,
    limit: STEPS.length,
    active,
    node: active.node,
    secondary: active.secondary,
    edge: active.edge,
    lines: active.lines,
    phase: at === STEPS.length ? 'done' : 'running',
  };
}
