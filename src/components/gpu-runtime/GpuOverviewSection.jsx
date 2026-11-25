import React, { useMemo, useState } from 'react';
import { ArrowDownRight } from 'lucide-react';
import { deriveGpuOverview } from './model';
import GpuOverviewSvg from './GpuOverviewSvg';

export default function GpuOverviewSection({ t }) {
  const [activeNode, setActiveNode] = useState('sm_array');
  const [traceStep, setTraceStep] = useState(0);
  const [activeMapId, setActiveMapId] = useState(null);

  const overview = useMemo(
    () => deriveGpuOverview({ activeNode, traceStep, activeMapId }),
    [activeNode, traceStep, activeMapId]
  );

  const handleSelectNode = (id) => {
    setTraceStep(0);
    setActiveMapId(null);
    setActiveNode(id);
  };

  const handleSelectTrace = (step) => {
    setActiveMapId(null);
    setTraceStep(step);
  };

  const handleSelectMap = (entry) => {
    setTraceStep(0);
    setActiveMapId(entry.id);
    setActiveNode(entry.focusNode);
  };

  const jumpToAnchor = (anchor) => {
    const el = document.querySelector(`[data-section-anchor="${anchor}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const { node, trace, philosophy } = overview;

  return (
    <section className="gr-section" data-testid="gpu-overview-section">
      <h2 data-section-anchor="gpucudagraph-overview" data-section-label={t('ovNavLabel')}>
        {t('ovTitle')}
      </h2>
      <p className="gr-lead">{t('ovLead')}</p>

      {/* Compact CPU vs GPU Silicon Die Allocation Contrast */}
      <div className="gr-ov-phil-grid" aria-label={t('ovPhilTitle')}>
        <div className="gr-ov-phil-card">
          <div className="gr-ov-phil-head">
            <strong>{t('ovPhilCpuTitle')}</strong>
            <span>{t('ovPhilCpuGoal')}</span>
          </div>
          <div className="gr-ov-phil-bar" aria-hidden="true">
            <i className="ctrl" style={{ width: `${philosophy.cpu.controlPct}%` }}>{t('ovBarCtrl')}</i>
            <i className="cache" style={{ width: `${philosophy.cpu.cachePct}%` }}>{t('ovBarCache')}</i>
            <i className="alu" style={{ width: `${philosophy.cpu.computePct}%` }}>{t('ovBarAlu')}</i>
          </div>
          <p>{t('ovPhilCpu')}</p>
        </div>

        <div className="gr-ov-phil-card gpu">
          <div className="gr-ov-phil-head">
            <strong>{t('ovPhilGpuTitle')}</strong>
            <span>{t('ovPhilGpuGoal')}</span>
          </div>
          <div className="gr-ov-phil-bar" aria-hidden="true">
            <i className="ctrl" style={{ width: `${philosophy.gpu.controlPct}%` }} />
            <i className="cache" style={{ width: `${philosophy.gpu.cachePct}%` }} />
            <i className="alu gpu" style={{ width: `${philosophy.gpu.computePct}%` }}>{t('ovBarSm')}</i>
          </div>
          <p>{t('ovPhilGpu')}</p>
        </div>
      </div>

      {/* Balanced 2-Column Stage: Left Diagram | Right Reactive Spec Inspector */}
      <div className="gr-ov-main">
        <div className="gr-ov-diagram-card">
          <div className="gr-ov-toolbar">
            <span className="gr-ctrl-label">{t('ovTraceLabel')}</span>
            <div className="gr-toggle" role="group" aria-label={t('ovTraceLabel')}>
              {overview.traceSteps.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  data-testid={`gpu-ov-trace-${st.step}`}
                  aria-pressed={trace.step === st.step}
                  onClick={() => handleSelectTrace(st.step)}
                >
                  {t(`ovTrace_${st.id}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="gr-svg-wrap gr-ov-canvas">
            <GpuOverviewSvg overview={overview} onSelectNode={handleSelectNode} t={t} />
          </div>
        </div>

        <aside className="gr-ov-inspector" data-testid="gpu-ov-inspector">
          <div className="gr-ov-card">
            {trace.step > 0 && (
              <div className="gr-ov-trace-inline">
                <span className="gr-ov-trace-tag">{t('ovTraceStepBadge')} {trace.step}/4</span>
                <strong>{t(`ovTraceTitle_${trace.id}`)}</strong>
                <p>{t(`ovTraceDesc_${trace.id}`)}</p>
              </div>
            )}

            <div className="gr-ov-card-head">
              <div>
                <span className={`gr-ov-tier ${node.tier}`}>
                  {t(node.tier === 'macro' ? 'ovTierMacro' : 'ovTierSm')}
                </span>
                <h3>{t(`ovNodeTitle_${node.id}`)}</h3>
              </div>
              <span className="gr-ov-spec">{node.spec}</span>
            </div>

            <dl className="gr-ov-dl">
              <div>
                <dt>{t('ovWhatLabel')}</dt>
                <dd>{t(`ovNodeWhat_${node.id}`)}</dd>
              </div>
              <div>
                <dt>{t('ovLlmLabel')}</dt>
                <dd>{t(`ovNodeLlm_${node.id}`)}</dd>
              </div>
            </dl>

            {/* Reactive Hardware Path Context (Upstream -> Current -> Downstream) */}
            <div className="gr-ov-path-box">
              <small>{t('ovPathLabel')}</small>
              <div className="gr-ov-path-chain">
                {node.prev && (
                  <>
                    <button type="button" className="gr-ov-path-btn" onClick={() => handleSelectNode(node.prev)}>
                      {t(`ovShort_${node.prev}`)}
                    </button>
                    <span className="gr-ov-path-sep" aria-hidden="true">→</span>
                  </>
                )}
                <span className="gr-ov-path-cur">{t(`ovShort_${node.id}`)}</span>
                {node.next && (
                  <>
                    <span className="gr-ov-path-sep" aria-hidden="true">→</span>
                    <button type="button" className="gr-ov-path-btn" onClick={() => handleSelectNode(node.next)}>
                      {t(`ovShort_${node.next}`)}
                    </button>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              className="gr-ov-jump"
              data-testid="gpu-ov-jump"
              onClick={() => jumpToAnchor(node.anchor)}
            >
              <span>{t('ovDeepDivePrefix')} · {t(`ovAnchor_${node.anchor}`)}</span>
              <ArrowDownRight size={14} aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>

      {/* Compact Full-Width 4-Tier CUDA Software -> GPU Hardware Mapping */}
      <div className="gr-ov-map-box">
        <div className="gr-ov-map-hdr">{t('ovMapTitle')}</div>
        <div className="gr-ov-map-grid">
          {overview.mappings.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              data-testid={`gpu-ov-map-${m.id}`}
              aria-pressed={overview.activeMapId === m.id}
              className={`gr-ov-map-row ${overview.activeMapId === m.id ? 'on' : ''}`}
              onClick={() => handleSelectMap(m)}
            >
              <span className="gr-ov-map-idx">{idx + 1}</span>
              <div className="gr-ov-map-body">
                <div className="gr-ov-map-line">
                  <strong>{t(`ovMapSw_${m.id}`)}</strong>
                  <span className="gr-ov-map-hw">→ {t(`ovMapHw_${m.id}`)}</span>
                </div>
                <small>{t(`ovMapDesc_${m.id}`)}</small>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
