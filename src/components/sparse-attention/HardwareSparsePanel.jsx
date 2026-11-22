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
    tcFill: 'Tensor Core 块填充率',
    coalesce: 'HBM 访存合并',
    coalesceBad: '离散随机 Gather',
    coalesceGood: '连续 64-tok 对齐块',
    blockNote: 'GQA 下若 4 个 Q 头各自选离散 Token，KV 访存会按头并集放大且无法拼成矩阵块；NSA / MoBA 按块粗选并在 GQA 组内共享块索引，再用三分支门控融合压缩、选块与滑窗输出。',
    sinkPure: '纯滑动窗口 (丢弃首位)',
    sinkPinned: 'Pinned Sink + 滑动窗口',
    sinkMass: '首位 Sink 吸收权重',
    sinkSpilled: '0%（权重溢出）',
    sinkPpl: '长文困惑度 (PPL)',
    sinkStable: '稳定 (~6.1)',
    sinkCollapse: '分布崩溃 (>1000)',
    sinkNote: 'Softmax 要求权重和恒为 1，模型常把多余概率质量停泊在序列开头的 Sink Token；纯滑窗驱逐首位后会把这股权重错误冲刷到近期词元，固定保留前 4 个 Sink 即可稳住分布。',
    paradigmTitle: '三种稀疏范式边界',
    p1: '永久驱逐 (StreamingLLM / H2O)：丢弃历史省显存，但远距信息不可逆丢失',
    p2: '驻留检索 (DSA / Quest)：全量 KV 留在池中按 Query 选读，显存不省但可回溯',
    p3: '原生块压缩 (NSA / CSA / HCA)：训练期对齐块结构与压缩表示，兼顾硬件吞吐',
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
    tcFill: 'Tensor Core tile fill',
    coalesce: 'HBM memory access',
    coalesceBad: 'Scattered random gather',
    coalesceGood: 'Contiguous 64-tok blocks',
    blockNote: 'When 4 GQA query heads pick scattered tokens independently, KV reads expand by their union and break MMA tile shapes. NSA / MoBA selects contiguous blocks shared across the GQA group and gates compressed, selected, and window outputs.',
    sinkPure: 'Pure SWA (evict head)',
    sinkPinned: 'Pinned Sink + SWA',
    sinkMass: 'Initial sink mass',
    sinkSpilled: '0% (spilled)',
    sinkPpl: 'Long-context PPL',
    sinkStable: 'Stable (~6.1)',
    sinkCollapse: 'Collapsed (>1000)',
    sinkNote: 'Because Softmax sums to 1, models park excess attention mass on initial sink tokens. Pure SWA evicts those heads and spills the mass onto recent tokens; pinning the first 4 sink tokens restores stability.',
    paradigmTitle: 'Three Sparse Paradigms',
    p1: 'Permanent Eviction (StreamingLLM / H2O): cuts KV memory, but evicted facts cannot be recovered',
    p2: 'Resident Retrieval (DSA / Quest): keeps full KV and fetches per query—saves reads, not memory',
    p3: 'Native Block / Compression (NSA / CSA / HCA): aligns block layout in training for GPU throughput',
    sinkBadge: 'Sink anchor',
    evictedBadge: 'Evicted',
    windowBadge: 'Recent window',
  },
};

const HEAD_SELECTIONS_TOKEN = [
  [1, 5, 10, 14],
  [2, 6, 9, 15],
  [0, 7, 11, 13],
  [3, 4, 8, 12],
];
const SHARED_BLOCKS = [1, 3]; // Block 1 (pos 4..7) and Block 3 (pos 12..15)

export function deriveHardwareSparseMetrics(granularity = 'block') {
  const isBlock = granularity !== 'token';
  const unionTokens = isBlock
    ? SHARED_BLOCKS.length * 4
    : new Set(HEAD_SELECTIONS_TOKEN.flat()).size;
  return {
    granularity: isBlock ? 'block' : 'token',
    unionTokens,
    readAmplification: Number((unionTokens / 8).toFixed(1)),
    tcFillPct: isBlock ? 100 : 25,
  };
}

export default function HardwareSparsePanel({ lang = 'zh' }) {
  const t = (key) => copy[lang]?.[key] ?? copy.en[key] ?? key;
  const [tab, setTab] = useState('block');
  const [granularity, setGranularity] = useState('block');
  const [sinkMode, setSinkMode] = useState('pinned');

  const blockMetrics = deriveHardwareSparseMetrics(granularity);
  const sinkWeights = sinkMode === 'pinned'
    ? [0.28, 0.14, 0, 0, 0, 0, 0, 0, 0.05, 0.06, 0.08, 0.11, 0.13, 0.15]
    : [0, 0, 0, 0, 0, 0, 0, 0, 0.24, 0.19, 0.16, 0.14, 0.14, 0.13];

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
              <span className={sinkMode === 'pinned' ? 'good' : 'warn'}>{t('sinkMass')}: <b>{sinkMode === 'pinned' ? '42%' : t('sinkSpilled')}</b></span>
              <span className={sinkMode === 'pinned' ? 'good' : 'warn'}>{t('sinkPpl')}: <b>{t(sinkMode === 'pinned' ? 'sinkStable' : 'sinkCollapse')}</b></span>
            </div>
          </div>

          <div className="sc-sink-strip">
            {sinkWeights.map((w, idx) => {
              const role = idx < 2 ? (sinkMode === 'pinned' ? 'sink' : 'evicted') : idx < 8 ? 'evicted' : 'window';
              return (
                <div key={idx} className={`sc-sink-col ${role}`}>
                  <div className="sc-sink-bar"><i style={{ height: `${Math.round(w * 280)}%` }} /></div>
                  <b>{w > 0 ? `${Math.round(w * 100)}%` : '×'}</b>
                  <small>T{idx}</small>
                </div>
              );
            })}
          </div>
          <div className="sc-sink-legend">
            <span><i className="sink" />{t('sinkBadge')} (T0–T1)</span>
            <span><i className="evicted" />{t('evictedBadge')}</span>
            <span><i className="window" />{t('windowBadge')} (T8–T13)</span>
          </div>

          <p className="sc-hw-note">{t('sinkNote')}</p>
          <div className="sc-paradigms">
            <strong>{t('paradigmTitle')}</strong>
            <ul>
              <li>{t('p1')}</li>
              <li>{t('p2')}</li>
              <li>{t('p3')}</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
