import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Globe, Layers, RotateCcw } from 'lucide-react';
import { getInitialLang, i18n } from './sparse-attention/content';
import { canvasI18n } from './sparse-attention/canvas-content';
import { CANVAS_DEFAULTS, deriveCanvasModel } from './sparse-attention/canvas-model';
import { NodeMicroscope } from './sparse-attention/AttentionCanvas';
import { ResourceComparison, LocalImpact } from './sparse-attention/ResourceComparison';
import { RecordTrace } from './sparse-attention/InformationTradeoff';
import { explorerI18n } from './sparse-attention/explorer-content';
import { MatrixSystemGraph } from './sparse-attention/MatrixSystemGraph';
import { matrixI18n } from './sparse-attention/matrix-content';
import './sparse-attention/style.css';
import './sparse-attention/canvas.css';
import './sparse-attention/explorer.css';
import './sparse-attention/matrix.css';
import {deriveExecution,executionView} from './sparse-attention/execution-model';
import {ExecutionControls,executionCopy} from './sparse-attention/ExecutionControls';
import './sparse-attention/execution.css';

export default function SparseAttention() {
  const [lang, setLang] = useState(getInitialLang);
  const [input, setInput] = useState(CANVAS_DEFAULTS);
  const [focus, setFocus] = useState('overview');
  const [stepDelay,setStepDelay]=useState(2000);
  const [progress,setProgress]=useState(null),[isPlaying,setIsPlaying]=useState(false);
  const model = useMemo(() => deriveCanvasModel(input, focus), [input, focus]);
  const execution=deriveExecution(model,progress),graphModel=executionView(model,execution);
  const handleNextStep=()=>{setIsPlaying(false);setProgress(p=>Math.min(execution.total,(p??0)+1));};
  const togglePlay=()=>{if(execution.done||!execution.enabled)setProgress(0);setIsPlaying(v=>!v);};
  useEffect(()=>{if(!isPlaying||execution.done)return;const timer=setTimeout(()=>setProgress(p=>Math.min(execution.total,(p??0)+1)),stepDelay);return()=>clearTimeout(timer);},[isPlaying,execution.done,execution.total,progress,stepDelay]);
  useEffect(()=>{if(execution.enabled&&execution.done)setIsPlaying(false);},[execution.enabled,execution.done]);
  const t = key => executionCopy[lang][key] ?? matrixI18n[lang][key] ?? explorerI18n[lang][key] ?? canvasI18n[lang][key] ?? i18n[lang][key] ?? key;
  const pathRef = useRef(null);
  const update = patch => {if(Object.keys(patch).some(k=>['mode','tokens','query','topK','window','csaRatio','hcaRatio'].includes(k))){setIsPlaying(false);setProgress(p=>p===null?null:0);}setInput(old => ({ ...old, ...patch }));};
  const onFocus = value => {
    setIsPlaying(false);
    if(['cache','index'].includes(value)&&model.tracedRecord?.position!==undefined&&model.entry) update({traceId:model.entry.id});
    setFocus(value);
    requestAnimationFrame(()=>{ pathRef.current?.scrollIntoView({block:'start'}); pathRef.current?.focus({preventScroll:true}); });
  };
  const chooseRecord = (record, target) => {
    setIsPlaying(false);
    update({traceId:record.id,...(record.index!==undefined?{inspect:record.index}:{})});
    if(target) {
      setFocus(target);
      requestAnimationFrame(()=>{ pathRef.current?.scrollIntoView({block:'start'}); pathRef.current?.focus({preventScroll:true}); });
    }
  };
  return <div className="sparse-module sc-module bg-slate-50 text-slate-800" data-testid="sparse-module" data-mode={model.mode} data-focus={model.focus} lang={lang}>
    <header className="sa-card sa-header">
      <div className="sa-heading"><Layers size={25} className="text-indigo-600 shrink-0"/><div><h1>{t('title')}</h1><p>{t('canvasSubtitle')}</p></div></div>
      <div className="sa-header-controls"><div className="sa-segment" role="group" aria-label={t('strategy')}>{['dsa','csa','hca'].map(mode => <button key={mode} aria-pressed={model.mode === mode} onClick={() => { update({ mode }); setFocus('overview'); }}>{t(`strategy_${mode}`)}</button>)}</div><div className="sa-actions"><button className="sa-language" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} aria-label={t('language')}><Globe size={16}/>{lang === 'zh' ? 'EN' : '中文'}</button><button className="sa-icon" aria-label={t('reset')} title={t('reset')} onClick={() => { setInput(CANVAS_DEFAULTS); setFocus('overview'); setProgress(null); setIsPlaying(false); }}><RotateCcw size={18}/></button></div></div>
    </header>
    <section className="sc-canvas" aria-label={t('overview')} data-testid="attention-canvas">
      <div className="sc-experiment"><div><strong>{t('why')}</strong><small>{t('experiment')}</small></div><label className="sc-length"><span>{t('tokens')} <b>{model.tokens}</b></span><input aria-label={t('tokens')} type="range" min="1" max="64" value={model.tokens} onChange={e => update({tokens:+e.target.value})}/></label></div>
      <ResourceComparison model={model} t={t} update={update} onFocus={onFocus}/>
      <div className="sc-path" ref={pathRef} tabIndex={-1}><nav aria-label={t('drillPath')}><button onClick={() => onFocus('overview')} disabled={model.focus === 'overview'}>{model.focus !== 'overview' && <ArrowLeft size={14}/>} {t('overview')}</button>{model.focus !== 'overview' && <><span>/</span><strong>{t(`${model.focus}Node`)}</strong>{model.tracedRecord && <><span>/</span><span>{model.tracedRecord.id}</span></>}</>}</nav><div className="sm-query-control" title={t('matrixQueryHint')}><span>{t('matrixQuery')}</span><button className="sm-change-query" onClick={() => update({query:1-model.query})}><RotateCcw size={14}/>{t('changeQuery')}</button><small className="sm-query-result" aria-live="polite">{model.indexed ? <>{t('querySelected')} <b>{graphModel.matrices.selection.globalIds.join(' · ') || t(execution.enabled&&!execution.selectionReady?'runUnselected':'matrixEmpty')}</b></> : t('queryAllRead')}</small></div></div>
      <ExecutionControls stepDelay={stepDelay} onSpeedChange={setStepDelay} e={execution} playing={isPlaying} onPlay={togglePlay} onStep={handleNextStep} onReplay={()=>{setProgress(0);setIsPlaying(false);}} onOverview={()=>{setProgress(null);setIsPlaying(false);}} t={t}/>
      <div className={`sc-workspace ${model.focus !== 'overview' ? 'sc-zoomed' : ''}`} data-testid="canvas-workspace">
        <MatrixSystemGraph model={graphModel} execution={execution} playing={isPlaying} t={t} onFocus={onFocus} chooseRecord={chooseRecord} compact={model.focus !== 'overview'}/>
        {model.focus !== 'overview' && <section className="sc-microscope" aria-label={t(`focus_${model.focus}`)} key={model.focus}>
          <div className="sc-detail-heading"><h2>{t(`focus_${model.focus}`)}</h2><button onClick={() => onFocus('overview')} aria-label={t('back')}><ArrowLeft size={16}/></button></div>
          <div className="sc-io"><span><small>{t('incoming')}</small>{t(`in_${model.focus}`)}</span><ArrowRight size={16}/><span><small>{t('outgoing')}</small>{t(model.focus === 'query' && !model.indexed ? 'routeQuery' : `out_${model.focus}`)}</span>{model.next && <button onClick={() => onFocus(model.next)}>{t('follow')}<ArrowRight size={14}/></button>}</div>
          <div className="sc-detail-scroll" tabIndex={0}>{execution.enabled&&<p className="se-reference">{t('runReference')}</p>}<LocalImpact m={model} t={t}/><RecordTrace m={model} t={t} onFocus={onFocus}/><p className="sc-detail-desc">{t(`desc_${model.focus}`)}</p><NodeMicroscope model={model} t={t} update={update} chooseRecord={chooseRecord} onFocus={onFocus}/></div>
        </section>}
      </div>
      <details className="sc-sources"><summary>{t('boundaries')}</summary><p>{t('boundariesText')}</p><p>{t('sourceDetail')}</p><div className="sa-sources"><a href="https://arxiv.org/html/2512.02556v1#S2.SS1" target="_blank" rel="noreferrer">{t('sourceDsa')}</a><a href="https://arxiv.org/html/2606.19348v1#S2.SS3" target="_blank" rel="noreferrer">{t('sourceV4')}</a></div></details>
    </section>
  </div>;
}
