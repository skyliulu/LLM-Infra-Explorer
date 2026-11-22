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

export function HybridStatePanel({ lang }) {
  const [cfg, setCfg] = useExperimentState('RadixCache.hybrid', { mode: 'align', sched: 'fcfs' });
  const [step, setStep] = useState(0);
  const [isPlaying, setPlaying] = useState(false);

  const t = (key) => hybridCopy[lang][key] || key;
  const m = useMemo(() => deriveHybridState(cfg.mode, step), [cfg.mode, step]);

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

  const nodeCoords = useMemo(() => {
    const colX = [8, 212, 416];
    const rowY = [8, 68, 166, 264];
    return Object.fromEntries(
      m.nodes.map((n) => {
        const pos = n.id === 'n8a' && !m.nodes.some((x) => x.id === 'n6')
          ? { col: 1, row: 2 }
          : (NODE_POS[n.id] || { col: 1, row: 0 });
        return [n.id, { x: colX[pos.col], y: rowY[pos.row], w: 194, h: n.id === 'root' ? 38 : 78 }];
      })
    );
  }, [m.nodes]);

  const graphHeight = m.nodes.some((n) => n.id === 'n6') ? 356 : 262;
  const trunkWords = HYBRID_REQUESTS[0].tokens;

  return (
    <div className="hc-hybrid" data-testid="hybrid-state-cache">
      <p>{t('intro')}</p>

      {/* Root Conflict Contrast Strip */}
      <div className="hc-conflict-grid" aria-label={t('contrastTitle')}>
        <div className="hc-conflict-card kv">
          <div className="hc-conflict-head">
            <strong>{t('kvImmutable')}</strong>
            <span>[K₀, K₁, K₂, K₃]</span>
          </div>
          <div className="hc-token-strip">
            {trunkWords.map((word, i) => (
              <span key={`${word}-${i}`} className={i < m.mutabilityPos ? 'written' : ''}>
                {word}
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
              {r.tokens.map((word, ti) => (
                <i
                  key={`${r.id}-${ti}`}
                  className={
                    r.branchAt > 0 && ti < 4
                      ? 'grid-hit'
                      : r.branchAt > 0 && ti < r.branchAt
                        ? 'mid-prefix'
                        : 'suffix'
                  }
                >
                  {word}
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
            <ArrowDownLeft size={13} /> {t('rollbackBadge')}: {m.rollback.fromTokens} → {m.rollback.toTokens}
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
            <div className="hc-hybrid-graph" style={{ width: 618, height: graphHeight }}>
              <svg width={618} height={graphHeight} aria-hidden="true">
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
                    d={`M${nodeCoords[m.rollback.fromNode].x + 194},${nodeCoords[m.rollback.fromNode].y + 34} C${nodeCoords[m.rollback.fromNode].x + 232},${nodeCoords[m.rollback.fromNode].y + 10} ${nodeCoords[m.rollback.toNode].x + 232},${nodeCoords[m.rollback.toNode].y + 55} ${nodeCoords[m.rollback.toNode].x + 194},${nodeCoords[m.rollback.toNode].y + 38}`}
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
                      {n.pages.length > 0 && <span className="hc-hn-kv">{n.pages.join(', ')}</span>}
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

          {/* Pool 1: TokenToKVPool */}
          <div className="hc-pool-card kv">
            <div className="hc-pool-head">
              <strong>{t('kvPoolTitle')}</strong>
              <b>{m.kvUsed} / {m.kvCapacity}</b>
            </div>
            <div className="hc-pool-grid kv-grid">
              {m.kvPool.map((slot, i) => (
                <div key={i} className={`hc-pool-slot ${slot ? 'filled' : 'empty'}`}>
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

          {/* Pool 2: MambaPool */}
          <div className="hc-pool-card mamba">
            <div className="hc-pool-head">
              <strong>{t('mambaPoolTitle')}</strong>
              <b>{m.mambaUsed} / {m.mambaCapacity}</b>
            </div>
            <div className="hc-pool-grid mamba-grid">
              {m.mambaPool.map((slot, i) => (
                <div
                  key={i}
                  className={`hc-pool-slot ${slot ? `filled ${slot.role}` : 'empty'} ${m.cow && m.cow.to === i ? 'cow-target' : ''}`}
                >
                  {slot ? (
                    <>
                      <small className="hc-slot-idx">{slot.id}</small>
                      <strong>{slot.label}</strong>
                      {slot.clonedFrom !== undefined && <small>← M{slot.clonedFrom}</small>}
                    </>
                  ) : (
                    <>
                      <small className="hc-slot-idx">M{i}</small>
                      <span>·</span>
                    </>
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

      {/* Live Hybrid Metrics */}
      <div className="hc-hybrid-metrics" data-testid="hybrid-metrics">
        <div>
          <span>{t('kvMatched')}</span>
          <strong>{m.metrics.kvMatched} {t('tokensUnit')}</strong>
        </div>
        <div>
          <span>{t('hybridHit')}</span>
          <strong>{m.metrics.hybridHit} {t('tokensUnit')}</strong>
        </div>
        <div className={m.metrics.rollbackRecompute > 0 ? 'warn' : 'good'}>
          <span>{t('rollbackWork')}</span>
          <strong>{m.metrics.rollbackRecompute} {t('tokensUnit')}</strong>
        </div>
        <div>
          <span>{t('cumReuse')} / {t('cumRollback')}</span>
          <strong>{m.metrics.totalHybridHit} / {m.metrics.totalRollback} {t('tokensUnit')}</strong>
        </div>
        <div>
          <span>{t('cowCount')}</span>
          <strong>{m.metrics.cowClones} {t('timesUnit')}</strong>
        </div>
      </div>

      <p className="hc-hybrid-scope">{t('scopeNote')}</p>
    </div>
  );
}

export function CacheAwareScheduling({ lang }) {
  const [cfg, setCfg] = useExperimentState('RadixCache.hybrid', { mode: 'align', sched: 'fcfs' });
  const [activeIdx, setActiveIdx] = useState(3);
  const t = (key) => hybridCopy[lang][key] || key;
  const sched = useMemo(() => deriveSchedulingComparison(cfg.sched), [cfg.sched]);
  const current = sched.trace[Math.min(activeIdx, sched.trace.length - 1)];

  return (
    <section className="hc-workbench hc-sched-section" data-testid="lpm-scheduling-panel">
      <div className="hc-sched-top">
        <div>
          <h2 data-section-anchor="hicache-scheduling" data-section-label={t('schedNavTitle')}>
            {t('schedTitle')}
          </h2>
          <p>{t('schedIntro')}</p>
        </div>
        <div className="hc-mode-tabs" role="group" aria-label={t('schedTitle')}>
          {SCHED_POLICIES.map((pol) => (
            <button
              key={pol}
              type="button"
              aria-pressed={cfg.sched === pol}
              onClick={() => { setCfg({ ...cfg, sched: pol }); setActiveIdx(3); }}
            >
              {t(pol)}
            </button>
          ))}
        </div>
      </div>

      {/* Legend of the 2 competing system prompts */}
      <div className="hc-sched-legend">
        <span className="hc-prefix-pill prefix-A">{t('schedPrefixA')} (A0, A1)</span>
        <span className="hc-prefix-pill prefix-B">{t('schedPrefixB')} (B0, B1)</span>
        <small>{t('schedQueueLabel')}</small>
      </div>

      {/* Execution timeline (clickable step cards) */}
      <div className="hc-sched-trace">
        {sched.trace.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveIdx(idx)}
            aria-pressed={activeIdx === idx}
            className={`hc-sched-card prefix-${item.prefix} ${item.thrashed ? 'thrashed' : ''} ${activeIdx === idx ? 'selected' : ''}`}
          >
            <div className="hc-sc-head">
              <b>#{idx + 1} · {item.id}</b>
              <span className={item.hitPages > 0 ? 'hit' : 'miss'}>
                {item.hitPages > 0 ? `${t('schedHitTag')} ${item.hitPages}` : `${t('schedComputeTag')} ${item.computePages}`}
              </span>
            </div>
            <div className="hc-sc-name">{t(`schedReq_${item.id}`)}</div>
            <div className="hc-sc-pages">
              {item.pages.map((p, pi) => (
                <i key={p} className={pi < item.hitPages ? 'hit' : 'miss'}>{p}</i>
              ))}
            </div>
            {item.thrashed && <small className="hc-thrash-tag">{t('schedThrashTag')}</small>}
          </button>
        ))}
      </div>

      {/* Live GPU Pool Residency for selected step */}
      {current && (
        <div className="hc-sched-gpu" aria-live="polite">
          <div className="hc-sched-gpu-head">
            <strong>#{activeIdx + 1} {current.id} ({t(`schedReq_${current.id}`)}) → {t('schedGpuTitle')}</strong>
            <span>
              {t('schedEvictedLabel')}:{' '}
              <b>{current.evicted.length > 0 ? current.evicted.join(', ') : t('schedNone')}</b>
            </span>
          </div>
          <div className="hc-sched-slots">
            {Array.from({ length: sched.capacity }, (_, i) => {
              const page = current.residentAfter[i];
              const isA = page && (page.startsWith('A') || page.startsWith('qa'));
              return (
                <div key={i} className={`hc-sched-slot ${page ? (isA ? 'prefix-A' : 'prefix-B') : 'empty'}`}>
                  <small>G{i}</small>
                  <strong>{page || '·'}</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="hc-sched-summary">
        <span>{t('schedHit')}: <b>{sched.totalHit} / {sched.totalPages}</b></span>
        <span>{t('schedCompute')}: <b>{sched.totalCompute}</b></span>
        <span>{t('schedEvict')}: <b>{sched.totalEvicted}</b></span>
        <span>{t('schedRate')}: <b>{(sched.hitRate * 100).toFixed(0)}%</b></span>
      </div>
      <p className="hc-sched-note">{t(`schedNote_${cfg.sched}`)}</p>
    </section>
  );
}

export default HybridStatePanel;
