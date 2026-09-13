import { Braces, Info, Variable } from 'lucide-react';
import { MathFormula } from './MathFormula';
import { getStageCopy } from './content';

export function Inspector({ mode, step, state, t }) {
  const copy = getStageCopy(mode, step, t);
  const formula = mode === 'gla' && step === 0
    ? String.raw`\begin{aligned}\alpha_t&=\sigma(W_\alpha x_t)\\\beta_t&=\sigma(W_\beta x_t)\\G_t&=\alpha_t^\top\beta_t\end{aligned}`
    : copy.formula;
  return (
    <aside className="linear-inspector rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
      <div className="p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600"><Info size={13}/>{t('principle')}</div>
        <h3 className="mt-1 text-sm font-bold leading-5 text-slate-950">{copy.title}</h3>
        <p className="mt-1 text-[11px] leading-4">{copy.lead}</p>
      </div>
      <div className="border-t border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><Variable size={13}/>{t('equation')}</div>
        <div className="my-1 overflow-x-auto rounded-lg bg-indigo-50 px-2 py-1 text-center text-indigo-950"><MathFormula block>{formula}</MathFormula></div>
        <ul className="space-y-1 text-[11px] leading-4">{copy.variables.map(item=><li key={item}>{item}</li>)}</ul>
      </div>
      <div className="border-t border-slate-200 bg-[#0d1117] px-3 py-2 text-slate-300">
        <div className="mb-1 flex items-center gap-2 text-[10px] font-bold"><Braces size={13}/>{t('pseudocode')}</div>
        <div className="font-mono text-[10px] leading-4">{copy.code.map((line,index)=><div key={index} className={`whitespace-pre-wrap break-words border-l-2 px-2 py-0.5 ${index===copy.activeLine?'border-amber-400 bg-amber-400/10 text-amber-100':'border-transparent text-slate-400'}`}>{line}</div>)}</div>
      </div>
      <div className="rounded-b-xl border-t border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-950">
        <strong className="mr-1">{t('boundary')}</strong>{copy.boundary}
      </div>
    </aside>
  );
}
