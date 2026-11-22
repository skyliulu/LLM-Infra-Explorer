import React, { useMemo, useState } from 'react';
import { ArrowRight, Cpu, Layers, Sparkles } from 'lucide-react';
import { useExperimentState } from '../../lib/ExperimentContext';
import { MathFormula } from './MathFormula';
import {
  CHUNK_SIZES,
  HYBRID_RATIOS,
  BATCH_SIZES,
  deriveChunkwiseModel,
  deriveDeltaRecallModel,
  deriveHybridMemoryModel,
} from './modern-model';
import { modernCopy } from './modern-content';

const CHUNK_FORMULA = String.raw`O_c = (Q_c K_c^\top \odot M_{\gamma}) V_c + \tilde{Q}_c S_{[c-1]}, \qquad S_{[c]} = \bar{\alpha}_c S_{[c-1]} + \tilde{K}_c^\top V_c`;
const DELTA_FORMULA = String.raw`S_t = \alpha_t S_{t-1} + \beta_t k_t^\top\bigl(v_t - \alpha_t k_t S_{t-1}\bigr)`;

const fmtBytes = (b) => (b >= 2 ** 30 ? `${(b / 2 ** 30).toFixed(2)} GiB` : b >= 2 ** 20 ? `${(b / 2 ** 20).toFixed(1)} MiB` : `${(b / 1024).toFixed(1)} KiB`);
const fmtVec = (v) => `[${v[0].toFixed(2)}, ${v[1].toFixed(2)}]`;

export function ChunkwisePrefillSection({ lang, contextLength, dk, dv }) {
  const [cfg, setCfg] = useExperimentState('LinearAttention.modern', {
    chunkSize: 64,
    alpha: 0.85,
    beta: 0.9,
    ratio: 'hybrid_3_1',
    batchSize: 8,
  });
  const [activeChunk, setActiveChunk] = useState(1);
  const t = (key) => modernCopy[lang][key] || key;
  const chunkModel = useMemo(
    () => deriveChunkwiseModel({ contextLength, chunkSize: cfg.chunkSize, dk, dv, activeChunk }),
    [contextLength, cfg.chunkSize, dk, dv, activeChunk]
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 space-y-3" data-testid="chunkwise-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 data-section-anchor="linear-prefill" data-section-label={t('prefillNav')} className="flex items-center gap-2 text-base font-bold text-slate-950">
            <Cpu size={16} className="text-indigo-600 shrink-0" />
            {t('prefillTitle')}
          </h2>
          <p className="mt-1 text-xs text-slate-600">{t('prefillLead')}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <span className="px-2 text-[11px] font-semibold text-slate-500">{t('chunkSizeLabel')}</span>
          {CHUNK_SIZES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cfg.chunkSize === c}
              onClick={() => setCfg({ ...cfg, chunkSize: c })}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                cfg.chunkSize === c ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
              }`}
            >
              C={c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {chunkModel.chunks.map((ch) => (
          <button
            key={ch.index}
            type="button"
            onClick={() => setActiveChunk(ch.index)}
            aria-pressed={ch.status === 'active'}
            className={`rounded-xl border p-3 text-left transition ${
              ch.status === 'active'
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                : ch.status === 'passed'
                  ? 'border-emerald-300 bg-emerald-50/70'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-800">{ch.label} ({chunkModel.C})</span>
              <span className="font-mono text-[10px] text-indigo-700">γ={ch.retention}</span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-0.5 rounded bg-slate-100 p-1.5" aria-hidden="true">
              {Array.from({ length: 16 }, (_, idx) => {
                const causal = (idx % 4) <= Math.floor(idx / 4);
                return (
                  <span
                    key={idx}
                    className={`h-2.5 rounded-[2px] ${
                      !causal ? 'bg-slate-200/70' : ch.status === 'active' ? 'bg-indigo-500' : ch.status === 'passed' ? 'bg-emerald-500' : 'bg-slate-400/60'
                    }`}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-600">
              <span>{t('intraLabel')}</span>
              <span>S[{ch.index}] → S[{ch.index + 1}]</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-[11px] text-slate-500">{t('serialHops')}</div>
          <div className="text-base font-extrabold text-rose-700">{chunkModel.serialSequentialHops.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-[11px] text-slate-500">{t('chunkHops')}</div>
          <div className="text-base font-extrabold text-emerald-700">{chunkModel.chunkSequentialHops.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          <div className="text-[11px] text-indigo-700">{t('hopSpeedup')}</div>
          <div className="text-base font-extrabold text-indigo-900">{chunkModel.hopReduction.toFixed(0)}×</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 overflow-x-auto">
        <MathFormula block>{CHUNK_FORMULA}</MathFormula>
      </div>
    </section>
  );
}

export default function ChunkDeltaWorkbench({ lang, contextLength, dk, dv }) {
  const [cfg, setCfg] = useExperimentState('LinearAttention.modern', {
    chunkSize: 64,
    alpha: 0.85,
    beta: 0.9,
    ratio: 'hybrid_3_1',
    batchSize: 8,
  });

  const t = (key) => modernCopy[lang][key] || key;
  const deltaModel = useMemo(
    () => deriveDeltaRecallModel({ alpha: cfg.alpha, beta: cfg.beta }),
    [cfg.alpha, cfg.beta]
  );
  const hybridModel = useMemo(
    () => deriveHybridMemoryModel({ ratio: cfg.ratio, contextLength, batchSize: cfg.batchSize, dk, dv }),
    [cfg.ratio, contextLength, cfg.batchSize, dk, dv]
  );

  const barScale = Math.max(hybridModel.baselinePureSoftmaxBytes, hybridModel.totalBytes, 1);

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 space-y-4"
      data-testid="linear-modern-workbench"
    >
      <h2
        data-section-anchor="linear-modern"
        data-section-label={t('navTitle')}
        className="text-base font-bold text-slate-950"
      >
        {t('sectionTitle')}
      </h2>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* GLA vs Gated DeltaNet */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3" data-testid="deltanet-panel">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Sparkles size={14} className="text-cyan-700 shrink-0" />
              {t('deltaTitle')}
            </h3>
            <div className="flex gap-2 text-[11px]">
              <label className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1">
                <span>{t('alphaLabel')}</span>
                <input type="range" min="0.4" max="1.0" step="0.05" value={deltaModel.alpha} onChange={(e) => setCfg({ ...cfg, alpha: Number(e.target.value) })} className="w-16 accent-indigo-600" />
                <strong className="font-mono text-indigo-700">{deltaModel.alpha.toFixed(2)}</strong>
              </label>
              <label className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1">
                <span>{t('betaLabel')}</span>
                <input type="range" min="0.2" max="1.0" step="0.05" value={deltaModel.beta} onChange={(e) => setCfg({ ...cfg, beta: Number(e.target.value) })} className="w-16 accent-cyan-600" />
                <strong className="font-mono text-cyan-700">{deltaModel.beta.toFixed(2)}</strong>
              </label>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">{t('deltaHint')}</p>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-amber-200 bg-white p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <strong className="text-amber-900">{t('glaCardTitle')}</strong>
                <span className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-800">
                  {t('errorK1')} {deltaModel.gla.errorK1.toFixed(3)}
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-700">
                {t('readoutVal')}: <strong className="text-rose-800">{fmtVec(deltaModel.gla.readK1)}</strong> · {t('orthoK2')}: {fmtVec(deltaModel.gla.readK2)}
              </div>
              <p className="text-[11px] leading-snug text-slate-500">{t('glaConclusion')}</p>
            </div>

            <div className="rounded-lg border border-emerald-300 bg-white p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <strong className="text-emerald-900">{t('deltaCardTitle')}</strong>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                  {t('errorK1')} {deltaModel.delta.errorK1.toFixed(3)}
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-700">
                {t('readoutVal')}: <strong className="text-emerald-800">{fmtVec(deltaModel.delta.readK1)}</strong> · {t('orthoK2')}: {fmtVec(deltaModel.delta.readK2)}
              </div>
              <p className="text-[11px] leading-snug text-slate-500">{t('deltaConclusion')}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 overflow-x-auto">
            <MathFormula block>{DELTA_FORMULA}</MathFormula>
          </div>
        </div>

        {/* Hybrid Memory Crossover */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3 flex flex-col justify-between" data-testid="hybrid-memory-panel">
          <div className="space-y-2.5">
            <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Layers size={14} className="text-violet-600 shrink-0" />
              {t('hybridTitle')}
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label={t('ratioLabel')}>
                {HYBRID_RATIOS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={cfg.ratio === r}
                    onClick={() => setCfg({ ...cfg, ratio: r })}
                    className={`rounded px-2 py-1 text-[11px] font-semibold transition ${
                      cfg.ratio === r ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {t(r)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label={t('batchLabel')}>
                {BATCH_SIZES.map((b) => (
                  <button
                    key={b}
                    type="button"
                    aria-pressed={cfg.batchSize === b}
                    onClick={() => setCfg({ ...cfg, batchSize: b })}
                    className={`rounded px-2 py-1 text-[11px] font-bold transition ${
                      cfg.batchSize === b ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    B={b}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">{t('pure_softmax')} (N={hybridModel.N}, B={hybridModel.B})</span>
                <strong className="font-mono text-slate-800">{fmtBytes(hybridModel.baselinePureSoftmaxBytes)}</strong>
              </div>
              <div className="h-3.5 w-full overflow-hidden rounded bg-slate-100">
                <div className="h-full bg-slate-500 transition-all" style={{ width: `${(hybridModel.baselinePureSoftmaxBytes / barScale) * 100}%` }} />
              </div>

              <div className="flex justify-between text-xs pt-1">
                <span className="text-slate-800">
                  {t(hybridModel.ratio)} ({t('fullMem')} {fmtBytes(hybridModel.fullBytes)} + {t('linearMem')} {fmtBytes(hybridModel.linearBytes)})
                </span>
                <strong className="font-mono text-indigo-800">{fmtBytes(hybridModel.totalBytes)} ({hybridModel.savingsRatio.toFixed(2)}×)</strong>
              </div>
              <div className="flex h-3.5 w-full overflow-hidden rounded bg-slate-100">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${(hybridModel.fullBytes / barScale) * 100}%` }} />
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${(hybridModel.linearBytes / barScale) * 100}%` }} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                <span className={hybridModel.linearExceedsSoftmax ? 'font-semibold text-amber-800' : 'font-semibold text-emerald-700'}>
                  {t(hybridModel.linearExceedsSoftmax ? 'shortWarning' : 'longWin')}
                </span>
                <span className="font-mono text-slate-500">{t('crossoverNote')} ≈ {hybridModel.crossoverN}</span>
              </div>
            </div>
          </div>

          <a href="#radixcache?section=hicache-hybrid" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline">
            {t('radixBridge')} <ArrowRight size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}
