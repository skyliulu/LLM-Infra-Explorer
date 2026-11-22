import React, { useMemo } from 'react';
import { Activity, ArrowRight, Cpu, Layers } from 'lucide-react';
import { useExperimentState } from '../../lib/ExperimentContext';
import { MathFormula } from '../linear-attention/MathFormula';
import {
  SERVING_BATCHES,
  SERVING_KS,
  DRAFTER_FAMILIES,
  WORKLOAD_TYPES,
  deriveRooflineSweep,
  deriveDrafterFamilyModel,
} from './serving-model';
import { servingCopy } from './serving-content';

const ROOFLINE_FORMULA = String.raw`\mathrm{Speedup}(B,K,\alpha)=\frac{\sum_{j=0}^{K}\alpha^j}{\bigl(\max(1,\,B(K{+}1)/R_{\mathrm{ridge}})+c_d K\bigr)\big/\max(1,\,B/R_{\mathrm{ridge}})}`;

export default function ServingBoundaries({ lang }) {
  const [cfg, setCfg] = useExperimentState('SpeculativeDecoding.serving', {
    batchSize: 8,
    k: 4,
    alpha: 0.75,
    family: 'mtp',
    workload: 'agent_code',
  });

  const t = (key) => servingCopy[lang][key] || key;
  const sweep = useMemo(
    () => deriveRooflineSweep({ batchSize: cfg.batchSize, k: cfg.k, alpha: cfg.alpha }),
    [cfg.batchSize, cfg.k, cfg.alpha]
  );
  const drafter = useMemo(
    () => deriveDrafterFamilyModel({ family: cfg.family, workload: cfg.workload }),
    [cfg.family, cfg.workload]
  );

  const maxSpeedupScale = 3.6;

  return (
    <section className="spec-card space-y-5" data-testid="speculative-serving-panel">
      <div>
        <h2
          data-section-anchor="speculative-serving"
          data-section-label={t('navTitle')}
          className="text-lg font-bold"
        >
          {t('sectionTitle')}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{t('sectionIntro')}</p>
      </div>

      {/* 01: Batch/Load Roofline Crossover */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3" data-testid="spec-roofline-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Activity size={16} className="text-indigo-600 shrink-0" />
              {t('rooflineTitle')}
            </h3>
            <p className="mt-1 text-xs text-slate-600">{t('rooflineHint')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label={t('batchLabel')}>
            <span className="px-2 text-[11px] font-semibold text-slate-500">{t('batchLabel')}</span>
            {SERVING_BATCHES.map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={sweep.batchSize === b}
                onClick={() => setCfg({ ...cfg, batchSize: b })}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  sweep.batchSize === b ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                B={b}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label={t('kLabel')}>
            <span className="px-2 text-[11px] font-semibold text-slate-500">{t('kLabel')}</span>
            {SERVING_KS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={sweep.k === k}
                onClick={() => setCfg({ ...cfg, k })}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  sweep.k === k ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                K={k}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs">
            <span className="font-semibold text-slate-600">{t('alphaLabel')}</span>
            <input
              type="range"
              min="0.4"
              max="0.9"
              step="0.05"
              value={sweep.alpha}
              onChange={(e) => setCfg({ ...cfg, alpha: Number(e.target.value) })}
              className="w-24 accent-indigo-600"
            />
            <strong className="font-mono text-indigo-700">{sweep.alpha.toFixed(2)}</strong>
          </label>
        </div>

        {/* Visual Speedup Bars Across Batches with 1.0x Break-Even Line */}
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{t('barLegend')}</span>
            <span className={`font-semibold ${sweep.current.regresses ? 'text-rose-700' : sweep.current.beneficial ? 'text-emerald-700' : 'text-amber-700'}`}>
              {t(`regime_${sweep.current.regime}`)}
            </span>
          </div>

          <div className="space-y-1.5 relative">
            {sweep.curve.map((pt) => {
              const pct = Math.min(100, (pt.speedup / maxSpeedupScale) * 100);
              const breakEvenPct = (1.0 / maxSpeedupScale) * 100;
              const isSelected = pt.batchSize === sweep.batchSize;
              return (
                <button
                  key={pt.batchSize}
                  type="button"
                  onClick={() => setCfg({ ...cfg, batchSize: pt.batchSize })}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition ${
                    isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="w-14 shrink-0 font-mono text-xs font-bold text-slate-700">B={pt.batchSize}</span>
                  <div className="relative h-5 flex-1 rounded bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        pt.regresses ? 'bg-rose-500' : pt.beneficial ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                    <span
                      className="absolute top-0 bottom-0 border-l-2 border-dashed border-slate-600"
                      style={{ left: `${breakEvenPct}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <span className={`w-16 shrink-0 text-right font-mono text-xs font-extrabold ${
                    pt.regresses ? 'text-rose-700' : pt.beneficial ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {pt.speedup.toFixed(2)}×
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Metrics */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="text-[10px] text-slate-500">{t('verifyLoad')}</div>
            <div className="font-mono text-sm font-extrabold text-slate-800">
              {sweep.current.verifyTokens} / {sweep.current.ridgeTokens}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="text-[10px] text-slate-500">{t('expectedNew')}</div>
            <div className="font-mono text-sm font-extrabold text-slate-800">{sweep.current.expectedNew.toFixed(2)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="text-[10px] text-slate-500">{t('stepCostRatio')}</div>
            <div className="font-mono text-sm font-extrabold text-slate-800">{sweep.current.stepRatio.toFixed(2)}×</div>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${
            sweep.current.regresses ? 'border-rose-300 bg-rose-50' : 'border-emerald-300 bg-emerald-50'
          }`}>
            <div className="text-[10px] text-slate-600">{t('netSpeedup')}</div>
            <div className={`font-mono text-sm font-extrabold ${sweep.current.regresses ? 'text-rose-800' : 'text-emerald-800'}`}>
              {sweep.current.speedup.toFixed(2)}×
            </div>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
            <div className="text-[10px] text-indigo-700">{t('adaptiveRec')}</div>
            <div className="text-xs font-extrabold text-indigo-950">
              {sweep.recommended.bestK === 0
                ? t('disableSpec')
                : `${t('keepSpec')} = ${sweep.recommended.bestK} (${sweep.recommended.bestSpeedup.toFixed(2)}×)`}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 overflow-x-auto">
          <MathFormula block>{ROOFLINE_FORMULA}</MathFormula>
        </div>
      </div>

      {/* 02: Modern Drafter Families */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3" data-testid="spec-drafter-families">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Layers size={16} className="text-blue-600 shrink-0" />
              {t('familiesTitle')}
            </h3>
            <p className="mt-1 text-xs text-slate-600">{t('familiesHint')}</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label={t('workloadLabel')}>
            {WORKLOAD_TYPES.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={cfg.workload === w}
                onClick={() => setCfg({ ...cfg, workload: w })}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  cfg.workload === w ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t(w)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {DRAFTER_FAMILIES.map((fam) => {
            const fm = deriveDrafterFamilyModel({ family: fam, workload: cfg.workload });
            const active = cfg.family === fam;
            return (
              <button
                key={fam}
                type="button"
                aria-pressed={active}
                onClick={() => setCfg({ ...cfg, family: fam })}
                className={`rounded-xl border p-3.5 text-left transition space-y-2 ${
                  active ? 'border-blue-500 bg-white ring-2 ring-blue-200 shadow-sm' : 'border-slate-200 bg-white/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-xs text-slate-900">{t(fam)}</strong>
                  <span className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                    fm.speedup < 1 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {fm.speedup.toFixed(2)}×
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">{t(`${fam}Desc`)}</p>
                <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2 text-[10px]">
                  <div>
                    <span className="text-slate-500 block">{t('metricAlpha')}</span>
                    <strong className="font-mono text-slate-800">{(fm.alpha * 100).toFixed(0)}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t('metricHead')}</span>
                    <strong className="font-mono text-slate-800">
                      {fm.vocabDraft === 0
                        ? t('zeroHead')
                        : fm.vocabDraft < fm.vocabFull
                          ? `${(fm.vocabDraft / 1000).toFixed(0)}K (${fm.vocabReduction.toFixed(1)}×↓)`
                          : `${(fm.vocabFull / 1000).toFixed(0)}K`}
                    </strong>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <a href="#deepinfer" className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 hover:underline">
            <Cpu size={14} /> {t('deepinferLink')} <ArrowRight size={13} />
          </a>
          <span className="text-[11px] text-slate-500">{t('scopeNote')}</span>
        </div>
      </div>
    </section>
  );
}
