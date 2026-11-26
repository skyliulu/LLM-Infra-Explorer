import React, { useEffect, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, ArrowDownLeft, Copy, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
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

const HYBRID_PAGE_TOKENS = {
  K0: ['You', 'are'],
  K1: ['a', 'helpful'],
  K2: ['coding', 'assistant'],
  K3: ['Explain', 'caching'],
  K4: ['Write', 'tests'],
  K5: ['Fix', 'bugs'],
};

const SHARED_PAGES = new Set(['K0', 'K1', 'K2']);

function layoutHybridTree(nodes) {
  let leaf = 0;
  const out = [];
  const heights = [];
  const visit = (n, depth) => {
    const children = nodes.filter((c) => c.parent === n.id);
    const xs = children.map((c) => visit(c, depth + 1));
    const x = xs.length ? (xs[0] + xs.at(-1)) / 2 : leaf++ * 204 + 12;
    const height = n.pages.length ? 46 + n.pages.length * 52 : 36;
    heights[depth] = Math.max(heights[depth] || 0, height);
    out.push({ ...n, x, depth, height });
    return x;
  };
  visit(nodes[0], 0);
  out.forEach((n) => {
    n.y = 12 + heights.slice(0, n.depth).reduce((sum, h) => sum + h + 30, 0);
  });
  return {
    nodes: out,
    width: Math.max(360, leaf * 204 + 24),
    height: Math.max(...out.map((n) => n.y + n.height)) + 20,
  };
}

export function HybridStatePanel({ lang }) {
  const [cfg, setCfg] = useExperimentState('RadixCache.hybrid', { mode: 'align', sched: 'fcfs' });
  const [step, setStep] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [selectedPage, setSelectedPage] = useState('K0');

  const t = (key) => hybridCopy[lang][key] || key;
  const m = useMemo(() => deriveHybridState(cfg.mode, step), [cfg.mode, step]);
  const graph = useMemo(() => layoutHybridTree(m.nodes), [m.nodes]);
  const activeReq = HYBRID_REQUESTS[m.requestIndex] || HYBRID_REQUESTS[0];

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

  const reqStartStep = (idx) => {
    const found = m.history.findIndex((h) => h.requestIndex === idx && h.step > 0);
    return found >= 0 ? found : 0;
  };

  const relatedPages = m.nodes.find((n) => n.pages.includes(selectedPage))?.pages || [selectedPage];
  const selectedNode = m.nodes.find((n) => n.pages.includes(selectedPage));
  const selectedKvIdx = m.kvPool.findIndex((slot) => slot?.id === selectedPage);
  const selectedMambaSlot = selectedNode && selectedNode.mambaSlot !== null ? m.mambaPool[selectedNode.mambaSlot] : null;

  const pageAction = (pageId, pageIdx) => {
    if (step === 0) return { cls: '', label: t('routeCompute') };
    if (m.requestIndex === 0) return { cls: 'miss', label: t('routeCompute') };
    const tokEnd = (pageIdx + 1) * 2;
    if (tokEnd <= m.metrics.hybridHit) return { cls: 'gpu', label: t('routeReuse') };
    if (tokEnd <= m.metrics.kvMatched) return { cls: 'miss', label: t('routeRollback') };
    return { cls: 'host', label: t('routeCompute') };
  };

  const fromNode = m.rollback ? graph.nodes.find((n) => n.id === m.rollback.fromNode) : null;
  const toNode = m.rollback ? graph.nodes.find((n) => n.id === m.rollback.toNode) : null;

  return (
    <div data-testid="hybrid-state-cache">
      {/* Same .hc-engine-settings control bar as Pure KV mode */}
      <details className="hc-engine-settings">
        <summary>{t('modeLabel')}</summary>
        <div className="hc-controls">
          <label>
            {t('modeLabel')}
            <select value={cfg.mode} onChange={(e) => setMode(e.target.value)}>
              {HYBRID_MODES.map((mode) => (
                <option key={mode} value={mode}>{t(mode)}</option>
              ))}
            </select>
          </label>
          <p className="hc-hybrid-policy-note">{t(`modeHint_${cfg.mode}`)}</p>
        </div>
      </details>

      {/* Same .hc-sequences / .hc-token-stream per-token chip strip as Pure KV mode */}
      <div className="hc-sequences">
        <h3>{t('sequenceTitle')}</h3>
        <div className="hc-sequence-scroll">
          <div className="hc-stream hc-token-stream" aria-label={t('sequenceTitle')}>
            {HYBRID_REQUESTS.map((r, i) => {
              const sharedPages = Math.floor(r.branchAt / 2);
              const isCurrent = m.requestIndex === i && step > 0;
              const isPassed = i < m.requestIndex;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={isPassed ? 'passed' : isCurrent ? 'current' : ''}
                  onClick={() => { setPlaying(false); setStep(reqStartStep(i)); }}
                  aria-pressed={isCurrent}
                >
                  <span className="hc-request-label"><b>0{i + 1} · {t(r.key)}</b></span>
                  {r.pages.map((pid, index) => (
                    <span
                      key={pid}
                      className={`hc-request-page ${index < sharedPages ? 'shared' : 'suffix'} ${index === sharedPages && i > 0 ? 'branch-boundary' : ''} ${relatedPages.includes(pid) ? 'linked' : ''}`}
                    >
                      <span className="hc-word-pair">
                        {(HYBRID_PAGE_TOKENS[pid] || []).map((word, j) => (
                          <i key={j}>{word}</i>
                        ))}
                      </span>
                    </span>
                  ))}
                  <span className="hc-prefix-count">{r.branchAt} Token</span>
                </button>
              );
            })}
          </div>
        </div>
        <small>{t('tokenNote')}</small>
      </div>

      {/* Same .hc-play-row playback bar as Pure KV mode */}
      <div className="hc-play-row">
        <div>
          <strong>{t(activeReq.key)}</strong>
          <progress value={step} max={m.limit} aria-label={t('modeLabel')} />
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

      {/* Same .hc-story-canvas layout: Action bar + Left Tree + Right Pools + Bottom Route & Inspector */}
      <div className="hc-story-canvas">
        <div className="hc-canvas-action" aria-live="polite">
          <strong>{step} / {m.limit} · {t(activeReq.key)}</strong>
          <span>{t('kvMatched')}: {m.metrics.kvMatched} Token · {t('hybridHit')}: {m.metrics.hybridHit} Token</span>
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
          <small className="hc-op-note">{t(m.kind)}</small>
        </div>

        {/* Left: Logical Radix Tree using the EXACT same .hc-graph-node + .hc-word-pair token chips */}
        <div className="hc-story-tree">
          <h3>{t('treeTitle')}</h3>
          <small>{t('treeHint')}</small>
          <div className="hc-graph-scroll">
            <div className="hc-graph" style={{ width: graph.width, height: graph.height }}>
              <svg width={graph.width} height={graph.height} aria-hidden="true">
                {graph.nodes.filter((n) => n.parent).map((n) => {
                  const p = graph.nodes.find((x) => x.id === n.parent);
                  if (!p) return null;
                  return (
                    <path
                      key={n.id}
                      d={`M${p.x + 90},${p.y + p.height} V${p.y + p.height + 15} H${n.x + 90} V${n.y}`}
                      fill="none"
                      stroke={m.activeNodeIds.includes(n.id) ? '#6366f1' : '#94a3b8'}
                      strokeWidth="2.5"
                    />
                  );
                })}
                {fromNode && toNode && (
                  <path
                    d={`M${fromNode.x + 180},${fromNode.y + fromNode.height / 2} C${fromNode.x + 216},${fromNode.y} ${toNode.x + 216},${toNode.y + toNode.height} ${toNode.x + 180},${toNode.y + toNode.height / 2}`}
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                  />
                )}
              </svg>

              {graph.nodes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`hc-graph-node ${n.pages.includes(selectedPage) ? 'selected' : ''} ${m.activeNodeIds.includes(n.id) ? 'active' : ''} ${n.stateStatus === 'kv_only' ? 'hc-node-kvonly' : n.stateStatus === 'evicted' ? 'hc-node-evicted' : ''}`}
                  style={{ left: n.x, top: n.y, height: n.height }}
                  onClick={() => n.pages.length && setSelectedPage(n.pages[0])}
                >
                  {!n.pages.length && <strong>{t('root')}</strong>}
                  {n.pages.map((pid) => (
                    <span className="hc-token-node-row" key={pid}>
                      <span className={`hc-word-pair ${SHARED_PAGES.has(pid) ? 'shared' : 'suffix'}`}>
                        {(HYBRID_PAGE_TOKENS[pid] || []).map((word, j) => (
                          <i key={j}>{word}</i>
                        ))}
                      </span>
                      <span className="hc-residency">
                        <b>{pid}</b>
                        <i className="gpu">KV</i>
                        {n.kvRef > 0 && <Lock size={10} />}
                      </span>
                    </span>
                  ))}
                  {n.id !== 'root' && (
                    <span className="hc-hn-state">
                      {n.stateStatus === 'checkpoint' ? (
                        <span className="hc-state-ok"><CheckCircle2 size={11} /> {t('checkpointBadge')} M{n.mambaSlot}</span>
                      ) : n.stateStatus === 'evicted' ? (
                        <span className="hc-state-evicted"><AlertTriangle size={11} /> {t('evictedBadge')}</span>
                      ) : (
                        <span className="hc-state-miss"><AlertTriangle size={11} /> {t('kvOnlyBadge')}</span>
                      )}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {m.nodes.length === 1 && <p>{t('idle')}</p>}
        </div>

        {/* Right: Dual Physical Pools using the EXACT same .hc-tier / .hc-slots language */}
        <div className="hc-story-pools">
          <div className="hc-tier gpu">
            <div className="hc-tier-heading">
              <span><strong>{t('kvPoolTitle')}</strong><small>{t('kvScope')}</small></span>
              <b>{m.kvUsed}/{m.kvCapacity}</b>
            </div>
            <div className="hc-slots">
              {m.kvPool.map((slot, i) => slot ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedPage(slot.id)}
                  className={`${relatedPages.includes(slot.id) ? 'selected' : ''}`}
                  title={slot.tokens}
                >
                  <strong>{slot.id}</strong>
                  <small>G{i}</small>
                  {slot.locked && <Lock size={10} />}
                </button>
              ) : (
                <span className="hc-slot-empty" key={i}>·</span>
              ))}
            </div>
          </div>

          <div className={`hc-transfer ${m.cow || m.rollback ? 'moving' : ''}`}>
            {t('transferBridge')}
          </div>

          <div className="hc-tier host">
            <div className="hc-tier-heading">
              <span><strong>{t('mambaPoolTitle')}</strong><small>{t('mambaScope')}</small></span>
              <b>{m.mambaUsed}/{m.mambaCapacity}</b>
            </div>
            <div className="hc-slots hc-slots-3">
              {m.mambaPool.map((slot, i) => slot ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const owner = m.nodes.find((n) => n.id === slot.nodeId);
                    if (owner?.pages.length) setSelectedPage(owner.pages[0]);
                  }}
                  className={`${selectedMambaSlot?.id === slot.id ? 'selected' : ''} ${m.cow && m.cow.to === i ? 'arrived' : ''}`}
                >
                  <strong>{slot.label}</strong>
                  <small>{slot.id}{slot.clonedFrom !== undefined ? ` ←M${slot.clonedFrom}` : ''}</small>
                  {slot.locked && <Lock size={10} />}
                </button>
              ) : (
                <span className="hc-slot-empty" key={i}>M{i} ·</span>
              ))}
            </div>
          </div>

          <div className="hc-hybrid-formula" style={{ marginTop: 10 }}>
            <MathFormula block>{HYBRID_FORMULA}</MathFormula>
            <small>{t('formulaCaption')}</small>
          </div>
        </div>

        {/* Bottom: Same .hc-story-bottom route strip + metrics + clickable inspector */}
        <div className="hc-story-bottom">
          <div>
            <h3>{t('planTitle')}</h3>
            <div className="hc-route-strip">
              {activeReq.pages.map((pid, idx) => {
                const act = pageAction(pid, idx);
                return (
                  <button key={pid} type="button" className={act.cls} onClick={() => setSelectedPage(pid)}>
                    <b>{pid} · {(HYBRID_PAGE_TOKENS[pid] || []).join(' ')}</b>
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="hc-story-metrics" data-testid="hybrid-metrics">
              <span>{t('kvMatched')} <b>{m.metrics.kvMatched}</b> {t('tokensUnit')}</span>
              <span>{t('hybridHit')} <b>{m.metrics.hybridHit}</b> {t('tokensUnit')}</span>
              <span>{t('rollbackWork')} <b>{m.metrics.rollbackRecompute}</b> {t('tokensUnit')}</span>
              <span>{t('cowCount')} <b>{m.metrics.cowClones}</b> {t('timesUnit')}</span>
            </div>
          </div>
          <div className="hc-inspector" aria-live="polite">
            <h3>{t('selectedTitle')} · {(HYBRID_PAGE_TOKENS[selectedPage] || []).join(' ')} · {selectedPage}</h3>
            <p>
              {selectedKvIdx >= 0
                ? `${t('kvPoolTitle')} [G${selectedKvIdx}] · ${
                    selectedNode?.stateStatus === 'checkpoint'
                      ? `${t('checkpointBadge')} M${selectedNode.mambaSlot} (${selectedMambaSlot?.label || ''})`
                      : selectedNode?.stateStatus === 'evicted'
                        ? t('evictedBadge')
                        : t('kvOnlyBadge')
                  }`
                : t('notResident')}
            </p>
            <small>{t('traceHint')}</small>
          </div>
        </div>
      </div>

      <p>{t('scopeNote')}</p>
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

      <div className="hc-sched-legend">
        <span className="hc-prefix-pill prefix-A">{t('schedPrefixA')} (A0, A1)</span>
        <span className="hc-prefix-pill prefix-B">{t('schedPrefixB')} (B0, B1)</span>
        <small>{t('schedQueueLabel')}</small>
      </div>

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
