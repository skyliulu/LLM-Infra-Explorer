// Sampling changes only presentation: record identity and full-set weights survive.
export function sampleMatrixRows(rows, traceId, limit = 6) {
  if (rows.length <= limit) return rows;
  const indexes = new Set();
  const add = i => { if (i >= 0 && indexes.size < limit) indexes.add(i); };
  add(rows.findIndex(row => row.id === traceId));
  add(0);
  add(rows.length - 1);
  rows.forEach((row, i) => { if (row.read) add(i); });
  rows.forEach((_, i) => add(i));
  const sampled = [];
  let previous = -1;
  for (const i of [...indexes].sort((a, b) => a - b)) {
    if (i > previous + 1) sampled.push({ gap: i - previous - 1, id: `gap-${previous + 1}` });
    sampled.push(rows[i]);
    previous = i;
  }
  return sampled;
}

export function deriveMatrixModel(m, tracedRecord) {
  const traceId = tracedRecord?.id;
  const sources = new Set(tracedRecord?.sources ?? (tracedRecord ? [tracedRecord.position] : []));
  return {
    traceId,
    selection: {
      globalIds: m.global.filter(row => row.read).map(row => row.id),
      localRange: m.local.length ? [m.local[0].id, m.local.at(-1).id] : [],
      total: m.mainReads,
    },
    history: m.history.map(row => ({ ...row, traced: sources.has(row.position),
      previous: tracedRecord?.main?.rows.find(r => r.position === row.position)?.previous ?? false })),
    global: m.global.map(row => ({ ...row, cells: m.compressed ? row.key : [...row.key, ...row.value], indexCells: m.indexed ? [...row.indexKey, row.score] : [] })),
    index: m.global.map(row => ({ ...row, cells: [...(row.indexKey ?? []), row.score] })),
    local: m.local.map(row => ({ ...row, cells: row.key })),
    reads: m.reads.map(row => ({ ...row, cells: [...row.key, row.logit, row.weight, ...row.value] })),
    query: [{ id: 'q', symbol: 'q', cells: m.mainQuery },
      ...(m.indexed ? m.queryHeads.map((cells, i) => ({ id: `qi${i}`, symbol: `q^I_{${i + 1}}`, cells })) : [])],
    output: m.output,
  };
}
