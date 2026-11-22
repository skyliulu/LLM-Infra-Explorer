import React, { useMemo } from 'react';
import { useExperimentState } from '../../lib/ExperimentContext';
import { MathFormula } from '../linear-attention/MathFormula';
import {
  FRONTIER_FORMATS,
  ROOFLINE_TOKENS,
  deriveFormatSpec,
  deriveHadamardLab,
  deriveQuantRoofline,
} from './frontier-model';
import { frontierCopy } from './frontier-content';

const HADAMARD_EQ = String.raw`X W = (X H)(H^\top W), \qquad H^\top H = I, \qquad \max_j |(xH)_j| \ll \max_j |x_j|`;
const NVFP4_EQ = String.raw`\hat{w}_{g,i} = s_{\mathrm{tensor}}^{\mathrm{FP32}} \cdot s_g^{\mathrm{E4M3}} \cdot q_{g,i}^{\mathrm{E2M1}} \quad (|g|=16)`;

export default function FrontierQuantWorkbench({ lang }) {
  const [cfg, setCfg] = useExperimentState('Quantization.frontier', {
    format: 'nvfp4',
    outlierPeak: 16,
    tokensPerStep: 512,
  });

  const t = (key) => frontierCopy[lang][key] || key;
  const spec = useMemo(() => deriveFormatSpec(cfg.format), [cfg.format]);
  const had = useMemo(() => deriveHadamardLab({ outlierPeak: cfg.outlierPeak }), [cfg.outlierPeak]);
  const roof = useMemo(() => deriveQuantRoofline(cfg.tokensPerStep), [cfg.tokensPerStep]);

  const maxBar = Math.max(had.rawPeak, 1);

  return (
    <section className="q-card q-frontier" data-testid="quant-frontier">
      <div className="q-heading">
        <div>
          <h2 data-section-anchor="quant-frontier" data-section-label={t('navTitle')}>
            <span className="q-number">05</span>
            {t('title')}
          </h2>
          <p>{t('hint')}</p>
        </div>
      </div>

      {/* Part A: Blockwise FP8 & Microscaling W4A4 */}
      <div className="q-soft q-stack" data-testid="quant-microscaling">
        <div className="q-heading" style={{ marginBottom: 4 }}>
          <h4>{t('partFormats')}</h4>
          <div className="q-tabs" role="group" aria-label={t('partFormats')}>
            {FRONTIER_FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={cfg.format === f}
                onClick={() => setCfg({ ...cfg, format: f })}
              >
                {t(f)}
              </button>
            ))}
          </div>
        </div>

        <div className="q-metrics">
          <div className="q-metric">
            <span>{t('actTile')}</span>
            <strong>{spec.actTile}</strong>
          </div>
          <div className="q-metric">
            <span>{t('weightBlock')}</span>
            <strong>{spec.weightBlock}</strong>
          </div>
          <div className="q-metric">
            <span>{t('scaleType')}</span>
            <strong>{spec.scaleType}</strong>
          </div>
          <div className="q-metric">
            <span>{t('effWeightBits')}</span>
            <strong>{spec.effectiveWeightBits.toFixed(2)} bit</strong>
          </div>
          <div className="q-metric">
            <span>{t('tcPeak')}</span>
            <strong>{spec.tensorCoreGain.toFixed(1)}× BF16</strong>
          </div>
        </div>

        <p className="q-insight">{t(spec.accumulatorNoteKey)}</p>
        {cfg.format === 'nvfp4' && <MathFormula block>{NVFP4_EQ}</MathFormula>}
      </div>

      {/* Part B: Hadamard Rotation Outlier Suppression */}
      <div className="q-soft q-stack" style={{ marginTop: 12 }} data-testid="quant-hadamard">
        <div className="q-heading" style={{ marginBottom: 4 }}>
          <div>
            <h4>{t('partHadamard')}</h4>
            <p className="q-footnote">{t('hadamardHint')}</p>
          </div>
          <label className="q-field q-range">
            <span>
              {t('outlierSlider')} <strong>{had.peak}</strong>
            </span>
            <input
              type="range"
              min="2"
              max="24"
              step="2"
              value={had.peak}
              aria-label={t('outlierSlider')}
              onChange={(e) => setCfg({ ...cfg, outlierPeak: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="q-columns">
          <div className="q-frontier-subcard">
            <div className="q-frontier-subhead">
              <strong>{t('beforeRot')}</strong>
              <span className="q-badge-warn">
                {t('mseLabel')}: {had.rawMse.toFixed(4)}
              </span>
            </div>
            <div className="q-channel-bars">
              {had.raw.map((v, i) => (
                <div key={i}>
                  <span>c{i}</span>
                  <div>
                    <i
                      style={{
                        height: `${(Math.abs(v) / maxBar) * 100}%`,
                        background: i === 0 ? '#e11d48' : '#60a5fa',
                      }}
                    />
                  </div>
                  <small>{v.toFixed(1)}</small>
                </div>
              ))}
            </div>
            <small>
              {t('peakLabel')}: <strong>{had.rawPeak.toFixed(2)}</strong>
            </small>
          </div>

          <div className="q-frontier-subcard">
            <div className="q-frontier-subhead">
              <strong>{t('afterRot')}</strong>
              <span className="q-badge-good">
                {t('mseLabel')}: {had.rotatedMse.toFixed(4)}
              </span>
            </div>
            <div className="q-channel-bars">
              {had.rotated.map((v, i) => (
                <div key={i}>
                  <span>c{i}</span>
                  <div>
                    <i
                      style={{
                        height: `${(Math.abs(v) / maxBar) * 100}%`,
                        background: '#059669',
                      }}
                    />
                  </div>
                  <small>{v.toFixed(1)}</small>
                </div>
              ))}
            </div>
            <small>
              {t('peakLabel')}: <strong>{had.rotatedPeak.toFixed(2)}</strong> · {t('peakCut')}:{' '}
              <strong>{had.peakSuppression.toFixed(2)}×</strong> · {t('mseCut')}:{' '}
              <strong>{had.mseReduction.toFixed(1)}×</strong>
            </small>
          </div>
        </div>

        <MathFormula block>{HADAMARD_EQ}</MathFormula>
      </div>

      {/* Part C: Roofline Crossover */}
      <div className="q-soft q-stack" style={{ marginTop: 12 }} data-testid="quant-roofline">
        <div className="q-heading" style={{ marginBottom: 4 }}>
          <div>
            <h4>{t('partRoofline')}</h4>
            <p className="q-footnote">{t('rooflineHint')}</p>
          </div>
          <div className="q-tabs" role="group" aria-label={t('tokensLabel')}>
            {ROOFLINE_TOKENS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={roof.tokensPerStep === m}
                onClick={() => setCfg({ ...cfg, tokensPerStep: m })}
              >
                M={m}
              </button>
            ))}
          </div>
        </div>

        <div className="q-roofline-bars">
          {roof.rows.map((row) => {
            const pct = Math.min(100, (row.speedup / 3.8) * 100);
            const isSlow = row.speedup < 1.0;
            const isBest = row.id === roof.bestId;
            return (
              <div key={row.id} className={`q-roofline-row ${isBest ? 'best' : ''}`}>
                <span className="q-rf-name">{t(row.id)}</span>
                <div className="q-rf-track">
                  <div
                    className={`q-rf-fill ${isSlow ? 'slow' : isBest ? 'best' : 'ok'}`}
                    style={{ width: `${pct}%` }}
                  />
                  <span className="q-rf-baseline" style={{ left: `${(1 / 3.8) * 100}%` }} aria-hidden="true" />
                </div>
                <strong className={`q-rf-val ${isSlow ? 'slow' : ''}`}>{row.speedup.toFixed(2)}×</strong>
                <small className="q-rf-bound">{t(`bound_${row.bound}`)}</small>
              </div>
            );
          })}
        </div>

        <p className={`q-insight ${roof.w4a16SlowerThanBf16 ? 'q-outlier-note' : ''}`}>
          {t(roof.w4a16SlowerThanBf16 ? 'w4a16Warn' : 'w4a16Win')}
        </p>
      </div>
    </section>
  );
}
