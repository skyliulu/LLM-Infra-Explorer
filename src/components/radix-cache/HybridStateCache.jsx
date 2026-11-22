import React, { useEffect, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, ArrowDownLeft, Copy, AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import { useExperimentState } from '../../lib/ExperimentContext';
import { MathFormula } from '../linear-attention/MathFormula';
import {
  HYBRID_MODES,
  SCHED_POLICIES,
  HYBRID_REQUESTS,
  deriveHybridState,
  deriveSchedulingComparison,
} from './hybrid-state-model';
import { hybridCopy } from './hybrid-state-content';

const HYBRID_FORMULA = String.raw`L_{\mathrm{hit}}^{\mathrm{hybrid}} = \max\{t \le L_{\mathrm{hit}}^{\mathrm{KV}} : S_t \in \mathrm{MambaPool}\}`;

const NODE_POS = {
  root: { col: 1, row: 0 },
  n4: { col: 1, row: 1 },
  n6: { col: 1, row: 2 },
  n8a: { col: 0, row: 3 },
  n8b: { col: 1, row: 3 },
  n8c: { col: 2, row: 3 },
};

export default function HybridStateCache({ lang }) {
  const [cfg, setCfg] = useExperimentState('RadixCache.hybrid', { mode: 'align', sched: 'fcfs' });
  const [step, setStep] = useState(0);
  const [isPlaying, setPlaying] = useState(false);

  const t = (key) => hybridCopy[lang][key] || key;
  const m = useMemo(() => deriveHybridState(cfg.mode, step), [cfg.mode, step]);
  const sched = useMemo(() => deriveSchedulingComparison(cfg.sched), [cfg.sched]);

  useEffect(() => {
    if (!isPlaying || m.done) return undefined;
    const timer = setTimeout(() => setStep((s) => Math.min(m.limit, s + 1)), 1400);
    return () => clearTimeout(timer);
  }, [isPlaying, step, m.done, m.limit]);

  const setMode = (mode) => {
    setCfg({ ...cfg, mode });
    setPlaying(false);
    setStep(0);
  };
  const reset = () => { setPlaying(false); setStep(0); };
  const togglePlay = () => { if (m.done) setStep(0); setPlaying((v) => !v); };
  const handleNextStep = () => { setPlaying(false); setStep((s) => Math.min(m.limit, s + 1)); };

  // Compute node pixel coordinates inside a compact responsive SVG/card graph
  const nodeCoords = useMemo(() => {
    const colX = [10, 210, 410];
    const rowY = [8, 72, 166, 260];
    return Object.fromEntries(
      m.nodes.map((n) => {
        const pos = n.id === 'n8a' && !m.nodes.some((x) => x.id === 'n6')
          ? { col: 1, row: 2 }
          : (NODE_POS[n.id] || { col: 1, row: 0 });
        return [n.id, { x: colX[pos.col], y: rowY[pos.row], w: 184, h: n.id === 'root' ? 40 : 74 }];
      })
    );
  }, [m.nodes]);

  const graphHeight = m.nodes.some((n) => n.id === 'n6') ? 350 : 260;

  return (
    <section className="hc-workbench hc-hybrid" data-testid="hybrid-state-cache">
      <h2 data-section-anchor="hicache-hybrid" data-section-label={t('navTitle')}>
        {t('title')}
      </h2>
      <p>{t('intro')}</p>

      {/* Root Conflict Contrast Strip */}
      <div className="hc-conflict-grid" aria-label={t('contrastTitle')}>
        <div className="hc-conflict-card kv">
          <div className="hc-conflict-head">
            <strong>{t('kvImmutable')}</strong>
            <span>[K₀, K₁, K₂, K₃]</span>
          </div>
          <div className="hc-token-strip">
            {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'].map((tok, i) => (
              <span key={tok} className={i < m.mutabilityPos ? 'written' : ''}>
                {tok}
              </span>
            ))}
          </div>
          <small>{t('kvImmutableNote')}</small>
        </div>

        <div className="hc-conflict-card state">
          <div className="hc-conflict-head">
            <strong>{t('stateMutable')}</strong>
            <span>Sₜ ← f(Sₜ₋₁, xₜ)</span>
          </div>
          <div className="hc-state-strip">
            <span className="hc-live-slot">
              {m.mutabilityPos > 0 ? `S@${m.mutabilityPos}` : 'S@0'}
            </span>
            <span className="hc-state-arrow">← in-place</span>
            <span className="hc-ckpt-pills">
              {m.mambaPool.filter(Boolean).length > 0
                ? m.mambaPool.filter(Boolean).map((s) => (
                    <b key={s.id} className={s.role === 'extra_checkpoint' ? 'extra' : ''}>
                      {s.id}:{s.label}
                    </b>
                  ))
                : <em>—</em>}
            </span>
          </div>
          <small>{t('stateMutableNote')}</small>
        </div>
      </div>

      {/* Mode Switch + Local Playback */}
      <div className="hc-hybrid-toolbar">
        <div className="hc-mode-tabs" role="group" aria-label={t('modeLabel')}>
          {HYBRID_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={cfg.mode === mode}
              onClick={() => setMode(mode)}
            >
              {t(mode)}
            </button>
          ))}
        </div>
        <div className="chapter-playback hc-playback">
          <button type="button" onClick={reset} aria-label={lang === 'zh' ? '重置' : 'Reset'}>
            <RotateCcw size={17} />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={lang === 'zh' ? (isPlaying && !m.done ? '暂停' : '播放') : (isPlaying && !m.done ? 'Pause' : 'Play')}
          >
            {isPlaying && !m.done ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={m.done}
            aria-label={lang === 'zh' ? '下一步' : 'Next step'}
          >
            <SkipForward size={17} />
          </button>
        </div>
      </div>

      <p className="hc-hybrid-mode-hint">{t(`modeHint_${cfg.mode}`)}</p>

      {/* Request Strip + Step Banner */}
      <div className="hc-hybrid-reqs">
        {HYBRID_REQUESTS.map((r, idx) => (
          <div
            key={r.id}
            className={`hc-hybrid-req ${m.requestIndex === idx && step > 0 ? 'current' : idx < m.requestIndex ? 'passed' : ''}`}
          >
            <strong>{t(r.key)}</strong>
            <div className="hc-req-tokens">
              {r.tokens.map((tok, ti) => (
                <i
                  key={tok}
                  className={
                    r.branchAt > 0 && ti < 4
                      ? 'grid-hit'
                      : r.branchAt > 0 && ti < r.branchAt
                        ? 'mid-prefix'
                        : 'suffix'
                  }
                >
                  {tok}
                </i>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hc-hybrid-banner" aria-live="polite">
        <span className="hc-step-pill">
          {step} / {m.limit}
        </span>
        <p>{t(m.kind)}</p>
        {m.rollback && (
          <span className="hc-flag rollback">
            <ArrowDownLeft size={13} /> {t('rollbackBadge')}: t={m.rollback.fromTokens} → t={m.rollback.toTokens}
          </span>
        )}
        {m.cow && (
          <span className="hc-flag cow">
            <Copy size={13} /> {t('cowBadge')}: M{m.cow.from} → M{m.cow.to}
          </span>
        )}
      </div>

      {/* Main Hybrid Canvas: Tree + Dual Physical Pools */}
      <div className="hc-hybrid-canvas">
        <div className="hc-hybrid-tree-box">
          <h3>
            <Layers size={15} /> {t('treeTitle')}
          </h3>
          <div className="hc-graph-scroll">
            <div className="hc-hybrid-graph" style={{ width: 604, height: graphHeight }}>
              <svg width={604} height={graphHeight} aria-hidden="true">
                {m.nodes
                  .filter((n) => n.parent && nodeCoords[n.parent] && nodeCoords[n.id])
                  .map((n) => {
                    const p = nodeCoords[n.parent];
                    const c = nodeCoords[n.id];
                    const midY = p.y + p.h + (c.y - (p.y + p.h)) / 2;
                    return (
                      <path
                        key={n.id}
                        d={`M${p.x + p.w / 2},${p.y + p.h} V${midY} H${c.x + c.w / 2} V${c.y}`}
                        fill="none"
                        stroke={m.activeNodeIds.includes(n.id) ? '#6366f1' : '#94a3b8'}
                        strokeWidth="2.2"
                      />
                    );
                  })}
                {m.rollback && nodeCoords[m.rollback.fromNode] && nodeCoords[m.rollback.toNode] && (
                  <path
                    d={`M${nodeCoords[m.rollback.fromNode].x + 184},${nodeCoords[m.rollback.fromNode].y + 34} C${nodeCoords[m.rollback.fromNode].x + 225},${nodeCoords[m.rollback.fromNode].y + 10} ${nodeCoords[m.rollback.toNode].x + 225},${nodeCoords[m.rollback.toNode].y + 55} ${nodeCoords[m.rollback.toNode].x + 184},${nodeCoords[m.rollback.toNode].y + 38}`}
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                  />
                )}
              </svg>

              {m.nodes.map((n) => {
                const pos = nodeCoords[n.id];
                if (!pos) return null;
                return (
                  <div
                    key={n.id}
                    className={`hc-hybrid-node ${n.stateStatus} ${m.activeNodeIds.includes(n.id) ? 'active' : ''}`}
                    style={{ left: pos.x, top: pos.y, width: pos.w, minHeight: pos.h }}
                  >
                    <div className="hc-hn-top">
                      <strong>{n.label}</strong>
                      {n.pages.length > 0 && <span className="hc-hn-kv">KV: {n.pages.join(', ')}</span>}
                    </div>
                    {n.id !== 'root' && (
                      <div className="hc-hn-state">
                        {n.stateStatus === 'checkpoint' ? (
                          <span className="hc-state-ok">
                            <CheckCircle2 size={12} /> {t('checkpointBadge')} M{n.mambaSlot}
                          </span>
                        ) : n.stateStatus === 'evicted' ? (
                          <span className="hc-state-evicted">
                            <AlertTriangle size={12} /> {t('evictedBadge')}
                          </span>
                        ) : (
                          <span className="hc-state-miss">
                            <AlertTriangle size={12} /> {t('kvOnlyBadge')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="hc-hybrid-pools-box">
          <h3>{t('poolsTitle')}</h3>

          <div className="hc-pool-card kv">
            <div className="hc-pool-head">
              <strong>{t('kvPoolTitle')}</strong>
              <b>
                {m.kvUsed} / {m.kvCapacity}
              </b>
            </div>
            <div className="hc-pool-grid kv-grid">
              {m.kvPool.map((slot, idx) => (
                <div key={idx} className={`hc-pool-slot ${slot ? 'filled' : 'empty'} ${slot?.locked ? 'locked' : ''}`}>
                  {slot ? (
                    <>
                      <strong>{slot.id}</strong>
                      <small>{slot.tokens}</small>
                    </>
                  ) : (
                    <span>·</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="hc-pool-card mamba">
            <div className="hc-pool-head">
              <strong>{t('mambaPoolTitle')}</strong>
              <b>
                {m.mambaUsed} / {m.mambaCapacity}
              </b>
            </div>
            <div className="hc-pool-grid mamba-grid">
              {m.mambaPool.map((slot, idx) => (
                <div
                  key={idx}
                  className={`hc-pool-slot ${slot ? 'filled' : 'empty'} ${slot?.role || ''} ${m.cow?.to === idx ? 'cow-target' : ''} ${m.cow?.from === idx ? 'cow-source' : ''}`}
                >
                  <small className="hc-slot-idx">M{idx}</small>
                  {slot ? (
                    <>
                      <strong>{slot.label}</strong>
                      {slot.clonedFrom !== undefined && <small>← M{slot.clonedFrom}</small>}
                    </>
                  ) : (
                    <span>·</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="hc-hybrid-formula">
            <MathFormula block>{HYBRID_FORMULA}</MathFormula>
            <small>{t('formulaCaption')}</small>
          </div>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="hc-hybrid-metrics" data-testid="hybrid-metrics">
        <div>
          <span>{t('kvMatched')}</span>
          <strong>
            {m.metrics.kvMatched} {t('tokensUnit')}
          </strong>
        </div>
        <div>
          <span>{t('hybridHit')}</span>
          <strong>
            {m.metrics.hybridHit} {t('tokensUnit')}
          </strong>
        </div>
        <div className={m.metrics.rollbackRecompute > 0 ? 'warn' : 'good'}>
          <span>{t('rollbackWork')}</span>
          <strong>
            {m.metrics.rollbackRecompute} {t('tokensUnit')}
          </strong>
        </div>
        <div>
          <span>{t('cumReuse')} / {t('cumRollback')}</span>
          <strong>
            {m.metrics.totalHybridHit} / {m.metrics.totalRollback} {t('tokensUnit')}
          </strong>
        </div>
        <div>
          <span>{t('cowCount')}</span>
          <strong>
            {m.metrics.cowClones} {t('timesUnit')}
          </strong>
        </div>
      </div>

      {/* Companion LPM vs FCFS Scheduling Counterfactual */}
      <div className="hc-sched-panel" data-testid="lpm-scheduling-panel">
        <div className="hc-sched-head">
          <div>
            <h3>{t('schedTitle')}</h3>
            <p>{t('schedIntro')}</p>
          </div>
          <div className="hc-mode-tabs" role="group" aria-label={t('schedTitle')}>
            {SCHED_POLICIES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={cfg.sched === p}
                onClick={() => setCfg({ ...cfg, sched: p })}
              >
                {t(p)}
              </button>
            ))}
          </div>
        </div>

        <div className="hc-sched-trace">
          {sched.trace.map((row, idx) => (
            <div key={row.id} className={`hc-sched-row ${row.thrashed ? 'thrashed' : row.hitPages > 0 ? 'reused' : ''}`}>
              <div className="hc-sched-order">
                <b>#{idx + 1}</b>
                <strong>{row.id}</strong>
              </div>
              <div className="hc-sched-pages">
                {row.pages.map((p, pi) => (
                  <span key={p} className={pi < row.hitPages ? 'hit' : 'miss'}>
                    {p}
                  </span>
                ))}
              </div>
              <div className="hc-sched-verdict">
                {row.thrashed ? (
                  <span className="thrash">{t('schedThrashTag')}</span>
                ) : row.hitPages > 0 ? (
                  <span className="hit">
                    {t('schedHitTag')} {row.hitPages} / {t('schedComputeTag')} {row.computePages}
                  </span>
                ) : (
                  <span>
                    {t('schedComputeTag')} {row.computePages}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hc-sched-summary">
          <span>
            {t('schedHit')}: <b>{sched.totalHit}</b>
          </span>
          <span>
            {t('schedCompute')}: <b>{sched.totalCompute}</b>
          </span>
          <span>
            {t('schedEvict')}: <b>{sched.totalEvicted}</b>
          </span>
          <span>
            {t('schedRate')}: <b>{(sched.hitRate * 100).toFixed(0)}%</b>
          </span>
          <small>{t(`schedNote_${cfg.sched}`)}</small>
        </div>
      </div>

      <small className="hc-hybrid-scope">{t('scopeNote')}</small>
    </section>
  );
}
