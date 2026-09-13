// Logical, causal, single-layer snapshots. Numeric fixtures are not model weights.
export const MODES = ['dense', 'dsa', 'swa', 'csa', 'hca'];
export const DEFAULTS = { mode: 'dsa', tokens: 24, query: 0, topK: 2, window: 8, csaRatio: 4, hcaRatio: 8, inspect: 2, channel: 0 };
const clamp = (v, fallback, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+v) ? Math.round(+v) : fallback));
const option = (v, values, fallback) => values.includes(+v) ? +v : fallback;
const positions = (start, end) => Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
export const softmax = values => {
  const max = Math.max(...values);
  const exps = values.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
};
const feature = (p, c, salt = 0) => Math.sin((p + 1) * (c ? 0.71 : 0.37) + salt) + 0.3 * Math.cos((p + 1) * 1.3 + c + salt);
const vector = (p, salt = 0) => [feature(p, 0, salt), feature(p, 1, salt)];

// Explicit teaching references: same history/query; no trained-model quality claim.
export function deriveTradeoff(m) {
  const attend = entries => {
    const weights = softmax(entries.map(e => dot(m.mainQuery, e.key) / Math.sqrt(2)));
    return [0, 1].map(c => entries.reduce((sum, e, i) => sum + weights[i] * e.value[c], 0));
  };
  const fullTokens = positions(0, m.tokens).map(p => ({ key: vector(p), value: vector(p, m.compressed ? 0 : 0.6) }));
  const fullOutput = attend(fullTokens);
  const residentOutput = attend([...m.global, ...m.local]);
  const direct = new Set(m.reads.flatMap(e => e.branch === 'local' ? [e.position] : m.compressed ? [] : e.sources));
  const summarized = new Set(m.reads.flatMap(e => e.branch === 'global' && m.compressed ? e.sources : []));
  const coverage = positions(0, m.tokens).map(position => ({ position, kind: direct.has(position) ? 'direct' : summarized.has(position) ? 'summary' : 'missing' }));
  const distance = output => Math.hypot(...output.map((x, i) => x - m.output[i]));
  return { fullOutput, residentOutput, distance: distance(fullOutput), selectionDistance: distance(residentOutput), coverage,
    counts: Object.fromEntries(['direct','summary','missing'].map(kind => [kind, coverage.filter(p => p.kind === kind).length])) };
}

// CSA uses different projections for previous (b) and current (a) groups.
// Independent salts represent separate main and indexer projection/gate parameters.
function compress(start, ratio, overlap, salt) {
  const sources = positions(Math.max(0, start - (overlap ? ratio : 0)), start + ratio);
  const rows = sources.map(p => {
    const previous = p < start;
    const branch = previous ? 0.83 : 0;
    return {
      position: p, previous,
      values: vector(p, salt + branch),
      logits: [0, 1].map(c => feature(p, c, salt + branch + 1.9) + (p - start) / ratio * (c ? -0.3 : 0.3)),
    };
  });
  const weights = [0, 1].map(c => softmax(rows.map(row => row.logits[c])));
  return {
    rows: rows.map((row, i) => ({ ...row, weights: weights.map(w => w[i]) })),
    vector: [0, 1].map(c => rows.reduce((sum, row, i) => sum + row.values[c] * weights[c][i], 0)),
  };
}

export function deriveSparseModel(input = {}) {
  const mode = MODES.includes(input.mode) ? input.mode : DEFAULTS.mode;
  const tokens = clamp(input.tokens ?? DEFAULTS.tokens, DEFAULTS.tokens, 1, 64);
  const query = option(input.query, [0, 1], 0);
  const topK = option(input.topK, [1, 2, 4, 8], 2);
  const window = option(input.window, [4, 8, 16], 8);
  const csaRatio = option(input.csaRatio, [2, 4, 8], 4);
  const hcaRatio = option(input.hcaRatio, [8, 16], 8);
  const channel = option(input.channel, [0, 1], 0);
  const compressed = mode === 'csa' || mode === 'hca';
  const indexed = mode === 'dsa' || mode === 'csa';
  const hasWindow = mode === 'swa' || compressed;
  const ratio = compressed ? (mode === 'csa' ? csaRatio : hcaRatio) : 1;
  const count = mode === 'swa' ? 0 : compressed ? Math.floor(tokens / ratio) : tokens;
  const positionQuery = Number.isInteger(input.queryPosition) ? clamp(input.queryPosition,0,0,tokens-1) : null;
  const queryHeads = positionQuery!==null ? [vector(positionQuery,1.3),vector(positionQuery,2.9)] : query === 0 ? [[1.2, -0.3], [0.6, 0.4]] : [[-0.5, 1.1], [-0.8, 0.3]];
  const headWeights = [0.7, 0.3];
  const mainQuery = positionQuery!==null ? vector(positionQuery,0.21) : query === 0 ? [1.1, -0.4] : [-0.6, 1.2];
  const global = positions(0, count).map(i => {
    const main = compressed ? compress(i * ratio, ratio, mode === 'csa', 0) : null;
    const index = indexed && compressed ? compress(i * ratio, ratio, true, 2.4) : null;
    const key = main?.vector ?? vector(i);
    const indexKey = indexed ? (index?.vector ?? vector(i, 2.4)) : null;
    const headScores = indexed ? queryHeads.map((q, h) => headWeights[h] * Math.max(0, dot(q, indexKey))) : [];
    return {
      id: `${compressed ? 'C' : 'T'}${i + 1}`, index: i, main, indexCompression: index,
      key, value: compressed ? key : vector(i, 0.6), indexKey, headScores,
      score: headScores.reduce((a, b) => a + b, 0),
      sources: main ? main.rows.map(r => r.position) : [i],
      end: compressed ? (i + 1) * ratio - 1 : i,
    };
  });
  const ranked = [...global].sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = new Set((indexed ? ranked.slice(0, topK) : global).map(e => e.id));
  global.forEach(e => { e.read = selected.has(e.id); e.rank = indexed ? ranked.findIndex(r => r.id === e.id) + 1 : null; });
  const local = hasWindow ? positions(Math.max(0, tokens - window), tokens).map(p => ({ id: `L${p + 1}`, position: p, key: vector(p), value: vector(p), read: true })) : [];
  const reads = [...global.filter(e => e.read).map(e => ({ ...e, branch: 'global' })), ...local.map(e => ({ ...e, branch: 'local' }))];
  const logits = reads.map(e => dot(mainQuery, e.key) / Math.sqrt(2));
  const weights = softmax(logits);
  reads.forEach((e, i) => { e.logit = logits[i]; e.weight = weights[i]; });
  const output = [0, 1].map(c => reads.reduce((sum, e) => sum + e.weight * e.value[c], 0));
  const inspect = clamp(input.inspect ?? DEFAULTS.inspect, DEFAULTS.inspect, 0, Math.max(0, count - 1));
  const entry = global[inspect] ?? null;
  const sourceSet = new Set(entry?.sources ?? []);
  const tail = compressed ? positions(count * ratio, tokens) : [];
  const carry = mode === 'csa' && count > 0 ? positions((count - 1) * ratio, count * ratio) : [];
  const history = positions(0, tokens).map(p => ({
    position: p, source: sourceSet.has(p), previous: entry?.main?.rows.find(r => r.position === p)?.previous ?? false,
    local: hasWindow && p >= tokens - window, tail: tail.includes(p), current: p === tokens - 1,
  }));
  const lanes = [
    { id: 'global', count, max: 64 },
    ...(hasWindow ? [{ id: 'local', count: local.length, max: 64 }] : []),
    ...(indexed ? [{ id: 'index', count, max: 64 }] : []),
  ];
  return {
    mode, tokens, query, topK, window, csaRatio, hcaRatio, channel, compressed, indexed, hasWindow, ratio,
    global, local, reads, history, inspect, entry, tail, carry, queryHeads, headWeights, mainQuery, output, lanes,
    globalReads: global.filter(e => e.read).length, mainReads: reads.length, indexReads: indexed ? count : 0,
    formula: compressed ? 'G=\\lfloor N/r\\rfloor' : mode === 'swa' ? 'L=\\min(N,W)' : 'G=N',
    readFormula: indexed ? (compressed ? 'R=\\min(k,G)+\\min(N,W)' : 'R=\\min(k,N)') : compressed ? 'R=G+\\min(N,W)' : mode === 'swa' ? 'R=\\min(N,W)' : 'R=N',
    compressionFormula: 'c_{i,d}=\\sum_{s\\in B_i}\\alpha_{s,d}u_{s,d}',
    gateFormula: '\\alpha_{s,d}=\\operatorname{softmax}_{s\\in B_i}(z_{s,d})',
    indexFormula: 'I_s=\\sum_h w_h\\operatorname{ReLU}((q_h^I)^T k_s^I)',
    attentionFormula: 'o=\\sum_{e\\in\\mathcal R}\\operatorname{softmax}_{e}\\!\\left(\\frac{q^Tk_e}{\\sqrt d}\\right)v_e',
    code: CODE[mode],
  };
}

// Conceptual decode order, not a specific engine API. Cache building happens incrementally.
const CODE = {
  dense: 'slot = cache.reserve(request, position)\ncache.write(slot, project_kv(hidden))\nvisible = cache.causal_slots(request, position)\nout = attention(query, cache, visible)',
  dsa: 'slot = mla_cache.reserve(request, position)\nmla_cache.write(slot, latent_and_rope(hidden))\nindex_cache.write(slot, index_key(hidden))\nscores = index_scan(index_query(hidden), index_cache)\nids = causal_topk(scores, k)\nout = sparse_mla(query, mla_cache, ids)\n# Unselected cache entries remain resident.',
  swa: 'slot = window_cache.ring_slot(request, position)\nwindow_cache.write(slot, project_kv(hidden))\nids = window_cache.last_positions(W)\nout = attention(query, window_cache, ids)',
  csa: 'window_cache.append_and_evict(hidden, W)\nmain_compressor.update(hidden)\nindex_compressor.update(hidden)\nif group_complete(position, r):\n    main_cache.append(main_compressor.emit_overlap())\n    index_cache.append(index_compressor.emit_overlap())\nscores = index_scan(index_query(hidden), index_cache)\nids = causal_topk(scores, k)\nout = joint_attention(query, main_cache[ids], window_cache)',
  hca: 'window_cache.append_and_evict(hidden, W)\nmain_compressor.update(hidden)\nif group_complete(position, r):\n    main_cache.append(main_compressor.emit_nonoverlap())\nids = main_cache.causal_slots(request, position)\nout = joint_attention(query, main_cache[ids], window_cache)',
};
