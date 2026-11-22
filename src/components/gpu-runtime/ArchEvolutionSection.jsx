import React from 'react';
import { GPU_GENERATIONS } from './model';

export default function ArchEvolutionSection({ config, update, t }) {
  const selected = GPU_GENERATIONS.find((g) => g.id === config.archGen) || GPU_GENERATIONS[2];
  const maxHbm = Math.max(...GPU_GENERATIONS.map((g) => g.hbmGBps));

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

      <div className="gr-evo-grid">
        <div className="gr-evo-bars">
          {GPU_GENERATIONS.map((gen) => (
            <button
              key={gen.id}
              type="button"
              className={`gr-evo-row ${selected.id === gen.id ? 'on' : ''}`}
              onClick={() => update({ archGen: gen.id })}
            >
              <div>
                <strong>{gen.chip}</strong>
                <small>{gen.precision} · {gen.tcGen}</small>
              </div>
              <div className="gr-evo-track" aria-hidden="true">
                <i style={{ width: `${Math.max(8, (gen.hbmGBps / maxHbm) * 100).toFixed(1)}%` }} />
              </div>
              <b>{(gen.hbmGBps / 1000).toFixed(1)} TB/s</b>
            </button>
          ))}
        </div>

        <div className="gr-evo-card">
          <div className="gr-evo-head">
            <strong>{selected.chip} ({selected.year})</strong>
            <span className={`gr-evo-badge ${selected.isPlatformSpec ? 'spec' : ''}`}>
              {selected.isPlatformSpec ? t('evoPlatformBadge') : `${selected.peakLabel} · NVLink ${selected.nvlinkGBps} GB/s`}
            </span>
          </div>

          <div className="gr-kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div>
              <small>{t('evoPeakMetric')}</small>
              <strong>{selected.peakLabel}</strong>
            </div>
            <div>
              <small>{t('evoHbmMetric')}</small>
              <strong>{(selected.hbmGBps / 1000).toFixed(2)} TB/s</strong>
            </div>
            <div>
              <small>{t('evoNvlMetric')}</small>
              <strong>{selected.nvlinkGBps} GB/s</strong>
            </div>
          </div>

          <div className="gr-evo-item">
            <small>{t('evoSolved')}</small>
            <p>{t(`evoSolved_${selected.id}`)}</p>
          </div>
          <div className="gr-evo-item">
            <small>{t('evoHw')}</small>
            <p>{t(`evoHw_${selected.id}`)}</p>
          </div>
          <div className="gr-evo-item">
            <small>{t('evoSw')}</small>
            <p>{t(`evoSw_${selected.id}`)}</p>
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
