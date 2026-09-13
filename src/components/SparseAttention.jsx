import ChapterIcon from './ChapterIcon';
import {useExperimentState} from '../lib/ExperimentContext';
import {useLanguage} from '../lib/LanguageContext';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Layers, RotateCcw } from 'lucide-react';
import { i18n } from './sparse-attention/content';
import { canvasI18n } from './sparse-attention/canvas-content';
import { CANVAS_DEFAULTS, deriveCanvasModel } from './sparse-attention/canvas-model';
import { NodeMicroscope } from './sparse-attention/AttentionCanvas';
import { ResourceComparison, LocalImpact } from './sparse-attention/ResourceComparison';
import AttentionComparison from './sparse-attention/AttentionComparison';
import { RecordTrace } from './sparse-attention/InformationTradeoff';
import { explorerI18n } from './sparse-attention/explorer-content';
import { MatrixSystemGraph } from './sparse-attention/MatrixSystemGraph';
import { matrixI18n } from './sparse-attention/matrix-content';
import './sparse-attention/style.css';
import './sparse-attention/canvas.css';
import './sparse-attention/explorer.css';
import './sparse-attention/matrix.css';
import {deriveExecution,executionView,advanceSequence} from './sparse-attention/execution-model';
import {ExecutionControls,executionCopy} from './sparse-attention/ExecutionControls';
import './sparse-attention/execution.css';

export default function SparseAttention() {
  const [lang] = useLanguage();
  const [input, setInput] = useExperimentState('SparseAttention.input', CANVAS_DEFAULTS);
  const [focus, setFocus] = useState('overview');
  const [projection,setProjection]=useState('latent');
  const [stepDelay,setStepDelay]=useState(500);
  const [sequence,setSequence]=useState({position:null,progress:null}),[isPlaying,setIsPlaying]=useState(false);
  const {position,progress}=sequence;
  const [traceSelection,setTraceSelection]=useState(null);
  const overviewModel=useMemo(()=>deriveCanvasModel(input,'overview'),[input]);
  const model=useMemo(()=>deriveCanvasModel(position===null?input:{...input,tokens:position,queryPosition:position-1,followLatest:traceSelection?.position!==position,traceId:traceSelection?.position===position?traceSelection.traceId:undefined,inspect:traceSelection?.position===position?traceSelection.inspect:63},focus),[input,focus,position,traceSelection]);
  const execution=deriveExecution(model,progress),graphModel=executionView(model,execution);
  const finished=position!==null&&position>=overviewModel.tokens&&execution.done;
  const handleNextStep=()=>setSequence(s=>advanceSequence(s,overviewModel.tokens,execution.total));
  const togglePlay=()=>{if(position===null||finished){setTraceSelection(null);setSequence({position:1,progress:0});}setIsPlaying(v=>!v);};
  useEffect(()=>{if(!isPlaying||finished)return;const timer=setTimeout(()=>setSequence(s=>advanceSequence(s,overviewModel.tokens,execution.total)),stepDelay);return()=>clearTimeout(timer);},[isPlaying,sequence,overviewModel.tokens,execution.total,stepDelay,finished]);
  useEffect(()=>{if(finished)setIsPlaying(false);},[finished]);
  const t = key => executionCopy[lang][key] ?? matrixI18n[lang][key] ?? explorerI18n[lang][key] ?? canvasI18n[lang][key] ?? i18n[lang][key] ?? key;
  const pathRef = useRef(null);
  const update = patch => {if(position!==null&&('traceId' in patch||'inspect' in patch)){setTraceSelection({position,traceId:patch.traceId??model.global[patch.inspect]?.id,inspect:patch.inspect??model.inspect});}if(Object.keys(patch).some(k=>['mode','tokens','query','topK','window','csaRatio','hcaRatio'].includes(k))){setSequence(s=>s.position===null?s:{position:1,progress:0});}setInput(old => ({ ...old, ...patch }));};
  const onFocus = value => {
    if(['cache','index'].includes(value)&&model.tracedRecord?.position!==undefined&&model.entry) update({traceId:model.entry.id});
    setFocus(value);
    requestAnimationFrame(()=>{ pathRef.current?.scrollIntoView({block:'start'}); pathRef.current?.focus({preventScroll:true}); });
  };
  const chooseRecord = (record, target) => {
    update({traceId:record.id,...(record.index!==undefined?{inspect:record.index}:{})});
    if(target) {
      setFocus(target);
      requestAnimationFrame(()=>{ pathRef.current?.scrollIntoView({block:'start'}); pathRef.current?.focus({preventScroll:true}); });
    }
  };
  return <div className="chapter-page sparse-module sc-module bg-slate-50 text-slate-800" data-testid="sparse-module" data-mode={model.mode} data-focus={model.focus} lang={lang}>
    <header className="sa-card sa-header chapter-header">
      <div className="sa-heading"><div><h1 data-section-anchor="sparse-overview"><ChapterIcon chapter="sparseattn"/>{t('title')}</h1><p>{t('canvasSubtitle')}</p></div></div>
      <div className="sa-header-controls"><div className="sa-segment" role="group" aria-label={t('strategy')}>{['dsa','csa','hca'].map(mode => <button key={mode} aria-pressed={model.mode === mode} onClick={() => { update({ mode }); setFocus('overview'); }}>{t(`strategy_${mode}`)}</button>)}</div><div className="sa-actions"><button className="sa-icon" aria-label={t('reset')} title={t('reset')} onClick={() => { setInput(CANVAS_DEFAULTS); setFocus('overview'); setSequence({position:isPlaying?1:null,progress:isPlaying?0:null}); }}><RotateCcw size={18}/></button></div></div>
    </header>
    <section className="sc-canvas" aria-label={t('overview')} data-testid="attention-canvas">
      <div className="sc-experiment"><div><strong>{t('sharedExperiment')}</strong><small>{t('sharedExperimentHint')}</small></div><label className="sc-length"><span>{t('tokens')} <b>{overviewModel.tokens}</b></span><input aria-label={t('tokens')} type="range" min="1" max="64" value={overviewModel.tokens} onChange={e => update({tokens:+e.target.value})}/></label></div>
      <AttentionComparison key={`${overviewModel.mode}-${overviewModel.tokens}-${overviewModel.topK}-${overviewModel.ratio}-${overviewModel.window}`} model={overviewModel} lang={lang} update={update} onFocus={onFocus}/>
      <ResourceComparison model={overviewModel} t={t} update={update} onFocus={onFocus}/>
      <div className="sc-reading-bridge"><h2 data-section-anchor="sparse-structure">{t('structureQuestion')}</h2><small>{t('structureBridge')}</small></div>
      <div className="sc-path" ref={pathRef} tabIndex={-1}><nav aria-label={t('drillPath')}><button onClick={() => onFocus('overview')} disabled={model.focus === 'overview'}>{model.focus !== 'overview' && <ArrowLeft size={14}/>} {t('overview')}</button>{model.focus !== 'overview' && <><span>/</span><strong>{t(`${model.focus}Node`)}</strong>{model.focus!=='history'&&model.tracedRecord && <><span>/</span><span>{model.tracedRecord.id}</span></>}</>}</nav><div className="sm-query-control" title={t('matrixQueryHint')}><span>{t(position===null?'matrixQuery':'sequenceQuery')}</span>{position===null&&<button className="sm-change-query" onClick={() => update({query:1-model.query})}><RotateCcw size={14}/>{t('changeQuery')}</button>}<small className="sm-query-result" aria-live="polite">{model.indexed ? <>{t('querySelected')} <b>{graphModel.matrices.selection.globalIds.join(' · ') || t(execution.enabled&&!execution.selectionReady?'runUnselected':'matrixEmpty')}</b></> : t('queryAllRead')}</small></div></div>
      <ExecutionControls finished={finished} position={position} limit={overviewModel.tokens} onPosition={p=>{setTraceSelection(null);setSequence({position:p,progress:0});}} stepDelay={stepDelay} onSpeedChange={setStepDelay} e={execution} playing={isPlaying} onPlay={togglePlay} onStep={handleNextStep} onReplay={()=>{setTraceSelection(null);setSequence({position:1,progress:0});}} onOverview={()=>{setSequence({position:null,progress:null});setIsPlaying(false);}} t={t}/>
      <div className={`sc-workspace ${model.focus !== 'overview' ? 'sc-zoomed' : ''}`} data-testid="canvas-workspace">
        <MatrixSystemGraph model={graphModel} execution={execution} playing={isPlaying} t={t} onFocus={onFocus} chooseRecord={chooseRecord} compact={model.focus !== 'overview'} projection={projection} onProjection={id=>{setProjection(id);onFocus('query');}}/>
        {model.focus !== 'overview' && <section className="sc-microscope" aria-label={t(`focus_${model.focus}`)} key={model.focus}>
          <div className="sc-detail-heading"><h2 data-section-anchor="sparseattention-1">{t(`focus_${model.focus}`)}</h2><button onClick={() => onFocus('overview')} aria-label={t('back')}><ArrowLeft size={16}/></button></div>
          <div className="sc-io"><span><small>{t('incoming')}</small>{t(`in_${model.focus}`)}</span><ArrowRight size={16}/><span><small>{t('outgoing')}</small>{t(model.focus === 'query' && !model.indexed ? 'routeQuery' : `out_${model.focus}`)}</span>{model.next && <button onClick={() => onFocus(model.next)}>{t('follow')}<ArrowRight size={14}/></button>}</div>
          <div className="sc-detail-scroll" tabIndex={0}>{execution.enabled&&<p className="se-reference">{t('runReference')}</p>}{model.focus!=='history'&&<><LocalImpact m={model} t={t}/><RecordTrace m={model} t={t} onFocus={onFocus}/></>}<p className="sc-detail-desc">{t(`desc_${model.focus}`)}</p><NodeMicroscope projection={projection} model={model} t={t} update={update} chooseRecord={chooseRecord} onFocus={onFocus}/></div>
        </section>}
      </div>
      <details className="sc-sources"><summary>{t('boundaries')}</summary><p>{t('boundariesText')}</p><p>{t('sourceDetail')}</p><div className="sa-sources"><a href="https://arxiv.org/html/2512.02556v1#S2.SS1" target="_blank" rel="noreferrer">{t('sourceDsa')}</a><a href="https://arxiv.org/html/2606.19348v1#S2.SS3" target="_blank" rel="noreferrer">{t('sourceV4')}</a></div></details>
    </section>
  </div>;
}
