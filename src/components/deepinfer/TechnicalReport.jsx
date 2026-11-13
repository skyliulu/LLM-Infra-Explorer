import React, {useEffect,useState} from 'react';
import {useExperimentState} from '../../lib/ExperimentContext';
import {MathFormula} from '../linear-attention/MathFormula';
import {CacheView,DecodeView,KernelView,OverlapView,Playback} from './LessonExplorer';
import {deriveLesson,LESSON_DEFAULTS,LESSON_SOURCE,GEMM_SOURCE} from './lesson-model';
import {i18n} from './lesson-content';
import {article} from './article-content';
import './report.css';

const GEMM=String.raw`[m,k]\times[k,n]\longrightarrow[m,n]`;
const COST=String.raw`c_{\mathrm{token}}=\frac{C_{\mathrm{hour}}}{Q_{\mathrm{SLO/hour}}}`;
const EXPERT=String.raw`X_e\in\mathbb{R}^{m_e\times k},\quad Y_e=\operatorname{SwiGLU}(X_eW_{1,e})W_{2,e}`;
function Experiment({kind,config,setConfig,lang}) {
 const t=k=>i18n[lang][k]??k;
 const [step,setStep]=useState(kind==='kernel'?3:kind==='decode'?2:3),[playing,setPlaying]=useState(false),[token,setToken]=useState(0);
 const model=deriveLesson(config,kind,step,token),max=kind==='kernel'?12:3;
 const update=(key,value)=>{setConfig({...model.config,[key]:value});setStep(0);setPlaying(false);if(key==='batch')setToken(0);};
 useEffect(()=>{if(!playing||step===max){if(playing)setPlaying(false);return;}const timer=setTimeout(()=>setStep(v=>Math.min(max,v+1)),750);return()=>clearTimeout(timer);},[playing,step,max]);
 return <div className="report-demo" data-experiment={kind} data-step={step} data-playing={playing}>
  {kind!=='overlap'&&<Playback t={t} step={step} max={max} playing={playing} setPlaying={setPlaying} setStep={setStep}/>}
  {kind==='cache'&&<CacheView model={model} t={t} update={update} step={step}/>}
  {kind==='decode'&&<><DecodeView model={model} t={t} update={update} token={model.moe.selected.id} setToken={setToken}/><div className="report-expert-shape"><strong>{article[lang].expertBatch} E{model.moe.selected.expert+1} · {article[lang].rowsLabel}: {model.moe.selectedWeight.tokens.length}</strong><MathFormula>{EXPERT}</MathFormula><p>{article[lang].expertShapeNote}</p></div></>}
  {kind==='kernel'&&<KernelView model={model} t={t} step={step} setStep={setStep} setPlaying={setPlaying}/>}
  {kind==='overlap'&&<OverlapView model={model} t={t} update={update}/>}
 </div>;
}
function DataTable({data}) {return <div className="report-table"><table><thead><tr>{data.headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{data.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;}
function Topology({t}) {return <figure className="report-topology"><div className="rt-entry">{t('entry')}</div><div className="rt-stage"><b>Prefill</b><strong>EP2–8 / DP2–8</strong><span>{t('pRole')}</span></div><div className="rt-transfer">{t('kv')}</div><div className="rt-stage"><b>Decode</b><strong>EP64–128 / DP64–128</strong><span>{t('dRole')}</span></div><div className="rt-storage">{t('storage')}</div><figcaption>{t('topologyCaption')}</figcaption></figure>;}
export default function TechnicalReport({lang}) {
 const a=article[lang],t=k=>a[k];
 const [config,setConfig]=useExperimentState('DeepInfer.lesson',LESSON_DEFAULTS);
 const jump=(event,id)=>{event.preventDefault();const heading=document.querySelector(`[data-section-anchor="di-report-${id}"]`);heading?.scrollIntoView({block:'start',behavior:'instant'});if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}};
 return <article className="technical-report">
  <div className="report-lead"><p>{a.meta.lead}</p></div>
  <nav className="report-toc" aria-label={t('contents')}>{a.sections.map((s,i)=><a key={s.id} href={`#deepinfer?section=di-report-${s.id}`} onClick={e=>jump(e,s.id)}><span>{String(i+1).padStart(2,'0')}</span>{s.title.replace(/^\d+ · /,'')}</a>)}</nav>
  {a.sections.map((s,i)=><section className="report-section" key={s.id} data-report-section={s.id}>
   <header><span className="report-number">{String(i+1).padStart(2,'0')}</span><h2 data-section-anchor={`di-report-${s.id}`}>{s.title.replace(/^\d+ · /,'')}</h2></header>
   <p className="report-intro">{s.intro}</p>
   {s.id==='topology'&&<Topology t={t}/>}
   {s.paragraphs.map((p,j)=><p key={j}>{p}</p>)}
   {s.rows&&<DataTable data={s.rows}/>}
   {s.id==='experts'&&<div className="report-equation"><MathFormula>{GEMM}</MathFormula><span>{t('gemmExplanation')}</span></div>}
   {['experts','kernel','cache'].includes(s.id)&&<details className="report-experiment" open={s.id==='experts'}><summary>{s.experiment}</summary><Experiment kind={{experts:'decode',kernel:'kernel',cache:'cache'}[s.id]} config={config} setConfig={setConfig} lang={lang}/></details>}
   {s.id==='scheduling'&&<details className="report-experiment"><summary>{s.experiment}</summary><Experiment kind="overlap" config={config} setConfig={setConfig} lang={lang}/></details>}
   {s.id==='results'&&<><div className="report-equation"><MathFormula>{COST}</MathFormula><span>{t('costExplanation')}</span></div><details className="report-benchmark"><summary>{t('benchmark')}</summary><img src="./deepinfer-wide-ep.png" alt={i18n[lang].figureAlt}/><p>{i18n[lang].figureNote}</p></details></>}
   <p className="report-transition">{s.takeaway}</p>
   <a className="report-source" href={s.id==='kernel'?GEMM_SOURCE:LESSON_SOURCE} target="_blank" rel="noreferrer">{t('source')}</a>
  </section>)}
 </article>;
}
