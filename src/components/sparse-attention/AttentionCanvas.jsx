import React, { useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Search } from 'lucide-react';
import { MathFormula } from '../linear-attention/MathFormula';
import { InformationTradeoff } from './InformationTradeoff';

const vectorTex = (symbol, values) => `${symbol}=\\begin{bmatrix}${values.map(v => v.toFixed(3)).join('&')}\\end{bmatrix}`;

function Edge({label}) { return <div className="sc-edge"><ArrowDown size={17}/>{label && <span>{label}</span>}</div>; }

export function SystemGraph({ model: m, t, onFocus, compact }) {
  const graphRef = useRef(null);
  const [paths, setPaths] = useState([]);
  useLayoutEffect(() => {
    const root = graphRef.current;
    const measure = () => {
      const box = root.getBoundingClientRect();
      const bounds = id => {
        const el = root.querySelector(`[data-node="${id}"]`) ?? root.querySelector(`[data-anchor="${id}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return { x:r.x-box.x, y:r.y-box.y, w:r.width, h:r.height };
      };
      const links = [...m.edges, ['current','query']].map(([from,to]) => {
        const a=bounds(from), b=bounds(to);
        if (!a || !b) return null;
        const indexed = from==='query' && to==='index';
        const x1=a.x+a.w/2, y1=a.y+a.h, x2=b.x+b.w/2, y2=b.y;
        if(indexed) return {id:`${from}-${to}`,indexed,d:`M ${a.x} ${a.y+a.h*.75} H ${a.x-9} V ${b.y+b.h*.5} H ${b.x+b.w}`};
        if (compact && b.x > a.x+a.w+4 && to==='attention') return {id:`${from}-${to}`,d:`M ${a.x+a.w} ${a.y+a.h/2} H ${b.x-5} V ${b.y+b.h/2} H ${b.x}`};
        const middle = y1+(y2-y1)*.6;
        return {id:`${from}-${to}`,d:`M ${x1} ${y1} V ${middle} H ${x2} V ${y2}`};
      }).filter(Boolean);
      setPaths(links);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root.querySelectorAll('[data-node], [data-anchor]').forEach(el=>observer.observe(el));
    return ()=>observer.disconnect();
  }, [m.mode, compact, m.focus]);
  const node = (id, hint, value) => <button className={`sc-node sc-node-${id}`} data-node={id} aria-pressed={m.focus === id} onClick={() => onFocus(id)}><strong>{t(`${id}Node`)}</strong>{!compact&&<span>{hint}</span>}{value&&<b>{value}</b>}{!compact&&<Search size={13} className="sc-search"/>}</button>;
  return <div ref={graphRef} className={`sc-graph ${compact ? 'sc-mini' : ''}`} aria-label={t('overview')}>
    <svg className="sc-connections" aria-hidden="true"><defs><marker id="sc-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#94a3b8"/></marker><marker id="sc-index-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#8b5cf6"/></marker></defs>{paths.map(p=><path key={p.id} data-edge={p.id} d={p.d} fill="none" stroke={p.indexed?'#8b5cf6':'#94a3b8'} strokeWidth="1.2" strokeDasharray={p.indexed?'4 3':undefined} markerEnd={`url(#${p.indexed?'sc-index-arrow':'sc-arrow'})`}/>)}</svg>
    <div className="sc-origin" data-anchor="history">{t('historyNode')}<span> · {m.tokens}</span></div>
    <div className={`sc-branches ${!m.hasWindow ? 'sc-no-local' : ''}`}>
      <div className="sc-global-branch"><Edge/>{node('cache',t(m.compressed ? 'cacheHint':'rawCacheHint'),`${t('resident')} ${m.global.length}`)}<Edge label={t(m.indexed?'routeIndexKey':'routeGlobal')}/>{m.indexed ? <>{node('index',t('indexHint'),`${t('readNow')} ${m.globalReads} / ${m.global.length}`)}<Edge label={t('routeIds')}/></> : <div className="sc-all-read">{t('allRead')}<Edge/></div>}</div>
      {m.hasWindow && <div className="sc-local-branch"><Edge/>{node('local',t('localHint'),`${t('resident')} ${m.local.length}`)}<div className="sc-local-wire"><Edge label={t('routeLocal')}/></div></div>}
      <div className="sc-query-branch"><div className="sc-current" data-anchor="current">{t('currentNode')}</div><Edge/>{node('query',t('queryHint'))}{m.indexed && <div className="sc-index-route" data-testid="index-query-path"><span>{t('routeIndexQuery')}</span></div>}<div className="sc-local-wire"><Edge label={t('routeQuery')}/></div></div>
    </div>
    <div className="sc-merge-wire"/>{node('attention',t('attentionHint'),`${t('readNow')} ${m.mainReads}`)}<div className="sc-output"><ArrowDown size={15}/>{t('outputNode')}</div>
  </div>;
}

function Select({label,value,values,onChange}) { return <label className="sc-select"><span>{label}</span><select aria-label={label} value={value} onChange={e => onChange(+e.target.value)}>{values.map(v => <option key={v} value={v}>{v}</option>)}</select></label>; }
function Records({m,t,chooseRecord}) {
  return <><small>{t('recordsHint')}</small><div className="sc-records">{m.global.map(e => <button key={e.id} className={e.read ? 'sc-read' : ''} aria-label={`${e.id} · ${t(e.read?'fetched':'notFetched')}`} aria-pressed={m.tracedRecord?.id === e.id} onClick={() => chooseRecord(e)}>{e.id}{e.read && <span> ✓</span>}</button>)}</div></>;
}

export function NodeMicroscope({model:m,t,update,chooseRecord,onFocus}) {
  const c=m.channel;
  if(m.focus === 'query') return <><div className="sa-segment" role="group" aria-label={t('queryControl')}>{[0,1].map(q=><button key={q} aria-pressed={m.query===q} onClick={()=>update({query:q})}>{t(q?'queryB':'queryA')}</button>)}</div><div className="sc-formula"><MathFormula block>{'h\\longrightarrow c^Q\\longrightarrow q'}</MathFormula><MathFormula block>{vectorTex('q',m.mainQuery)}</MathFormula></div><p>{t(m.indexed?'querySeparate':'noIndexer')}</p>{m.indexed && <><MathFormula block>{'c^Q\\longrightarrow q^I'}</MathFormula>{m.queryHeads.map((q,h) => <MathFormula key={h} block>{vectorTex(`q^I_{${h+1}}`,q)}</MathFormula>)}</>}</>;
  if(m.focus === 'local') return <><div className="sc-local-controls"><Select label={t('window')} value={m.window} values={[4,8,16]} onChange={window => update({window})}/><MathFormula>{`L=\\min(N,W)=${m.local.length}`}</MathFormula></div><div className="sc-history">{m.history.map(h => <span key={h.position} className={h.local?'sc-in-window':''}>{`T${h.position+1}`}</span>)}</div><p>{t('localWindowHint')}</p><div className="sc-records">{m.local.map(e=><button key={e.id} aria-pressed={m.tracedRecord?.id===e.id} onClick={()=>chooseRecord(e)}>{e.id}</button>)}</div>{m.tracedRecord?.position!==undefined&&<div className="sc-formula"><MathFormula block>{vectorTex('k=v',m.tracedRecord.key)}</MathFormula><span>{t('sourcePreview')} · {`T${m.tracedRecord.position+1}`}</span></div>}<button className="sc-inline-link" onClick={()=>onFocus('attention')}>{t('tradeOpen')}</button></>;
  if(m.focus === 'cache') return <>
    {m.compressed && <div className="sc-local-controls"><Select label={t('ratio')} value={m.ratio} values={m.mode === 'csa'?[2,4,8]:[8,16]} onChange={ratio => update(m.mode === 'csa'?{csaRatio:ratio}:{hcaRatio:ratio})}/><MathFormula>{`G=\\lfloor N/r\\rfloor=${m.global.length}`}</MathFormula></div>}
    <Records m={m} t={t} chooseRecord={chooseRecord}/><p>{t(m.compressed ? m.mode === 'csa'?'overlapHint':'nonoverlapHint':'rawHint')}</p>
    {m.entry ? <div className="sc-record-detail"><div className="sc-local-controls"><h3>{t('recordDetail')} · {m.entry.id}</h3>{m.compressed && <Select label={t('channelLabel')} value={c} values={[0,1]} onChange={channel=>update({channel})}/>}</div>
      {m.compressed ? <><div className="sc-history">{m.history.map(h=><span key={h.position} className={h.source ? h.previous?'sc-previous':'sc-source':''}>{`T${h.position+1}`}</span>)}</div><div className="sc-compression-result"><span>{t('compressionResult')} · {m.entry.id}</span><MathFormula>{`c_{${m.inspect+1},${c}}=${m.entry.key[c].toFixed(3)}`}</MathFormula></div><small>{t('gateHint')}</small><div className="sc-formula"><MathFormula>{m.gateFormula}</MathFormula><MathFormula>{m.compressionFormula}</MathFormula></div><table className="sc-table"><thead><tr>{['sourcesLabel','valueLabel','weightLabel','contributionLabel'].map(key=><th key={key}>{t(key)}</th>)}</tr></thead><tbody>{m.entry.main.rows.map(row=><tr key={row.position}><th>{`T${row.position+1}`}<small>{t(row.previous?'previous':'currentGroup')}</small></th><td>{row.values[c].toFixed(3)}</td><td><div className="sc-cell-bar" style={{backgroundSize:`${row.weights[c]*100}% 100%`}}>{row.weights[c].toFixed(3)}</div></td><td>{(row.values[c]*row.weights[c]).toFixed(3)}</td></tr>)}</tbody></table><MathFormula block>{`c_{${m.inspect+1},${c}}=${m.entry.key[c].toFixed(3)}`}</MathFormula></> : <><MathFormula block>{vectorTex('k',m.entry.key)}</MathFormula><MathFormula block>{vectorTex('v',m.entry.value)}</MathFormula></>}
    </div>:<p>{t('empty')}</p>}
    {m.compressed && <p className="sc-tail">{t('pendingLabel')}: {m.tail.length} · {t('carryLabel')}: {m.carry.length}</p>}<button className="sc-inline-link" onClick={()=>onFocus('attention')}>{t('tradeOpen')}</button>
  </>;
  if(m.focus === 'index') return <IndexInspector m={m} t={t} update={update} chooseRecord={chooseRecord}/>;
  return <><div className="sc-local-controls">{m.indexed && <Select label={t('topK')} value={m.topK} values={[1,2,4,8]} onChange={topK=>update({topK})}/>}<MathFormula>{m.readFormula}</MathFormula></div><InformationTradeoff m={m} t={t}/><h3>{t('jointWeights')}</h3><div className="sc-weights">{m.reads.map(e=><button key={e.id} data-output-record={e.id} aria-pressed={m.tracedRecord?.id===e.id} onClick={()=>chooseRecord(e)}><span>{e.id}<small>{t(e.branch==='local'?'localLabel':'globalLabel')}</small></span><div className="sc-track"><i className={e.branch==='local'?'sc-teal':''} style={{width:`${e.weight*100}%`}}/></div><b>{(e.weight*100).toFixed(1)}%</b></button>)}</div>{m.reads.find(e=>e.id===m.tracedRecord?.id)&&<div className="sc-formula"><strong>{t('contribution')} · {m.tracedRecord.id}</strong><MathFormula block>{vectorTex('a_e v_e',m.reads.find(e=>e.id===m.tracedRecord.id).value.map(v=>v*m.reads.find(e=>e.id===m.tracedRecord.id).weight))}</MathFormula><button className="sc-inline-link" onClick={()=>onFocus(m.tracedRecord.position!==undefined?'local':'cache')}>{t('backSource')}</button></div>}<div className="sc-formula"><MathFormula block>{m.attentionFormula}</MathFormula><MathFormula block>{vectorTex('o',m.output)}</MathFormula></div><small>{t('readHint')}</small></>;
}

function IndexInspector({m,t,update,chooseRecord}) {
  const entry=m.entry;
  return <><div className="sc-local-controls"><Select label={t('topK')} value={m.topK} values={[1,2,4,8]} onChange={topK=>update({topK})}/><span>{t('scanLabel')} <b>{m.indexReads}</b></span><label className="sc-select"><span>{t('sortLabel')}</span><select aria-label={t('sortLabel')} value={m.scoreOrder} onChange={e=>update({scoreOrder:e.target.value})}><option value="position">{t('positionOrder')}</option><option value="score">{t('scoreOrder')}</option></select></label></div><small>{t('scoreScale')}</small>
    <div className="sc-index-layout"><div className="sc-score-grid" tabIndex={0} aria-label={t('sortLabel')}>{m.scoreEntries.map(e=><button key={e.id} aria-label={`${e.id} · ${t(e.read?'fetched':'notFetched')}`} aria-pressed={e.id===m.tracedRecord?.id} className={e.read?'sc-read':''} onClick={()=>chooseRecord(e)}><span>{e.id}{e.read?' ✓':''}</span><div className="sc-track"><i style={{width:`${e.score/Math.max(.001,...m.global.map(x=>x.score))*100}%`}}/></div><b>{e.score.toFixed(2)}</b></button>)}</div>
    {entry?<div className="sc-score-detail"><h3>{t('viewing')} · {entry.id}</h3><p>{t(entry.read?'fetched':'notFetched')}</p><MathFormula block>{m.indexFormula}</MathFormula><MathFormula block>{vectorTex('k^I',entry.indexKey)}</MathFormula><MathFormula block>{`I_{${m.inspect+1}}=${entry.headScores.map(v=>v.toFixed(3)).join('+')}=${entry.score.toFixed(3)}`}</MathFormula><p>{t('indexVars')}</p></div>:<p>{t('empty')}</p>}</div>{m.compressed&&<p>{t('indexIndependent')}</p>}
  </>;
}
