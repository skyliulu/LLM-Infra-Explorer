import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Boxes, Merge, Search } from 'lucide-react';
import { ComputeComparison } from './ComputeComparison';
import { MathFormula } from './MathFormula';

const toneClasses = {
  indigo: {
    text: 'text-indigo-700',
    border: 'border-indigo-300',
    soft: 'bg-indigo-50',
  },
  cyan: {
    text: 'text-cyan-800',
    border: 'border-cyan-400',
    soft: 'bg-cyan-50',
  },
  emerald: {
    text: 'text-emerald-800',
    border: 'border-emerald-400',
    soft: 'bg-emerald-50',
  },
};

function AddressabilityStrip({ targetMode, gateStrength, t }) {
  const tone = targetMode === 'deltanet' ? 'emerald' : targetMode === 'gla' ? 'cyan' : 'indigo';
  const colors = toneClasses[tone];
  return (
    <div
      className="grid items-center gap-3 border-t border-slate-200 px-3 py-3 xl:grid-cols-[1fr_32px_1fr]"
      role="img"
      aria-label={t('compressionCostLead')}
    >
      <div className="flex items-center justify-center gap-2">
        <Search size={15} className="text-rose-600" />
        {['A', 'B', 'C'].map((label) => (
          <div
            key={label}
            className={`flex h-10 w-16 items-center justify-center rounded-lg border font-mono text-[10px] font-bold ${
              label === 'B'
                ? 'border-rose-400 bg-rose-100 ring-2 ring-rose-100 text-rose-950'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            KV-{label}
          </div>
        ))}
        <span className="text-[10px] font-bold text-rose-700">{t('addressable')}</span>
      </div>
      <ArrowRight size={17} className="mx-auto rotate-90 text-slate-400 xl:rotate-0" />
      <div className="flex items-center justify-center gap-2">
        <div className="relative h-12 w-40">
          {['A', 'B', 'C'].map((label, index) => (
            <motion.div
              key={label}
              animate={{
                left: `${18 + index * 22}%`,
                opacity: (targetMode === 'gla' || targetMode === 'deltanet') && index === 0 ? Math.max(0.2, 1 - gateStrength) : 1,
              }}
              className={`absolute top-1 flex h-10 w-16 items-center justify-center rounded-lg border text-[10px] font-bold ${colors.border} ${colors.soft} ${colors.text}`}
            >
              <MathFormula>{String.raw`${label}\rightarrow S`}</MathFormula>
            </motion.div>
          ))}
        </div>
        <Merge size={16} className={colors.text} />
        <span className={`text-[10px] font-bold ${colors.text}`}>{t('compressed')}</span>
      </div>
    </div>
  );
}

export function ArchitectureComparison({
  contextMode,
  onSelectContext,
  targetMode,
  activeMode,
  contextLength,
  dk,
  dv,
  state,
  step,
  phase,
  gateStrength,
  setGateStrength,
  t,
}) {
  const sharedProps = {
    contextMode,
    targetMode,
    activeMode,
    contextLength,
    dk,
    dv,
    state,
    step,
    phase,
    gateStrength,
    setGateStrength,
    t,
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label={t('architectureTitle')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <Boxes size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">{t('designLevel')}</div>
            <h2 className="mt-1 text-base font-bold text-slate-950">{t('architectureShortTitle')}</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{t('architectureLead')}</p>
          </div>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label={t('executionContext')}>
          {['decode', 'prefill'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onSelectContext(value)}
              aria-pressed={contextMode === value}
              className={`linear-focus rounded-lg px-4 py-2 text-[11px] font-bold transition ${
                contextMode === value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t(value)}
            </button>
          ))}
        </div>
      </div>

      <ComputeComparison
        key={`${targetMode}-${contextMode}-${contextLength}-${dk}-${dv}-${gateStrength}`}
        {...sharedProps}
      />
      <AddressabilityStrip {...sharedProps} />

      {(targetMode === 'gla' || targetMode === 'deltanet') && (
        <label className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
          <span>{t('gateStrength')}</span>
          <input
            aria-label={t('gateStrength')}
            type="range"
            min="0"
            max="0.9"
            step="0.05"
            value={gateStrength}
            onChange={(event) => setGateStrength(Number(event.target.value))}
            className={`w-44 cursor-pointer ${targetMode === 'deltanet' ? 'accent-emerald-700' : 'accent-cyan-700'}`}
          />
          <span className="font-mono font-bold">{Math.round(gateStrength * 100)}%</span>
        </label>
      )}

      {targetMode === 'gla' && (
        <aside className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-xs leading-relaxed text-cyan-950" data-testid="gla-paper-parameterization">
          <strong>{t('glaRelationTitle')}</strong>
          <p className="mt-1 font-semibold">{t('glaPaperTitle')}</p>
          <p>{t('glaPaperNote')}</p>
          <div className="my-1 overflow-x-auto">
            <MathFormula>{String.raw`\beta_t=\mathbf1\quad\Longrightarrow\quad (G_t)_{ij}=(\alpha_t)_i`}</MathFormula>
          </div>
          <a className="underline" href="https://arxiv.org/html/2312.06635v2#S3.SS4" target="_blank" rel="noreferrer">
            {t('glaPaperSource')}
          </a>
        </aside>
      )}

      {targetMode === 'deltanet' && (
        <aside className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950" data-testid="deltanet-mode-summary">
          <strong>{t('deltaRelationTitle')}</strong>
          <p className="mt-1">{t('deltaRelationLead')}</p>
          <div className="my-1 overflow-x-auto">
            <MathFormula>{String.raw`S_t = \alpha_t S_{t-1} + \beta_t \hat{k}_t^\top\bigl(v_t - \alpha_t \hat{k}_t S_{t-1}\bigr), \quad \|\hat{k}_t\|_2 = 1`}</MathFormula>
          </div>
        </aside>
      )}
    </section>
  );
}
