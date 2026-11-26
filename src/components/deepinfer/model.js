export const COMMIT = '553741557a57df44a46fb3ab72b6aafeaf945337';
export const SOURCE_BASE = `https://github.com/deepseek-ai/DeepInfer/blob/${COMMIT}/`;
export const SOURCES = {
  overview: `${SOURCE_BASE}README.md`,
  engine: `${SOURCE_BASE}deepinfer/engine/llm_engine.py#L860`,
  scheduler: `${SOURCE_BASE}csrc/engine/scheduler.hpp#L285`,
  prefill: `${SOURCE_BASE}csrc/engine/scheduler.hpp#L351`,
  decode: `${SOURCE_BASE}csrc/engine/scheduler.hpp#L559`,
  worker: `${SOURCE_BASE}deepinfer/worker/worker.py#L89`,
  remap: `${SOURCE_BASE}csrc/engine/zos.cpp`,
  memory: `${SOURCE_BASE}csrc/engine/scheduler.hpp#L815`,
};
export const SCENARIOS = {
  mixed: [[6, 3], [4, 2], [8, 3]],
  pressure: [[4, 3], [4, 3], [4, 2], [4, 2]],
  long: [[20, 3], [4, 2], [6, 2]],
};
export const normalizeConfig = (input = {}) => ({
  scenario: Object.hasOwn(SCENARIOS, input.scenario) ? input.scenario : 'mixed',
  prefillBudget: [4, 8, 12].includes(input.prefillBudget) ? input.prefillBudget : 8,
  overlap: typeof input.overlap === 'boolean' ? input.overlap : true,
});

// A single-rank NORMAL-engine teaching subset: nextn=0, prompt-attempt interval=1,
// max_num_prompts=max_num_seqs=2, sufficient blocks, no multimodal/preemption.
// It is a logical synchronous trace; ZOS timing is derived separately below.
export function buildRequestTrace(input = {}) {
  const config = normalizeConfig(input);
  const rows = SCENARIOS[config.scenario].map(([prompt, target], index) => ({
    id: String.fromCharCode(65 + index), prompt, target, computed: 0, output: 0,
    pending: 0, status: 'waiting',
  }));
  const events = [];
  let batch = 0, workload = 0;
  const push = (stage, extra = {}) => events.push({
    stage, batch, workload, rows: rows.map(row => ({ ...row })),
    kind: 'idle', selected: [], retiring: [], ...extra,
  });
  push('ready');
  while (rows.some(row => row.status !== 'done')) {
    if (batch > 120) throw new Error('Teaching trace did not terminate');
    batch += 1;
    let remaining = config.prefillBudget;
    let slots = rows.filter(row => ['running', 'finishing'].includes(row.status)).length;
    let selected = [];
    for (const row of rows.filter(row => row.status === 'waiting')) {
      if (slots >= 2 || remaining === 0) break;
      const count = Math.min(row.prompt - row.computed, remaining);
      selected.push({ id: row.id, from: row.computed, count, last: row.computed + count === row.prompt });
      remaining -= count;
      if (row.computed + count === row.prompt) slots += 1;
      else break;
    }
    let kind = selected.length ? 'prefill' : 'decode';
    const retiring = [];
    if (kind === 'decode') {
      for (const row of rows.filter(row => row.status === 'finishing')) {
        row.status = 'releasing'; retiring.push(row.id);
      }
      selected = rows.filter(row => row.status === 'running')
        .sort((a, b) => a.output - b.output || a.id.localeCompare(b.id))
        .map(row => ({ id: row.id, from: row.computed + row.output - 1, inputIndex: row.output - 1, count: 1, last: true }));
      if (!selected.length) kind = 'cleanup';
    }
    const details = { kind, selected, retiring, tokens: selected.reduce((sum, row) => sum + row.count, 0) };
    push('schedule', details);
    if (kind !== 'cleanup') {
      for (const item of selected) {
        const row = rows.find(row => row.id === item.id);
        if (kind === 'prefill') row.computed += item.count;
      }
      workload += details.tokens;
      push('forward', details);
    }
    for (const row of rows.filter(row => row.status === 'releasing')) row.status = 'done';
    for (const item of selected) {
      const row = rows.find(row => row.id === item.id);
      if (kind === 'decode' || item.last) row.pending = 1;
    }
    push('sample', details);
    for (const item of selected) {
      const row = rows.find(row => row.id === item.id);
      if (row.pending) {
        row.output += row.pending; row.pending = 0;
        row.status = row.output === row.target ? 'finishing' : 'running';
      }
    }
    push('commit', details);
  }
  push('done', { kind: 'done' });
  return { config, events, maxStep: events.length - 1, batches: batch };
}

// A dependency schedule in dimensionless, explicitly illustrative units.
// One CPU lane; one ordered device lane. Sample i feeds forward i+1 on device.
// Async postprocess i overlaps forward i+1, then final output needs a drain.
export function deriveOverlapModel(overlap = true, rounds = 3) {
  rounds = Math.max(1, Math.min(5, Math.floor(Number(rounds)) || 1));
  const operations = [];
  let host = 0, device = 0, priorSample = 0;
  const add = (lane, type, round, start, duration) => {
    const op = { id: `${type}-${round}`, lane, type, round, start, end: start + duration };
    operations.push(op); return op.end;
  };
  for (let round = 0; round < rounds; round += 1) {
    host = add('cpu', 'schedule', round, host, 1);
    const forwardEnd = add('device', 'forward', round, Math.max(host, device), 4);
    if (overlap && round > 0) host = add('cpu', 'commit', round - 1, Math.max(host, priorSample), 2);
    // GPU sample(round) only depends on GPU forward(round), never on CPU commit(round - 1).
    device = add('device', 'sample', round, forwardEnd, 1);
    priorSample = device;
    if (!overlap) host = add('cpu', 'commit', round, device, 2);
  }
  if (overlap) host = add('cpu', 'flush', rounds - 1, Math.max(host, device), 2);
  return { operations, total: Math.max(host, device), rounds, overlap };
}

export function deriveDeepInferState(input = {}, step = 0, requestId = 'A', timingSelection = {track:'candidate',id:'commit-0'}) {
  const trace = buildRequestTrace(input);
  const cursor = Math.min(trace.maxStep, Math.max(0, Math.floor(Number(step)) || 0));
  const event = trace.events[cursor];
  const selectedRequest = event.rows.find(row => row.id === requestId) || event.rows[0];
  const activeRequest = event.selected.find(item => item.id === selectedRequest.id);
  const requestReason = ['done','finishing','releasing'].includes(selectedRequest.status) ? 'requestFinished'
    : selectedRequest.pending ? 'requestPending'
    : !activeRequest ? 'requestExcluded'
    : event.stage === 'schedule' ? 'requestScheduled'
    : selectedRequest.computed < selectedRequest.prompt ? 'requestPartial'
    : 'requestActive';
  const baseline = deriveOverlapModel(false);
  const timing = deriveOverlapModel(trace.config.overlap);
  const timingTrack = timingSelection?.track === 'baseline' ? 'baseline' : 'candidate';
  const inspectedTiming = timingTrack === 'baseline' ? baseline : timing;
  const selectedOperation = inspectedTiming.operations.find(op => op.id === timingSelection?.id) || inspectedTiming.operations[0];
  return {
    ...trace, step: cursor, event,
    phase: cursor === 0 ? 'idle' : cursor === trace.maxStep ? 'done' : 'running',
    completed: event.rows.filter(row => ['done', 'finishing', 'releasing'].includes(row.status)).length,
    outputTokens: event.rows.reduce((sum, row) => sum + row.output, 0),
    promptTokens: event.rows.reduce((sum, row) => sum + row.computed, 0),
    totalPrompt: event.rows.reduce((sum, row) => sum + row.prompt, 0),
    requestInspector: { row: selectedRequest, inBatch: Boolean(activeRequest), reason: requestReason },
    baseline, timing, timingInspection: { track: timingTrack, operation: selectedOperation, overlap: inspectedTiming.overlap },
    timelineScale: baseline.total,
  };
}
