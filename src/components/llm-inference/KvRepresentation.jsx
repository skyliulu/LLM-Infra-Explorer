import {useExperimentState} from '../../lib/ExperimentContext';
import React, { useState } from 'react';
import { ChevronDown, Microscope, RotateCcw } from 'lucide-react';
import { MathFormula } from '../linear-attention/MathFormula';
import { deriveKvRepresentationModel, KV_DEFAULTS, KV_MODES } from './kv-representation-model';
import './kv-representation.css';

const i18n = {
  zh: {
    title: 'KV 表示显微镜', teaser: 'MHA → GQA → MLA：一个 token 到底存了什么？',
    scope: '单层结构实验 · 独立于上方推理时间轴', mode: '注意力表示', mha: 'MHA', gqa: 'GQA', mla: 'MLA',
    mhaName: '每个头各存一份 K/V', gqaName: '一组 query 头共享 K/V', mlaName: '各头共享联合 latent 与位置 key',
    mhaDesc: '8 个 query 头对应 8 组独立 K/V。点选一个头，追踪它读取的那一列历史。',
    gqaDesc: '同组 query 头读取相同的 K/V，但各自的 query、注意力权重和输出仍然不同。',
    mlaDesc: '每个历史 token 只保存一份联合 latent 和解耦 RoPE key。各头通过自己的投影读取，不缓存展开后的每头 K/V。',
    tokens: '历史 token 数', groups: 'GQA 组数', latent: 'MLA latent 维度', reset: '重置表示实验',
    fixed: '固定：8 个 query 头，K/V 每头 64 维，MLA 位置 key 32 维；全部使用 BF16（2 bytes/元素）。',
    queries: '① 点选当前 query 的一个头', query: 'Query 头', history: '② 点选历史 token，展开其缓存', token: '历史 token',
    mapping: '连线表示读取关系；描边列是选中头访问的全部历史。',
    pair: 'K / V', shared: '联合 latent + RoPE key', detail: '③ 放大这一条缓存记录',
    keyField: 'Key · 已应用 RoPE', valueField: 'Value', latentField: '联合 KV latent', ropeField: '解耦 RoPE key',
    unit: '每小格 = 32 个 BF16 元素 = 64 bytes；块宽按通道数成比例。',
    record: '所选记录', perToken: '每 token · 本层合计', total: '全部历史 · 本层合计',
    compare: '相同历史长度下的缓存容量', compareHint: '统一比例尺 · 全部 query 头 · 单层 · 单请求', bytes: 'bytes',
    remain: '相对 MHA', inspect: '写入与读取', write: '历史 token 写入', read: '当前 query 的打分项',
    symbols: '依次表示：历史长度、KV 组数、每头维度、latent 维度、位置 key 维度、每元素字节数。',
    boundary: '这是可调维度的架构教学模型，非真实 checkpoint 配置。只计算逻辑 KV 数据，不计权重、临时张量、分配器与跨卡复制；容量比例不代表速度或质量比例。',
    mlaNote: 'MLA 是训练得到的低秩表示，不是把已有 K/V 无损打包。Decode 可将内容 key 的上投影吸收到 query 路径、value 上投影吸收到输出路径；位置 key 另外保存。',
    gqaEdge: '1 组是 MQA；8 组退化为 MHA。减少组数不保证模型质量不变。',
    grow: '三种表示都保留逐 token 的历史；增加历史长度，缓存仍线性增长。',
    pseudo: '单层 decode · 概念伪代码', sources: '原理来源', sourceMla: 'DeepSeek-V2 · MLA §2.1', sourceGqa: 'GQA 论文',
  },
  en: {
    title: 'KV Representation Microscope', teaser: 'MHA → GQA → MLA: what does one token actually store?',
    scope: 'Single-layer experiment · independent of the inference timeline above', mode: 'Attention representation', mha: 'MHA', gqa: 'GQA', mla: 'MLA',
    mhaName: 'Separate K/V for every head', gqaName: 'Query groups share K/V', mlaName: 'Shared joint latent and positional key',
    mhaDesc: '8 query heads have 8 separate K/V groups. Select a head to trace the history column it reads.',
    gqaDesc: 'Query heads in a group read the same K/V, but keep their own queries, attention weights, and outputs.',
    mlaDesc: 'Each past token stores one joint latent and a decoupled RoPE key. Heads use their own projections; expanded per-head K/V are not cached.',
    tokens: 'History tokens', groups: 'GQA groups', latent: 'MLA latent dimension', reset: 'Reset representation experiment',
    fixed: 'Fixed: 8 query heads, 64 dimensions per K/V head, 32 MLA positional-key dimensions; BF16 throughout (2 bytes/element).',
    queries: '① Select a head of the current query', query: 'Query head', history: '② Select a past token to inspect its cache', token: 'Past token',
    mapping: 'Lines show read relationships; the outlined column is all the history read by the selected head.',
    pair: 'K / V', shared: 'Joint latent + RoPE key', detail: '③ Inspect this cache record',
    keyField: 'Key · after RoPE', valueField: 'Value', latentField: 'Joint KV latent', ropeField: 'Decoupled RoPE key',
    unit: 'Each cell = 32 BF16 elements = 64 bytes; block widths are proportional to channel counts.',
    record: 'Selected record', perToken: 'Per token · whole layer', total: 'All history · whole layer',
    compare: 'Cache capacity at the same history length', compareHint: 'Shared scale · all query heads · one layer · one request', bytes: 'bytes',
    remain: 'Relative to MHA', inspect: 'Write and read paths', write: 'Past-token write', read: 'Current-query score terms',
    symbols: 'In order: history length, KV groups, head dimension, latent dimension, positional-key dimension, bytes per element.',
    boundary: 'An architecture teaching model with adjustable dimensions, not a checkpoint configuration. Counts logical KV payload only, excluding weights, temporary tensors, allocation and device copies; capacity ratios do not predict speed or quality.',
    mlaNote: 'MLA learns a low-rank representation; it is not lossless packing of existing K/V. Decode can absorb the content-key up-projection into the query path and the value up-projection into the output path. The positional key is stored separately.',
    gqaEdge: '1 group is MQA; 8 groups recover MHA. Fewer groups do not guarantee unchanged model quality.',
    grow: 'All three representations retain token-addressable history. Cache size still grows linearly with history length.',
    pseudo: 'Single-layer decode · conceptual pseudocode', sources: 'Sources', sourceMla: 'DeepSeek-V2 · MLA §2.1', sourceGqa: 'GQA paper',
  },
};

export default function KvRepresentation({ lang }) {
  const t = key => i18n[lang][key] ?? key;
  const [input, setInput] = useExperimentState('llm-inference/KvRepresentation.input', KV_DEFAULTS);
  const model = deriveKvRepresentationModel(input);
  const update = patch => setInput(prev => {
    const next = deriveKvRepresentationModel({ ...prev, ...patch });
    return { mode: next.mode, tokens: next.tokens, groups: next.groups, latent: next.latent, head: next.head, token: next.token };
  });
  return <details className="kv-microscope" data-testid="kv-microscope">
    <summary><Microscope size={20} /><span><strong>{t('title')}</strong><small>{t('teaser')}</small></span><ChevronDown className="kv-chevron" size={18} /></summary>
    <div className="kv-workbench" data-testid="kv-workbench" data-mode={model.mode}>
      <div className="kv-toolbar">
        <div className="kv-modes" role="group" aria-label={t('mode')}>
          {KV_MODES.map(mode => <button type="button" key={mode} aria-pressed={model.mode === mode} onClick={() => update({ mode })}>{t(mode)}</button>)}
        </div>
        <span className="kv-scope">{t('scope')}</span>
        <button type="button" className="kv-reset" aria-label={t('reset')} title={t('reset')} onClick={() => setInput(KV_DEFAULTS)}><RotateCcw size={16} /></button>
      </div>
      <div className="kv-inputs">
        <label>{t('tokens')}<input aria-label={t('tokens')} type="range" min="1" max="16" value={model.tokens} onChange={e => update({ tokens: e.target.value })} /><output>{model.tokens}</output></label>
        <label>{t('groups')}<select aria-label={t('groups')} value={model.groups} onChange={e => update({ groups: e.target.value })}>{[1, 2, 4, 8].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        <label>{t('latent')}<select aria-label={t('latent')} value={model.latent} onChange={e => update({ latent: e.target.value })}>{[32, 64, 128, 256].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      </div>
      <p className="kv-caption">{t('fixed')}</p>
      <div className="kv-layout">
        <div className="kv-canvas">
          <h3>{t(`${model.mode}Name`)}</h3><p>{t(`${model.mode}Desc`)}</p>
          <h4>{t('queries')}</h4>
          <div className="kv-query-row">{model.queryHeads.map(q => <button type="button" key={q.id} aria-label={`${t('query')} ${q.id + 1}`} aria-pressed={q.selected} onClick={() => update({ head: q.id })}><MathFormula>{`q_{${q.id + 1}}`}</MathFormula></button>)}</div>
          <svg className="kv-links" viewBox="0 0 800 48" preserveAspectRatio="none" aria-hidden="true">
            {model.queryHeads.map(q => <path key={q.id} d={`M ${(q.id + .5) * 100} 0 C ${(q.id + .5) * 100} 24 ${(q.group + .5) * 800 / model.groupCount} 24 ${(q.group + .5) * 800 / model.groupCount} 48`} stroke={q.selected ? '#4f46e5' : '#cbd5e1'} strokeWidth={q.selected ? 4 : 1.5} fill="none" />)}
          </svg>
          <div className="kv-groups" style={{ gridTemplateColumns: `repeat(${model.groupCount}, minmax(0,1fr))` }}>{model.records.map(g => <div key={g.id} data-selected={g.selected}>
            {model.mode === 'mla' ? t('shared') : <span className="kv-group-pair"><MathFormula>{`K_{${g.id + 1}}`}</MathFormula><MathFormula>{`V_{${g.id + 1}}`}</MathFormula></span>}
          </div>)}</div>
          <p className="kv-caption">{t('mapping')}</p>
          <h4>{t('history')}</h4>
          <div className="kv-history" data-testid="kv-history">{model.rows.map(row => <button type="button" className="kv-history-row" key={row.id} aria-label={`${t('token')} ${row.id + 1}`} aria-pressed={row.selected} onClick={() => update({ token: row.id })}>
            <span className="kv-token-name"><MathFormula>{`t_{${row.id + 1}}`}</MathFormula></span>
            <span className="kv-history-records" style={{ gridTemplateColumns: `repeat(${model.groupCount}, minmax(0,1fr))` }}>{model.records.map(g => <span key={g.id} className="kv-history-record" data-read={g.selected}>
              {model.mode === 'mla' ? <><i style={{ flex: model.latent }} /><i style={{ flex: model.ropeDim }} /></> : <><i /><i /></>}
            </span>)}</span>
          </button>)}</div>
          <p className="kv-caption">{t('grow')}</p>
          <div className="kv-record-inspector" data-testid="kv-record-inspector">
            <h4>{t('detail')} <MathFormula>{`t_{${model.token + 1}}`}</MathFormula></h4>
            <div className="kv-fields">{model.fields.map(field => <div key={field.id} className={`kv-field kv-field-${field.id}`}>
              <div><MathFormula>{field.tex}</MathFormula><span>{t(field.role)}</span><b>{field.bytes} {t('bytes')}</b></div>
              <div className="kv-units" style={{ width: `${field.channels / 256 * 100}%` }}>{Array.from({ length: field.units }, (_, i) => <i key={i} />)}</div>
              <MathFormula>{`d=${field.channels}`}</MathFormula>
            </div>)}</div>
            <p className="kv-caption">{t('unit')}</p>
          </div>
        </div>
        <aside className="kv-inspector">
          <div className="kv-budget">
            <span>{t('perToken')}</span><strong data-testid="kv-per-token">{model.perToken.toLocaleString('en-US')} <small>{t('bytes')}</small></strong>
            <span>{t('total')}</span><b data-testid="kv-total">{model.totalBytes.toLocaleString('en-US')} {t('bytes')}</b>
            <MathFormula>{model.formula}</MathFormula><MathFormula>{model.substitution}</MathFormula>
          </div>
          <h4>{t('compare')}</h4><p className="kv-caption">{t('compareHint')}</p>
          <div className="kv-comparisons">{model.comparisons.map(c => <div key={c.id} className="kv-comparison" data-active={model.mode === c.id}>
            <div><b>{t(c.id)}</b><span>{c.totalBytes.toLocaleString('en-US')} {t('bytes')}</span></div>
            <div className="kv-bar-track"><div style={{ width: `${c.fraction * 100}%` }} /></div>
            <small>{t('remain')} {(100 * c.fraction).toFixed(1)}%</small>
          </div>)}</div>
          <p className="kv-caption"><MathFormula>{'N,\\ H_{KV},\\ d_h,\\ d_c,\\ d_R,\\ b'}</MathFormula><br />{t('symbols')}</p>
          <p className="kv-note">{t(model.mode === 'mla' ? 'mlaNote' : 'gqaEdge')}</p>
        </aside>
      </div>
      <details className="kv-method"><summary>{t('inspect')}</summary><div className="kv-method-grid">
        <div><h4>{t('write')}</h4><div className="kv-math-scroll"><MathFormula>{model.writeFormula}</MathFormula></div><h4>{t('read')}</h4><div className="kv-math-scroll"><MathFormula>{model.readFormula}</MathFormula></div><p className="kv-caption">{t('boundary')}</p></div>
        <div><h4>{t('pseudo')}</h4><pre>{model.code}</pre></div>
      </div></details>
      <div className="kv-sources"><span>{t('sources')}</span><a href="https://arxiv.org/html/2405.04434v5#S2.SS1" target="_blank" rel="noreferrer">{t('sourceMla')}</a><a href="https://arxiv.org/abs/2305.13245" target="_blank" rel="noreferrer">{t('sourceGqa')}</a></div>
    </div>
  </details>;
}

