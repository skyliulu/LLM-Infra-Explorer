import React from 'react';
import { Square, Circle, CircleDot } from 'lucide-react';
import { MathFormula } from '../linear-attention/MathFormula';

const vectorTex = (symbol, values) => `${symbol}=\\begin{bmatrix}${values.map(v=>v.toFixed(3)).join('&')}\\end{bmatrix}`;

export function InformationTradeoff({m,t}) {
  const points=[{id:'full',label:'fullReference',symbol:'o_{\\mathrm{token}}',values:m.tradeoff.fullOutput},
    {id:'resident',label:'residentReference',symbol:'o_{\\mathrm{resident}}',values:m.tradeoff.residentOutput},
    {id:'current',label:'currentOutput',symbol:'o',values:m.output}];
  const px=x=>100+x/1.5*80, py=y=>100-y/1.5*80;
  return <section className="sc-tradeoff" aria-label={t('tradeTitle')}>
    <h3>{t('tradeTitle')}</h3><p>{t(`why_${m.mode}`)}</p>
    <h4>{t('coverageTitle')}</h4>
    <div className="sc-coverage">{m.tradeoff.coverage.map(p=><span key={p.position} className={`sc-coverage-${p.kind}`} title={`${`T${p.position+1}`} · ${t(p.kind)}`}>{`T${p.position+1}`}</span>)}</div>
    <div className="sc-coverage-legend">{['direct','summary','missing'].map(kind=><span key={kind} className={`sc-coverage-${kind}`}>{t(kind)} <b>{m.tradeoff.counts[kind]}</b></span>)}</div>
    <small>{t('coverageNote')}</small>
    <div className="sc-output-comparison">
      <div><svg viewBox="0 0 200 200" role="img" aria-label={t('outputDistance')}>
        <path d="M20 100H180 M100 20V180" stroke="#94a3b8" fill="none"/>
        <text x="174" y="115">{1.5}</text><text x="7" y="115">{-1.5}</text><text x="105" y="22">{1.5}</text><text x="105" y="190">{-1.5}</text>
        <line x1={px(points[0].values[0])} y1={py(points[0].values[1])} x2={px(points[2].values[0])} y2={py(points[2].values[1])} stroke="#d97706" strokeDasharray="3 3"/>
        {points.map((p,i)=><g key={p.id} className={`sc-point-${p.id}`}><title>{t(p.label)}: {p.values.map(v=>v.toFixed(3)).join(', ')}</title>{i===0?<rect x={px(p.values[0])-6} y={py(p.values[1])-6} width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"/>:i===1?<circle cx={px(p.values[0])} cy={py(p.values[1])} r="8" fill="none" stroke="currentColor" strokeWidth="2"/>:<circle cx={px(p.values[0])} cy={py(p.values[1])} r="4" fill="currentColor"/>}</g>)}
      </svg><small>{t('vectorAxes')}</small></div>
      <div>{points.map((p,i)=>{const Icon=[Square,Circle,CircleDot][i];return <div key={p.id} className={`sc-vector sc-point-${p.id}`}><strong><Icon size={13}/>{t(p.label)}</strong><MathFormula>{vectorTex(p.symbol,p.values)}</MathFormula></div>;})}</div>
    </div>
    <div className="sc-distance"><span>{t('outputDistance')}<MathFormula>{`\\lVert o-o_{\\mathrm{token}}\\rVert_2=${m.tradeoff.distance.toFixed(3)}`}</MathFormula></span>{m.indexed&&<span>{t('selectionDistance')}<MathFormula>{`\\lVert o-o_{\\mathrm{resident}}\\rVert_2=${m.tradeoff.selectionDistance.toFixed(3)}`}</MathFormula></span>}</div>
    <p>{t('outputNote')}</p><details><summary>{t('formulaDetail')}</summary><p>{t(m.compressed?'referenceCompressed':'referenceDsa')}</p><p>{t('trainedNotice')}</p></details>
  </section>;
}

export function RecordTrace({m,t,onFocus}) {
  const record=m.tracedRecord;
  if(!record) return null;
  const local=record.position!==undefined;
  const contribution=m.reads.find(e=>e.id===record.id);
  return <div className="sc-record-trace" data-trace-id={record.id}>
    <div><strong>{t('viewing')} · {record.id}</strong><span>{t(record.read?'fetched':'notFetched')}</span></div>
    <nav aria-label={t('followTrace')}>
      <button onClick={()=>onFocus(local?'local':'cache')}>{t('backSource')}</button>
      {!local&&m.indexed&&<button onClick={()=>onFocus('index')}>{t('traceIndex')}</button>}
      <button onClick={()=>onFocus('attention')}>{t('traceOutput')}</button>
    </nav>
    {m.focus==='attention'&&!record.read&&<p>{t('traceMissing')}</p>}
    {m.focus==='attention'&&contribution&&<div className="sc-trace-contribution"><span>{t('contribution')} · {(contribution.weight*100).toFixed(1)}%</span><MathFormula>{vectorTex('a_e v_e',contribution.value.map(v=>v*contribution.weight))}</MathFormula></div>}
  </div>;
}
