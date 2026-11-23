import React, { useEffect, useState } from 'react';
import { GPU_GENERATIONS } from './model';
import ArchDiagramSvg from './ArchDiagramSvg';

export default function ArchEvolutionSection({ config, update, t }) {
  const selected = GPU_GENERATIONS.find((g) => g.id === config.archGen) || GPU_GENERATIONS[2];
  const [activePin, setActivePin] = useState(1);
  const maxHbm = Math.max(...GPU_GENERATIONS.map((g) => g.hbmGBps));

  useEffect(() => {
    setActivePin(1);
  }, [selected.id]);

  return (
    <section className="gr-section" data-testid="gpu-evolution-section">
      <h2 data-section-anchor="gpucudagraph-evolution">{t('evoTitle')}</h2>
      <p className="gr-lead">{t('evoLead')}</p>

      <div className="gr-controls">
        <div className="gr-toggle" role="group" aria-label={t('evoTitle')}>
          {GPU_GENERATIONS.map((gen) => (
            <button
              key={gen.id}
              type="button"
              data-testid={`gpu-evo-${gen.id}`}
              aria-pressed={selected.id === gen.id}
              onClick={() => update({ archGen: gen.id })}
            >
              {gen.id.charAt(0).toUpperCase() + gen.id.slice(1)} ({gen.year})
            </button>
          ))}
        </div>
      </div>

      {/* Interactive 5-Gen HBM Scaling Strip */}
      <div className="gr-evo-strip" role="list" aria-label={t('evoHbmMetric')}>
        {GPU_GENERATIONS.map((gen) => (
          <button
            key={gen.id}
            type="button"
            className={`gr-evo-chip ${selected.id === gen.id ? 'on' : ''}`}
            onClick={() => update({ archGen: gen.id })}
          >
            <div className="gr-evo-chip-top">
              <strong>{gen.chip}</strong>
              <b>{(gen.hbmGBps / 1000).toFixed(1)} TB/s</b>
            </div>
            <div className="gr-evo-track" aria-hidden="true">
              <i style={{ width: `${Math.max(6, (gen.hbmGBps / maxHbm) * 100).toFixed(1)}%` }} />
            </div>
            <small>{gen.precision} · NVLink {gen.nvlinkGBps >= 1000 ? `${(gen.nvlinkGBps / 1000).toFixed(1)} TB/s` : `${gen.nvlinkGBps} GB/s`}</small>
          </button>
        ))}
      </div>

      {/* Main Architecture Diagram + Concrete Upgrades */}
      <div className="gr-evo-main">
        <div className="gr-evo-diagram-wrap">
          <div className="gr-evo-head">
            <strong>{selected.chip} ({selected.year})</strong>
            <span className={`gr-evo-badge ${selected.isPlatformSpec ? 'spec' : ''}`}>
              {selected.isPlatformSpec ? t('evoPlatformBadge') : `${selected.tcGen} · ${selected.precision}`}
            </span>
          </div>

          <div className="gr-code-title">{t('evoDiagramTitle')}</div>
          <div className="gr-arch-canvas">
            <ArchDiagramSvg gen={selected.id} activePin={activePin} onSelectPin={setActivePin} />
          </div>

          <div className="gr-kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div>
              <small>{t('evoPeakMetric')}</small>
              <strong>{selected.peakLabel}</strong>
            </div>
            <div>
              <small>{t('evoHbmMetric')}</small>
              <strong>{selected.hbmCap} · {(selected.hbmGBps / 1000).toFixed(1)} TB/s</strong>
            </div>
            <div>
              <small>{t('evoNvlMetric')}</small>
              <strong>{selected.nvlinkGBps >= 1000 ? `${(selected.nvlinkGBps / 1000).toFixed(1)} TB/s` : `${selected.nvlinkGBps} GB/s`}</strong>
            </div>
          </div>

          <div className="gr-evo-meta-row">
            <div className="gr-evo-item">
              <small>{t('evoSolved')}</small>
              <p>{t(`evoSolved_${selected.id}`)}</p>
            </div>
            <div className="gr-evo-item">
              <small>{t('evoSw')}</small>
              <p>{t(`evoSw_${selected.id}`)}</p>
            </div>
          </div>
        </div>

        <div className="gr-evo-upgrades">
          <div className="gr-code-title">{t('evoImprovementsTitle')}</div>
          <div className="gr-imp-list">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                type="button"
                data-testid={`gpu-evo-imp-${num}`}
                className={`gr-imp-card ${activePin === num ? 'on' : ''}`}
                onClick={() => setActivePin(num)}
              >
                <div className="gr-imp-head">
                  <span className="gr-imp-num">{num}</span>
                  <strong>{t(`evoImp${num}Title_${selected.id}`)}</strong>
                </div>
                <p>{t(`evoImp${num}Desc_${selected.id}`)}</p>
              </button>
            ))}
          </div>

          <div className="gr-evo-item trap">
            <small>{t('evoTrap')}</small>
            <p>{t(`evoTrap_${selected.id}`)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
