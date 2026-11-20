import React, {useEffect, useMemo, useState} from 'react';
import {Pause, Play, RotateCcw, SkipForward} from 'lucide-react';
import {CODE, STEPS, TOPOLOGIES, stepAt} from './stack';
import {deriveTopologyComparison} from './model';
import {fmtBytes, fmtMs} from './format';

const LABELS = {
  router: 'node_router',
  conductor: 'node_conductor',
  master: 'node_master',
  engine: 'node_engine',
  te: 'node_te',
  segments: 'node_segments',
};

export default function ServingArchitecture({t}) {
  const [topo, setTopo] = useState('mooncake');
  const [step, setStep] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState('router');

  const compare = useMemo(() => deriveTopologyComparison(), []);
  const cur = compare[topo] || compare.mooncake;
  const maxMs = Math.max(compare.mooncake.totalMs, compare.local.totalMs, compare.proxy.totalMs);
  const m = useMemo(() => stepAt(step), [step]);
  const done = step === m.limit;
  const isMooncake = topo === 'mooncake';
  const isLocal = topo === 'local';
  const isProxy = topo === 'proxy';

  useEffect(() => {
    if (!playing || done || !isMooncake) return undefined;
    const timer = setTimeout(() => setStep(value => Math.min(m.limit, value + 1)), 950);
    return () => clearTimeout(timer);
  }, [playing, step, done, m.limit, isMooncake]);

  useEffect(() => {
    if (isMooncake && m.node) setSelected(m.node);
  }, [m.node, isMooncake]);

  const switchTopo = nextTopo => {
    setPlaying(false);
    setTopo(nextTopo);
    if (nextTopo === 'local') setSelected('engine');
    else if (nextTopo === 'proxy') setSelected('master');
    else setSelected(m.node);
  };

  const next = () => { setPlaying(false); setStep(value => Math.min(m.limit, value + 1)); };
  const reset = () => { setPlaying(false); setStep(1); };
  const toggle = () => { if (done) setStep(1); setPlaying(value => !value); };

  const activeId = m.active.id;
  const edgeOn = id => isMooncake && m.edge === id;

  const nodeState = id => {
    const absent = (isLocal && ['conductor', 'master', 'te', 'segments'].includes(id))
      || (isProxy && id === 'te');
    const hot = (isLocal && id === 'engine') || (isProxy && id === 'master');
    const primary = isMooncake && m.node === id;
    const linked = isMooncake && m.secondary.includes(id);
    return {absent, hot, primary, linked};
  };

  const renderNode = (id, tag) => {
    const {absent, hot, primary, linked} = nodeState(id);
    return (
      <button
        type="button"
        className={`mk-node ${selected === id ? 'on' : ''} ${primary ? 'active' : linked ? 'linked' : ''} ${absent ? 'absent' : ''} ${hot ? 'hot' : ''}`}
        aria-pressed={selected === id}
        onClick={() => setSelected(id)}
      >
        <div className="mk-node-top">
          <b>{t(LABELS[id])}</b>
          {tag && <span className={`mk-tag ${hot ? 'hot' : ''}`}>{tag}</span>}
        </div>
        <small>{t(`sub_${id}`)}</small>
      </button>
    );
  };

  return (
    <section className="mk-section">
      <h2 data-section-anchor="mooncake-arch">{t('s0Title')}</h2>
      <p className="mk-lead">{t('s0Lead')}</p>

      <div className="mk-controls">
        <div className="mk-toggle" role="group" aria-label={t('topoLabel')}>
          {TOPOLOGIES.map(id => (
            <button key={id} type="button" aria-pressed={topo === id} onClick={() => switchTopo(id)}>
              {t(`topo_${id}`)}
            </button>
          ))}
        </div>
        {isMooncake ? (
          <>
            <div className="mk-step-label" aria-live="polite" data-phase={m.phase}>
              <strong>{step}. {t(`st_${activeId}`)}</strong>
              <span>{step}/{m.limit}</span>
            </div>
            <div className="chapter-playback mk-playback">
              <button type="button" onClick={reset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={17}/></button>
              <button type="button" onClick={toggle} aria-label={playing && !done ? t('pause') : t('play')} title={playing && !done ? t('pause') : t('play')}>{playing && !done ? <Pause size={17}/> : <Play size={17}/>}</button>
              <button type="button" onClick={next} disabled={done} aria-label={t('next')} title={t('next')}><SkipForward size={17}/></button>
            </div>
          </>
        ) : (
          <span className="mk-topo-alert">{t(`topoAlert_${topo}`)}</span>
        )}
      </div>

      {isMooncake && (
        <div className="mk-arch-steps" role="group" aria-label={t('steps')}>
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={step === index + 1 ? 'active' : step > index + 1 ? 'passed' : ''}
              aria-current={step === index + 1 ? 'step' : undefined}
              aria-label={`${index + 1}. ${t(`st_${item.id}`)}`}
              onClick={() => { setPlaying(false); setStep(index + 1); }}
            >
              <b>{index + 1}</b>{t(`st_${item.id}`)}
            </button>
          ))}
        </div>
      )}

      <div className="mk-atlas-grid">
        <div className="mk-stack-map">
          <div className="mk-plane-band control">
            <div className="mk-plane-head">
              <span className="mk-plane">{t('planeControl')}</span>
              <small>{isProxy ? t('planeControlProxy') : t('planeControlDesc')}</small>
            </div>
            <div className="mk-plane-row">
              {renderNode('router')}
              <div className={`mk-edge ${edgeOn('router-conductor') ? 'on' : ''} ${isLocal ? 'absent' : ''}`}>
                <span>{t('edgeQuery')}</span>
                <i aria-hidden="true">⇄</i>
              </div>
              {renderNode('conductor', isLocal ? t('tagAbsent') : null)}
              <div className="mk-edge-sep" aria-hidden="true"/>
              {renderNode(
                'master',
                isProxy
                  ? `${t('tagRelay')} ${fmtBytes(cur.masterBytes)}`
                  : isLocal
                    ? t('tagAbsent')
                    : t('tagZeroBytes')
              )}
            </div>
          </div>

          <div className="mk-bridges">
            <div className={`mk-bridge ${edgeOn('router-engine') ? 'on' : ''}`}>
              <i aria-hidden="true">↓</i>
              <span>{t('edgeRoute')}</span>
            </div>
            <div className={`mk-bridge ${edgeOn('engine-master') ? 'on' : ''} ${isProxy ? 'hot' : ''} ${isLocal ? 'absent' : ''}`}>
              <i aria-hidden="true">⇅</i>
              <span>
                {isProxy
                  ? `${fmtBytes(cur.masterBytes)} · TCP ${fmtMs(cur.transferMs)} · 2 CPU`
                  : t('edgeMeta')}
              </span>
            </div>
          </div>

          <div className="mk-plane-band data">
            <div className="mk-plane-head">
              <span className="mk-plane data">{t('planeData')}</span>
              <small>{isLocal ? t('planeDataLocal') : isProxy ? t('planeDataProxy') : t('planeDataDesc')}</small>
            </div>
            <div className="mk-plane-row">
              {renderNode(
                'engine',
                isLocal
                  ? `${t('tagRecompute')} ${cur.computePages} ${t('pagesUnit')}`
                  : `${t('tagCompute')} ${cur.computePages} ${t('pagesUnit')}`
              )}
              <div className={`mk-edge ${edgeOn('data-transfer') ? 'on' : ''} ${!isMooncake ? 'absent' : ''}`}>
                <span>{isMooncake ? `RDMA ${fmtMs(cur.transferMs)}` : t('tagBypassed')}</span>
                <i aria-hidden="true">⇄</i>
              </div>
              {renderNode('te', isMooncake ? t('tagZeroCopy') : t('tagAbsent'))}
              <div className={`mk-edge ${edgeOn('data-transfer') ? 'on' : ''} ${isLocal ? 'absent' : ''}`}>
                <span>{isProxy ? t('tagViaMaster') : t('edgeSeg')}</span>
                <i aria-hidden="true">⇄</i>
              </div>
              {renderNode('segments', isLocal ? t('tagAbsent') : fmtBytes(compare.mooncake.transferBytes))}
            </div>
          </div>

          <div className="mk-topo-bars" role="group" aria-label={t('topoCompareTitle')}>
            {TOPOLOGIES.map(id => {
              const row = compare[id];
              const pct = Math.max(8, (row.totalMs / maxMs) * 100);
              return (
                <button
                  key={id}
                  type="button"
                  className={`mk-topo-row ${topo === id ? 'on' : ''} ${row.bottleneck ? 'warn' : 'ok'}`}
                  aria-pressed={topo === id}
                  onClick={() => switchTopo(id)}
                >
                  <span className="mk-topo-name">{t(`topo_${id}`)}</span>
                  <div className="mk-topo-track"><i style={{width: `${pct}%`}}/></div>
                  <b>{fmtMs(row.totalMs)}</b>
                </button>
              );
            })}
            <small className="mk-note">{t('topoBarNote')}</small>
          </div>
        </div>

        <aside className="mk-atlas-side">
          <div className="mk-side-card" aria-live="polite">
            <div className="mk-side-head">
              <strong>{t(LABELS[selected])}</strong>
              <span>{t(`sub_${selected}`)}</span>
            </div>
            <dl className="mk-step-detail">
              <div><dt>{t('roleLabel')}</dt><dd>{t(`role_${selected}`)}</dd></div>
              <div><dt>{t('notLabel')}</dt><dd>{t(`not_${selected}`)}</dd></div>
              <div><dt>{t('apiLabel')}</dt><dd>{t(`api_${selected}`)}</dd></div>
            </dl>
          </div>

          {isMooncake ? (
            <pre className="mk-stack-code" aria-label={t('steps')}>
              {CODE.map((line, index) => (
                <div key={index} className={m.lines.includes(index + 1) ? 'on' : ''}>
                  <i>{index + 1}</i>
                  <span>{line || ' '}</span>
                </div>
              ))}
            </pre>
          ) : (
            <div className="mk-topo-explain" aria-live="polite">
              <h3>{t(`topoWhyTitle_${topo}`)}</h3>
              <p>{t(`topoWhy_${topo}`)}</p>
              <dl className="mk-figures">
                <div><dt>{t('metricMaster')}</dt><dd>{fmtBytes(cur.masterBytes)}</dd></div>
                <div><dt>{t('metricTransfer')}</dt><dd>{fmtMs(cur.transferMs)}</dd></div>
                <div><dt>{t('metricCompute')}</dt><dd>{fmtMs(cur.computeMs)}</dd></div>
                <div><dt>{t('metricTotal')}</dt><dd>{fmtMs(cur.totalMs)}</dd></div>
              </dl>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
