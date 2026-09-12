import assert from 'node:assert/strict';
import { CANVAS_DEFAULTS, deriveCanvasModel } from '../src/components/sparse-attention/canvas-model.js';
import { deriveExecution, executionView } from '../src/components/sparse-attention/execution-model.js';

let cases = 0;
for (const mode of ['dsa', 'csa', 'hca']) for (const tokens of [1, 7, 24, 64])
for (const query of [0, 1]) for (const topK of [1, 8]) for (const window of [4, 16]) {
 const m = deriveCanvasModel({...CANVAS_DEFAULTS, mode, tokens, query, topK, window}, 'overview');
 assert.equal(executionView(m, deriveExecution(m)), m);
 const initial = deriveExecution(m, 0);
 assert.equal(initial.readBytes, 0);
 assert.equal(initial.events.some(e => e.id === 'index'), mode !== 'hca');
 let bytes = 0;
 for (let progress = 0; progress <= initial.total; progress++) {
  const e = deriveExecution(m, progress), view = executionView(m, e);
  assert.ok(e.readBytes >= bytes && e.readBytes <= e.targetBytes);
  bytes = e.readBytes;
  assert.equal(new Set(e.readIds).size, e.readIds.length);
  assert.equal(view.matrices.global.length, m.matrices.global.length);
  assert.equal(view.matrices.local.length, m.matrices.local.length);
  assert.equal(view.matrices.reads.length, e.readIds.length);
  assert.equal(e.phases.filter(p => p.status === 'active').length, e.done ? 0 : 1);
  if (!e.selectionReady) assert.deepEqual(view.matrices.selection.globalIds, []);
  for (const row of view.matrices.reads) {
   if (!e.scoreReady) assert.equal(row.cells[2], null);
   if (!e.weightsReady) assert.equal(row.cells[3], null);
  }
  if (e.scoreReady) assert.equal(e.readIds.length, m.reads.length);
  assert.equal(e.outputReady, e.done);
 }
 const final = deriveExecution(m, initial.total), view = executionView(m, final);
 assert.equal(final.readBytes, m.resources.readBytes);
 assert.equal(view.mainReads, m.mainReads);
 assert.equal(view.indexReads, m.indexReads);
 assert.deepEqual(view.matrices.reads, m.matrices.reads.map(r => ({...r, read:true})));
 assert.deepEqual(view.output, m.output);
 cases++;
}
console.log(`Sparse execution: ${cases} configurations, every stage passed.`);
