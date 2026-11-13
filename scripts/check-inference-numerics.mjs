import assert from 'node:assert/strict';
import { runNumericInference, chooseSamplingCandidate, samplingDraw } from '../src/components/llm-inference/numeric-model.js';
import { deriveSamplingDistribution } from '../src/components/llm-inference/model.js';

const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-10, `${label}: ${a} != ${b}`);
const product = (a, b) => a.map(row => b[0].map((_, j) => row.reduce((sum, x, k) => sum + x * b[k][j], 0)));
const matrixClose = (a, b, label) => {
  assert.equal(a.length, b.length, label);
  a.forEach((row, r) => { assert.equal(row.length, b[r].length); row.forEach((x, c) => close(x, b[r][c], label)); });
};
const gelu = x => x * 0.5 * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
const ids = [0, 1, 2, 3, 4, 5];
for (const modelType of ['dense', 'moe']) {
  for (const layer of [1, 7, 32]) {
    const m = runNumericInference({ tokenIds: ids, layer, modelType });
    assert.deepEqual(m.probabilities[0], [1, 0, 0, 0, 0, 0]);
    matrixClose([m.attentionOutput[0]], [m.v[0]], 'causal first row must equal V0');
    m.q.forEach((q, r) => m.k.forEach((k, c) => close(m.scores[r][c], q.reduce((s, x, d) => s + x * k[d], 0) / 2, 'scaled QK')));
    m.scores.forEach((row, r) => {
      const visible = row.slice(0, r + 1);
      const maximum = Math.max(...visible);
      const exponentials = visible.map(x => Math.exp(x - maximum));
      const denominator = exponentials.reduce((sum, x) => sum + x, 0);
      row.forEach((_, c) => close(m.probabilities[r][c], c <= r ? exponentials[c] / denominator : 0, 'causal softmax'));
    });
    matrixClose(m.attentionOutput, product(m.probabilities, m.v), 'PV');
    matrixClose(m.attentionProjected, product(m.attentionOutput, m.wo), 'output projection');
    matrixClose(m.ffnInput, m.attentionResidual.map(row => {
      const rms = Math.sqrt(row.reduce((sum, x) => sum + x * x, 0) / row.length + 1e-6);
      return row.map(x => x / rms);
    }), 'pre-FFN RMSNorm');
    const hidden = product(m.ffnInput, m.ffnUpWeight).map(row => row.map(gelu));
    matrixClose(m.denseHidden, hidden, 'GELU MLP');
    const expected = modelType === 'dense' ? product(hidden, m.ffnDownWeight) : m.routes.map((route, r) => m.ffnOutput[r].map((_, c) => route.topK.reduce((sum, e, i) => sum + route.weights[i] * product(m.experts[e].hidden, m.experts[e].down)[r][c], 0)));
    matrixClose(m.ffnOutput, expected, 'Dense or routed expert output');
    matrixClose(m.layerOutput, m.attentionResidual.map((row, r) => row.map((x, c) => x + expected[r][c])), 'residual');
    matrixClose(m.logits, product(m.lastHidden, m.vocabWeight), 'LM head');
    const appended = runNumericInference({ tokenIds: [...ids, 2], layer, modelType });
    matrixClose(m.k, appended.k.slice(0, ids.length), 'cached prefix K remains stable');
    matrixClose(m.v, appended.v.slice(0, ids.length), 'cached prefix V remains stable');
  }
}
const layer1 = runNumericInference({ tokenIds: ids, layer: 1 });
const layer2 = runNumericInference({ tokenIds: ids, layer: 2 });
matrixClose(layer1.layerOutput, layer2.input, 'layers form one chain');
const fixed = { candidates: [{ sourceIndex: 0, finalProbability: 0.25 }, { sourceIndex: 1, finalProbability: 0 }, { sourceIndex: 2, finalProbability: 0.75 }] };
assert.equal(chooseSamplingCandidate(fixed, 0.249).sourceIndex, 0);
assert.equal(chooseSamplingCandidate(fixed, 0.25).sourceIndex, 2);
assert.equal(chooseSamplingCandidate(fixed, 1).sourceIndex, 2);
let generated = [...ids];
for (let step = 0; step < 6; step++) {
  const m = runNumericInference({ tokenIds: generated });
  const d = deriveSamplingDistribution({ candidates: m.vocabularyProbabilities.map((p, i) => ({ token: String(i), p })), temperature: 0.8, topK: 3, topP: 0.9 });
  const picked = chooseSamplingCandidate(d, samplingDraw(step));
  assert.ok(picked && picked.finalProbability > 0, 'draw selects a retained token');
  generated.push(picked.sourceIndex);
  assert.equal(runNumericInference({ tokenIds: generated }).tokenIds.at(-1), picked.sourceIndex);
}
console.log('Inference numerical chain, stable causal cache and seeded CDF sampling checks passed.');
