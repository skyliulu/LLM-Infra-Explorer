// Request path through the open-source stack at kvcache-ai/Mooncake@504f2ae.
// Each step names the component that acts, the interface it crosses and the
// line of the teaching pseudocode that is active.
export const STEPS = [
  {id: 'request', node: 'router', line: 1},
  {id: 'index', node: 'conductor', line: 2},
  {id: 'pick', node: 'router', line: 3},
  {id: 'lookup', node: 'store', line: 5},
  {id: 'load', node: 'te', line: 6},
  {id: 'prefill', node: 'engine', line: 8},
  {id: 'decode', node: 'engine', line: 10},
];

export const CODE = [
  'req   = {input_tokens, prefix_keys}',
  'hits  = conductor.query(prefix_keys)',
  'inst  = router.pick(hits, load)',
  '',
  'reps  = store.get_replica_list(keys)   # replicas + lease_ttl',
  'te.read(reps.segment, local_buffer)    # BatchTransfer',
  '',
  'prefill(input_tokens)',
  'store.put_start(keys, sizes)',
  'te.write(kv, reps.segment); store.put_end(keys)',
  'decode()',
];

export function stepAt(step) {
  const at = Math.max(0, Math.min(STEPS.length, Number.isFinite(step) ? Math.floor(step) : 0));
  const active = at > 0 ? STEPS[at - 1] : null;
  return {
    step: at,
    limit: STEPS.length,
    active,
    node: active ? active.node : null,
    line: active ? active.line : null,
    phase: at === 0 ? 'idle' : at === STEPS.length ? 'done' : 'running',
  };
}
