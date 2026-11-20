import React from 'react';
import {MathFormula} from '../linear-attention/MathFormula';
import {KV_BYTES_PER_TOKEN, MEDIA, PAGE_TOKENS, READOUT, SERIES_TOKENS, deriveEconomics} from './model';
import {fmtMs, fmtTokens} from './format';

const W = 340;
const H = 212;
const box = {left: 40, right: 330, top: 16, bottom: 148};
const xFor = tokens => box.left + ((Math.log2(tokens) - Math.log2(SERIES_TOKENS[0])) / (Math.log2(SERIES_TOKENS.at(-1)) - Math.log2(SERIES_TOKENS[0]))) * (box.right - box.left);
const fmtBandwidth = value => `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} GB/s`;
const fmtFactor = ratio => {
  const factor = ratio >= 1 ? ratio : (ratio > 0 ? 1 / ratio : 0);
  return `${factor < 1.1 ? factor.toFixed(2) : factor.toFixed(1)}×`;
};

export default function Economics({t, config, setConfig}) {
  const m = deriveEconomics(config);
  const max = m.maxUs * 1.12;
  const yFor = us => box.bottom - (us / max) * (box.bottom - box.top);
  const path = key => m.series.map((point, index) => `${index === 0 ? 'M' : 'L'}${xFor(point.tokens).toFixed(1)},${yFor(point[key]).toFixed(1)}`).join(' ');
  const crossing = Number.isFinite(m.breakEvenTokens) && m.breakEvenTokens >= SERIES_TOKENS[0] && m.breakEvenTokens <= SERIES_TOKENS.at(-1);
  const current = m.series.find(point => point.tokens === config.hitTokens) || {compute: m.computeUs, fetch: m.fetchUs};
  const floor = Number.isFinite(m.bandwidthFloor) ? m.bandwidthFloor : Infinity;
  const labels = {gain: t('verdictGain'), marginal: t('verdictMarginal'), loss: t('verdictLoss'), skipped: t('verdictSkipped')};
  const verdictDesc = m.verdict === 'loss'
    ? t(m.lossCause === 'lookup' ? 'verdict_loss_lookup' : 'verdict_loss')
    : t(`verdict_${m.verdict}`);
  const set = patch => setConfig({...config, ...patch});

  const xThresh = xFor(256);
  const xBreak = crossing ? xFor(m.breakEvenTokens) : -999;
  const nearThreshold = crossing && Math.abs(xBreak - xThresh) < 108;
  const nearRight = crossing && xBreak > box.right - 95;

  return (
    <section className="mk-section">
      <h2 data-section-anchor="mooncake-cost">{t('s3Title')}</h2>
      <p className="mk-lead">{t('s3Lead')}</p>

      <div className="mk-controls">
        <div className="mk-toggle" role="group" aria-label={t('medium')}>
          {MEDIA.map(item => (
            <button key={item.id} type="button" aria-pressed={config.medium === item.id} onClick={() => set({medium: item.id})}>
              {t(`medium_${item.id}`)}
            </button>
          ))}
        </div>
        <label className="mk-slider">
          <span>{t('hitTokens')}</span>
          <input type="range" min={0} max={SERIES_TOKENS.length - 1} step={1} value={Math.max(0, SERIES_TOKENS.indexOf(config.hitTokens))} onChange={event => set({hitTokens: SERIES_TOKENS[Number(event.target.value)]})} aria-label={t('hitTokens')}/>
          <b>{fmtTokens(config.hitTokens)} {t('tokensUnit')}</b>
        </label>
        <label className="mk-slider">
          <span>{t('prefillRate')}</span>
          <input type="range" min={4000} max={24000} step={1000} value={config.prefillRate} onChange={event => set({prefillRate: Number(event.target.value)})} aria-label={t('prefillRate')}/>
          <b>{fmtTokens(config.prefillRate)} /s</b>
        </label>
      </div>

      <div className="mk-econ">
        <div className="mk-econ-main">
          <div className="mk-cards">
            <div><small>{t('computeLabel')}</small><strong>{fmtMs(m.computeMs)}</strong></div>
            <div><small>{t('fetchLabel')}</small><strong>{fmtMs(m.fetchMs)}</strong></div>
            <div className={m.savingMs >= 0 ? 'gain' : 'loss'}><small>{t('savingLabel')}</small><strong>{m.savingMs >= 0 ? '+' : '−'}{fmtMs(Math.abs(m.savingMs))}</strong></div>
            <div><small>{m.ratio >= 1 ? t('speedupLabel') : t('slowdownLabel')}</small><strong>{fmtFactor(m.ratio)}</strong></div>
          </div>

          <div className="mk-chart">
            <h3>{t('formulaTitle')}</h3>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t('axisX')} / ${t('axisY')}`}>
              <rect className="mk-zone" x={box.left} y={box.top} width={Math.max(0, xThresh - box.left)} height={box.bottom - box.top}/>
              {[0, 0.5, 1].map(part => {
                const value = max * part;
                return (
                  <g key={part}>
                    <line className="mk-gridline" x1={box.left} x2={box.right} y1={yFor(value)} y2={yFor(value)}/>
                    <text className="mk-axis" x={4} y={yFor(value) + 4}>{Math.round(value)} µs</text>
                  </g>
                );
              })}
              {[8, 64, 512, 4096, 8192].map(tokens => (
                <text className="mk-axis" key={tokens} x={xFor(tokens)} y={H - 34} textAnchor="middle">{tokens}</text>
              ))}
              <text className="mk-axis" x={box.left} y={H - 18}>{t('axisX')}</text>
              <line className="mk-marker threshold" x1={xThresh} x2={xThresh} y1={box.top} y2={box.bottom}/>
              <text className="mk-axis" x={xThresh + 4} y={box.top + 9}>{t('thresholdLine')}</text>
              {crossing && (
                <g>
                  <line className="mk-marker break-even" x1={xBreak} x2={xBreak} y1={box.top} y2={box.bottom}/>
                  <text
                    className="mk-axis"
                    x={nearRight ? xBreak - 4 : xBreak + 3}
                    y={nearThreshold ? box.top + 22 : box.top + 9}
                    textAnchor={nearRight ? 'end' : 'start'}
                  >
                    {`${t('breakEven')} ≈ ${Math.round(m.breakEvenTokens)}`}
                  </text>
                </g>
              )}
              <path className="mk-line compute" d={path('compute')}/>
              <path className="mk-line fetch" d={path('fetch')}/>
              <line className="mk-cursor" x1={xFor(config.hitTokens)} x2={xFor(config.hitTokens)} y1={box.top} y2={box.bottom}/>
              <circle className="mk-dot compute on" cx={xFor(config.hitTokens)} cy={yFor(current.compute)} r={3.4}/>
              <circle className="mk-dot fetch on" cx={xFor(config.hitTokens)} cy={yFor(current.fetch)} r={3.4}/>
            </svg>
            <div className="mk-legend">
              <span><i className="compute"/>{t('computeLabel')}</span>
              <span><i className="fetch"/>{t('fetchLabel')}</span>
            </div>
            <small className="mk-note">{Number.isFinite(m.breakEvenTokens) ? t('chartCaption') : t('chartCaptionNone')}</small>
          </div>
        </div>

        <aside className="mk-econ-side">
          <div className={`mk-verdict ${m.verdict}`} role="status">
            <small>{t('verdict')}</small>
            <strong>{labels[m.verdict]}</strong>
            <p>{verdictDesc}</p>
          </div>

          <div className="mk-math">
            <MathFormula block>{String.raw`T_{\mathrm{fetch}} = t_{\mathrm{lookup}} + L\left(\frac{b}{B_f} + \frac{b}{B_h}\right)`}</MathFormula>
            <MathFormula block>{String.raw`L^{*} = \frac{t_{\mathrm{lookup}}}{1/R - b\left(1/B_f + 1/B_h\right)}`}</MathFormula>
            <dl className="mk-vars">
              <div><dt><MathFormula>{String.raw`L`}</MathFormula></dt><dd>{t('varL')}</dd></div>
              <div><dt><MathFormula>{String.raw`b`}</MathFormula></dt><dd>{t('varB')} · {Math.round(KV_BYTES_PER_TOKEN / 1024)} KiB</dd></div>
              <div><dt><MathFormula>{String.raw`B_f`}</MathFormula></dt><dd>{t('varBf')} · {fmtBandwidth(m.bandwidth)}</dd></div>
              <div><dt><MathFormula>{String.raw`B_h`}</MathFormula></dt><dd>{t('varBh')} · {fmtBandwidth(READOUT.hostGBps)}</dd></div>
              <div><dt><MathFormula>{String.raw`R`}</MathFormula></dt><dd>{t('varR')} · {fmtTokens(m.prefillRate)} /s</dd></div>
              <div><dt><MathFormula>{String.raw`t_{\mathrm{lookup}}`}</MathFormula></dt><dd>{t('varT')} · {fmtMs(READOUT.lookupMs)}</dd></div>
            </dl>
          </div>

          <dl className="mk-figures">
            <div><dt>{t('breakEven')}</dt><dd>{Number.isFinite(m.breakEvenTokens) ? `${Math.round(m.breakEvenTokens)} ${t('tokensUnit')}` : '—'}{Number.isFinite(m.breakEvenTokens) && m.breakEvenTokens < PAGE_TOKENS ? ` · ${t('belowPage')}` : ''}</dd></div>
            <div><dt>{t('bandwidthFloorLabel')}</dt><dd>{Number.isFinite(floor) ? fmtBandwidth(floor) : '—'}</dd></div>
          </dl>
          {m.bandwidth < floor && <p className="mk-warn">{t('bandwidthFloor')}</p>}
          {m.belowDefaultThreshold && <p className="mk-warn">{t('thresholdNote')}</p>}
          <p className="mk-note">{t('poolSizing')}</p>
          <p className="mk-note mk-muted">{t('assumptions')}</p>
        </aside>
      </div>
    </section>
  );
}
