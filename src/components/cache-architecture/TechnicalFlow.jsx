import {deriveCedExecution} from './execution';
import {executionCopy} from './execution-content';
import React, {useEffect, useState} from 'react';
import {ArrowDown, ArrowRight, Play, Pause, SkipForward, RotateCcw} from 'lucide-react';
import {MathFormula} from '../linear-attention/MathFormula';
import {technicalCopy as i18n} from './technical-content';
import './technical.css';

const count=n=>n.toLocaleString('en-US');
function Positions({rows,total,t}) {
 return <span className="ct-positions"><span>{count(rows)} / {count(total)} {t('positions')}</span><span className="ct-position-track"><i style={{width:(rows/total*100)+'%'}}/></span></span>;
}
export default function TechnicalFlow({m,lang,ShapeTensor,t:shared}) {
 const [selected,setSelected]=useState('projection'),t=k=>i18n[lang][k],v=m.technical;
 const [step,setStep]=useState(null),[isPlaying,setIsPlaying]=useState(false);
 const execution=deriveCedExecution(m,step),et=k=>executionCopy[lang][k];
 const handleNextStep=()=>{setIsPlaying(false);setStep(value=>value===null?0:Math.min(10,value+1));};
 const reset=()=>{setIsPlaying(false);setStep(0);};
 const togglePlay=()=>{if(step===null||execution.done)setStep(0);setIsPlaying(value=>!value);};
 useEffect(()=>{
  if(!isPlaying||execution.done)return;
  const timer=setTimeout(()=>setStep(value=>Math.min(10,(value??0)+1)),2000);
  return ()=>clearTimeout(timer);
 },[isPlaying,step,execution.done]);
 useEffect(()=>{if(execution.done)setIsPlaying(false);},[execution.done]);
 const status=id=>execution.overview?'overview':execution.status[id];
 const stateBadge=id=><span className="ct-state">{et(execution.overview?'schema':execution.status[id])}{!execution.overview&&(id==='encoder'||id==='window')&&` · ${id==='encoder'?execution.encoderLayers:execution.decoderLayers} / 20`}{!execution.overview&&(id==='encoder'||id==='window')&&<span className="ct-layer-progress">{Array.from({length:20},(_,i)=><i key={i} className={i<(id==='encoder'?execution.encoderLayers:execution.decoderLayers)?'complete':''}/>)}</span>}</span>;
 const detailKey=suffix=>selected==='window'&&m.phase==='decode' ? `windowDecode${suffix}` : `${selected}${suffix}`;
 const input = selected==='baseline'?String.raw`X_l\in\mathbb{R}^{n\times d}`:selected==='encoder'?`X\\in\\mathbb{R}^{${v.inputRows}\\times${m.hiddenDim}}`:selected==='projection'?`H_{20}\\in\\mathbb{R}^{${v.projectionRows}\\times${m.hiddenDim}}`:selected==='window'?`H_{20}[${v.windowStart}:${v.windowEnd}]`:String.raw`C,\ KV^{\mathrm{SWA}}_l,\ X_l`;
 const operation = selected==='baseline'?String.raw`KV_l=f_l(X_l),\quad X_{l+1}=\mathrm{Block}_l(X_l)`:
  selected==='encoder'?String.raw`H_{20}=\mathrm{Encoder}_{1:20}(X)`:
  selected==='projection'?String.raw`C=H_{20}W_{\mathrm{KV}},\quad K_{\mathrm{index}}=CW_{\mathrm{index}}`:
  selected==='window'?(m.phase==='prefill'?String.raw`KV^{\mathrm{SWA}}_l=g_l(X_l^{\mathrm{tail}}),\quad l=21,\ldots,40`:String.raw`KV^{\mathrm{SWA,new}}_l=g_l(X_l),\quad l=21,\ldots,40`):
  String.raw`Q_l=f_Q(X_l),\quad O_l=\mathrm{Attention}\!\left(Q_l,[C_{\mathrm{selected}};KV^{\mathrm{SWA}}_l]\right)`;
 const output = selected==='baseline'?String.raw`KV_{21},\ldots,KV_{40}`:selected==='encoder'?`H_{20}\\in\\mathbb{R}^{${v.inputRows}\\times${m.hiddenDim}}`:
  selected==='projection'?`C\\in\\mathbb{R}^{${v.projectionRows}\\times${m.mainDim}},\\quad K_{\\mathrm{index}}\\in\\mathbb{R}^{${v.projectionRows}\\times${m.indexDim}}`:
  selected==='window'?String.raw`KV^{\mathrm{SWA}}_{21},\ldots,KV^{\mathrm{SWA}}_{40}`:String.raw`O_{21},\ldots,O_{40}\ \longrightarrow\ \mathrm{logits}`;
 const node=(id,children)=> <button className={`ct-node ${id} ct-${status(id)}`} data-state={status(id)} aria-label={t(id)} aria-pressed={selected===id} onClick={()=>setSelected(id)}>{stateBadge(id)}{children}</button>;
 return <section className="ca-ced ct-section"><div className="ca-heading"><div><h2>{t('title')}</h2><p>{t('hint')}</p></div><strong className="ct-phase">{shared(m.phase)}</strong></div>
  <div className="ct-playback" data-testid="ced-playback">
   <div className="ct-playback-top"><strong>{et('title')}</strong><div className="ct-playback-controls">
    <button onClick={reset} aria-label={et('reset')} title={et('reset')}><RotateCcw size={16}/></button>
    <button onClick={togglePlay} aria-label={et(isPlaying?'pause':'play')} title={et(isPlaying?'pause':'play')}>{isPlaying?<Pause size={16}/>:<Play size={16}/>}</button>
    <button onClick={handleNextStep} disabled={!execution.overview&&execution.done} aria-label={et('next')} title={et('next')}><SkipForward size={16}/></button>
    {!execution.overview&&<button onClick={()=>{setIsPlaying(false);setStep(null);}}>{et('overview')}</button>}
   </div></div>
   {!execution.overview&&<><div className="ct-runtime-message" aria-live="polite"><strong>{execution.cursor} / 10 · {et(execution.stage)}{execution.stage==='encoder'?` · L${Math.max(1,execution.encoderLayers-4)}–L${execution.encoderLayers}`:execution.stage==='window'?` · L${execution.decoderLayers+16}–L${execution.decoderLayers+20}`:''}</strong><p>{et(execution.stage+'Body')}</p></div>
    <div className="ct-runtime-metrics"><span>{et('preserved')}<b>{count(execution.existing)}</b></span><span>{et('written')}<b>{count(execution.written)}</b></span><span>{et('resident')}<b>{count(execution.bytes)} B</b></span><span>{et('work')}<b>{count(execution.work)}</b></span></div>
    <small>{et(m.phase)} {et('localScope')}</small>
   </>}
   <small>{et('scope')}</small>
  </div>
  <div className="ct-baseline"><button aria-pressed={selected==='baseline'} onClick={()=>setSelected('baseline')}><strong>{t('baseline')}</strong><small>{t('baselineScope')}</small></button><div><span>{t('firstHalf')}</span><Positions rows={v.inputRows} total={v.inputRows} t={t}/></div><ArrowRight size={18}/><div><span>{t('secondHalf')}</span><Positions rows={v.inputRows} total={v.inputRows} t={t}/></div><small>{t('baselineEnd')}</small></div>
  <div className="ct-workbench"><div className={`ct-scene ${execution.overview?'':'ct-executing'} ${isPlaying?'ct-playing':''}`} data-stage={execution.stage}>
   {node('encoder',<><strong>{t('encoder')}</strong><Positions rows={v.inputRows} total={v.inputRows} t={t}/><ShapeTensor start={m.globalStart} end={m.globalEnd} dim={m.hiddenDim} symbol="H_{20}" t={shared}/></>)}
   <div className={`ct-split ${!execution.overview&&execution.cursor===5?'ct-flow-active':''}`}><div><ArrowDown size={20}/><span>{t('allRows')}</span></div><div><ArrowDown size={20}/><span>{t(m.phase==='prefill'?'tailRows':'currentRow')}</span></div></div>
   <div className="ct-branches"><div>{node('projection',<><strong>{t('projection')}</strong><small>{t('projectionShort')}</small><ShapeTensor start={m.globalStart} end={m.globalEnd} dim={m.mainDim} symbol="C" t={shared}/><small>{t('indexOutput')} · {m.indexDim}</small></>)}</div><div>{node('window',<><strong>{t('window')}</strong><Positions rows={v.decoderRows} total={v.inputRows} t={t}/><ShapeTensor start={v.windowStart} end={v.windowEnd} dim={m.mainDim} symbol={String.raw`KV^{\mathrm{SWA}}_l`} t={shared} tone="decoder"/><small>{t(m.phase==='prefill'?'skip':'noSkip')} {count(v.skippedRows)} {t('positions')}</small></>)}</div></div>
   <div className={`ct-split ct-merge ${!execution.overview&&execution.decoderLayers>0&&!execution.done?'ct-flow-active':''}`}><div><ArrowDown size={20}/><span>{t('globalForAll')}</span></div><div><ArrowDown size={20}/><span>{t('localForEach')}</span></div></div>
   {node('generation',<><strong>{t('generation')}</strong><span>{!execution.overview&&!execution.done?et('pending'):t(m.phase==='prefill'?'ready':'decode')}</span><small>{t('queryOwn')}</small></>)}
   <small className="ct-legend">{!execution.overview&&<>{et('shapeNote')} {et('target')} </>}{t('legend')}{m.phase==='decode'&&<> {t('decodeMatrices')}</>}</small>
  </div><aside className="ct-inspector" aria-live="polite"><small>{t('selected')}</small><h3>{t(selected)}</h3><p className="ct-answer">{t(detailKey('Why'))}</p>
   <div className="ct-io"><h4>{t('input')}</h4><MathFormula block>{input}</MathFormula><p>{t(detailKey('Input'))}</p><h4>{t('operation')}</h4><MathFormula block>{operation}</MathFormula><p>{t(detailKey('Operation'))}</p><h4>{t('output')}</h4><MathFormula block>{output}</MathFormula><p>{t(detailKey('Output'))}</p></div>
   <div className="ct-warning"><strong>{t('boundary')}</strong><p>{t(detailKey('Boundary'))}</p>{(selected==='window'||selected==='generation')&&<p>{t(m.phase==='prefill'?'prefillBoundary':'decodeBoundary')}</p>}</div>
   <div className="ct-account"><strong>{t('account')}</strong><p>{t('firstHalf')}: {count(v.firstHalfWork)} · {t('secondHalf')}: {count(v.secondHalfWork)}</p><MathFormula block>{m.phase==='prefill'?`20\\times ${m.tokens}+20\\times ${m.replay}=${m.encoderWork+m.decoderWork}`:String.raw`20+20=40`}</MathFormula><small>{t('accountScope')}</small></div>
  </aside></div>
 </section>;
}
