import React, {useEffect, useMemo, useState} from 'react';
import {ArrowDown, ArrowRight, Check, Database, Pause, Play, RotateCcw, SkipForward} from 'lucide-react';
import {motion, useReducedMotion} from 'framer-motion';
import {MathFormula} from '../linear-attention/MathFormula';
import {buildCedSession, deriveCedSession} from './session-model';
import {sessionCopy} from './session-content';
import './session.css';

const number = n => n.toLocaleString('en-US');
const bytes = n => n >= 1e6 ? `${(n/1e6).toFixed(2)} MB` : n >= 1024 ? `${(n/1024).toFixed(2)} KiB` : `${n} B`;
function WindowGrid({value, t}) {
  return <div className="cs-window"><div className="cs-window-label"><span>{t('local')} · {t('perLayer')}</span><strong>{value.count} / 128</strong></div>
    <div className="cs-window-cells" aria-hidden="true">{Array.from({length:128},(_,i)=>{
      const position=value.end-((value.end-1-i+128)%128), occupied=position>=value.start&&position<=value.end;
      return <i key={i} className={`${occupied?'occupied':''} ${occupied&&position===value.end?'newest':''}`} title={occupied?`${t('positions')} ${position}`:t('empty')}/>;
    })}</div>
    <small>{value.count ? `${number(value.start)} → ${number(value.end)}` : t('empty')}{value.count>0&&<span> · {t('newest')} {number(value.end)}</span>}{value.start>1&&<span> · {t('leftBehind')} 1–{number(value.start-1)}</span>}</small></div>;
}
export default function SessionLifecycle({tokens,lang}) {
  const reducedMotion = useReducedMotion();
  const trace = useMemo(()=>buildCedSession(tokens),[tokens]);
  const [step,setStep] = useState(0), [isPlaying,setIsPlaying] = useState(false), [selection,setSelection] = useState(null);
  const m = deriveCedSession(trace,step), t = key => sessionCopy[lang][key];
  const reset = () => {setStep(0);setIsPlaying(false);setSelection(null);};
  const handleNextStep = () => {setIsPlaying(false);setSelection(null);setStep(s=>Math.min(trace.frames.length-1,s+1));};
  const togglePlay = () => {if(m.done)setStep(0);setSelection(null);setIsPlaying(p=>!p);};
  useEffect(()=>{
    if(!isPlaying || m.done)return;
    const timer=setTimeout(()=>setStep(s=>Math.min(trace.frames.length-1,s+1)),2000);
    return ()=>clearTimeout(timer);
  },[isPlaying,step,m.done,trace]);
  useEffect(()=>{if(m.done)setIsPlaying(false);},[m.done]);
  const inspect = id => {setSelection(id);setIsPlaying(false);};
  const selected = selection || m.active;
  const nodeClass = id => `cs-node ${id} ${m.active===id?'active':''} ${selected===id?'selected':''}`;
  const globalRow = g => <div className={`cs-record-row ${m.resident?'':'ghost'}`} key={g.owner}>
    <div className="cs-record-label"><strong>L{g.owner+1} · {g.ratio}:1</strong><span>{number(g.count)} {t('records')}</span><b>{bytes(g.bytes)}</b></div>
    <div className="cs-record-cells">{g.count>5&&<small>1 …</small>}{g.cells.map(cell=><motion.span layout={!reducedMotion} key={cell.id} className={cell.fresh?'fresh':''} title={`${cell.id} · ${cell.start}–${cell.end}`}><small>#{number(cell.record)}</small><b>{number(cell.start)}{cell.end!==cell.start?`–${number(cell.end)}`:''}</b></motion.span>)}{!g.count&&<small>{t('empty')}</small>}
      {g.pending>0&&<span className="partial"><small>{t(g.pendingReady?'pending':'needState')}</small><b>{number(g.end)}</b></span>}</div>
  </div>;
  return <section className="cs-session" data-testid="ced-session" data-operation={m.operation} data-step={m.step}>
    <div className="ca-heading"><div><h2 data-section-anchor="ced-session">{t('title')}</h2><p>{t('hint')}</p></div></div>
    <div className="cs-toolbar"><small>{t('history')} · {number(trace.initial)}</small><div className="ct-playback-controls">
      <button aria-label={t('reset')} title={t('reset')} onClick={reset}><RotateCcw size={16}/></button>
      <button aria-label={t(isPlaying?'pause':'play')} title={t(isPlaying?'pause':'play')} onClick={togglePlay}>{isPlaying?<Pause size={16}/>:<Play size={16}/>}</button>
      <button aria-label={t('next')} title={t('next')} onClick={handleNextStep} disabled={m.done}><SkipForward size={16}/></button>
    </div></div>
    <div className="cs-turns">{trace.requests.map((r,i)=><button key={i} aria-pressed={m.request===i} onClick={()=>{setStep(r.start);setIsPlaying(false);setSelection(null);}}><span><b>{i+1}</b>{t(['first','tool','return'][i])}</span><small>{t('prefix')} {number(r.prefix)} <ArrowRight size={12}/> {t('suffix')} +{number(r.suffix)}</small></button>)}</div>
    <div className="cs-scene"><div className="cs-graph">
      <div className={`cs-token-lane ${m.active==='input'?'active':''}`}><div><strong>{t('sequence')}</strong><small>{t('ready')} {number(m.completed)}</small></div><div className="cs-token-cells">{m.visible[0]>1&&<small>1 …</small>}{m.tokens.map(token=><motion.span layout={!reducedMotion} key={token.id} className={`${token.kind} ${token.inflight?'inflight':''} ${token.complete?'complete':''}`}><b>{number(token.id)}</b>{token.complete?<Check size={10}/>:<span>·</span>}</motion.span>)}</div></div>
      <div className="cs-legend">{['prefix','input','generated'].map(k=><span key={k}><i className={k}/>{t(k)}</span>)}</div>
      <div className={`cs-connector ${m.active==='encoder'?'flow':''}`}><ArrowDown size={18}/><span>{m.active==='encoder'?t(`title${m.operation}`):t('encoder')}</span></div>
      <button className={nodeClass('encoder')} aria-label={t('encoder')} aria-pressed={selected==='encoder'} onClick={()=>inspect('encoder')}>
        <div className="cs-node-heading"><strong>{t('encoder')}</strong><span>{m.active==='encoder'?t('active'):t(!m.resident?'absent':m.encoderWindow?'resident':'localPending')}</span></div>
        {m.groups.slice(0,3).map(globalRow)}<WindowGrid value={m.encoderTail} t={t}/>
      </button>
      <div className={`cs-connector ${m.active==='decoder'?'flow':''}`}><ArrowDown size={18}/><span>{m.active==='decoder'?t(`title${m.operation}`):t('read')}</span></div>
      <button className={nodeClass('decoder')} aria-label={t('decoder')} aria-pressed={selected==='decoder'} onClick={()=>inspect('decoder')}>
        <div className="cs-node-heading"><strong>{t('decoder')}</strong><span>{m.active==='decoder'?t('active'):t(!m.resident?'absent':m.decoderWindow?'resident':'localPending')}</span></div>
        {globalRow(m.groups[3])}<WindowGrid value={m.decoderTail} t={t}/>
      </button>
      <div className={`cs-connector ${m.active==='archive'?'flow':''}`}><span>{m.operation==='load'?'↑':'↓'}</span><span>{t(m.operation==='load'?'titleload':'titlesave')}</span></div>
      <button className={nodeClass('archive')} aria-label={t('archive')} aria-pressed={selected==='archive'} onClick={()=>inspect('archive')}>
        <div className="cs-node-heading"><strong><Database size={15}/>{t('archive')}</strong><span>{bytes(m.persistentBytes)}</span></div>
        <div className="cs-retained"><span><b>{t('global')}</b><small>{t('saved')} · {m.saved?`1–${number(m.saved)}`:t('empty')}</small></span><span><b>{t('short')}</b><small>{m.checkpoint?`${number(m.checkpointTail.start)}–${number(m.checkpointTail.end)}`:t(m.operation==='expire'||m.request===2?'missing':'empty')}</small></span><span><b>{t('discarded')}</b><small>0 {t('positions')}</small></span></div>
      </button>
    </div><aside className="cs-inspector">
      <div className="cs-current" aria-live="polite"><small>{t('active')} · {m.step+1}/{trace.frames.length}</small><h3>{t(`title${m.operation}`)}</h3></div>
      <p>{t(`note${m.operation}`)}</p>
      {selection&&<div className="cs-inspection"><strong>{t('inspect')} · {t(selection)}</strong><p>{t(selection==='archive'?'archiveDetail':'globalDetail')}</p>{selection!=='archive'&&<p>{t('localDetail')}</p>}<button onClick={()=>setSelection(null)}>{t('back')}</button></div>}
      <div className="cs-metrics"><div><span>{t('globalMetric')}</span><strong>{bytes(m.total)}</strong></div><div><span>{t('deltaMetric')}</span><strong className={m.delta?'increment':''}>+{bytes(m.delta)}</strong></div><div><span>{t('transferMetric')}</span><strong>{bytes(m.loaded)}</strong></div></div>
      <small className="cs-count-note">{t('counters')}</small>
      <div className="cs-comparison"><strong>{t('repairMetric')}</strong><div><span>{t('reference')} {number(m.prefix)}</span><b>{number(m.repair)} {t('unit')}</b></div><div className="cs-bar"><i style={{width:`${m.prefix?m.repair/m.prefix*100:0}%`}}/></div>{m.repair>0?<MathFormula>{`[${m.repairTail.start},${m.repairTail.end}]`}</MathFormula>:<small>{t(m.request===2?'needState':'noRepair')}</small>}</div>
      <div className="cs-comparison"><strong>{t('decoderMetric')}</strong><div><span>{t('reference')} {number(m.target)}</span><b>{number(m.decoderReplay)} {t('unit')}</b></div><div className="cs-bar"><i style={{width:`${m.decoderReplay/m.target*100}%`}}/></div><small>{t('perLayer')} · {t('positions')}</small></div>
      <p className="cs-budget-note">{t('metricNote')}</p>
      <div className="cs-invariant"><Check size={15}/>{m.delta?t('publish'):t('unchanged')}</div>
      <p className="cs-approximation">{t('approximate')}</p>
    </aside></div>
    <input className="cs-scrub" aria-label={t('scrub')} type="range" min={0} max={trace.frames.length-1} value={m.step} onChange={e=>{setStep(Number(e.target.value));setIsPlaying(false);setSelection(null);}}/>
    <details className="cs-boundary"><summary>{t('boundary')}</summary><p>{t('boundaryNote')}</p><a href="https://www.lmsys.org/blog/2026-09-10-deepseek-v41" target="_blank" rel="noreferrer">{t('source')} ↗</a><a href="https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/517ef625df97ec57aadc91b67506a57c20fdc5bb/DeepSeek_V41_Tech_Report.pdf" target="_blank" rel="noreferrer">{t('report')} ↗</a></details>
  </section>;
}
