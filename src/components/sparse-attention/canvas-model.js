import { DEFAULTS, deriveSparseModel, deriveTradeoff } from './model.js';
import { deriveMatrixModel } from './matrix-model.js';

export const CANVAS_DEFAULTS = { ...DEFAULTS, mode: 'dsa', budgetKiB: 64 };

export function deriveTrends(m) {
  const history = Array.from({length:64}, (_,i) => {
    const n=i+1, g=m.compressed?Math.floor(n/m.ratio):n, l=m.hasWindow?Math.min(n,m.window):0;
    return { x:n, baseline:n*RECORD_BYTES.baseline, memory:cacheBytesAt(m,n),
      traffic:(m.indexed?Math.min(m.topK,g):g)*RECORD_BYTES.global+l*RECORD_BYTES.local+(m.indexed?g*RECORD_BYTES.index:0) };
  });
  const capacity = [32,64,128].map(b => ({x:b,baseline:b,value:deriveResourceEstimate(m,b).capacity}));
  return { history, capacity };
}

export function deriveBenefitModel(r) {
  return [
    { id:'memory', before:r.baselineBytes, after:r.storedBytes, parts:[r.globalStoredBytes,r.localStoredBytes,r.indexStoredBytes] },
    { id:'traffic', before:r.baselineBytes, after:r.readBytes, parts:[r.globalReadBytes,r.localReadBytes,r.indexReadBytes] },
    { id:'context', before:r.baselineCapacity, after:r.capacity, parts:[r.capacity] },
  ].map(item => {
    const change = item.after/item.before-1;
    const direction = Math.abs(change)<1e-9 ? 'same' : change>0 ? 'up' : 'down';
    const improves = item.id==='context' ? change>0 : change<0;
    return { ...item, change, direction, outcome:direction==='same'?'same':improves?'better':'worse', scale:Math.max(item.before,item.after,1) };
  });
}

// Explicit what-if accounting, not checkpoint dimensions or a GPU benchmark.
export const RECORD_BYTES = { baseline: 1024, global: 1024, local: 1024, index: 128 };
export function cacheBytesAt(m, tokens) {
  const global = m.compressed ? Math.floor(tokens / m.ratio) : tokens;
  const local = m.hasWindow ? Math.min(tokens, m.window) : 0;
  return global * (RECORD_BYTES.global + (m.indexed ? RECORD_BYTES.index : 0)) + local * RECORD_BYTES.local;
}
export function deriveResourceEstimate(m, budgetKiB = 64) {
  const budgetBytes = budgetKiB * 1024;
  let lo = 0, hi = 1;
  while (cacheBytesAt(m, hi) <= budgetBytes) hi *= 2;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (cacheBytesAt(m, mid) <= budgetBytes) lo = mid;
    else hi = mid;
  }
  const baselineBytes = m.tokens * RECORD_BYTES.baseline;
  const storedBytes = cacheBytesAt(m, m.tokens);
  const mainReadBytes = m.globalReads * RECORD_BYTES.global + m.local.length * RECORD_BYTES.local;
  const indexReadBytes = m.indexReads * RECORD_BYTES.index;
  return { budgetBytes, baselineBytes, storedBytes, mainReadBytes, indexReadBytes,
    globalReadBytes:m.globalReads*RECORD_BYTES.global, localReadBytes:m.local.length*RECORD_BYTES.local,
    readBytes: mainReadBytes + indexReadBytes, baselineCapacity: Math.floor(budgetBytes / RECORD_BYTES.baseline), capacity:lo,
    globalStoredBytes:m.global.length*RECORD_BYTES.global, localStoredBytes:m.local.length*RECORD_BYTES.local,
    indexStoredBytes:m.indexed?m.global.length*RECORD_BYTES.index:0,
    capacityBytes:cacheBytesAt(m,lo), nextCapacityBytes:cacheBytesAt(m,lo+1),
  };
}
export function deriveCanvasModel(input = {}, selectedFocus = 'overview') {
  const mode = ['dsa', 'csa', 'hca'].includes(input.mode) ? input.mode : 'dsa';
  const m = deriveSparseModel({ ...input, mode });
  const baseline = deriveSparseModel({ ...input, mode: 'dense' });
  const nodes = ['history', 'query', 'cache', ...(m.indexed ? ['index'] : []), ...(m.hasWindow ? ['local'] : []), 'attention'];
  const focus = nodes.includes(selectedFocus) ? selectedFocus : 'overview';
  const budgetKiB = [32,64,128].includes(+input.budgetKiB) ? +input.budgetKiB : 64;
  const resources = deriveResourceEstimate(m,budgetKiB);
  const tracedRecord = input.followLatest ? (m.local.at(-1) ?? m.global.at(-1) ?? null) : ([...m.global, ...m.local].find(e=>e.id===input.traceId) ?? m.entry ?? m.local.at(-1) ?? null);
  const traceSources = tracedRecord?.sources ?? (tracedRecord ? [tracedRecord.position] : []);
  const scoreOrder = input.scoreOrder==='score'?'score':'position';
  const scoreEntries = scoreOrder==='score'?[...m.global].sort((a,b)=>a.rank-b.rank):m.global;
  const tradeoff = deriveTradeoff(m);
  const edges = [['history','cache'], ['query','attention'], ['cache','attention'], ...(m.indexed ? [['history','index'],['query','index'],['index','attention']] : []), ...(m.hasWindow ? [['history','local'],['local','attention']] : [])];
  return { ...m, baseline, nodes, edges, focus, budgetKiB, resources, benefits:deriveBenefitModel(resources),
    tracedRecord, traceSources, scoreOrder, scoreEntries, tradeoff, trends:deriveTrends(m), matrices:deriveMatrixModel(m,tracedRecord),
    next: { history:'cache', query: m.indexed ? 'index' : 'attention', cache: m.indexed ? 'index' : 'attention', index:'attention', local:'attention' }[focus] };
}
