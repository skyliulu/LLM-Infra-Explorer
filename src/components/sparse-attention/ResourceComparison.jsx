import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { MathFormula } from '../linear-attention/MathFormula';

export const kib = n => `${(n / 1024).toFixed(n % 1024 ? 2 : 0)} KiB`;
const FORMULAS = { memory:'M=G b_G+L b_L+I b_I', traffic:'D=R_G b_G+L b_L+I b_I', context:'N_{\\max}=\\max\\{N:M(N)\\le B\\}' };

export function ResourceComparison({ model: m, t, update, onFocus }) {
  const [trendsOpen, setTrendsOpen] = useState(true);
  const keys=['globalLabel','localLabel','indexKey'], nodes=['cache','local','index'], colors=['sc-global-byte','sc-teal','sc-index-byte'];
  return <section className="sc-benefits sc-benefits-together" data-testid="resource-comparison">
    <div className="sc-benefit-header"><strong>{t('benefitsTogether')}</strong><span className="sc-estimate-badge">{t('byteExperiment')}</span></div>
    <div className="sc-benefit-columns">
      {m.benefits.map(item => {
        const context = item.id==='context';
        const amount = n => context ? `${n} ${t('tokenUnit')}` : kib(n);
        const Direction = item.direction==='same' ? Minus : item.direction==='up' ? ArrowUp : ArrowDown;
        return <article key={item.id} className={`sc-benefit-card sc-outcome-${item.outcome}`} data-benefit={item.id} data-outcome={item.outcome}>
          <div className="sc-benefit-card-title"><h3>{t(`metric_${item.id}`)}</h3><span>{t(context?'moreIsBetter':'lessIsBetter')}</span></div>
          <div className="sc-benefit-delta"><div><Direction size={20}/><strong>{`${(Math.abs(item.change)*100).toFixed(1)}%`}</strong><small>{t(`direction_${item.direction}`)}</small></div><span className="sc-outcome-label">{t(`outcome_${item.outcome}`)}</span></div>
          <div className="sc-side-row"><span>{t('baseline')}</span><b data-testid="resource-before">{amount(item.before)}</b><div className="sc-track"><i className="sc-before" style={{width:`${item.before/item.scale*100}%`}}/></div></div>
          <div className="sc-side-row"><span>{t(`strategy_${m.mode}`)}</span><b data-testid="resource-after">{amount(item.after)}</b><div className="sc-track sc-linked-track">{item.parts.map((value,i)=>context?<i key={i} className={colors[i]} style={{width:`${value/item.scale*100}%`}}/>:value>0&&<button key={i} className={colors[i]} style={{width:`${value/item.scale*100}%`}} title={`${t(keys[i])} · ${kib(value)} · ${t('locate')}`} aria-label={`${t('locate')} · ${t(keys[i])}`} onClick={()=>onFocus(nodes[i])}/>)}</div></div>
          <div className="sc-benefit-card-foot">
            {context ? <label className="sc-select"><span>{t('budgetLabel')}</span><select value={m.budgetKiB} onChange={e=>update({budgetKiB:+e.target.value})} aria-label={t('budgetLabel')}>{[32,64,128].map(n=><option key={n} value={n}>{`${n} KiB`}</option>)}</select></label> : <div className="sc-cost-parts">{keys.map((key,i)=><button key={key} disabled={!m.nodes.includes(nodes[i])} title={t(m.nodes.includes(nodes[i])?'locate':'noBranch')} onClick={()=>onFocus(nodes[i])}><i className={colors[i]}/>{t(key)} <b>{kib(item.parts[i])}</b></button>)}</div>}
          </div>
          {trendsOpen && <ResourceTrend m={m} id={item.id} t={t}/>}
        </article>;
      })}
    </div>
    <div className="sc-benefit-tools"><span>{t('linkHint')}</span><button aria-expanded={trendsOpen} onClick={()=>setTrendsOpen(v=>!v)}>{t(trendsOpen?'trendClose':'trendToggle')}</button></div>
    <small className="sc-assumption-visible">{t('compactAssumption')}</small>
    <details className="sc-estimate-detail"><summary>{t('formulaDetail')}</summary><p>{t('estimateNotice')} {t('budgetNotice')}</p><div className="sc-estimate-columns">{m.benefits.map(item=><div key={item.id}><h3>{t(`metric_${item.id}`)}</h3><p>{t(`${item.id}Meaning`)}</p><MathFormula block>{FORMULAS[item.id]}</MathFormula><p>{t(`${item.id}Variables`)}</p></div>)}</div><MathFormula block>{`${m.compressed?'G=\\lfloor N/r\\rfloor':'G=N'},\\quad ${m.hasWindow?'L=\\min(N,W)':'L=0'},\\quad ${m.indexed?'I=G':'I=0'}`}</MathFormula></details>
  </section>;
}

function ResourceTrend({m,id,t}) {
  const capacity=id==='context', rows=capacity?m.trends.capacity:m.trends.history;
  const current=capacity?m.budgetKiB:m.tokens, min=capacity?32:1, max=capacity?128:64;
  const value=row=>capacity?row.value:row[id];
  const top=Math.max(...rows.flatMap(row=>[row.baseline,value(row)]));
  const x=n=>40+(n-min)/(max-min)*260, y=n=>86-n/top*70;
  const path=key=>rows.map((row,i)=>`${i?'L':'M'} ${x(row.x)} ${y(key(row))}`).join(' ');
  const selected=rows.find(row=>row.x===current);
  return <div className="sc-trend" data-trend={id}>
    <strong>{t(capacity?'trendBudget':'trendHistory')}</strong>
    <svg viewBox="0 0 320 112" role="img" aria-label={`${t(`metric_${id}`)} · ${t('trendScope')}`}>
      <path d="M40 12 V86 H304" fill="none" stroke="#cbd5e1"/>
      <text x="36" y="15" textAnchor="end">{capacity?top:(top/1024).toFixed(0)}</text><text x="36" y="89" textAnchor="end">{0}</text>
      <path d={path(row=>row.baseline)} fill="none" stroke="#64748b" strokeDasharray="4 3" strokeWidth="2"/>
      <path d={path(value)} fill="none" stroke="#4f46e5" strokeWidth="2"/>
      <line x1={x(current)} x2={x(current)} y1="12" y2="86" stroke="#a5b4fc"/>
      <circle cx={x(current)} cy={y(value(selected))} r="4" fill="#4f46e5"/>
      <text x="40" y="103">{min}</text><text x="300" y="103" textAnchor="end">{max}</text><text x="165" y="109" textAnchor="middle">{capacity?'KiB':t('tokenUnit')}</text>
    </svg>
    <small>{capacity?t('tokenUnit'):'KiB'} · {t('trendScope')}</small><p>{t(capacity?'trendIndependent':m.compressed?'trendWindow':'trendDsa')}</p>
  </div>;
}

export function LocalImpact({m,t}) {
  return <aside className="sc-local-impact" aria-label={t('localImpact')}>
    <div>{m.benefits.map(b=><span key={b.id}><small>{t(`metric_${b.id}`)}</small><b>{b.id==='context'?`${b.after} ${t('tokenUnit')}`:kib(b.after)}</b></span>)}</div>
    <p>{t(`impact_${m.focus==='cache'&&!m.compressed?'raw':m.focus}`)}</p>
  </aside>;
}
