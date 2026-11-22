import React, { useMemo, useState } from 'react';
import { ArrowRight, Cpu, Layers } from 'lucide-react';
import { useExperimentState } from '../../lib/ExperimentContext';
import { MathFormula } from './MathFormula';
import {
  CHUNK_SIZES,
  HYBRID_RATIOS,
  BATCH_SIZES,
  deriveChunkwiseModel,
  deriveHybridMemoryModel,
} from './modern-model';
import { modernCopy } from './modern-content';

const CHUNK_FORMULA = String.raw`O_c = (Q_c K_c^\top \odot M_{\gamma}) V_c + \tilde{Q}_c S_{[c-1]}, \qquad S_{[c]} = \bar{\alpha}_c S_{[c-1]} + \tilde{K}_c^\top V_c`;

const fmtBytes = (b) => (b >= 2 ** 30 ? `${(b / 2 ** 30).toFixed(2)} GiB` : b >= 2 ** 20 ? `${(b / 2 ** 20).toFixed(1)} MiB` : `${(b / 1024).toFixed(1)} KiB`);

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
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 space-y-3"
      data-testid="chunkwise-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <Cpu size={15} />
          </div>
          <h2
            data-section-anchor="linear-chunkwise"
            data-section-label={t('chunkNavTitle')}
            className="text-base font-bold text-slate-950"
          >
            {t('chunkTitle')}
          </h2>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label={t('chunkSizeLabel')}>
          <span className="px-2 text-[11px] font-semibold text-slate-500">{t('chunkSizeLabel')}</span>
          {CHUNK_SIZES.map((cs) => (
            <button
              key={cs}
              type="button"
              aria-pressed={cfg.chunkSize === cs}
              onClick={() => { setCfg({ ...cfg, chunkSize: cs }); setActiveChunk(0); }}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                cfg.chunkSize === cs ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              C={cs}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-600">{t('chunkLead')}</p>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {chunkModel.chunks.map((ch) => (
          <button
            key={ch.index}
            type="button"
            onClick={() => setActiveChunk(ch.index)}
            aria-pressed={activeChunk === ch.index}
            className={`rounded-xl border p-2.5 text-left transition ${
              ch.status === 'active'
                ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-200'
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

// Visual 8-layer sample stack matching each hybrid ratio
const LAYER_PATTERNS = {
  pure_softmax: Array(8).fill('full'),
  hybrid_3_1: ['linear', 'linear', 'linear', 'full', 'linear', 'linear', 'linear', 'full'],
  hybrid_7_1: ['linear', 'linear', 'linear', 'linear', 'linear', 'linear', 'linear', 'full'],
  pure_linear: Array(8).fill('linear'),
};

export default function ChunkDeltaWorkbench({ lang, contextLength, dk, dv }) {
  const [cfg, setCfg] = useExperimentState('LinearAttention.modern', {
    chunkSize: 64,
    alpha: 0.85,
    beta: 0.9,
    ratio: 'hybrid_3_1',
    batchSize: 8,
  });

  const t = (key) => modernCopy[lang][key] || key;

  const hybrid = useMemo(
    () => deriveHybridMemoryModel({ contextLength, batchSize: cfg.batchSize, ratio: cfg.ratio, dk, dv }),
    [contextLength, cfg.batchSize, cfg.ratio, dk, dv]
  );

  const maxBytes = Math.max(hybrid.baselinePureSoftmaxBytes, hybrid.totalBytes, 1);
  const pattern = LAYER_PATTERNS[cfg.ratio] || LAYER_PATTERNS.hybrid_3_1;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 space-y-3"
      data-testid="linear-modern-workbench"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <Layers size={15} />
          </div>
          <div>
            <h2
              data-section-anchor="linear-modern"
              data-section-label={t('navTitle')}
              className="text-base font-bold text-slate-950"
            >
              {t('hybridTitle')}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">{t('hybridBridge')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-lg bg-slate-100 p-0.5" role="group" aria-label={t('ratioLabel')}>
            {HYBRID_RATIOS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={cfg.ratio === r}
                onClick={() => setCfg({ ...cfg, ratio: r })}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                  cfg.ratio === r ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(`ratio_${r}`)}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label={t('batchLabel')}>
            {BATCH_SIZES.map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={cfg.batchSize === b}
                onClick={() => setCfg({ ...cfg, batchSize: b })}
                className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
                  cfg.batchSize === b ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                B={b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual 8-layer stack showing Linear vs Full KV distribution */}
      <div className="grid gap-3 lg:grid-cols-2 lg:items-center">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>{t('stackLabel')}</span>
            <span className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />{t('layerLinear')}</span>
              <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-600" />{t('layerFull')}</span>
            </span>
          </div>
          <div className="grid grid-cols-8 gap-1.5" role="img" aria-label={t('stackLabel')}>
            {pattern.map((kind, i) => (
              <div
                key={i}
                className={`rounded-lg border px-1 py-2 text-center text-[10px] font-bold ${
                  kind === 'full'
                    ? 'border-indigo-400 bg-indigo-100 text-indigo-900'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                }`}
              >
                <div>L{i + 1}</div>
                <div className="mt-0.5 text-[9px] font-semibold opacity-80">{kind === 'full' ? 'KV' : 'State'}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500">{t(`stackNote_${cfg.ratio}`)}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5" data-testid="hybrid-memory-panel">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>{t('softmaxBaseline')} (N={contextLength.toLocaleString()}, B={cfg.batchSize})</span>
              <span className="font-mono">{fmtBytes(hybrid.baselinePureSoftmaxBytes)}</span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-slate-500 rounded-full" style={{ width: `${(hybrid.baselinePureSoftmaxBytes / maxBytes) * 100}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-indigo-800">
              <span>{t(`ratio_${cfg.ratio}`)} ({t('kvPart')} {fmtBytes(hybrid.fullBytes)} + {t('statePart')} {fmtBytes(hybrid.linearBytes)})</span>
              <span className="font-mono">{fmtBytes(hybrid.totalBytes)} ({hybrid.savingsRatio.toFixed(2)}×)</span>
            </div>
            <div className="mt-1 flex h-3 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-indigo-600" style={{ width: `${(hybrid.fullBytes / maxBytes) * 100}%` }} />
              <div className="h-full bg-emerald-500" style={{ width: `${(hybrid.linearBytes / maxBytes) * 100}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
            <span className={hybrid.linearExceedsSoftmax ? 'font-semibold text-amber-800' : 'font-semibold text-emerald-800'}>
              {hybrid.linearExceedsSoftmax ? t('shortPenalty') : t('longSavings')}
            </span>
            <span className="font-mono text-slate-500">
              {t('crossoverLabel')}: N* ≈ {hybrid.crossoverN}
            </span>
          </div>
        </div>
      </div>

      <a
        href="#radixcache"
        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline"
      >
        {t('radixBridge')} <ArrowRight size={13} />
      </a>
    </section>
  );
}
