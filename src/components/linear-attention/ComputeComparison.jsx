import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { MathFormula } from './MathFormula';
import { vectorFor } from './model';
import { deriveLinearComparison } from './comparison-model';
import './comparison.css';

const i18n = {
  zh: {
    title: '扫描历史 KV，还是读取固定状态 S？',
    play: '播放计算对照',
    pause: '暂停计算对照',
    reset: '重置计算对照',
    next: '计算对照下一步',
    ready: '就绪',
    score: 'QK 打分',
    softmax: 'Softmax',
    value: 'V 加权',
    map: '特征映射',
    keyread: '读旧值与残差',
    outer: '生成写入增量',
    gate: '衰减旧状态',
    write: '更新状态',
    normalizer: '更新归一化状态',
    read: '读取状态',
    divide: '归一化输出',
    done: '完成',
    work: '累计乘法 / 乘加项',
    reads: '累计缓存 / 状态读取',
    stored: '驻留缓存 / 状态',
    note: '4 维合成矩阵演示；上方参数 N、dₖ、dᵥ 同步换算工作量与显存。口径与下方混合层统一：Full KV 按 BF16 (2 B/elem)，递归状态 S 按 FP32 (4 B/elem) 保证数值稳定；仅计主乘加与状态读取（不含 QKV 投影与写回）。',
    prefill: 'Prefill 演示 8 个采样位置的因果递推与累计前缀工作量；真实训练/Prefill 请见下方 §3 Chunkwise 并行分块。',
    decode: 'Decode：共享历史后的单步新查询，计入当前 Token 的状态更新与读取。',
    difference: 'Kernel Linear 改写核映射，GLA 引入数据相关门控，Gated DeltaNet 先读旧值再写残差（多一次 dₖ·dᵥ 键读取）；输出无需与 Softmax 相等。',
    norm: '归一化状态',
    deltaReadTag: '先读旧值再算残差',
    weights: '注意力权重',
  },
  en: {
    title: 'Scan growing KV history, or read fixed state S?',
    play: 'Play compute comparison',
    pause: 'Pause compute comparison',
    reset: 'Reset compute comparison',
    next: 'Next comparison operation',
    ready: 'Ready',
    score: 'QK scores',
    softmax: 'Softmax',
    value: 'Weight V',
    map: 'Feature map',
    keyread: 'Read old value & delta',
    outer: 'Form update',
    gate: 'Decay old state',
    write: 'Update state',
    normalizer: 'Update normalizer',
    read: 'Read state',
    divide: 'Normalize output',
    done: 'Done',
    work: 'Cumulative multiply / MAC terms',
    reads: 'Cumulative cache / state reads',
    stored: 'Resident cache / state',
    note: 'Synthetic 4D matrices; metrics scale to N, d_k, d_v above using the same precision as the Hybrid section: BF16 (2 B/elem) for Full KV and FP32 (4 B/elem) for recurrent state S. Counts core MACs and state reads (excluding projections and write-back).',
    prefill: 'Prefill shows causal recurrence across 8 sampled positions; see §3 Chunkwise Parallel Prefill below for real Tensor Core chunking.',
    decode: 'Decode: one new query after shared history, including the current token state update and readout.',
    difference: 'Kernel Linear changes the kernel, GLA adds data-dependent decay, and Gated DeltaNet reads the old value first (+d_k·d_v key-read MAC) before writing the residual.',
    norm: 'Normalizer state',
    deltaReadTag: 'Read-before-write',
    weights: 'Attention weights',
  },
};

function Grid({ label, values, active = false, axis = 'col', limit = Infinity, current = -1 }) {
  return (
    <div className="lc-matrix" data-active={active}>
      <MathFormula>{label}</MathFormula>
      <div className="lc-grid" style={{ gridTemplateColumns: `repeat(${values[0].length},13px)` }}>
        {values.flatMap((row, r) =>
          row.map((v, c) => (
            <i
              key={`${r}-${c}`}
              title={v.toFixed(3)}
              data-current={(axis === 'col' ? c : r) === current}
              data-hidden={(axis === 'col' ? c : r) >= limit}
              style={{ background: `rgba(${v < 0 ? '234,88,12' : '109,40,217'},${0.2 + 0.75 * Math.min(1, Math.abs(v))})` }}
            />
          ))
        )}
      </div>
      <MathFormula>{`${values.length}\\times${values[0].length}`}</MathFormula>
    </div>
  );
}

const tr = (a) => a[0].map((_, j) => a.map((r) => r[j]));
const Op = ({ children }) => (
  <span className="lc-op">
    <MathFormula>{children}</MathFormula>
  </span>
);

export function ComputeComparison({ targetMode: mode, contextMode: context, contextLength: n, dk, dv, gateStrength }) {
  const [lang] = useLanguage();
  const t = (k) => i18n[lang][k] ?? k;
  const [cursor, setCursor] = useState(null);
  const [playing, setPlaying] = useState(false);

  const e = deriveLinearComparison({ mode, context, n, dk, dv, gateStrength, cursor });
  useEffect(() => {
    if (!playing || e.done) return undefined;
    const id = setTimeout(() => setCursor((x) => (x ?? 0) + 1), 700);
    return () => clearTimeout(id);
  }, [cursor, playing, e.done]);

  const complete = deriveLinearComparison({ mode, context, n, dk, dv, gateStrength });
  const metrics = (l) => (
    <aside>
      {[
        [t('work'), l.mac, Math.max(complete.full.mac, complete.state.mac, 1)],
        [t('reads'), l.readBytes, Math.max(complete.full.readBytes, complete.state.readBytes, 1)],
        [t('stored'), l.storedBytes, Math.max(complete.full.storedBytes, complete.state.storedBytes, 1)],
      ].map(([name, v, max], i) => (
        <div key={name}>
          <small>{name}</small>
          <b>{i ? `${(v / 1024).toFixed(2)} KiB` : v.toLocaleString()}</b>
          <span>
            <i style={{ width: `${(v / max) * 100}%` }} />
          </span>
        </div>
      ))}
    </aside>
  );

  const f = e.full;
  const s = e.state;
  const fs = f.s;
  const ss = s.s;
  const keys = Array.from({ length: f.token + 1 }, (_, i) => vectorFor(i, 2));
  const values = Array.from({ length: f.token + 1 }, (_, i) => vectorFor(i, 3));
  const normalized = ['softmax', 'value', 'done'].includes(f.phase);
  const scored = f.phase === 'ready' ? 0 : f.phase === 'score' ? f.count : keys.length;
  const vcount = f.phase === 'value' ? f.count : f.done ? keys.length : 0;
  const partial = Array.from({ length: 4 }, (_, d) => values.slice(0, vcount).reduce((sum, v, i) => sum + fs.weights[i] * v[d], 0));
  const updateReady = ['write', 'normalizer', 'read', 'divide', 'done'].includes(s.phase);
  const outputReady = ['read', 'divide', 'done'].includes(s.phase);
  const keyReadReady = ['keyread', 'outer', 'write', 'read', 'done'].includes(s.phase);
  const activeKeyVec = mode === 'linear' ? ss.phiKey : mode === 'deltanet' ? ss.deltaKey : ss.key;
  const activeValVec = mode === 'deltanet' ? (ss.scaledDeltaError || ss.deltaError) : ss.value;

  return (
    <div className="lc-comparison">
      <header>
        <h3 data-section-anchor="linear-compute">{t('title')}</h3>
        <div className="lc-actions">
          <button type="button" aria-label={t('reset')} onClick={() => { setCursor(0); setPlaying(false); }}>
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            aria-label={t(playing && !e.done ? 'pause' : 'play')}
            onClick={() => {
              if (e.done) {
                setCursor(0);
                setPlaying(true);
              } else {
                setPlaying(!playing);
              }
            }}
          >
            {playing && !e.done ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            type="button"
            disabled={e.done}
            aria-label={t('next')}
            onClick={() => {
              setPlaying(false);
              setCursor((cursor ?? 0) + 1);
            }}
          >
            <SkipForward size={15} />
          </button>
        </div>
      </header>

      <div className="lc-scroll">
        <div className="lc-lane">
          <strong>
            Full Attention (BF16 KV)
            <small>{t(f.phase)} · T{f.token + 1}</small>
          </strong>
          <div className="lc-flow">
            <Grid label={String.raw`q_t`} values={[fs.query]} active={f.phase === 'score'} />
            <Op>{String.raw`\times`}</Op>
            <Grid label={String.raw`K_{1:t}^\top`} values={tr(keys)} active={f.phase === 'score'} current={f.phase === 'score' ? f.count - 1 : -1} />
            <Op>{normalized ? String.raw`\xrightarrow{\mathrm{softmax}}` : String.raw`\xrightarrow{/\sqrt{d_k}}`}</Op>
            <Grid
              label={normalized ? String.raw`a_t` : String.raw`\ell_t`}
              values={[normalized ? fs.weights : fs.scores]}
              limit={scored}
              active={['score', 'softmax', 'value'].includes(f.phase)}
              current={f.phase === 'value' ? f.count - 1 : -1}
            />
            <Op>{String.raw`\times`}</Op>
            <Grid label={String.raw`V_{1:t}`} values={values} axis="row" current={f.phase === 'value' ? f.count - 1 : -1} active={f.phase === 'value'} />
            <Op>{String.raw`=`}</Op>
            <Grid label={String.raw`o_t`} values={[partial]} active={f.phase === 'value'} />
          </div>
          {metrics(f)}
        </div>

        <div className="lc-lane lc-recurrent">
          <strong>
            {mode === 'deltanet' ? 'Gated DeltaNet (FP32 S)' : mode === 'gla' ? 'GLA (FP32 S)' : 'Linear Attention (FP32 S)'}
            <small>{t(s.phase)} · T{s.token + 1}</small>
          </strong>
          <div className="lc-recurrent-flow">
            {mode === 'deltanet' && (
              <div className="lc-flow lc-normalizer">
                <small>{t('deltaReadTag')}</small>
                <Grid label={String.raw`\hat{k}_t`} values={[ss.deltaKey]} active={s.phase === 'keyread'} />
                <Op>{String.raw`\times`}</Op>
                <Grid label={String.raw`\widetilde{S}_{t-1}`} values={ss.decayedState} active={s.phase === 'keyread'} />
                <Op>{String.raw`=`}</Op>
                <Grid label={String.raw`\hat{v}_t`} values={[keyReadReady ? ss.predictedValue : [0, 0, 0, 0]]} active={s.phase === 'keyread'} />
                <Op>{String.raw`\Longrightarrow`}</Op>
                <Grid label={String.raw`\delta_t=v_t-\hat{v}_t`} values={[keyReadReady ? ss.deltaError : [0, 0, 0, 0]]} active={s.phase === 'keyread' || s.phase === 'outer'} />
              </div>
            )}

            <div className="lc-flow">
              <Grid label={String.raw`S_{t-1}`} values={ss.previousState} active={['gate', 'write'].includes(s.phase)} />
              {(mode === 'gla' || mode === 'deltanet') && (
                <>
                  <Op>{mode === 'deltanet' ? String.raw`\times` : String.raw`\odot`}</Op>
                  <Grid label={mode === 'deltanet' ? String.raw`\alpha_t` : String.raw`G_t`} values={ss.gateMatrix} active={s.phase === 'gate'} />
                  <Op>{String.raw`\longrightarrow`}</Op>
                  <Grid label={String.raw`\widetilde{S}_{t-1}`} values={ss.decayedState} active={s.phase === 'gate' || s.phase === 'keyread'} />
                </>
              )}
              <Op>{String.raw`+`}</Op>
              <Grid
                label={mode === 'linear' ? String.raw`\phi(k_t)^\top` : mode === 'deltanet' ? String.raw`\hat{k}_t^\top` : String.raw`k_t^\top`}
                values={tr([activeKeyVec])}
                active={s.phase === 'outer' || s.phase === 'map'}
              />
              <Op>{String.raw`\times`}</Op>
              <Grid label={mode === 'deltanet' ? String.raw`\beta_t\delta_t` : String.raw`v_t`} values={[activeValVec]} active={s.phase === 'outer'} />
              <Op>{String.raw`\longrightarrow`}</Op>
              <Grid label={String.raw`S_t`} values={updateReady ? ss.state : ss.previousState} active={s.phase === 'write' || s.phase === 'read'} />
            </div>

            {mode === 'linear' && (
              <div className="lc-flow lc-normalizer">
                <small>{t('norm')}</small>
                <Grid label={String.raw`z_{t-1}`} values={[ss.previousNormalizer]} active={s.phase === 'normalizer'} />
                <Op>{String.raw`+`}</Op>
                <Grid label={String.raw`\phi(k_t)`} values={[ss.phiKey]} active={s.phase === 'normalizer'} />
                <Op>{String.raw`=`}</Op>
                <Grid
                  label={String.raw`z_t`}
                  values={[['normalizer', 'read', 'divide', 'done'].includes(s.phase) ? ss.normalizer : ss.previousNormalizer]}
                  active={s.phase === 'normalizer' || s.phase === 'read'}
                />
              </div>
            )}

            <div className="lc-flow">
              <Grid label={mode === 'linear' ? String.raw`\phi(q_t)` : String.raw`q_t`} values={[mode === 'linear' ? ss.phiQuery : ss.query]} active={s.phase === 'read'} />
              <Op>{String.raw`\times`}</Op>
              <Grid label={String.raw`S_t`} values={updateReady ? ss.state : ss.previousState} active={s.phase === 'read'} />
              <Op>{String.raw`=`}</Op>
              <Grid label={mode === 'linear' ? String.raw`n_t` : String.raw`o_t`} values={[outputReady ? ss.numerator : [0, 0, 0, 0]]} active={s.phase === 'read'} />
              {mode === 'linear' && (
                <>
                  <Op>{String.raw`\div`}</Op>
                  <Grid label={String.raw`\phi(q_t)z_t^\top`} values={[[outputReady ? ss.denominator : 0]]} active={s.phase === 'read' || s.phase === 'divide'} />
                  <Op>{String.raw`=`}</Op>
                  <Grid label={String.raw`o_t`} values={[['divide', 'done'].includes(s.phase) ? ss.linearOutput : [0, 0, 0, 0]]} active={s.phase === 'divide'} />
                </>
              )}
            </div>
          </div>
          {metrics(s)}
        </div>
      </div>

      <p>
        {t(context)} {t('note')}
      </p>
      <p>{t('difference')}</p>
    </div>
  );
}
