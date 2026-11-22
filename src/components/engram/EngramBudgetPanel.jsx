import React, { useState } from 'react';
import { MathFormula } from '../linear-attention/MathFormula';

const copy = {
  zh: {
    budgetTitle: '预取掩盖预算与 Zipf 分层',
    layerLabel: '插层深度',
    layer2: 'Layer 2 (浅层)',
    layer15: 'Layer 15 (深层)',
    tierLabel: '卸载介质',
    tierDram: 'Host DRAM (64 GB/s)',
    tierSsd: 'NVMe SSD (14 GB/s)',
    tierZipf: 'Zipf HBM 热表 + DRAM',
    phaseLabel: '阶段',
    phaseDecode: 'Decode (低延迟)',
    phasePrefill: 'Prefill (大批量)',
    prefetchTime: '预取耗时',
    computeWindow: '前置计算窗口',
    verdictMasked: '预取被前置计算窗口隐藏 · 无额外 GPU 停顿',
    verdictStall: 'GPU 停顿 +{ms} ms · 需下移插层深度或开启 Zipf HBM 热表',
    uTitle: '为什么 MoE 还需要 Engram？U 型稀疏分配律',
    uLead: '固定稀疏参数预算下，约 75–80% MoE（条件计算）+ 20–25% Engram（条件记忆）取得最低验证 Loss：把静态实体与固定短语卸载出早期层，释放注意力与专家容量。',
    uRatioLabel: 'Engram 参数占比 ρ',
    uPureMoe: '纯 MoE (0%)：早期层被迫用算力死记静态词组',
    uSweet: '最优区间 (≈22%)：记忆与计算分工，有效深度最大',
    uOver: '过度记忆 (>50%)：条件计算容量不足，推理退化',
  },
  en: {
    budgetTitle: 'Prefetch Hiding Budget & Zipf Tiering',
    layerLabel: 'Insertion layer',
    layer2: 'Layer 2 (shallow)',
    layer15: 'Layer 15 (deep)',
    tierLabel: 'Offload tier',
    tierDram: 'Host DRAM (64 GB/s)',
    tierSsd: 'NVMe SSD (14 GB/s)',
    tierZipf: 'Zipf HBM Hot + DRAM',
    phaseLabel: 'Phase',
    phaseDecode: 'Decode (latency)',
    phasePrefill: 'Prefill (bandwidth)',
    prefetchTime: 'Prefetch time',
    computeWindow: 'Preceding compute window',
    verdictMasked: 'Hidden behind preceding layer compute · 0 ms GPU stall',
    verdictStall: 'GPU stall +{ms} ms · move insertion deeper or enable Zipf HBM hot cache',
    uTitle: 'Why MoE Still Needs Engram: U-Shaped Allocation Law',
    uLead: 'Under a fixed sparse parameter budget, ~75–80% MoE (conditional compute) + 20–25% Engram (conditional memory) hits minimum validation loss by offloading static phrases from early layers.',
    uRatioLabel: 'Engram budget share ρ',
    uPureMoe: 'Pure MoE (0%): early layers waste compute memorizing static n-grams',
    uSweet: 'Sweet spot (≈22%): memory + compute specialization maximizes effective depth',
    uOver: 'Over-allocated (>50%): starved conditional compute degrades reasoning',
  },
};

export function deriveEngramBudget({ layer = 2, tier = 'dram', phase = 'decode' } = {}) {
  const safeLayer = layer === 15 ? 15 : 2;
  const computeWindowMs = phase === 'prefill' ? safeLayer * 0.45 : safeLayer * 0.14;
  const basePrefetchMs = {
    zipf: phase === 'prefill' ? 0.25 : 0.08,
    dram: phase === 'prefill' ? 0.95 : 0.22,
    ssd: phase === 'prefill' ? 3.8 : 0.72,
  }[tier] ?? 0.22;
  const stallMs = Math.max(0, basePrefetchMs - computeWindowMs);
  return {
    layer: safeLayer,
    tier,
    phase,
    computeWindowMs: Number(computeWindowMs.toFixed(2)),
    prefetchMs: Number(basePrefetchMs.toFixed(2)),
    stallMs: Number(stallMs.toFixed(2)),
    masked: stallMs <= 0,
  };
}

// Smooth illustrative U-shaped validation loss curve centered around rho = 22%.
export function deriveUAllocationLoss(rhoPct = 22) {
  const x = Math.max(0, Math.min(80, Number(rhoPct) || 0));
  const delta = (x - 22) / 28;
  return Number((1.72 + 0.14 * delta * delta).toFixed(3));
}

export default function EngramBudgetPanel({ lang = 'zh' }) {
  const t = (key, vars = {}) => {
    let s = copy[lang]?.[key] ?? copy.en[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, v); });
    return s;
  };
  const [layer, setLayer] = useState(2);
  const [tier, setTier] = useState('dram');
  const [phase, setPhase] = useState('decode');
  const [rho, setRho] = useState(22);

  const budget = deriveEngramBudget({ layer, tier, phase });
  const maxBar = Math.max(budget.computeWindowMs, budget.prefetchMs, 0.5);
  const loss = deriveUAllocationLoss(rho);
  const uPoints = [0, 10, 22, 35, 50, 65, 80].map((r) => ({ r, loss: deriveUAllocationLoss(r) }));
  const xOf = (r) => 28 + (r / 80) * 252;
  const yOf = (l) => 82 - ((l - 1.70) / 0.65) * 66;
  const uPath = uPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.r).toFixed(1)},${yOf(p.loss).toFixed(1)}`).join(' ');

  return (
    <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-slate-200 pt-4" data-testid="engram-budget-panel">
      {/* Left: Interactive Prefetch Hiding Budget */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-800">{t('budgetTitle')}</h3>
          <MathFormula>{String.raw`T_{\mathrm{prefetch}} \le T_{\mathrm{compute}}(L_{\mathrm{insert}})`}</MathFormula>
        </div>

        <div className="flex flex-wrap gap-2 text-[10.5px]">
          <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
            {[2, 15].map((lv) => (
              <button key={lv} type="button" data-testid={`engram-layer-${lv}`} aria-pressed={layer === lv} onClick={() => setLayer(lv)} className={`rounded px-2 py-0.5 font-bold ${layer === lv ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                {t(lv === 2 ? 'layer2' : 'layer15')}
              </button>
            ))}
          </div>
          <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
            {[['zipf', 'tierZipf'], ['dram', 'tierDram'], ['ssd', 'tierSsd']].map(([id, key]) => (
              <button key={id} type="button" data-testid={`engram-tier-${id}`} aria-pressed={tier === id} onClick={() => setTier(id)} className={`rounded px-2 py-0.5 font-bold ${tier === id ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                {t(key)}
              </button>
            ))}
          </div>
          <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
            {[['decode', 'phaseDecode'], ['prefill', 'phasePrefill']].map(([id, key]) => (
              <button key={id} type="button" data-testid={`engram-phase-${id}`} aria-pressed={phase === id} onClick={() => setPhase(id)} className={`rounded px-2 py-0.5 font-bold ${phase === id ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                {t(key)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="grid grid-cols-[6.5rem_1fr_4.2rem] items-center gap-2">
            <span className="font-semibold text-slate-600">{t('computeWindow')}</span>
            <div className="h-3 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${(budget.computeWindowMs / maxBar) * 100}%` }} /></div>
            <span className="text-right font-mono font-bold text-slate-700">{budget.computeWindowMs} ms</span>
          </div>
          <div className="grid grid-cols-[6.5rem_1fr_4.2rem] items-center gap-2">
            <span className="font-semibold text-slate-600">{t('prefetchTime')}</span>
            <div className="h-3 rounded-full bg-slate-200 overflow-hidden"><div className={`h-full rounded-full transition-all ${budget.masked ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${(budget.prefetchMs / maxBar) * 100}%` }} /></div>
            <span className="text-right font-mono font-bold text-slate-700">{budget.prefetchMs} ms</span>
          </div>
        </div>

        <div className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${budget.masked ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {budget.masked ? t('verdictMasked') : t('verdictStall', { ms: budget.stallMs })}
        </div>
      </div>

      {/* Right: U-Shaped Sparse Allocation Law */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-800">{t('uTitle')}</h3>
          <span className="font-mono text-[11px] font-bold text-indigo-700">MoE {100 - rho}% · Engram {rho}%</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">{t('uLead')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_13rem] items-center gap-3">
          <svg viewBox="0 0 300 96" className="w-full h-24 rounded-lg border border-slate-200 bg-white" role="img" aria-label={t('uTitle')}>
            <line x1="28" y1="82" x2="284" y2="82" stroke="#cbd5e1" strokeWidth="1" />
            <line x1={xOf(22)} y1="10" x2={xOf(22)} y2="82" stroke="#10b981" strokeDasharray="3 2" strokeWidth="1.2" />
            <path d={uPath} fill="none" stroke="#6366f1" strokeWidth="2.2" />
            <circle cx={xOf(rho)} cy={yOf(loss)} r="4.5" fill={rho >= 15 && rho <= 30 ? '#10b981' : '#f43f5e'} stroke="#0f172a" strokeWidth="1.2" />
            <text x="28" y="93" fontSize="8.5" fill="#64748b">0%</text>
            <text x={xOf(22)} y="93" fontSize="8.5" fill="#059669" textAnchor="middle">22% opt</text>
            <text x="280" y="93" fontSize="8.5" fill="#64748b" textAnchor="end">80%</text>
          </svg>
          <div className="space-y-1.5">
            <label className="block text-[10.5px] font-bold text-slate-700">
              {t('uRatioLabel')}: <span className="text-indigo-700">{rho}%</span>
              <input type="range" min={0} max={80} step={2} value={rho} onChange={(e) => setRho(Number(e.target.value))} className="mt-1 w-full accent-indigo-600" aria-label={t('uRatioLabel')} />
            </label>
            <div className="text-[10.5px] leading-snug text-slate-600">
              {rho < 10 ? t('uPureMoe') : rho <= 32 ? t('uSweet') : t('uOver')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
