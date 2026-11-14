import React, {useState} from 'react';

const LABELS = {
  conductor: 'stackCond',
  router: 'stackRouter',
  engine: 'stackEngine',
  te: 'stackTE',
  store: 'stackStore',
  pg: 'stackPG',
};

export default function ServingArchitecture({t}) {
  const [selected, setSelected] = useState('conductor');
  const node = (id, plane) => <button type="button" className={`mk-node ${selected === id ? 'on' : ''}`} aria-pressed={selected === id} onClick={() => setSelected(id)}>
    {plane && <span className={`mk-plane ${plane === 'data' ? 'data' : ''}`}>{t(plane === 'data' ? 'planeData' : 'planeControl')}</span>}
    <b>{t(LABELS[id])}</b>
    <small>{t(`src_${id}`)}</small>
  </button>;

  return (
    <section className="mk-section">
      <h2 data-section-anchor="mooncake-arch">{t('s0Title')}</h2>
      <p className="mk-lead">{t('s0Lead')}</p>

      <div className="mk-stack-map">
        <div className="mk-stack-flow">
          {node('conductor', 'control')}
          <div className="mk-stack-link"><span>{t('ifaceQuery')}</span><i aria-hidden="true">→</i></div>
          {node('router')}
          <div className="mk-stack-link"><span>{t('ifacePick')}</span><i aria-hidden="true">→</i></div>
          {node('engine', 'data')}
        </div>

        <div className="mk-stack-substrate">
          {node('te')}
          {node('store')}
          {node('pg')}
        </div>

        <div className="mk-inspect" role="status" aria-live="polite">
          <b>{t(LABELS[selected])}</b>
          <span><i>{t('roleLabel')}</i>{t(`role_${selected}`)}</span>
          <span><i>{t('notLabel')}</i>{t(`not_${selected}`)}</span>
          <span><i>{t('apiLabel')}</i>{t(`api_${selected}`)}</span>
        </div>

        <p className="mk-note mk-cap">{t('stackNote')}</p>
      </div>
    </section>
  );
}
