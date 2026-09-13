import React, {useEffect, useState} from 'react';
import {Play, Pause, SkipForward, RotateCcw} from 'lucide-react';
import {MathFormula} from '../linear-attention/MathFormula';
import './comparison.css';
import {deriveComparisonExecution} from './comparison-model';

const i18n={
  zh:{hidden:'历史隐藏状态',project:'特征投影',featureChange:'改变特征宽度',recordChange:'减少历史记录',axisHint:'每列一个 Token／记录；转置视图',shapeOnly:'维度示意：隐藏宽度 4，Key 宽度 2；投影权重未展开',featureSketch:'4 维教学示意，非模型真实维度',concatenate:'按记录拼接',inspectQuery:'查看 Query',joined:'拼接结果',compressedKey:'压缩 Key',transpose:'转置',dimensions:'教学 Key 维度',compressedRows:'压缩记录',localRows:'局部记录',pendingGroup:'未满组',envelope:'按发布组示意；CSA 还融合前组来源，点击历史压缩查看。',csa:'CSA · 压缩后选读',hca:'HCA · 高压缩',title_csa:'压缩与选读怎样减少主 Attention 的工作？',title_hca:'高比例压缩怎样缩小 Attention？',ratio:'压缩比例',window:'局部窗口',compress:'历史压缩',local:'原始局部窗口',resident:'完整分组发布压缩记录；局部窗口保留最近的原始位置。播放从缓存已驻留时开始，不计压缩开销。',join:'压缩记录与局部记录一起做 Softmax',records:'参与主计算的记录 / 全量位置',title:'稀疏注意力省掉了哪些计算？',ready:'就绪',index:'索引扫描',gatherPhase:'选行',score:'QK 打分',normalize:'Softmax',value:'V 加权',done:'完成',weights:'Softmax 注意力权重',logits:'Q–K 打分',read:'累计读取',cache:'缓存占用',work:'主 QK / V 加权位置',extra:'额外索引扫描',saved:'主计算位置减少',play:'播放矩阵运算',pause:'暂停矩阵运算',next:'矩阵运算下一步',reset:'重置矩阵运算',top:'Top-K',gather:'按位置取出 K、V',note:'两个独立 Query · 共享同一段历史 · 索引模式下每个 Query 独立选行；堆叠矩阵首维为 Query，乘号下标 b 表示逐 Query 运算 · 三维 V 为教学合成数据；色深表示数值大小；描边表示选中位置。两边各自推进，每步最多 8 个位置，步数不是实际耗时。主 KV 1 KiB/位置（K、V 各半），索引 128 B/位置；缓存已驻留，查询时占用不增长。读取量为两个 Query 独立读取之和；下方为单 Query。',full:'Full Attention',dsa:'Sparse Attention',detail:'索引原理',scan:'索引扫描',attention:'主 Attention',output:'输出'},
  en:{hidden:'History hidden states',project:'Feature projection',featureChange:'Change feature width',recordChange:'Reduce history records',axisHint:'One token / record per column; transposed view',shapeOnly:'Shape illustration: hidden width 4, key width 2; projection weights omitted',featureSketch:'4D illustration, not checkpoint dimensions',concatenate:'Concatenate records',inspectQuery:'Inspect query',joined:'Joined records',compressedKey:'Compressed keys',transpose:'Transpose',dimensions:'Teaching key dimension',compressedRows:'Compressed records',localRows:'Local records',pendingGroup:'Incomplete',envelope:'Publication groups shown; CSA also mixes previous-group sources. Inspect compression for details.',csa:'CSA · compress + select',hca:'HCA · high compression',title_csa:'How do compression and selection reduce attention work?',title_hca:'How does high compression shrink attention?',ratio:'Compression ratio',window:'Local window',compress:'Compress history',local:'Raw local window',resident:'Completed groups publish records; the local window retains recent raw positions. Playback uses resident caches and excludes compression cost.',join:'One joint Softmax over compressed and local records',records:'Main records / full-history positions',title:'Which computations does sparse attention skip?',ready:'Ready',index:'Index scan',gatherPhase:'Gather',score:'QK scores',normalize:'Softmax',value:'Weight V',done:'Done',weights:'Softmax attention weights',logits:'Q–K scores',read:'Cumulative reads',cache:'Cache resident',work:'Main QK / weighted V positions',extra:'Extra index scan',saved:'Fewer main positions',play:'Play matrix operations',pause:'Pause matrix operations',next:'Next matrix operation',reset:'Reset matrix operations',top:'Top-K',gather:'Gather K, V by position',note:'Two independent queries · Shared history · Indexed modes select positions independently per query; stacked tensors lead with query dimension, subscript b on multiplication means per-query operations · V has three synthetic teaching channels; intensity encodes magnitude; outlines mark selected positions. Independent timelines, up to 8 positions per step; steps are not wall time. Main KV: 1 KiB/position (half K, half V); index: 128 B/position. Cache stays resident. Reads sum two independent queries; the panel below reports one query.',full:'Full Attention',dsa:'Sparse Attention',detail:'Indexer details',scan:'Index scan',attention:'Main attention',output:'Output'}
};

function Matrix({label,data,cellW=10,cellH=8,active=false,ready=true,selected=[],ids=[],axis='column',visible=Infinity,range=null,shape=null,period=null,groupRows=null,split=null,plane=null,onPlane=null}){
  const [localFront,setLocalFront]=useState(0);
  const front=plane??localFront,setFront=onPlane??setLocalFront;
  const cols=data[0]?.length??1,rows=data.length,stacked=Boolean(shape&&groupRows),layers=stacked?rows/groupRows:1;
  const grid=(group=0)=>{
    const start=stacked?group*groupRows:0,plane=stacked?data.slice(start,start+groupRows):data;
    return <div className="am-grid" data-axis={axis} style={{gridTemplateColumns:`repeat(${Math.max(1,cols)},${cellW}px)`,gridAutoRows:`${cellH}px`}}>
      {plane.flatMap((row,localRow)=>row.map((value,c)=>{
        const r=start+localRow,i=axis==='column'?c:(period?r%period:r),batch=groupRows?Math.floor(r/groupRows):0,rowIds=Array.isArray(ids[0])?ids[batch]:ids,rowSelection=Array.isArray(selected[0])?selected[batch]:selected;
        return <i key={`${r}-${c}`} title={ready&&i<visible?`${rowIds?.[i]||''} ${value.toFixed(3)}`:rowIds?.[i]} data-origin={split===null?undefined:i<split?"compressed":"local"} data-selected={rowSelection?.includes(i)} data-pending={!ready||i>=visible} data-current={range&&i>=range[0]&&i<range[1]} style={{background:ready&&i<visible?`rgba(${value<0?'234,88,12':'109,40,217'},${.18+.72*Math.min(1,Math.abs(value))})`:undefined}}/>;
      }))}
    </div>;
  };
  return <div className="am-matrix" data-active={active} data-ready={ready} data-stacked={stacked}>
    <MathFormula>{label}</MathFormula>
    {stacked?<><div className="am-slice-tabs">{Array.from({length:layers},(_,b)=><button key={b} aria-label={`${label}: b=${b+1}`} aria-pressed={front===b} onClick={()=>setFront(b)}><MathFormula>{`b=${b+1}`}</MathFormula></button>)}</div>
      <div className="am-stack" style={{width:cols*(cellW+1)+8+(layers-1)*12,height:groupRows*cellH+8+(layers-1)*12}}>{Array.from({length:layers},(_,b)=><div key={b} className="am-sheet" data-front={front===b} style={{left:b*12,top:b*12,zIndex:front===b?layers+1:b}}>{grid(b)}</div>)}</div></>:grid()}
    <MathFormula>{shape||`${rows}\\times ${cols}`}</MathFormula>
  </div>;
}

const transpose=rows=>rows.length?rows[0].map((_,i)=>rows.map(row=>row[i])):[[],[]];
const Formula=({children,active=false})=><span className="am-op" data-active={active}><MathFormula>{children}</MathFormula></span>;

export default function AttentionComparison({model:m,lang,update,onFocus}){
  const t=key=>i18n[lang][key];
  const [joinQuery,setJoinQuery]=useState(0);
  const [cursor,setCursor]=useState(null),[playing,setPlaying]=useState(false);
  const e=deriveComparisonExecution(m,cursor);
  useEffect(()=>{if(!playing||e.done)return;const timer=setTimeout(()=>setCursor(c=>(c??0)+1),1000);return()=>clearTimeout(timer);},[playing,e.done,cursor]);
  useEffect(()=>{if(e.done)setPlaying(false);},[e.done]);
  const togglePlay=()=>{if(e.done)setCursor(0);setPlaying(p=>!p);};
  const selections=e.queries.map(q=>q.sparse.global.flatMap((r,i)=>r.read?[i]:[])),selected=[...new Set(selections.flat())],cw=Math.min(12,180/m.tokens),rh=Math.min(8,72/m.tokens);
  const joined=e.queries[joinQuery].sparse.reads,compressed=joined.slice(0,m.globalReads),local=joined.slice(m.globalReads);

  const metrics=lane=>{const n=lane.count;return <small className="am-count"><span>{t('work')}</span><MathFormula>{`${2*lane.scored}/${2*n} \\quad / \\quad ${2*lane.valued}/${2*n}`}</MathFormula><div className="am-workbar"><i style={{width:`${lane.scored/Math.max(m.tokens,m.mainReads)*100}%`}}/><i style={{width:`${lane.valued/Math.max(m.tokens,m.mainReads)*100}%`}}/></div><span>{t('read')} · {(lane.readBytes/1024).toFixed(2)} KiB</span><div className="am-meter"><i style={{width:`${lane.readBytes/(2*Math.max(m.resources.baselineBytes,m.resources.storedBytes))*100}%`}}/></div><span>{t('cache')} · {(lane.storedBytes/1024).toFixed(2)} KiB</span><div className="am-meter am-cache-meter"><i style={{width:`${lane.storedBytes/Math.max(m.resources.baselineBytes,m.resources.storedBytes)*100}%`}}/></div></small>;};
  const main=(sparse)=>{
    const models=e.queries.map(q=>q[sparse?'sparse':'full']),model=models[0],records=model.reads,ids=records.map(r=>r.id),batchIds=models.map(q=>q.reads.map(r=>r.id)),n=records.length,batched=sparse&&m.indexed,lane=sparse?e.sparse:e.full;
    const provenance=sparse&&m.compressed?m.globalReads:null;
    const scoreActive=lane.phase==='score'&&lane.scoreStart<lane.scored,valueActive=lane.phase==='value'&&lane.valueStart<lane.valued;
    return <div className="am-equation" data-path={sparse?'sparse':'full'}>
      <Matrix label="Q" data={e.queries.map(q=>q.sparse.mainQuery)} active={scoreActive}/><Formula>{batched?'\\underset{b}{\\times}':'\\times'}</Formula>
      <Matrix plane={batched?joinQuery:null} onPlane={batched?setJoinQuery:null} split={provenance} label={sparse?(m.compressed?'K_R^T':'K_S^T'):'K^T'} data={batched?models.flatMap(q=>transpose(q.reads.map(r=>r.key))):transpose(records.map(r=>r.key))} shape={batched?`2\\times 2\\times ${n}`:null} groupRows={batched?2:null} cellW={cw} active={scoreActive} ready={!sparse||e.gathered} selected={!sparse&&!m.compressed&&e.gathered?selected:[]} range={scoreActive?[lane.scoreStart,lane.scored]:null} ids={batched?batchIds:ids}/>
      <Formula active={scoreActive}>{lane.normalized?'\\xrightarrow{\\,/\\sqrt{d}\\ ;\\ \\mathrm{softmax}\\,}':'\\xrightarrow{\\,/\\sqrt{d}\\,}'}</Formula>
      <div className="am-weights"><small>{t(lane.normalized?'weights':'logits')}</small><Matrix split={provenance} label={lane.normalized?(sparse?'\\mathrm{softmax}(\\ell_S)':'\\mathrm{softmax}(\\ell)'):(sparse?'\\ell_S':'\\ell')} data={models.map(q=>q.reads.map(r=>lane.normalized?r.weight:r.logit))} cellW={cw} active={scoreActive||valueActive||lane.phase==='normalize'} visible={lane.scored} range={valueActive?[lane.valueStart,lane.valued]:scoreActive?[lane.scoreStart,lane.scored]:null} groupRows={1} ids={batched?batchIds:ids}/></div><Formula>{batched?'\\underset{b}{\\times}':'\\times'}</Formula>
      <Matrix plane={batched?joinQuery:null} onPlane={batched?setJoinQuery:null} split={provenance} label={sparse?(m.compressed?'V_R':'V_S'):'V'} data={batched?models.flatMap(q=>q.reads.map(r=>r.value)):records.map(r=>r.value)} shape={batched?`2\\times ${n}\\times 3`:null} period={batched?n:null} cellH={rh} active={valueActive} ready={!sparse||e.gathered} selected={!sparse&&!m.compressed&&e.gathered?selected:[]} range={valueActive?[lane.valueStart,lane.valued]:null} ids={batched?batchIds:ids} groupRows={batched?n:null} axis="row"/>
      <Formula>{'='}</Formula><div className="am-output"><Matrix label={sparse?'O_S':'O'} data={lane.partial} cellW={14} cellH={12} active={valueActive} ready={lane.valued>0}/></div>

    </div>;
  };
  return <section className="ac-comparison am-comparison" data-testid="macro-comparison" data-playing={playing}>
    <header><h2 data-section-anchor="sparse-comparison">{t(m.compressed?`title_${m.mode}`:'title')}</h2><div className="am-controls">{m.compressed&&<><label>{t('ratio')} <select value={m.ratio} onChange={event=>update({[m.mode==='csa'?'csaRatio':'hcaRatio']:+event.target.value})}>{(m.mode==='csa'?[2,4,8]:[8,16]).map(r=><option key={r} value={r}>{r}</option>)}</select></label><label>{t('window')} <select value={m.window} onChange={event=>update({window:+event.target.value})}>{[4,8,16].map(w=><option key={w} value={w}>{w}</option>)}</select></label></>}{m.indexed&&<label>{t('top')} <select value={m.topK} onChange={e=>update({topK:+e.target.value})}>{[1,2,4,8].map(n=><option key={n} value={n}>{n}</option>)}</select></label>}<div className="se-actions"><button onClick={()=>{setCursor(0);setPlaying(false);}} aria-label={t('reset')}><RotateCcw size={15}/></button><button onClick={togglePlay} aria-label={t(playing?'pause':'play')}>{playing?<Pause size={15}/>:<Play size={15}/>}</button><button onClick={()=>{setPlaying(false);setCursor(c=>Math.min(e.total,(c??0)+1));}} disabled={e.done} aria-label={t('next')}><SkipForward size={15}/></button></div></div></header>
    <div className="am-scroll" tabIndex={0}><div className="am-canvas">
      <div className="am-lane"><strong>{t('full')}<small>{t(e.full.phase)}</small></strong>{main(false)}{metrics(e.full)}</div>
      <div className="am-lane am-sparse"><strong>{t(m.mode)}<small>{t(e.sparse.phase==='gather'?'gatherPhase':e.sparse.phase)}</small></strong><div className="am-index-equation">
        {m.compressed&&<div className="am-compression-source">
          <small>{t('axisHint')}</small>
          <div className="am-equation am-source-equation">
            {[4,2].map((width,index)=><React.Fragment key={width}>
              {index===1&&<div className="am-shape-arrow"><small>{t('project')}</small><MathFormula>{'\\xrightarrow{W_K:4\\times2}'}</MathFormula><small>{t('featureChange')}</small></div>}
              <div className="am-shape-matrix"><small>{t(index?'project':'hidden')}</small><MathFormula>{index?'K_{\\mathrm{hist}}^T':'H^T'}</MathFormula>
                <div className="am-shape-grid" style={{gridTemplateColumns:`repeat(${m.tokens},${Math.min(7,150/m.tokens)}px)`}}>{Array.from({length:width*m.tokens},(_,i)=><i key={i} data-boundary={i%m.tokens%m.ratio===0}/>)}</div>
                <MathFormula>{`${width}\\times${m.tokens}`}</MathFormula>
              </div>
            </React.Fragment>)}
            <button onClick={()=>onFocus('cache')} className="am-compress-op"><small>{t('compress')}</small><MathFormula>{`\\xrightarrow{r=${m.ratio}}`}</MathFormula><small>{t('recordChange')}</small><MathFormula>{`${m.tokens}\\to${m.global.length}`}</MathFormula></button>
            <div><small>{t('compressedKey')}</small><Matrix label={'\\bar K^T'} data={transpose(m.global.map(r=>r.key))} split={m.global.length} ids={m.global.map(r=>r.id)} cellW={cw}/></div>
          </div>
          <small>{t('shapeOnly')} · {t('resident')} {m.indexed&&t('envelope')}</small>
        </div>}
        {m.indexed&&<div className="am-equation">
          <Matrix label="Q^I" data={e.queries.flatMap(q=>q.sparse.queryHeads)} shape={'2\\times 2\\times 2'} groupRows={2} active={e.phase==='index'}/><Formula>{'\\times'}</Formula>
          <Matrix label="(K^I)^T" data={transpose(m.global.map(r=>r.indexKey))} cellW={cw} active={e.phase==='index'} range={e.phase==='index'?[e.indexStart,e.indexCount]:null} selected={e.gathered?selected:[]} ids={m.global.map(r=>r.id)}/>
          <Formula active={e.phase==='index'}>{'\\xrightarrow{\\mathrm{ReLU}\\ ;\\ \\sum_h w_h}'}</Formula>
          <Matrix label="I" data={e.queries.map(q=>q.sparse.global.map(r=>r.score))} cellW={cw} visible={e.indexCount} range={e.phase==='index'?[e.indexStart,e.indexCount]:null} selected={e.gathered?selections:[]} groupRows={1} ids={m.global.map(r=>r.id)}/>
          <button className="am-topk" onClick={()=>onFocus('index')} title={t('detail')}><MathFormula>{'\\xrightarrow{\\mathrm{TopK}} S'}</MathFormula><span>{e.gathered?e.queries.map((q,i)=><small key={i}>{i+1}: {q.sparse.global.filter(r=>r.read).map(r=>r.id).join(' · ')}</small>):'—'}</span></button>
        </div>}
        {m.compressed?<div className="am-join-block" data-active={e.phase==='gather'}>
          <div className="am-join-title"><small>{t('concatenate')}</small>{m.indexed&&<div className="am-slice-tabs"><small>{t('inspectQuery')}</small>{[0,1].map(b=><button key={b} aria-pressed={joinQuery===b} onClick={()=>setJoinQuery(b)}><MathFormula>{`b=${b+1}`}</MathFormula></button>)}</div>}</div>
          <div className="am-join-parallel">{['key','value'].map((channel)=>{
            const symbol=channel==='key'?'K':'V',width=channel==='key'?2:3;
            const rows=records=>records.length?transpose(records.map(r=>r[channel])):Array.from({length:width},()=>[]);
            return <div className="am-join-equation" key={channel} data-channel={channel}>
              <div className="am-join-part"><small className="am-origin-label">{t('compressedRows')} · {compressed.length}</small><Matrix label={`\\bar ${symbol}${m.indexed?'_S':''}^T`} data={rows(compressed)} cellW={6} cellH={7} split={compressed.length} ready={e.gathered} ids={compressed.map(r=>r.id)}/></div>
              <Formula>{'+'}</Formula>
              <div className="am-join-part"><small className="am-origin-label" data-origin="local">{t('localRows')} · {local.length}</small><Matrix label={`${symbol}_W^T`} data={rows(local)} cellW={6} cellH={7} split={0} ids={local.map(r=>r.id)}/></div>
              <Formula active={e.phase==='gather'}>{'\\longrightarrow'}</Formula>
              <div className="am-join-part"><small>{t('joined')}</small><Matrix label={`${symbol}_R^T`} data={rows(joined)} cellW={6} cellH={7} split={compressed.length} ready={e.gathered} ids={joined.map(r=>r.id)}/></div>
            </div>;
          })}</div>
          <div className="am-join-footer"><MathFormula>{`${compressed.length}+${local.length}=${joined.length}`}</MathFormula><small>{t('axisHint')} · {t('join')}</small></div>
        </div>:<div className="am-gather" data-active={e.phase==='gather'}><span>↓</span><MathFormula>{'K_{S_b}=K[S_b,:],\\quad V_{S_b}=V[S_b,:]'}</MathFormula><small>{t('gather')}</small></div>}
        {main(true)}
      </div>{metrics(e.sparse)}</div>
    </div></div><div className="am-summary">{m.indexed&&<span>{t('extra')}: {2*e.indexCount}/{2*m.global.length}</span>}<span>{t('records')}: {2*m.mainReads}/{2*m.tokens}</span></div><small className="am-note">{t('note')}</small>
  </section>;
}
