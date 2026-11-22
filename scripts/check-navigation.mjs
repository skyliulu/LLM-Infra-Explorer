import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MODULE_LABELS } from '../src/lib/module-titles.js';

const expectedLabels = ['LLM Inference','Parallel Strategy','Flash Attention','Sparse Attention','DeepSeek CED','Flash Decode','Spec Decode','Quantization','Engram','Radix HiCache','Mooncake','DP Attention','Linear Attention','DeepInfer','GPU & CUDA Graph','Collective Comm','PD Disaggregation'];
const source = path => fs.readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
assert.deepEqual(Object.values(MODULE_LABELS),expectedLabels);
assert.ok(Object.values(MODULE_LABELS).every(label=>typeof label==='string'));
assert.ok(source('MainDashboard.jsx').includes('const title = getModuleLabel(tab.id, lang);'));
assert.ok(source('components/HomeLanding.jsx').includes('getModuleLabel(item.id, language)'));
assert.ok(!source('components/Quantization.jsx').includes('MODULE_LABELS'));
console.log('Navigation: 17 fixed English labels shared by homepage and sidebar; independent of content language and body titles.');
