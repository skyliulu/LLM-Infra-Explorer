import assert from 'node:assert/strict';
import {
  deriveBlockTranslation,
  deriveCowStep,
  deriveFragmentationModel,
  derivePreemptionModel,
  deriveSizingModel,
  normalizePagedConfig,
} from '../src/components/paged-kv/model.js';
import { i18n } from '../src/components/paged-kv/content.js';

const zhKeys = Object.keys(i18n.zh).sort();
const enKeys = Object.keys(i18n.en).sort();
assert.deepEqual(zhKeys, enKeys, 'PagedAttention zh/en i18n keys must match');

const norm = normalizePagedConfig({ allocMode: 'bad', blockSize: 99, tokenIdx: 500 });
assert.equal(norm.allocMode, 'paged');
assert.equal(norm.blockSize, 16);
assert.equal(norm.tokenIdx, 63);

// §1 Fragmentation
const contig = deriveFragmentationModel({ allocMode: 'contiguous', blockSize: 16 });
const paged = deriveFragmentationModel({ allocMode: 'paged', blockSize: 16 });
assert.equal(paged.externalWastePct, 0);
assert.ok(contig.externalWastePct > 0);
assert.ok(paged.utilPct > contig.utilPct + 40);

// §2 Block translation j=37, S=16 -> i=2, o=5
const addr = deriveBlockTranslation({ blockSize: 16, tokenIdx: 37 });
assert.equal(addr.logicalBlock, 2);
assert.equal(addr.offset, 5);

// §3 CoW steps
const s0 = deriveCowStep(0);
const s1 = deriveCowStep(1);
const s3 = deriveCowStep(3);
assert.equal(s0.cowCopies, 0);
assert.equal(s1.cowCopies, 1);
assert.equal(s3.blocks.filter((b) => b.state === 'freed').length, 2);

// §4 Preemption Swap vs Recompute crossover
const shortP = derivePreemptionModel({ victimLen: 256, pcieId: 'pcie4' });
const longP = derivePreemptionModel({ victimLen: 16384, pcieId: 'pcie5' });
assert.equal(shortP.winner, 'recompute', 'Short context recomputes faster than PCIe swap');
assert.equal(longP.winner, 'swap', 'Very long 16K context swaps faster than quadratic recompute');

// §6 Sizing + Cache Key
const mla = deriveSizingModel({ modelId: 'deepseek_mla', kvDtype: 'fp8', ctxLen: 8192, concurrency: 16 });
const gqa = deriveSizingModel({ modelId: 'llama70b', kvDtype: 'bf16', ctxLen: 8192, concurrency: 16 });
assert.ok(mla.kbPerTok < gqa.kbPerTok / 4, 'MLA FP8 KV footprint is dramatically smaller than 70B GQA BF16');
assert.equal(deriveSizingModel({ keyChange: 'lora' }).cacheReusable, false);
assert.equal(deriveSizingModel({ keyChange: 'same' }).cacheReusable, true);

console.log('PagedAttention checks passed:', {
  keys: zhKeys.length,
  contigUtilPct: contig.utilPct,
  pagedUtilPct: paged.utilPct,
  shortWinner: shortP.winner,
  longWinner: longP.winner,
  mlaKbTok: mla.kbPerTok,
});
