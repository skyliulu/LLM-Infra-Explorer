import React, {useEffect, useMemo, useState} from 'react';
import {Pause, Play, RotateCcw, SkipForward} from 'lucide-react';
import {CODE, stepAt} from './stack';

const LABELS = {
  conductor: 'stackCond',
  router: 'stackRouter',
  engine: 'stackEngine',
  te: 'stackTE',
  store: 'stackStore',
  pg: 'stackPG',
};

export default function ServingArchitecture({t}) {
  const [step, setStep] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState('router');
  const m = useMemo(() => stepAt(step), [step]);
  const done = step === m.limit;

  useEffect(() => {
    if (!playing || done) return undefined;
    const timer = setTimeout(() => setStep(value => Math.min(m.limit, value + 1)), 900);
    return () => clearTimeout(timer);
  }, [playing, step, done, m.limit]);

  useEffect(() => {
    if (m.node) setSelected(m.node);
  }, [m.node]);

  const next = () => { setPlaying(false); setStep(value => Math.min(m.limit, value + 1)); };
  const reset = () => { setPlaying(false); setStep(1); };
  const toggle = () => { if (done) setStep(1); setPlaying(value => !value); };
  const node = (id, plane) => <button type="button" className={`mk-node ${selected === id ? 'on' : ''} ${m.node === id ? 'active' : ''}`} aria-pressed={selected === id} onClick={() => setSelected(id)}>
    {plane && <span className={`mk-plane ${plane === 'data' ? 'data' : ''}`}>{t(plane === 'data' ? 'planeData' : 'planeControl')}</span>}
    <b>{t(LABELS[id])}</b>
    <small>{t(`src_${id}`)}</small>
  </button>;

  const activeId = m.active?.id;

  return (
    <section className="mk-section">
      <h2 data-section-anchor="mooncake-arch">{t('s0Title')}</h2>
      <p className="mk-lead">{t('s0Lead')}</p>

      <div className="mk-controls">
        <div className="chapter-playback mk-playback">
          <button type="button" onClick={reset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={17}/></button>
          <button type="button" onClick={toggle} aria-label={playing && !done ? t('pause') : t('play')} title={playing && !done ? t('pause') : t('play')}>{playing && !done ? <Pause size={17}/> : <Play size={17}/>}</button>
          <button type="button" onClick={next} disabled={done} aria-label={t('next')} title={t('next')}><SkipForward size={17}/></button>
        </div>
        <b className="mk-step-count">{step}/{m.limit}</b>
      </div>

      <div className="mk-arch-steps" role="group" aria-label={t('steps')}>
        {Array.from({length: 7}, (_, index) => {
          const id = ['request', 'index', 'pick', 'lookup', 'load', 'prefill', 'decode'][index];
          return <button key={id} type="button" className={step === index + 1 ? 'active' : step > index + 1 ? 'passed' : ''} aria-current={step === index + 1 ? 'step' : undefined} aria-label={`${index + 1}. ${t(`st_${id}`)}`} onClick={() => { setPlaying(false); setStep(index + 1); }}>
            <b>{index + 1}</b>{t(`st_${id}`)}
          </button>;
        })}
      </div>

      <div className="mk-stack-map">
        <div className="mk-stack-flow">
            {node('conductor', 'control')}
            <div className={`mk-stack-link ${activeId === 'index' ? 'on' : ''}`}><span>{t('ifaceQuery')}</span><i aria-hidden="true">→</i></div>
            {node('router')}
            <div className={`mk-stack-link ${activeId === 'pick' ? 'on' : ''}`}><span>{t('ifacePick')}</span><i aria-hidden="true">→</i></div>
            {node('engine', 'data')}
          </div>

          <div className="mk-stack-substrate">
            {node('te')}
            {node('store')}
            {node('pg')}
          </div>

          <div className="mk-inspect">
            <b>{t(LABELS[selected])}</b>
            <span><i>{t('roleLabel')}</i>{t(`role_${selected}`)}</span>
            <span><i>{t('notLabel')}</i>{t(`not_${selected}`)}</span>
            <span><i>{t('apiLabel')}</i>{t(`api_${selected}`)}</span>
          </div>
      </div>

      <div className="mk-stack-lower">
        <div className="mk-stack-side">
          {m.active ? <>
            <h3>{t(`st_${activeId}`)}</h3>
            <dl className="mk-step-detail">
              <div><dt>{t('whoLabel')}</dt><dd>{t(`who_${activeId}`)}</dd></div>
              <div><dt>{t('ifaceLabel')}</dt><dd>{t(`iface_${activeId}`)}</dd></div>
              <div><dt>{t('stateLabel')}</dt><dd>{t(`state_${activeId}`)}</dd></div>
            </dl>
          </> : <p className="mk-note">{t('stepHint')}</p>}
        </div>
        <pre className="mk-code" aria-label={t('steps')}>
          {CODE.map((line, index) => <div key={index} className={m.line === index + 1 ? 'on' : ''}><i>{index + 1}</i><span>{line || ' '}</span></div>)}
        </pre>
      </div>

      <p className="mk-note mk-cap">{t('stackNote')}</p>
    </section>
  );
}
