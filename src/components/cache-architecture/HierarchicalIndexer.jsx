import React,{useEffect,useState} from 'react';
import {Play,Pause,SkipForward,RotateCcw,ArrowRight} from 'lucide-react';
import {MathFormula} from '../linear-attention/MathFormula';
import {deriveHierarchicalIndexer} from './hierarchical';
import {hierarchicalCopy} from './hierarchical-content';
import './hierarchical.css';

export default function HierarchicalIndexer({m,lang,onSelect}){
 const t=k=>hierarchicalCopy[lang][k],v=deriveHierarchicalIndexer(m);
 const [step,setStep]=useState(null),[playing,setPlaying]=useState(false),[record,setRecord]=useState(0);
 const done=step===4,visible=step??4,stages=['global','block','rescore','gather'];
 useEffect(()=>{if(!playing||done)return;const timer=setTimeout(()=>setStep(s=>(s??0)+1),2000);return()=>clearTimeout(timer);},[playing,step,done]);
 useEffect(()=>{if(done)setPlaying(false);},[done]);
 const displayedSource=visible<2?20:v.source;
 const r=v.rows[Math.min(record,v.rows.length-1)],number=n=>n.toLocaleString('en-US');
 const note=visible<2?`${stages[visible]}Note`:visible===2?(v.reuse?'reuseNote':v.restricted?'reindexNote':'fullNote'):'gatherNote';
 return <div className="ci-panel"><div className="ci-heading"><div><h3 data-section-anchor="cachearchitecture-indexer">{t('title')} · L{m.layer+1}</h3><p>{t('why')}</p></div></div>
 {!v.enabled?<div className="ci-empty"><p>{t('other')}</p><button onClick={()=>onSelect(20)}>{t('open')}</button></div>:<>
 <div className="ci-detail-grid"><div className="ci-demo">
 <div className="ci-example-heading"><strong>{t('example')}</strong><div className="ci-controls"><button aria-label={t('reset')} title={t('reset')} onClick={()=>{setPlaying(false);setStep(null);setRecord(0);}}><RotateCcw size={15}/></button><button aria-label={t(playing?'pause':'play')} title={t(playing?'pause':'play')} onClick={()=>{if(step===null||done)setStep(0);setPlaying(p=>!p);}}>{playing?<Pause size={15}/>:<Play size={15}/>}</button><button aria-label={t('next')} title={t('next')} disabled={done} onClick={()=>{setPlaying(false);setStep(s=>s===null?0:Math.min(4,s+1));}}><SkipForward size={15}/></button></div></div>
 <small>{t('exampleNote')}</small>
 <div className="ci-stages" role="group" aria-label={t('stages')}>{stages.map((key,i)=><button key={key} className={step===null?'overview':i===step?'active':i<visible?'passed':'pending'} aria-pressed={step===i} onClick={()=>{setPlaying(false);setStep(i);}}>{t(key)}<small>{t(step===null?'overview':i===step?'running':i<visible?'passed':'pending')}</small></button>)}</div>
 <div className="ci-source"><MathFormula>{`Q^{\\mathrm{index}}_{${displayedSource+1}}\\longrightarrow K^{\\mathrm{index}}_{21}`}</MathFormula><span>{visible>=2&&v.reuse?t('reuse'):t('newQuery')} · L{displayedSource+1}</span></div>
 <div className="ci-blocks">{v.blocks.map(b=><div key={b.id} className={`ci-block ${visible>=1?(b.kept?'kept':'excluded'):''}`}><div className="ci-block-label"><strong>{b.start+1}–{b.end}</strong><span>{t('max')} {b.score.toFixed(1)}</span></div><div className="ci-cells">{v.rows.slice(b.start,b.end).map(row=>{const chosen=visible>=2&&row.selected,masked=visible>=2&&v.restricted&&!row.candidate;return <button key={row.id} aria-label={`${t('position')} ${row.id+1}, ${t(visible>=2?'current':'first')} ${(visible>=2?row.score:row.first).toFixed(1)}${chosen?`, ${t('chosen')}`:''}`} aria-pressed={record===row.id} className={`${chosen?'chosen':''} ${masked?'masked':''}`} onClick={()=>setRecord(row.id)}><small>{row.id+1}</small><strong>{masked?'—':(visible>=2?row.score:row.first).toFixed(1)}</strong><span>{chosen?'✓':'·'}</span></button>;})}</div><small>{visible>=1?t(b.pinned?'pinned':b.kept?'kept':'dropped'):'\u00a0'}</small></div>)}</div>
 </div><aside className="ci-reading"> <small>{t('scope')}</small><div className="ci-metrics">{[['history',v.tokens],['pool',v.candidateBound],['read',v.topCount]].map(([key,value])=><div key={key}><span>{t(key)}</span><strong>{number(value)}</strong><div className="ci-track"><i style={{width:`${value/v.tokens*100}%`}}/></div></div>)}</div>
 <p className="ci-scope">{v.tokens<=16384?t('short'):<>{t('long')} <strong>{(v.candidateBound/v.tokens*100).toFixed(2)}%</strong></>}</p>
 <p className="ci-instruction" aria-live="polite">{t(note)}</p>
 <MathFormula block>{String.raw`s_{l,j}=\sum_h w_{l,h}\,\mathrm{ReLU}(\langle q_{l,h},k_j\rangle)`}</MathFormula><small>{t('scoreNote')}</small><div className="ci-record"><strong>{t('toy')} {r.id+1}</strong><span>{t('first')}: {r.first.toFixed(1)}</span><ArrowRight size={14}/><span>L{v.source+1}: {visible>=2?r.score.toFixed(1):'—'}</span><span>{visible>=2?t(v.restricted&&!r.candidate?'masked':r.selected?'chosen':'eligible'):t(visible>=1?(r.candidate?'kept':'dropped'):'pending')}</span></div>
 <div className={`ci-output ${visible<3?'waiting':''}`}><span>{t('output')} · L{v.source+1} → L{m.layer+1}</span><MathFormula>{visible>=3?`[${v.topIds.map(id=>id+1).join(',')}]\\longrightarrow C_{21}[\\mathrm{positions}]` : String.raw`[\;?\;]\longrightarrow C_{21}`}</MathFormula></div>
 <small>{t('bound')} · {t('rate')}</small>
 </aside></div></>}
 </div>;
}
