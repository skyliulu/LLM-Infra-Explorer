import React, {useEffect, useMemo, useState} from 'react';
import {Pause, Play, RotateCcw, SkipForward} from 'lucide-react';
import {
  INSTANCES,
  L2_PAGES,
  POOL_MAX,
  POOL_MIN,
  ROUNDS,
  deriveMooncakeState,
} from './model';
import {fmtBytes, fmtMs, fmtPct, fmtTokens, shortHash} from './format';

const plot = {left: 30, right: 330, top: 12, bottom: 104};
const xFor = round => plot.left + ((round - 1) * (plot.right - plot.left)) / (ROUNDS - 1);
const yFor = rate => plot.bottom - rate * (plot.bottom - plot.top);
const pathFor = curve => curve.map((point, index) => `${index === 0 ? 'M' : 'L'}${xFor(point.round).toFixed(1)},${yFor(point.hitRate).toFixed(1)}`).join(' ');

const sourceKey = source => (source === 'l2' ? 'sourceL2' : source === 'pool' ? 'sourcePool' : 'sourceMiss');

export default function TierCanvas({t, mode, setMode, poolPages, setPoolPages}) {
  const [step, setStep] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [selected, setSelected] = useState('S0');
  const m = useMemo(() => deriveMooncakeState({mode, poolPages, step}), [mode, poolPages, step]);
  const {snapshot, phase, limit} = m;
  const request = snapshot.request;
  const shown = request || m.nextRequest;
  const done = m.done;

  const reset = () => { setPlaying(false); setStep(0); };
  const handleNextStep = () => { setPlaying(false); setStep(value => Math.min(limit, value + 1)); };
  const togglePlay = () => { if (done) setStep(0); setPlaying(value => !value); };
  useEffect(() => {
    if (!isPlaying || done) return undefined;
    const timer = setTimeout(() => setStep(value => Math.min(limit, value + 1)), 620);
    return () => clearTimeout(timer);
  }, [isPlaying, step, done, limit]);

  const decisionFor = id => snapshot.decisions.find(entry => entry.id === id);
  const localCopies = Array.from({length: INSTANCES}, (_, index) => snapshot.l2[index].includes(selected)).reduce((list, hit, index) => (hit ? [...list, index] : list), []);
  const segmentIndex = snapshot.segments.findIndex(row => row.includes(selected));
  const total = snapshot.totals;
  const hitRate = total.reusedTokens + total.computedTokens ? total.reusedTokens / (total.reusedTokens + total.computedTokens) : 0;
  const used = snapshot.segments.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const visiblePages = row => row.filter(Boolean).slice(-4);
  const lastPage = shown?.pages.at(-1);

  return (
    <section className="mk-section">
      <h2 data-section-anchor="mooncake-tiers">{t('s1Title')}</h2>
      <p className="mk-lead">{t('s1Lead')}</p>

      <div className="mk-controls">
        <div className="mk-toggle" role="group" aria-label={t('scope')}>
          <button aria-pressed={mode === 'instance'} onClick={() => setMode('instance')}>{t('modeInstance')}</button>
          <button aria-pressed={mode === 'cluster'} onClick={() => setMode('cluster')}>{t('modeCluster')}</button>
        </div>
        <label className="mk-slider" title={t('poolSizeNote')}>
          <span>{t('poolSize')}</span>
          <input type="range" min={POOL_MIN} max={POOL_MAX} step={6} value={poolPages} onChange={event => setPoolPages(Number(event.target.value))} aria-label={t('poolSize')}/>
          <b>{poolPages} {t('pagesUnit')}</b>
        </label>
        <label className="mk-slider">
          <span>{t('scrub')}</span>
          <input type="range" min={0} max={limit} step={1} value={step} onChange={event => { setPlaying(false); setStep(Number(event.target.value)); }} aria-label={t('scrub')}/>
          <b>{step}/{limit}</b>
        </label>
        <div className="chapter-playback mk-playback">
          <button onClick={reset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={17}/></button>
          <button onClick={togglePlay} aria-label={isPlaying && !done ? t('pause') : t('play')} title={isPlaying && !done ? t('pause') : t('play')}>{isPlaying && !done ? <Pause size={17}/> : <Play size={17}/>}</button>
          <button onClick={handleNextStep} disabled={done} aria-label={t('next')} title={t('next')}><SkipForward size={17}/></button>
        </div>
      </div>

      <div className="mk-grid">
        <div className="mk-main">
          <div className="mk-request" aria-live="polite" data-phase={phase}>
            <div className="mk-request-head">
              <strong>{shown ? `${t('round')} ${shown.round}${t('roundUnit')} · ${t('client')} ${shown.client} · ${t('instance')} ${shown.instance}` : t('request')}</strong>
              {shown?.moved && <span className="mk-badge">{t('moved')}</span>}
            </div>
            <div className="mk-chain">
              {(shown?.pages || []).map((id, index) => {
                const entry = decisionFor(id);
                const source = entry?.source;
                const role = index === 0 ? t('sharedPage') : id === lastPage ? t('newPage') : id;
                return <button key={id} className={`mk-page-chip ${source || 'pending'} ${index === 0 ? 'shared' : ''} ${selected === id ? 'on' : ''}`} onClick={() => setSelected(id)} aria-pressed={selected === id} aria-label={`${id} ${source ? t(sourceKey(source)) : ''}`} title={role}>
                  <b>{id}</b>
                  <small>{source ? t(sourceKey(source)) : index === 0 ? t('sharedPage') : t('newPage')}</small>
                </button>;
              })}
            </div>
          </div>

          <div className="mk-cluster">
            {Array.from({length: INSTANCES}, (_, index) => {
              const active = request?.instance === index;
              return <div className={`mk-instance ${active ? 'on' : ''}`} key={index}>
                <header><strong>{t('instance')} {index}</strong>{active && <span>{t('request')}</span>}</header>
                <div className="mk-tier-block l1">
                  <small>{t('l1Title')} · {t('l1Note')}</small>
                  <div className="mk-cells">
                    {active ? request.pages.map(id => <span key={id} className={`mk-cell ${selected === id ? 'on' : ''}`}>{id}</span>) : <span className="mk-off">—</span>}
                  </div>
                </div>
                <div className="mk-tier-block l2">
                  <small>{t('l2Title')} · {t('l2Note')}</small>
                  <div className="mk-cells grid">
                    {snapshot.l2[index].map((id, slot) => <span key={slot} className={`mk-cell ${id ? 'filled' : 'empty'} ${id === selected ? 'on' : ''}`} title={id || ''}>{id || '·'}</span>)}
                  </div>
                  <em>{snapshot.l2[index].filter(Boolean).length}/{L2_PAGES} {t('pagesUnit')}</em>
                </div>
              </div>;
            })}
          </div>

          <div className={`mk-pool ${mode === 'instance' ? 'off' : ''}`}>
            <header>
              <strong>{t('poolTitle')}</strong>
              <span className="mk-master">{t('master')}</span>
              <span>{used}/{m.poolPages} {t('pagesUnit')}</span>
            </header>
            <div className="mk-segments">
              {snapshot.segments.map((row, index) => <div className="mk-segment" key={index}>
                <small>{t('segment')} {index} {t('segmentUnit')}</small>
                <div className="mk-segbar"><i style={{width: `${(row.filter(Boolean).length / row.length) * 100}%`}}/></div>
                <span>{row.filter(Boolean).length}/{row.length}</span>
                <div className="mk-chips">
                  {visiblePages(row).map(id => <button key={id} className={selected === id ? 'on' : ''} onClick={() => setSelected(id)} aria-pressed={selected === id}>{id}</button>)}
                  {row.filter(Boolean).length > 4 && <em>+{row.filter(Boolean).length - 4}</em>}
                </div>
              </div>)}
            </div>
            <p>{t('poolNote')}</p>
          </div>
          <p className="mk-note">{t('canvasNote')}</p>
          <p className="mk-note">{t('residencyNote')}</p>
        </div>

        <aside className="mk-side">
          <div className="mk-metrics">
            <div><small>{t('hitRate')}</small><strong>{fmtPct(hitRate)}</strong></div>
            <div><small>{t('reused')}</small><strong>{fmtTokens(total.reusedTokens)}</strong></div>
            <div><small>{t('computed')}</small><strong>{fmtTokens(total.computedTokens)}</strong></div>
            <div><small>{t('poolRead')}</small><strong>{fmtBytes(total.poolReadBytes)}</strong></div>
            <div><small>{t('prefillTime')}</small><strong>{fmtMs(total.timeMs)}</strong></div>
            <div><small>{t('l3Gain')}</small><strong>{fmtMs(m.l3GainMs)}</strong></div>
          </div>
          <small className="mk-note">{t('timeNote')} {t('l3GainNote')}</small>

          <div className="mk-chart">
            <h3>{t('chartTitle')}</h3>
            <svg viewBox="0 0 340 128" role="img" aria-label={t('chartTitle')}>
              {[0, 0.5, 1].map(rate => <g key={rate}>
                <line className="mk-gridline" x1={plot.left} x2={plot.right} y1={yFor(rate)} y2={yFor(rate)}/>
                <text className="mk-axis" x={4} y={yFor(rate) + 4}>{rate * 100}%</text>
              </g>)}
              {[1, 4, 8].map(round => <text className="mk-axis" key={round} x={xFor(round)} y={122} textAnchor="middle">{round}</text>)}
              <path className={`mk-line instance ${mode === 'instance' ? 'active' : ''}`} d={pathFor(m.curves.instance)}/>
              <path className={`mk-line cluster ${mode === 'cluster' ? 'active' : ''}`} d={pathFor(m.curves.cluster)}/>
              {m.round > 0 && <g>
                <line className="mk-cursor" x1={xFor(m.round)} x2={xFor(m.round)} y1={plot.top} y2={plot.bottom}/>
                <circle className={`mk-dot instance ${mode === 'instance' ? 'on' : ''}`} cx={xFor(m.round)} cy={yFor(m.curves.instance[m.round - 1].hitRate)} r={3}/>
                <circle className={`mk-dot cluster ${mode === 'cluster' ? 'on' : ''}`} cx={xFor(m.round)} cy={yFor(m.curves.cluster[m.round - 1].hitRate)} r={3}/>
              </g>}
            </svg>
            <div className="mk-legend">
              <span><i className="instance"/>{t('legendInstance')}</span>
              <span><i className="cluster"/>{t('legendCluster')}</span>
            </div>
            <small className="mk-note">{t('chartNote')}</small>
          </div>

          <div className="mk-inspector" aria-live="polite">
            <h3>{selected} · {t('pageKey')}</h3>
            <code>qwen70_pp0_{shortHash(selected)}</code>
            <dl>
              <div><dt>{t('pageSource')}</dt><dd>{decisionFor(selected) ? t(sourceKey(decisionFor(selected).source)) : '—'}</dd></div>
              <div><dt>{t('pageSegment')}</dt><dd>{segmentIndex >= 0 ? `${t('segment')} ${segmentIndex} ${t('segmentUnit')}` : '—'}</dd></div>
              <div><dt>{t('l2Title')}</dt><dd>{localCopies.length ? localCopies.map(index => `${t('instance')} ${index}`).join(' · ') : '—'}</dd></div>
            </dl>
            <p>{t('selectHint')}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
