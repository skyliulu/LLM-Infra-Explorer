import React from 'react';
import {MathFormula} from '../linear-attention/MathFormula';

const formulas = {
  hidden: 'h_t',
  down: 'c^Q=\\operatorname{RMSNorm}(W_{\\mathrm{down}}h_t)',
  latent: 'c^Q\\longrightarrow\\{q,q^I_1,q^I_2\\}',
  main: 'q=W_{\\mathrm{main}}c^Q',
  index: '\\begin{bmatrix}q^I_1\\\\q^I_2\\end{bmatrix}=\\begin{bmatrix}W^I_1\\\\W^I_2\\end{bmatrix}c^Q',
  score: 'w=W_{\\mathrm{score}}h_t',
};
export function ProjectionInspector({selected,t}) {
  const id=formulas[selected]?selected:'latent';
  return <div className="pg-inspector"><h3>{t(`pg_${id}`)}</h3><p>{t(`pgDesc_${id}`)}</p><MathFormula block>{formulas[id]}</MathFormula><small>{t('pgFixture')}</small></div>;
}


export function ProjectionParameters({t,selected,onSelect}) {
  const item=(id,formula,label)=><button onClick={()=>onSelect(id)} aria-pressed={selected===id} aria-label={`${t('pgFixed')} · ${t(`pg_${id}`)}`}><small>{t(label)}</small><MathFormula>{formula}</MathFormula></button>;
  return <section className="pq-parameters"><strong>{t('parameterBank')}</strong><div className="pq-weight-groups"><div className="pq-query-weights"><small>{t('queryParameterGroup')}</small><div>{item('down','W_{\\mathrm{down}}','downLabel')}{item('main','W_{\\mathrm{main}}','mainQueryLabel')}{item('index','W^I=\\begin{bmatrix}W^I_1\\\\W^I_2\\end{bmatrix}','indexHeadLabel')}</div></div><div className="pq-score-weight"><small>{t('scoreParameterGroup')}</small>{item('score','W_{\\mathrm{score}}','pgScore')}</div></div></section>;
}
export function QueryProjection({m,t,selected,onSelect,ready,onFocus}) {
  const ref=(id,formula)=><button className="pq-ref" aria-label={`${t('parameterRef')} · ${t(`pg_${id}`)}`} aria-pressed={selected===id} onClick={()=>onSelect(id)}><MathFormula>{formula}</MathFormula></button>;
  const values=v=><span className="pq-values">{ready?v.map(x=>x.toFixed(2)).join(' · '):'—'}</span>;
  return <div className="pq-flow">
    <div className="pq-latent-row"><button onClick={()=>onSelect('hidden')} aria-label={t('pg_hidden')}><MathFormula>{'h_t'}</MathFormula></button><span>→</span>{ref('down','W_{\\mathrm{down}}')}<span>→</span><small>{t('normalizeLabel')}</small><span>→</span><button onClick={()=>onSelect('latent')} aria-label={t('pg_latent')} aria-pressed={selected==='latent'}><MathFormula>{'c^Q'}</MathFormula></button></div>
    <div className="pq-branches"><div className="pq-branch"><MathFormula>{'c^Q'}</MathFormula><span>→</span>{ref('main','W_{\\mathrm{main}}')}<span>→</span><button className="pq-output" onClick={()=>onSelect('main')} aria-label={t('pg_main')}><MathFormula>{'q'}</MathFormula>{values(m.mainQuery)}</button><button onClick={()=>onFocus('attention')} data-flow="query-attention">{t('alignedToAttention')} →</button></div>
    <div className="pq-branch" data-testid="index-query-path"><MathFormula>{'c^Q'}</MathFormula><span>→</span>{ref('index','W^I')}<span>→</span><button className="pq-output" onClick={()=>onSelect('index')} aria-label={t('pg_index')}>{m.queryHeads.map((v,i)=><span key={i}><MathFormula>{`q^I_{${i+1}}`}</MathFormula>{values(v)}</span>)}</button><button onClick={()=>onFocus('index')} data-flow="query-index">{t('alignedToIndex')} →</button></div></div>
    <div className="pq-branch pq-score"><MathFormula>{'h_t'}</MathFormula><span>→</span>{ref('score','W_{\\mathrm{score}}')}<span>→</span><button className="pq-output" onClick={()=>onSelect('score')} aria-label={t('pg_score')}><MathFormula>{'w_1,w_2'}</MathFormula>{values(m.headWeights)}</button><small>{t('pgScore')}</small></div>
  </div>;
}
