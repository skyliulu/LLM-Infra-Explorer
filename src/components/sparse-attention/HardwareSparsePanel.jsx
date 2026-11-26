import React, { useState } from 'react';
import { MathFormula } from '../linear-attention/MathFormula';

const copy = {
  zh: {
    title: '硬件落地 · 块稀疏与 Attention Sink',
    lead: '在 GPU 上落地稀疏注意力需解决两个现实问题：用连续块选择与 GQA 组共享对齐 Tensor Core，以及用 Attention Sink 稳定超长滑动窗口的 Softmax 分布。',
    tabBlock: '块稀疏 · NSA / MoBA',
    tabSink: 'Attention Sink · 窗口稳定',
    granToken: '逐 Token 独立选行',
    granBlock: '连续块 + GQA 组共享 (NSA)',
    hbmReads: 'GQA 组内 KV 读取量',
    perHeadBudget: '每头预算',
    tcFill: 'Tensor Core 块填充率',
    coalesce: 'HBM 访存合并',
    coalesceBad: '离散随机 Gather',
    coalesceGood: '连续 64-tok 对齐块',
    blockNote: '同等每头稀疏预算（4/16 = 25%）下，若 4 个 GQA 查询头各自选离散 Token，组内 KV 读取并集放大至 4.0×（16 tok）且 MMA 有效填充率跌至 25%；NSA / MoBA 按块粗选并在 GQA 组内共享块索引，将组内读取压回 1.0×、填充率保持 100%，再用三分支门控融合压缩、选块与滑窗输出。',
    sinkPure: '纯滑动窗口 (丢弃首位)',
    sinkPinned: 'Pinned Sink + 滑动窗口',
    sinkMass: '首位 Sink 吸收权重（示意）',
    sinkSpilled: '0%（权重溢出）',
    sinkStability: '长文分布状态',
    sinkStable: '分布稳定（无溢出）',
    sinkCollapse: '权重溢出（长文失稳）',
    sinkNote: 'Softmax 要求权重和恒为 1，模型常把多余概率质量停泊在序列开头的 Sink Token（示意分布总和为 100%）；纯滑窗驱逐首位后会把这股权重错误冲刷到近期词元，固定保留前 4 个 Sink（T0–T3）即可稳住分布。',
    paradigmTitle: '三种稀疏注意力范式全景（在深入矩阵前先定位 DSA / CSA / HCA）',
    paradigmSub: '按“是否永久丢弃历史、是否缩减显存占用、是否训练期块对齐”将主流长上下文稀疏方案分为三类：',
    p1Title: '1. 永久驱逐（StreamingLLM / H2O）',
    p1Desc: '保留 Sink + 近期窗口或高分 Token，直接丢弃其余 KV 省显存，但远距信息不可逆丢失。',
    p2Title: '2. 驻留检索（DSA / Quest）',
    p2Desc: '全量 KV 仍留在显存池，查询时靠轻量索引挑 Top-K；显著降读取流量，但显存容量不省。',
    p2Action: '切换到 DSA',
    p3Title: '3. 原生块 / 压缩（NSA / CSA / HCA）',
    p3Desc: '将历史块压缩为紧凑摘要并与近期滑窗联合计算；同时缩减 KV 显存、读取带宽且贴合 GPU 块访存。',
    p3ActionCsa: '切换到 CSA',
    p3ActionHca: '切换到 HCA',
    sinkBadge: 'Sink 锚点',
    evictedBadge: '已驱逐',
    windowBadge: '近期窗口',
  },
  en: {
    title: 'Hardware Reality · Block Sparsity & Attention Sinks',
    lead: 'Deploying sparse attention on GPUs faces two practical constraints: aligning contiguous blocks across GQA groups for Tensor Cores, and pinning Attention Sinks so sliding windows stay stable.',
    tabBlock: 'Block-Sparse · NSA / MoBA',
    tabSink: 'Attention Sink · SWA Stability',
    granToken: 'Per-Token Independent',
    granBlock: 'Contiguous Block + GQA Shared (NSA)',
    hbmReads: 'GQA group KV reads',
    perHeadBudget: 'Per-head budget',
    tcFill: 'Tensor Core tile fill',
    coalesce: 'HBM memory access',
    coalesceBad: 'Scattered random gather',
    coalesceGood: 'Contiguous 64-tok blocks',
    blockNote: 'At the exact same per-head budget (4/16 = 25%), independent per-token selection across 4 GQA query heads expands the KV read union to 4.0× (16 tok) and drops MMA tile fill to 25%. NSA / MoBA shares contiguous block indices across the GQA group (1.0× reads, 100% fill) and gates compressed, selected, and window outputs.',
    sinkPure: 'Pure SWA (evict head)',
    sinkPinned: 'Pinned Sink + SWA',
    sinkMass: 'Initial sink mass (illustrative)',
    sinkSpilled: '0% (spilled)',
    sinkStability: 'Long-context stability',
    sinkStable: 'Stable distribution',
    sinkCollapse: 'Mass spill (instability)',
    sinkNote: 'Because Softmax sums to 1, models park excess attention mass on initial sink tokens (illustrative weights sum to 100%). Pure SWA evicts those heads and spills the mass onto recent tokens; pinning the first 4 sink tokens (T0–T3) restores stability.',
    paradigmTitle: 'Three Sparse Attention Paradigms (Locate DSA / CSA / HCA First)',
    paradigmSub: 'Classify long-context sparse methods by whether history is evicted, whether KV memory shrinks, and whether block layout is native:',
    p1Title: '1. Permanent Eviction (StreamingLLM / H2O)',
    p1Desc: 'Keeps sinks + recent window or heavy hitters and drops the rest—cuts KV memory, but evicted facts cannot be recovered.',
    p2Title: '2. Resident Retrieval (DSA / Quest)',
    p2Desc: 'Keeps full KV in memory and fetches Top-K per query via a lightweight indexer—cuts read traffic, not KV memory.',
    p2Action: 'Inspect DSA',
    p3Title: '3. Native Block / Compression (NSA / CSA / HCA)',
    p3Desc: 'Compresses history blocks into compact summaries paired with a local window—reduces both memory and reads with GPU-friendly layout.',
    p3ActionCsa: 'Inspect CSA',
    p3ActionHca: 'Inspect HCA',
    sinkBadge: 'Sink anchor',
    evictedBadge: 'Evicted',
    windowBadge: 'Recent window',
  },
};

const NUM_GQA_HEADS = 4;
const BLOCK_SIZE = 4;
const HEAD_SELECTIONS_TOKEN = [
  [1, 5, 10, 14],
  [2, 6, 9, 15],
  [0, 7, 11, 13],
  [3, 4, 8, 12],
];
const SHARED_BLOCKS = [1]; // Block 1 (pos 4..7): same 4 tokens/head budget as token mode

export function deriveHardwareSparseMetrics(granularity = 'block') {
  const isBlock = granularity !== 'token';
  const perHeadBudget = isBlock
    ? SHARED_BLOCKS.length * BLOCK_SIZE
    : HEAD_SELECTIONS_TOKEN[0].length;
  const unionTokens = isBlock
    ? SHARED_BLOCKS.length * BLOCK_SIZE
    : new Set(HEAD_SELECTIONS_TOKEN.flat()).size;
  const activeCells = isBlock
    ? NUM_GQA_HEADS * SHARED_BLOCKS.length * BLOCK_SIZE
    : HEAD_SELECTIONS_TOKEN.reduce((sum, list) => sum + list.length, 0);
  const loadedCells = NUM_GQA_HEADS * unionTokens;
  return {
    granularity: isBlock ? 'block' : 'token',
    perHeadBudget,
    unionTokens,
    readAmplification: Number((unionTokens / perHeadBudget).toFixed(1)),
    tcFillPct: Math.round((activeCells / loadedCells) * 100),
  };
}

export function SparseParadigmOverview({ lang = 'zh', mode = 'dsa', onSelectMode }) {
  const t = (key) => copy[lang]?.[key] ?? copy.en[key] ?? key;
  return (
    <section className="sc-paradigms-hero" data-testid="sparse-paradigms-overview">
      <div className="sc-paradigms-head">
        <h2 data-section-anchor="sparse-overview">{t('paradigmTitle')}</h2>
        <p>{t('paradigmSub')}</p>
      </div>
      <div className="sc-paradigms-grid">
        <div className="sc-paradigm-card">
          <strong>{t('p1Title')}</strong>
          <p>{t('p1Desc')}</p>
        </div>
        <div className={`sc-paradigm-card ${mode === 'dsa' ? 'active' : ''}`}>
          <div className="sc-paradigm-top">
            <strong>{t('p2Title')}</strong>
            {onSelectMode && (
              <button type="button" onClick={() => onSelectMode('dsa')} aria-pressed={mode === 'dsa'}>{t('p2Action')}</button>
            )}
          </div>
          <p>{t('p2Desc')}</p>
        </div>
        <div className={`sc-paradigm-card ${mode === 'csa' || mode === 'hca' ? 'active' : ''}`}>
          <div className="sc-paradigm-top">
            <strong>{t('p3Title')}</strong>
            {onSelectMode && (
              <span className="sc-paradigm-btns">
                <button type="button" onClick={() => onSelectMode('csa')} aria-pressed={mode === 'csa'}>{t('p3ActionCsa')}</button>
                <button type="button" onClick={() => onSelectMode('hca')} aria-pressed={mode === 'hca'}>{t('p3ActionHca')}</button>
              </span>
            )}
          </div>
          <p>{t('p3Desc')}</p>
        </div>
      </div>
    </section>
  );
}

export default function HardwareSparsePanel({ lang = 'zh' }) {
  const t = (key) => copy[lang]?.[key] ?? copy.en[key] ?? key;
  const [tab, setTab] = useState('block');
  const [granularity, setGranularity] = useState('block');
  const [sinkMode, setSinkMode] = useState('pinned');

  const blockMetrics = deriveHardwareSparseMetrics(granularity);
  // 4 pinned sinks (T0..T3, sum = 0.48) + 6 window tokens (T8..T13, sum = 0.52) = 1.00
  const sinkWeights = sinkMode === 'pinned'
    ? [0.22, 0.12, 0.08, 0.06, 0, 0, 0, 0, 0.05, 0.06, 0.08, 0.10, 0.11, 0.12]
    : [0, 0, 0, 0, 0, 0, 0, 0, 0.22, 0.19, 0.17, 0.15, 0.14, 0.13];
  const sinkMassPct = Math.round(sinkWeights.slice(0, 4).reduce((sum, w) => sum + w, 0) * 100);

  return (
    <section className="sc-benefits sc-hw-panel" data-testid="sparse-hardware-panel">
      <div className="sc-benefit-header">
        <div>
          <h2 data-section-anchor="sparse-hardware">{t('title')}</h2>
          <p className="sc-hw-lead">{t('lead')}</p>
        </div>
        <div className="sa-segment" role="group" aria-label={t('title')}>
          <button type="button" data-testid="sparse-hw-tab-block" aria-pressed={tab === 'block'} onClick={() => setTab('block')}>{t('tabBlock')}</button>
          <button type="button" data-testid="sparse-hw-tab-sink" aria-pressed={tab === 'sink'} onClick={() => setTab('sink')}>{t('tabSink')}</button>
        </div>
      </div>

      {tab === 'block' ? (
        <div className="sc-hw-body">
          <div className="sc-hw-toolbar">
            <div className="sa-segment" role="group" aria-label={t('tabBlock')}>
              <button type="button" data-testid="sparse-gran-token" aria-pressed={granularity === 'token'} onClick={() => setGranularity('token')}>{t('granToken')}</button>
              <button type="button" data-testid="sparse-gran-block" aria-pressed={granularity === 'block'} onClick={() => setGranularity('block')}>{t('granBlock')}</button>
            </div>
            <div className="sc-hw-kpis">
              <span>{t('perHeadBudget')}: <b>{blockMetrics.perHeadBudget}/16 tok</b></span>
              <span className={granularity === 'block' ? 'good' : 'warn'}>{t('hbmReads')}: <b>{blockMetrics.unionTokens} tok ({blockMetrics.readAmplification}×)</b></span>
              <span className={granularity === 'block' ? 'good' : 'warn'}>{t('tcFill')}: <b>{blockMetrics.tcFillPct}%</b></span>
              <span>{t('coalesce')}: <b>{t(granularity === 'block' ? 'coalesceGood' : 'coalesceBad')}</b></span>
            </div>
          </div>

          <div className="sc-hw-grid">
            {[0, 1, 2, 3].map((head) => (
              <div key={head} className="sc-hw-row">
                <span className="sc-hw-head-tag">Q{head}</span>
                <div className="sc-hw-cells">
                  {Array.from({ length: 16 }, (_, pos) => {
                    const blockId = Math.floor(pos / 4);
                    const picked = granularity === 'block'
                      ? SHARED_BLOCKS.includes(blockId)
                      : HEAD_SELECTIONS_TOKEN[head].includes(pos);
                    return (
                      <i
                        key={pos}
                        data-picked={picked}
                        data-block-start={pos % 4 === 0}
                        data-mode={granularity}
                        title={`Block ${blockId} · pos ${pos}`}
                      >
                        {pos}
                      </i>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="sc-hw-foot">
            <p>{t('blockNote')}</p>
            <MathFormula>{String.raw`o=\sum_{c\in\{\mathrm{cmp},\,\mathrm{slc},\,\mathrm{win}\}} g_c\cdot\operatorname{Attn}(q,K_c,V_c)`}</MathFormula>
          </div>
        </div>
      ) : (
        <div className="sc-hw-body">
          <div className="sc-hw-toolbar">
            <div className="sa-segment" role="group" aria-label={t('tabSink')}>
              <button type="button" data-testid="sparse-sink-pure" aria-pressed={sinkMode === 'pure'} onClick={() => setSinkMode('pure')}>{t('sinkPure')}</button>
              <button type="button" data-testid="sparse-sink-pinned" aria-pressed={sinkMode === 'pinned'} onClick={() => setSinkMode('pinned')}>{t('sinkPinned')}</button>
            </div>
            <div className="sc-hw-kpis">
              <span className={sinkMode === 'pinned' ? 'good' : 'warn'}>{t('sinkMass')}: <b>{sinkMode === 'pinned' ? `${sinkMassPct}%` : t('sinkSpilled')}</b></span>
              <span className={sinkMode === 'pinned' ? 'good' : 'warn'}>{t('sinkStability')}: <b>{t(sinkMode === 'pinned' ? 'sinkStable' : 'sinkCollapse')}</b></span>
            </div>
          </div>

          <div className="sc-sink-strip">
            {sinkWeights.map((w, idx) => {
              const role = idx < 4 ? (sinkMode === 'pinned' ? 'sink' : 'evicted') : idx < 8 ? 'evicted' : 'window';
              return (
                <div key={idx} className={`sc-sink-col ${role}`}>
                  <div className="sc-sink-bar"><i style={{ height: `${Math.round(w * 320)}%` }} /></div>
                  <b>{w > 0 ? `${Math.round(w * 100)}%` : '×'}</b>
                  <small>T{idx}</small>
                </div>
              );
            })}
          </div>
          <div className="sc-sink-legend">
            <span><i className="sink" />{t('sinkBadge')} (T0–T3)</span>
            <span><i className="evicted" />{t('evictedBadge')}</span>
            <span><i className="window" />{t('windowBadge')} (T8–T13)</span>
          </div>

          <p className="sc-hw-note">{t('sinkNote')}</p>
        </div>
      )}
    </section>
  );
}
