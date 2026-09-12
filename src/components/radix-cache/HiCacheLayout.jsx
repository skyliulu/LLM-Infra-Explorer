import React,{useState,useEffect,useMemo} from 'react';
import {Play,Pause,RotateCcw,SkipForward} from 'lucide-react';
import {deriveHiCacheLayoutState} from './hicache-layout-model';
import {layoutCopy} from './hicache-layout-content';
import {engineCopy} from './hicache-engine-content';
import HiCacheMapping from './HiCacheMapping';
import {PAGE_TOKENS} from './hicache-story';
function LayoutScene({lang,page,pool,setPool,config,setConfig}){
 const [step,setStep]=useState(0),[isPlaying,setPlaying]=useState(false);
 const m=useMemo(()=>deriveHiCacheLayoutState({...config,page,pool,step}),[config,page,pool,step]);const t=k=>layoutCopy[lang][k];
 const done=step===m.limit;const reset=()=>{setPlaying(false);setStep(0);};const handleNextStep=()=>{setPlaying(false);setStep(s=>Math.min(m.limit,s+1));};const togglePlay=()=>{if(done)setStep(0);setPlaying(v=>!v);};
 useEffect(()=>{if(!isPlaying||done)return;const timer=setTimeout(()=>setStep(s=>s+1),850);return()=>clearTimeout(timer);},[isPlaying,done,step]);
 const update=(key,value)=>setConfig({...config,[key]:value});
 const controls=[['layout',['layer_first','page_first','page_first_direct']],['operation',['layer','page']],['backend',m.allowed],['storage',['scatter','file','direct_file']]];
 const activeSegment=m.segments[step-1];
 return <section className="hc-layout-panel hc-layout-lab"><h2 data-section-anchor="hicache-layout">{t('title')}</h2><p>{t('intro')}</p><div className="hc-layout-selected"><strong>{t('selected')}: {page}</strong><span>{PAGE_TOKENS[page].join(' ')}</span><small>{m.perPageBytes} B / {page} · {m.totalBytes} B</small></div>
 <div className="hc-controls"><label>{engineCopy[lang].pool}<select value={pool} onChange={e=>setPool(e.target.value)}>{['mha','mla'].map(v=><option key={v} value={v}>{engineCopy[lang][v]}</option>)}</select></label>{controls.map(([key,values])=><label key={key}>{t(key)}<select value={m[key]} onChange={e=>update(key,e.target.value)}>{values.map(v=><option key={v} value={v}>{t(v)}</option>)}</select></label>)}</div><div className="hc-layout-options"><label>{t('layerIndex')}<select disabled={m.operation!=='layer'} value={m.layer} onChange={e=>update('layer',Number(e.target.value))}>{[0,1,2].map(l=><option key={l} value={l}>{t('layerLabel')} {l+1}</option>)}</select></label><label><input type="checkbox" checked={m.registered} onChange={e=>update('registered',e.target.checked)}/>{t('registered')}</label></div>
 <p className="hc-layout-why">{t(m.layout==='layer_first'?'lfWhy':m.layout==='page_first'?'pfWhy':'pfdWhy')}</p>
 <div className="hc-play-row"><div><strong>{t('physical')}</strong><small>{t('vector')}</small></div><div className="chapter-playback hc-playback"><button onClick={reset} aria-label={t('reset')}><RotateCcw size={17}/></button><button disabled={!m.eligible} onClick={togglePlay} aria-label={t(isPlaying&&!done?'pause':'play')}>{isPlaying&&!done?<Pause size={17}/>:<Play size={17}/>}</button><button disabled={done||!m.eligible} onClick={handleNextStep} aria-label={t('next')}><SkipForward size={17}/></button></div></div>
 <HiCacheMapping model={m} lang={lang} activeSegment={activeSegment}/>
 <div className="hc-layout-metrics">{[['segment',m.segments.length],['requested',`${m.requestedBytes} B`],['complete',`${m.completedBytes} B`],['pack',`${m.packBytes} B`]].map(([label,value])=><div key={label}><small>{t(label)}</small><strong>{value}</strong></div>)}</div><p>{t('segmentNote')}</p>{!m.eligible&&<p className="hc-layout-blocked"><strong>{t('blocked')}</strong> · {t(m.storage==='direct_file'?'blockedNote':'registrationNote')}</p>}
 <div className="hc-overlap"><h3>{t('overlap')}</h3><div className="hc-controls">{['copyTime','computeTime'].map(key=><label key={key}>{t(key)} · {m[key]}<input aria-label={t(key)} type="range" min="1" max="10" value={m[key]} onChange={e=>update(key,Number(e.target.value))}/></label>)}</div><div className="hc-overlap-lanes">{m.schedule.map(s=><div className="hc-overlap-row" key={s.layer}><b>{t('layerLabel')} {s.layer+1}</b><div className="hc-overlap-track"><span className="transfer" style={{left:`${s.transferStart/m.serialTime*100}%`,width:`${m.copyTime/m.serialTime*100}%`}} title={`${t('transfer')} ${s.transferStart}–${s.transferEnd}`}>{t('transfer')}</span><span className="compute" style={{left:`${s.computeStart/m.serialTime*100}%`,width:`${m.computeTime/m.serialTime*100}%`}} title={`${t('compute')} ${s.computeStart}–${s.computeEnd}`}>{t('compute')}</span></div></div>)}</div><p>{t('serial')}: <strong>{m.serialTime}</strong> → {t('pipelined')}: <strong>{m.overlapTime}</strong></p><small>{t('timingNote')}</small></div>
 <details><summary>{t('boundary')}</summary><p>{t('boundaryNote')}</p><p>{t('headNote')}</p><a href="https://github.com/sgl-project/sglang/blob/main/python/sglang/srt/mem_cache/pool_host/mha.py" target="_blank" rel="noreferrer">{t('source')} ↗</a></details>
 </section>;
}
export default function HiCacheLayout({lang,page}){
 const [pool,setPool]=useState('mha');
 const [config,setConfig]=useState({layout:'layer_first',operation:'layer',layer:1,backend:'kernel',storage:'scatter',registered:true,copyTime:3,computeTime:4});
 return <LayoutScene key={JSON.stringify({...config,page,pool})} {...{lang,page,pool,setPool,config,setConfig}}/>;
}

