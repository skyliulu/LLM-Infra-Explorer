import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MODULE_LABELS } from '../src/lib/module-titles.js';

const expectedLabels = ['LLM Inference','Parallel Strategy','Flash Attention','Sparse Attention','DeepSeek CED','Flash Decode','Spec Decode','Quantization','Engram','Radix HiCache','Mooncake','DP Attention','Linear Attention','DeepInfer','GPU & CUDA Graph','Collective Comm','PD Disaggregation','PagedAttention','Structured Output','VLM & Visual Tokens','EPD Disaggregation','Diffusion & DiT Infra'];
const source = path => fs.readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
assert.deepEqual(Object.values(MODULE_LABELS),expectedLabels);
assert.ok(Object.values(MODULE_LABELS).every(label=>typeof label==='string'));
assert.ok(source('MainDashboard.jsx').includes('const title = getModuleLabel(tab.id, lang);'));
assert.ok(source('components/HomeLanding.jsx').includes('getModuleLabel(item.id, language)'));
assert.ok(!source('components/Quantization.jsx').includes('MODULE_LABELS'));
// Guard: data-section-anchor must be on heading elements (or carry explicit data-section-label), never on <section>/<div> wrappers
const componentsDir = new URL('../src/components/', import.meta.url);
for (const file of fs.readdirSync(componentsDir).filter(f => f.endsWith('.jsx'))) {
  const txt = fs.readFileSync(new URL(file, componentsDir), 'utf8');
  const badAnchors = [...txt.matchAll(/<(section|div|article|main)\b[^>]*\bdata-section-anchor=/g)]
    .filter(m => !m[0].includes('data-section-label='));
  assert.equal(badAnchors.length, 0, `${file}: data-section-anchor must be on a heading (h1-h3), not on <section>/<div> wrapper`);
}
console.log('Navigation: 22 fixed English labels shared by homepage and sidebar; section-anchor placement guard passed.');
