import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { MathFormula } from '../linear-attention/MathFormula';
import { REQUEST_CATALOG, TOKEN_BUDGET, deriveSchedulerSnapshot } from './scheduler-model';

const copy = {
  zh: {
    title: '在线调度 · Continuous Batching 与 Chunked Prefill',
    lead: '同一批 4 条到达时间与长度不同的请求，切换静态批处理与连续分块调度，点击任意时间步观察空泡、队头阻塞与融合 Ragged Batch。',
    modeStatic: '静态批处理 (Static)',
    modeContinuous: 'Continuous + Chunked Prefill',
    reqShortQa: '短问答 (256P / 2D)',
    reqCodeGen: '代码补全 (256P / 5D)',
    reqLongDoc: '长文档总结 (1024P / 3D)',
    reqToolCall: '工具调用 (128P / 2D)',
    requestCol: '请求',
    cellPrefill: 'Prefill',
    cellChunk: 'Chunk',
    cellDecode: 'Dec',
    cellPad: 'PAD 空泡',
    cellQueued: '排队',
    cellHol: '队头阻塞',
    cellDone: '完成',
    raggedTitle: '当前 Iteration 融合批次',
    raggedStatic: '静态波次批次',
    raggedFormulaNote: '同一前向传播把 Prefill 块与 Decode Token 拼接成变长一维张量，无需填零对齐。',
    staticNote: '短请求完成后槽位空转（PAD），新到的长文档 Prefill 还会堵住同批 Decode。',
    metricMakespan: '总完成步数',
    metricBubbles: '浪费槽位 (PAD)',
    metricHol: 'Decode 最大停顿',
    metricUtil: '有效吞吐占比',
    stepUnit: '步',
    slotUnit: '槽',
    tickPrefix: '步',
    play: '播放',
    pause: '暂停',
    next: '下一步',
    reset: '重置',
    budgetLabel: '单步 Token 预算',
  },
  en: {
    title: 'Online Scheduling · Continuous Batching & Chunked Prefill',
    lead: 'Compare static batching against iteration-level continuous batching with chunked prefill on 4 requests of mixed arrivals and lengths. Click any tick to inspect bubbles, HoL stalls, and the fused ragged batch.',
    modeStatic: 'Static Batching',
    modeContinuous: 'Continuous + Chunked Prefill',
    reqShortQa: 'Short QA (256P / 2D)',
    reqCodeGen: 'Code Gen (256P / 5D)',
    reqLongDoc: 'Long Doc (1024P / 3D)',
    reqToolCall: 'Tool Call (128P / 2D)',
    requestCol: 'Request',
    cellPrefill: 'Prefill',
    cellChunk: 'Chunk',
    cellDecode: 'Dec',
    cellPad: 'PAD Bubble',
    cellQueued: 'Queued',
    cellHol: 'HoL Stall',
    cellDone: 'Done',
    raggedTitle: 'Active Iteration Fused Batch',
    raggedStatic: 'Static Wave Batch',
    raggedFormulaNote: 'One forward pass packs prefill chunks and decode tokens into a flat ragged tensor with zero padding.',
    staticNote: 'Early finishes leave idle PAD slots, while a monolithic long prefill stalls co-batched decode.',
    metricMakespan: 'Total steps',
    metricBubbles: 'Wasted PAD slots',
    metricHol: 'Max decode stall',
    metricUtil: 'Active slot util',
    stepUnit: 'steps',
    slotUnit: 'slots',
    tickPrefix: 't',
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    reset: 'Reset',
    budgetLabel: 'Per-step token budget',
  },
};

const cellStyle = (state) => {
  switch (state) {
    case 'prefill':
      return 'bg-indigo-100 border-indigo-300 text-indigo-900 font-bold';
    case 'chunk':
      return 'bg-purple-100 border-purple-300 text-purple-900 font-bold';
    case 'decode':
      return 'bg-emerald-100 border-emerald-300 text-emerald-900 font-semibold';
    case 'pad':
      return 'bg-rose-100 border-rose-300 text-rose-800 font-bold';
    case 'hol_stall':
      return 'bg-amber-100 border-amber-400 text-amber-900 font-bold';
    case 'queued':
      return 'bg-amber-50 border-amber-200 text-amber-700';
    case 'done':
      return 'bg-slate-50 border-slate-200 text-slate-400';
    default:
      return 'bg-transparent border-dashed border-slate-200 text-slate-300';
  }
};

export default function ServingScheduler({ lang = 'zh', mode, setMode, anchorId = 'sched-batch' }) {
  const t = (key) => copy[lang]?.[key] ?? copy.en[key] ?? key;
  const [tick, setTick] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);

  const snap = useMemo(() => deriveSchedulerSnapshot({ mode, tick }), [mode, tick]);
  const { activeRun, currentTick, comparison } = snap;
  const activeStats = comparison[snap.mode];
  const otherMode = snap.mode === 'continuous' ? 'static' : 'continuous';
  const otherStats = comparison[otherMode];

  useEffect(() => {
    if (!isPlaying) return undefined;
    if (snap.tick >= snap.maxTick) {
      setIsPlaying(false);
      return undefined;
    }
    const timer = setTimeout(() => setTick((v) => Math.min(snap.maxTick, v + 1)), 900);
    return () => clearTimeout(timer);
  }, [isPlaying, snap.tick, snap.maxTick]);

  const handleModeChange = (nextMode) => {
    setIsPlaying(false);
    setMode(nextMode);
    setTick(nextMode === 'static' ? 4 : 3);
  };

  const labelForCell = (cell) => {
    if (cell.state === 'chunk') return `${t('cellChunk')} ${cell.chunkIndex}`;
    if (cell.state === 'prefill') return t('cellPrefill');
    if (cell.state === 'decode') return t('cellDecode');
    if (cell.state === 'pad') return t('cellPad');
    if (cell.state === 'hol_stall') return t('cellHol');
    if (cell.state === 'queued') return t('cellQueued');
    if (cell.state === 'done') return '✓';
    return '·';
  };

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4" data-testid="llm-serving-scheduler">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[240px] flex-1">
          <h2 data-section-anchor={anchorId} className="text-lg font-semibold flex items-center gap-2 text-slate-900">
            <Layers className="text-indigo-500" size={20} />
            {t('title')}
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1 leading-relaxed max-w-4xl">{t('lead')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200" role="group" aria-label={t('title')}>
            <button
              type="button"
              data-testid="scheduler-mode-static"
              aria-pressed={snap.mode === 'static'}
              onClick={() => handleModeChange('static')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${snap.mode === 'static' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t('modeStatic')}
            </button>
            <button
              type="button"
              data-testid="scheduler-mode-continuous"
              aria-pressed={snap.mode === 'continuous'}
              onClick={() => handleModeChange('continuous')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${snap.mode === 'continuous' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t('modeContinuous')}
            </button>
          </div>

          <div className="chapter-playback">
            <button type="button" aria-label={t('reset')} title={t('reset')} onClick={() => { setIsPlaying(false); setTick(0); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
              <RotateCcw size={15} />
            </button>
            <button type="button" aria-label={t(isPlaying ? 'pause' : 'play')} title={t(isPlaying ? 'pause' : 'play')} onClick={() => { if (snap.tick >= snap.maxTick) setTick(0); setIsPlaying((p) => !p); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button type="button" aria-label={t('next')} title={t('next')} disabled={snap.tick >= snap.maxTick} onClick={() => { setIsPlaying(false); setTick((v) => Math.min(snap.maxTick, v + 1)); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-indigo-50 disabled:opacity-45">
              <SkipForward size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Gantt Slot Grid */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[620px] space-y-1.5">
          <div className="grid gap-1 items-center" style={{ gridTemplateColumns: `168px repeat(${activeRun.totalTicks}, minmax(0, 1fr))` }}>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">{t('requestCol')}</div>
            {activeRun.ticks.map((item) => (
              <button
                key={item.tick}
                type="button"
                onClick={() => { setIsPlaying(false); setTick(item.tick); }}
                className={`rounded py-1 text-center text-[10px] font-bold transition ${snap.tick === item.tick ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {t('tickPrefix')}{item.tick}
              </button>
            ))}
          </div>

          {REQUEST_CATALOG.map((req, reqIdx) => (
            <div key={req.id} className="grid gap-1 items-center" style={{ gridTemplateColumns: `168px repeat(${activeRun.totalTicks}, minmax(0, 1fr))` }}>
              <div className="px-1.5 py-1 rounded bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 truncate" title={t(req.key)}>
                <span className="font-mono text-indigo-700 mr-1">{req.id}</span>
                {t(req.key)}
              </div>
              {activeRun.ticks.map((item) => {
                const cell = item.cells[reqIdx];
                const isSelected = snap.tick === item.tick;
                return (
                  <button
                    key={item.tick}
                    type="button"
                    onClick={() => { setIsPlaying(false); setTick(item.tick); }}
                    className={`h-8 rounded border text-[9.5px] leading-tight px-0.5 transition flex items-center justify-center ${cellStyle(cell.state)} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                  >
                    {labelForCell(cell)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Readout: Ragged Batch Inspector + 4 KPI Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-between gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800">
              {snap.mode === 'continuous' ? t('raggedTitle') : t('raggedStatic')} · {t('tickPrefix')}{snap.tick}
            </span>
            <span className="text-[11px] font-semibold text-indigo-700">
              <MathFormula>{String.raw`X_{\mathrm{batch}}\in\mathbb{R}^{${currentTick.totalBatchTokens}\times d}`}</MathFormula>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {currentTick.cells.filter((c) => c.tokens > 0).map((c) => (
              <span key={c.id} className={`rounded-md border px-2 py-1 text-[10.5px] font-bold ${cellStyle(c.state)}`}>
                {c.id}: {c.tokens} tok ({labelForCell(c)})
              </span>
            ))}
            {currentTick.totalBatchTokens === 0 && (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 border-t border-slate-200 pt-2">
            <span>{snap.mode === 'continuous' ? t('raggedFormulaNote') : t('staticNote')}</span>
            {snap.mode === 'continuous' && (
              <span className="font-mono text-[10.5px] font-semibold text-purple-700 shrink-0">
                {t('budgetLabel')}: {currentTick.totalBatchTokens}/{TOKEN_BUDGET}
              </span>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-2 gap-2">
          {[
            { label: t('metricMakespan'), value: `${activeStats.makespan} ${t('stepUnit')}`, ref: `${otherStats.makespan}`, good: activeStats.makespan <= otherStats.makespan },
            { label: t('metricBubbles'), value: `${activeStats.padSlotTotal} ${t('slotUnit')}`, ref: `${otherStats.padSlotTotal}`, good: activeStats.padSlotTotal === 0 },
            { label: t('metricHol'), value: `${activeStats.maxDecodeStall} ${t('stepUnit')}`, ref: `${otherStats.maxDecodeStall}`, good: activeStats.maxDecodeStall === 0 },
            { label: t('metricUtil'), value: `${activeStats.utilizationPct}%`, ref: `${otherStats.utilizationPct}%`, good: activeStats.utilizationPct >= otherStats.utilizationPct },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex flex-col justify-center">
              <span className="text-[10px] font-semibold text-slate-500">{kpi.label}</span>
              <div className="mt-0.5 flex items-baseline justify-between gap-1">
                <strong className={`text-base font-black tabular-nums ${kpi.good ? 'text-emerald-700' : 'text-rose-700'}`}>{kpi.value}</strong>
                <span className="text-[10px] text-slate-400">vs {kpi.ref}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
