import React, { useState } from 'react';
import { ArrowDown, ArrowRight, Database, Cpu, Network, ExternalLink } from 'lucide-react';
import { useExperimentState } from '../../lib/ExperimentContext';
import { MathFormula } from '../linear-attention/MathFormula';
import { derivePerformance, PERFORMANCE_DEFAULTS, OFFICIAL } from './performance-model';
import { performanceI18n as i18n } from './performance-content';
import './performance.css';

const RECOVERY = String.raw`T_{\mathrm{days}}=\frac{K}{24(R-C)}`;
const UNIT_COST = String.raw`c_{\mathrm{token}}=\frac{C_{\mathrm{hour}}}{Q_{\mathrm{useful/hour}}}`;
const cash = value => value.toLocaleString('en-US', { maximumFractionDigits: 1 });
const source = section => `${OFFICIAL}#${section}`;

function Reuse({ model, t, update }) {
 return <><p>{t('reuseBody')}</p><div className="dp-experiment">
  <label className="dp-slider">{t('hit')}<strong>{model.config.hit}%</strong><input aria-label={t('hit')} type="range" min="0" max="100" step="5" value={model.config.hit} onChange={event => update('hit', Number(event.target.value))}/></label>
  <div className="dp-reuse-bars" data-testid="di-reuse-evidence" data-remaining={model.remaining}>
   <div><span>{t('noCache')}</span><div className="dp-bar"><span className="dp-compute" style={{width:'100%'}}/></div><strong>{model.total}</strong></div>
   <div><span>{t('withCache')}</span><div className="dp-bar"><span className="dp-reused" style={{width:`${model.config.hit}%`}}/><span className="dp-compute" style={{width:`${100-model.config.hit}%`}}/></div><strong>{model.remaining}</strong></div>
  </div><div className="dp-legend"><span><i className="dp-reused"/>{t('reused')}: {model.reused}</span><span><i className="dp-compute"/>{t('compute')}: {model.remaining} {t('positions')}</span></div>
  <p className="dp-note">{t('reuseCaveat')}</p>
 </div><p>{t('cacheCost')}</p><div className="dp-subprinciple"><h4>{t('replay')}</h4><p>{t('replayBody')}</p><a href="#cachearch">{t('cacheLink')}<ArrowRight size={13}/></a></div></>;
}

function Execution({ model, t, update }) {
 return <><p>{t('executeBody')}</p><div className="dp-experiment dp-wide" data-testid="di-wide-evidence" data-ep={model.config.ep}><label className="dp-traffic">{t('epLabel')}<select aria-label={t('epLabel')} value={model.config.ep} onChange={event=>update('ep',Number(event.target.value))}><option value="2">EP2</option><option value="8">EP8</option></select></label><p className="dp-wide-intro">{t('wideIntro')}</p>
  <div className={`dp-wide-groups ep-${model.config.ep}`}>{Array.from({length:model.wide.groups},(_,group)=><div className="dp-ep-group" key={group}><div className="dp-group-input"><span>{t('group')} {group+1} · {t('pooled')}: <strong>{model.wide.tokensPerGroup}</strong></span><ArrowDown size={16}/></div><div className="dp-weight-ranks">{model.wide.ranks.filter(rank=>rank.group===group).map(rank=><div key={rank.rank}><span>GPU {rank.rank+1}</span><div>{rank.experts.map(expert=><span key={expert}>E{expert+1}</span>)}</div></div>)}</div></div>)}</div>
  <div className="dp-wide-metrics"><div><strong>{model.wide.expertsPerRank}</strong><span>{t('localWeights')}</span></div><div><strong>{model.wide.tokensPerExpert}</strong><span>{t('perExpert')}</span></div><div><strong>{model.wide.totalWeightUnits}</strong><span>{t('weightUnits')}</span></div></div><p className="dp-note">{t('wideNote')}</p>
 </div><h4 className="dp-balance-heading">{t('balanceTitle')}</h4><div className="dp-experiment">
  <label className="dp-check"><input type="checkbox" aria-label={t('balance')} checked={model.config.balanced} onChange={event => update('balanced',event.target.checked)}/>{t('balance')}</label>
  <div className="dp-ranks" data-testid="di-expert-evidence" data-end={model.slowest}>{model.loads.map((load,index) => <div key={index}><span>{t('rank')} {index+1}</span><div className="dp-rank-track"><span className="dp-work" style={{width:`${load/16*100}%`}}>{load}</span><span className="dp-wait" style={{width:`${model.waiting[index]/16*100}%`}}>{model.waiting[index]>0?model.waiting[index]:''}</span><i className="dp-finish-line" style={{left:`${model.slowest/16*100}%`}}/></div></div>)}</div><div className="dp-rank-axis"><span>0</span><span>8</span><span>16 · {t('units')}</span></div>
  <div className="dp-legend"><span><i className="dp-work"/>{t('work')}</span><span><i className="dp-wait"/>{t('wait')}</span><strong>{t('totalWork')}: 32 · {t('end')}: {model.slowest} {t('units')}</strong></div><p className="dp-note">{t('balanceNote')}</p>
 </div><div className="dp-subprinciple"><h4>{t('kernels')}</h4><div className="dp-fused"><span>{t('kernelNote')}</span><strong>{t('kernelFlow')}</strong></div><p>{t('kernelsBody')}</p><div className="dp-links"><a href="#parallel">{t('parallelLink')}<ArrowRight size={13}/></a><a href="#quantization">{t('precisionLink')}<ArrowRight size={13}/></a></div></div>
 <details className="dp-official-figure"><summary>{t('wideFigure')}</summary><figure><img src="./deepinfer-wide-ep.png" alt={t('figureAlt')} loading="lazy"/><figcaption>{t('figureNote')} <a href={source('inference-system-overview')} target="_blank" rel="noreferrer">{t('source')}</a></figcaption></figure></details></>;
}

function Capacity({ model, t, update }) {
 return <><p>{t('feedBody')}</p><div className="dp-experiment">
  <label className="dp-traffic">{t('traffic')}<select aria-label={t('traffic')} value={model.config.traffic} onChange={event=>update('traffic',event.target.value)}><option value="prefill">{t('prefillTraffic')}</option><option value="decode">{t('decodeTraffic')}</option></select></label>
  <div className="dp-pools" aria-label={t('poolLabel')} data-testid="di-pool-evidence" data-prefill={model.pools[0]}>{['prefill','decode'].map((stage,index)=><div key={stage}><strong>{t(stage)}</strong><div>{Array.from({length:8},(_,i)=><span key={i} className={i<model.pools[index]?'allocated':''}/>)}</div><span>{model.pools[index]} / 8</span></div>)}</div><p className="dp-note">{t('poolNote')}</p>
 </div><div className="dp-subprinciple"><h4>{t('async')}</h4><p>{t('asyncBody')}</p></div><div className="dp-subprinciple"><h4>{t('speculation')}</h4><p>{t('speculationBody')}</p><a href="#speculative">{t('specLink')}<ArrowRight size={13}/></a></div></>;
}

export default function PerformanceExplorer({ lang }) {
 const t=key=>i18n[lang][key]??key;
 const [config,setConfig]=useExperimentState('DeepInfer.performance',PERFORMANCE_DEFAULTS);
 const [selected,setSelected]=useState('reuse');
 const model=derivePerformance(config);
 const update=(key,value)=>setConfig({...model.config,[key]:value});
 const branches=[['capacity','prefill','prefillSub',Network],['execution','decode','decodeSub',Cpu],['reuse','cache','cacheSub',Database]];
 const selectedKey={reuse:'reuseTitle',execution:'executeTitle',capacity:'feedTitle'}[selected];
 return <>
 <section className="di-section dp-intro" aria-labelledby="di-performance"><span className="dp-kicker">{t('reported')}</span><div className="dp-reported"><div><strong>155T</strong><span>{t('tokens')}</span></div><div><strong>$38</strong><span>{t('income')}</span></div><a href={OFFICIAL} target="_blank" rel="noreferrer">{t('source')}<ExternalLink size={13}/></a></div><p className="dp-note">{t('numbersNote')}</p>
  <h2 id="di-performance" data-section-anchor="deepinfer-performance">{t('lead')}</h2><p className="dp-answer">{t('answer')}</p><div className="dp-unit-cost"><MathFormula>{UNIT_COST}</MathFormula><p>{t('unitCost')}</p></div>
 </section>
 <section className="di-section dp-system" aria-labelledby="di-performance-map" data-testid="di-performance-explorer" data-selected={selected}>
  <div className="di-section-heading"><div><h2 id="di-performance-map" data-section-anchor="deepinfer-performance-map">{t('mapTitle')}</h2><p>{t('mapHint')}</p></div></div>
  <div className="dp-architecture"><div className="dp-ends"><div className="dp-entry">{t('request')}<ArrowDown size={17}/></div><div className="dp-exit"><ArrowDown size={17}/>{t('response')}</div></div><div className="dp-path">{branches.slice(0,2).map(([id,label,sub,Icon],index)=><React.Fragment key={id}>{index===1&&<div className="dp-transfer"><ArrowRight size={22}/><span>{t('kv')}</span></div>}<button className={`dp-node ${selected===id?'selected':''}`} aria-pressed={selected===id} aria-controls="dp-selected-principle" onClick={()=>setSelected(id)}><Icon size={20}/><strong>{t(label)}</strong><span>{t(sub)}</span></button></React.Fragment>)}</div><div className="dp-storage-links"><span><ArrowRight size={16}/>{t('read')}</span><span><ArrowDown size={16}/>{t('store')}</span></div><button className={`dp-node dp-cache ${selected==='reuse'?'selected':''}`} aria-pressed={selected==='reuse'} aria-controls="dp-selected-principle" onClick={()=>setSelected('reuse')}><Database size={19}/><strong>{t('cache')}</strong><span>{t('cacheSub')}</span></button><p className="dp-note">{t('scope')}</p></div>
  <div className="dp-detail" id="dp-selected-principle" aria-live="polite"><div className="dp-detail-heading"><span>{String(branches.findIndex(([id])=>id===selected)+1).padStart(2,'0')}</span><h3>{t(selectedKey)}</h3><a href={source(selected==='reuse'?'kv-cache-storage':selected==='execution'?'inference-system-overview':'data-parallel-load-balancing')} target="_blank" rel="noreferrer">{t('source')}<ExternalLink size={12}/></a></div>
   {selected==='reuse'?<Reuse model={model} t={t} update={update}/>:selected==='execution'?<Execution model={model} t={t} update={update}/>:<Capacity model={model} t={t} update={update}/>}</div>
  <p className="dp-conclusion">{t('summary')}</p>
 </section>
 <section className="di-section dp-economics" aria-labelledby="di-economics" data-testid="di-economics"><h2 id="di-economics" data-section-anchor="deepinfer-economics">{t('economics')}</h2><p>{t('economyIntro')}</p>
  <div className="dp-economy-layout"><div className="dp-economy-inputs">{[['capital',10000,100000,1000],['cost',0,50,1],['revenue',0,100,5]].map(([key,min,max,step])=><label className="dp-slider" key={key}>{t(key==='cost'?'expense':key)}<strong>{key==='revenue'?`${model.config[key]}%`:`$${cash(model.config[key])}`}</strong><input type="range" aria-label={t(key==='cost'?'expense':key)} min={min} max={max} step={step} value={model.config[key]} onChange={event=>update(key,Number(event.target.value))}/></label>)}<p className="dp-note">{t('assumption')}</p></div>
  <div className="dp-cash-results" aria-live="polite" data-days={model.days===null?'none':model.days.toFixed(2)}><div><span>{t('gross')}</span><strong>${cash(model.hourlyRevenue)}</strong></div><div><span>{t('net')}</span><strong>${cash(model.dailyNet)}</strong></div><div className="dp-payback"><span>{t('payback')}</span><strong>{model.days===null?t('noPayback'):`${cash(model.days)} ${t('days')}`}</strong></div><MathFormula>{RECOVERY}</MathFormula><p className="dp-note">{t('variables')}</p><p className="dp-note">{t('formulaNote')}</p></div></div>
  <div className="dp-thirty"><strong>{t('thirty')}: ${cash(model.requiredHourlyNet)}</strong><p>{t('thirtyNote')}</p></div>
 </section>
 </>;
}
