import React from 'react';

export default function ServingArchitecture({t}) {
  return (
    <section className="mk-section">
      <h2 data-section-anchor="mooncake-arch">{t('s0Title')}</h2>
      <p className="mk-lead">{t('s0Lead')}</p>

      <div className="mk-stack-map">
        <div className="mk-stack-flow">
          <div className="mk-stack-node">
            <span className="mk-plane">{t('planeControl')}</span>
            <b>{t('stackCond')}</b>
            <small>{t('stackCondNote')}</small>
          </div>
          <div className="mk-stack-link"><span>{t('ifaceQuery')}</span><i aria-hidden="true">→</i></div>
          <div className="mk-stack-node">
            <b>{t('stackRouter')}</b>
            <small>{t('stackRouterNote')}</small>
          </div>
          <div className="mk-stack-link"><span>{t('ifacePick')}</span><i aria-hidden="true">→</i></div>
          <div className="mk-stack-node">
            <span className="mk-plane data">{t('planeData')}</span>
            <b>{t('stackEngine')}</b>
            <small>{t('stackEngineNote')}</small>
          </div>
        </div>

        <div className="mk-stack-substrate">
          <div className="mk-stack-node"><b>{t('stackTE')}</b><small>{t('stackTENote')}</small></div>
          <div className="mk-stack-node"><b>{t('stackStore')}</b><small>{t('stackStoreNote')}</small></div>
          <div className="mk-stack-node"><b>{t('stackPG')}</b><small>{t('stackPGNote')}</small></div>
        </div>

        <p className="mk-note">{t('stackNote')}</p>
        <p className="mk-note mk-warn">{t('unopenedNote')}</p>
      </div>

      <div className="mk-facts">
        <h3>{t('factTitle')}</h3>
        <dl>
          <div><dt>Conductor</dt><dd>{t('factConductor')}</dd></div>
          <div><dt>Store</dt><dd>{t('factStore')}</dd></div>
          <div><dt>Transfer Engine</dt><dd>{t('factTE')}</dd></div>
          <div><dt>PG / EP</dt><dd>{t('factPG')}</dd></div>
        </dl>
      </div>
    </section>
  );
}
