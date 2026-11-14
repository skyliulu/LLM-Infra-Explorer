import React, {useEffect, useMemo, useState} from 'react';
import {Pause, Play, RotateCcw, SkipForward} from 'lucide-react';
import {CHALLENGES, POLICIES, deriveArchitectureState} from './serving';
import {KV_BYTES_PER_TOKEN} from './model';
import {fmtBytes, fmtMs, fmtTokens} from './format';

export default function ServingArchitecture({t, config, setConfig}) {
  const [step, setStep] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const m = useMemo(() => deriveArchitectureState({challenge: config.challenge, policy: config.policy, step}), [config, step]);
  const done = step === m.limit;

  const reset = () => { setPlaying(false); setStep(0); };
  const handleNextStep = () => { setPlaying(false); setStep(value => Math.min(m.limit, value + 1)); };
  const togglePlay = () => { if (done) setStep(0); setPlaying(value => !value); };
  useEffect(() => {
    if (!isPlaying || done) return undefined;
    const timer = setTimeout(() => setStep(value => Math.min(m.limit, value + 1)), 900);
    return () => clearTimeout(timer);
  }, [isPlaying, step, done, m.limit]);

  const set = patch => { setPlaying(false); setStep(0); setConfig({...config, ...patch}); };
  const active = m.active;
  const isPrefill = active === 'load' || active === 'prefill';
  const onPool = active === 'index' || active === 'load';
  const onDecode = active === 'stream' || active === 'decode';
  const chosen = m.chosen;
  const showPlan = m.planned;
  const rejected = !m.admitted;
  const reasonKey = {reuse: 'reasonReuse', slo: 'reasonSlo', overload: 'reasonOverload'}[m.reason] || 'reasonPending';
  const showCandidates = m.challenge === 'placement' || m.challenge === 'overload';

  const budget = m.challenge === 'prefill'
    ? [
      {label: t('bSingle'), value: fmtMs(m.budget.singleNodeMs)},
      {label: t('bPipeline'), value: fmtMs(m.budget.cppMs), note: `${m.total.chunks || chosen.chunks} ${t('mChunks')}`},
      {label: t('bPeak'), value: `${fmtBytes(m.budget.peakFullBytes)} → ${fmtBytes(m.budget.peakChunkBytes)}`},
    ]
    : m.challenge === 'transfer'
      ? [
        {label: t('bLoad'), value: `${fmtMs(m.budget.loadMs)} / ${fmtMs(m.budget.tcpLoadMs)}`, note: `${t('bFabric')} / ${t('bTcp')}`},
        {label: t('bStream'), value: `${fmtMs(m.budget.streamMs)} / ${fmtMs(m.budget.tcpStreamMs)}`, note: `${t('bFabric')} / ${t('bTcp')}`},
      ]
      : m.challenge === 'placement'
        ? [
          {label: 'A', value: fmtMs(m.candidates[0].ttft), note: `${t('candReuse')} ${fmtTokens(m.candidates[0].hit)}`},
          {label: 'B', value: fmtMs(m.candidates[1].ttft), note: `${t('candReuse')} ${fmtTokens(m.candidates[1].hit)}`},
          {label: t('mSlo'), value: `${m.slo} ms`},
        ]
        : [
          {label: t('mTtft'), value: fmtMs(m.candidates[0].ttft)},
          {label: t('savedWork'), value: fmtMs(m.saved.prefillMs)},
          {label: t('savedBytes'), value: fmtBytes(m.saved.loadBytes + m.saved.streamBytes)},
        ];

  return (
    <section className="mk-section">
      <h2 data-section-anchor="mooncake-arch">{t('s0Title')}</h2>
      <p className="mk-lead">{t('s0Lead')}</p>

      <div className="mk-controls">
        <div className="mk-toggle" role="group" aria-label={t('challenges')}>
          {CHALLENGES.map(item => <button key={item} type="button" aria-pressed={config.challenge === item} onClick={() => set({challenge: item})}>{t(`ch_${item}`)}</button>)}
        </div>
        {!m.overload && <div className="mk-toggle" role="group" aria-label={t('policy')}>
          {POLICIES.map(item => <button key={item} type="button" aria-pressed={config.policy === item} onClick={() => set({policy: item})}>{t(`pol_${item}`)}</button>)}
        </div>}
        <div className="chapter-playback mk-playback">
          <button type="button" onClick={reset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={17}/></button>
          <button type="button" onClick={togglePlay} aria-label={isPlaying && !done ? t('pause') : t('play')} title={isPlaying && !done ? t('pause') : t('play')}>{isPlaying && !done ? <Pause size={17}/> : <Play size={17}/>}</button>
          <button type="button" onClick={handleNextStep} disabled={done} aria-label={t('next')} title={t('next')}><SkipForward size={17}/></button>
        </div>
      </div>

      <div className="mk-arch-steps" role="group" aria-label={t('steps')}>
        {m.steps.map((entry, index) => <button key={entry.id} type="button" className={step === index + 1 ? 'active' : step > index + 1 ? 'passed' : ''} aria-current={step === index + 1 ? 'step' : undefined} aria-label={`${index + 1}. ${t(`st_${entry.id}`)}`} onClick={() => { setPlaying(false); setStep(index + 1); }}>
          <b>{index + 1}</b>{t(`st_${entry.id}`)}
        </button>)}
      </div>

      <p className="mk-note mk-arch-note">{t('challengeNote')}</p>

      <div className="mk-grid">
        <div className="mk-main">
          <div className={`mk-arch-conductor ${active === 'conductor' || active === 'index' || active === 'reject' ? 'on' : ''} ${rejected && active === 'reject' ? 'reject' : ''}`}>
            <div>
              <span className="mk-plane">{t('planeControl')}</span>
              <strong>{t('conductor')}</strong>
              <small>{t('conductorRole')} · {t('ifacePlace')}</small>
            </div>
            <div className="mk-arch-keys">
              <span>{t('candReuse')} · {showPlan ? fmtTokens(chosen.hit) : '—'} {t('tokensUnit')}</span>
              <span>{t('mTtft')} · {showPlan ? fmtMs(chosen.ttft) : '—'}</span>
              <span className={showPlan && chosen.ttft > m.slo ? 'over' : ''}>SLO {m.slo} ms</span>
            </div>
          </div>

          <div className="mk-arch-flow">
            <div className={`mk-arch-prefill ${isPrefill ? 'on' : ''}`}>
              <header>
                <div><span className="mk-plane data">{t('planeData')}</span><strong>{t('prefillPool')}</strong></div>
                <small>{t('prefillRole')}</small>
              </header>
              {m.candidates.map(candidate => <div key={candidate.id} className={`mk-arch-node ${candidate.id === chosen.id && showPlan ? 'chosen' : ''} ${candidate.ttft > m.slo ? 'over' : ''}`}>
                <b>{candidate.id}{candidate.id === chosen.id && showPlan ? ` · ${t('chosen')}` : ''}</b>
                <span>{t('candReuse')} {fmtTokens(candidate.hit)}</span>
                <span>{t('candCompute')} {fmtTokens(candidate.compute)}</span>
                <span>{t('candTtft')} {fmtMs(candidate.ttft)}</span>
              </div>)}
              <div className="mk-chunks" aria-hidden="true" title={t('mChunks')}>
                {Array.from({length: Math.min(8, Math.max(1, chosen.chunks))}, (_, index) => <i key={index} className={active === 'prefill' ? 'on' : ''}/>)}
              </div>
            </div>

            <div className={`mk-arch-arrow ${active === 'stream' ? 'on' : ''}`}>
              <span>{t('ifaceStream')}</span>
              <b>{step >= 6 ? fmtBytes(chosen.compute * KV_BYTES_PER_TOKEN) : '—'}</b>
            </div>

            <div className={`mk-arch-decode ${onDecode ? 'on' : ''}`}>
              <header><strong>{t('decodePool')}</strong><small>{t('decodeRole')}</small></header>
              <div className="mk-batch"><i style={{width: `${(m.decodeBatch.tokens / m.decodeBatch.capacity) * 100}%`}}/></div>
              <small>{m.decodeBatch.tokens}/{m.decodeBatch.capacity} {t('tokensUnit')}</small>
              <div className={`mk-arch-result ${rejected ? 'reject' : m.admitted ? 'ok' : ''}`}>
                {active === 'decode' || active === 'reject' ? (rejected ? t('rejected') : t('admitted')) : '—'}
              </div>
            </div>
          </div>

          <div className={`mk-arch-pool ${onPool ? 'on' : ''}`}>
            <div>
              <span className="mk-plane data">{t('planeData')}</span>
              <strong>{t('kvPool')}</strong>
              <small>{t('kvPoolRole')} · {t('ifaceLoad')}</small>
            </div>
            <div className="mk-arch-pool-nums">
              <span>{t('mReused')} {showPlan ? fmtTokens(chosen.hit) : '—'}</span>
              <span>{t('mLoad')} {m.total.loadBytes ? fmtBytes(m.total.loadBytes) : '—'}</span>
              <span>{t('mStream')} {m.total.streamBytes ? fmtBytes(m.total.streamBytes) : '—'}</span>
            </div>
          </div>

          <div className="mk-arch-budget">
            <small>{t('budgetTitle')}</small>
            <div>
              {budget.map(cell => <span key={cell.label}><small>{cell.label}</small><b>{cell.value}</b>{cell.note && <em>{cell.note}</em>}</span>)}
            </div>
            <em className="mk-budget-note">{t('budgetNote')}</em>
          </div>

          <details className="mk-arch-design">
            <summary>{t('designTitle')}</summary>
            <p>{t('designMono')}</p>
            <p>{t('designChoice')}</p>
          </details>

          <div className="mk-stack">
            <header>
              <div><strong>{t('stackTitle')}</strong><small>{t('stackSub')}</small></div>
              <small>{t('stackBoundary')}</small>
            </header>
            <div className="mk-stack-chain">
              <span className="mk-stack-node"><b>{t('stackRouter')}</b><small>{t('stackRouterNote')}</small></span>
              <i aria-hidden="true">→</i>
              <span className="mk-stack-node"><b>{t('stackCond')}</b><small>{t('stackCondNote')}</small></span>
              <i aria-hidden="true">→</i>
              <span className="mk-stack-node"><b>{t('stackEngine')}</b><small>{t('stackEngineNote')}</small></span>
            </div>
            <div className="mk-stack-base">
              <span>{t('stackTE')}</span><span>{t('stackStore')}</span><span>{t('stackPG')}</span>
            </div>
            <p>{t('stackNote')}</p>
          </div>
        </div>

        <aside className="mk-side">
          <div className="mk-challenge">
            <small>{t('challenges')}</small>
            <h3>{t(`q_${m.challenge}`)}</h3>
            <dl>
              <div><dt>{t('cLabel')}</dt><dd>{t(`c_${m.challenge}`)}</dd></div>
              <div><dt>{t('magLabel')}</dt><dd>{t(`mag_${m.challenge}`)}</dd></div>
              <div><dt>{t('woLabel')}</dt><dd>{t(`wo_${m.challenge}`)}</dd></div>
              <div><dt>{t('mechLabel')}</dt><dd>{t(`mech_${m.challenge}`)}</dd></div>
              <div><dt>{t('bdLabel')}</dt><dd>{t(`bd_${m.challenge}`)}</dd></div>
            </dl>
          </div>

          <div className="mk-metrics">
            <div><small>{t('mReused')}</small><strong>{fmtTokens(m.total.reused)}</strong></div>
            <div><small>{t('mComputed')}</small><strong>{fmtTokens(m.total.computed)}</strong></div>
            <div><small>{t('mChunks')}</small><strong>{m.total.chunks}/{m.total.stages || '—'}</strong></div>
            <div><small>{t('mLoad')}</small><strong>{m.total.loadMs ? fmtMs(m.total.loadMs) : '—'}</strong></div>
            <div><small>{t('mStream')}</small><strong>{m.total.streamMs ? fmtMs(m.total.streamMs) : '—'}</strong></div>
            <div><small>{t('mTtft')}</small><strong>{showPlan ? fmtMs(m.total.ttft) : '—'}</strong></div>
          </div>
          <p className={`mk-note ${showCandidates && showPlan && chosen.ttft > m.slo ? 'mk-warn' : ''}`}>{showPlan ? `${chosen.id} · ${showCandidates ? t(reasonKey) : t(m.policy === 'reuse' ? 'pol_reuse' : 'pol_slo')}` : t('reasonPending')}</p>

          {showCandidates && <div className="mk-candidates">
            <h3>{t('candidates')}</h3>
            <table>
              <thead><tr><th>{t('candNode')}</th><th>{t('candReuse')}</th><th>{t('candCompute')}</th><th>{t('candQueue')}</th><th>{t('candTtft')}</th></tr></thead>
              <tbody>{m.candidates.map(candidate => <tr key={candidate.id} className={`${candidate.id === chosen.id && showPlan ? 'chosen' : ''} ${candidate.ttft > m.slo ? 'over' : ''}`}>
                <td>{candidate.id}{candidate.id === chosen.id && showPlan ? ` · ${t('chosen')}` : ''}</td>
                <td>{fmtTokens(candidate.hit)}</td>
                <td>{fmtTokens(candidate.compute)}</td>
                <td>{fmtMs(candidate.queue)}</td>
                <td>{fmtMs(candidate.ttft)}{candidate.ttft > m.slo ? ` · ${t('violates')}` : ''}</td>
              </tr>)}</tbody>
            </table>
          </div>}

          {rejected && step >= m.limit && <p className="mk-note mk-warn">{t('reasonOverload')}</p>}
        </aside>
      </div>
    </section>
  );
}
