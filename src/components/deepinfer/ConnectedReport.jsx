import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,CornerUpLeft,Play,Pause,RotateCcw,SkipForward} from 'lucide-react';
import {useExperimentState} from '../../lib/ExperimentContext';
import {MathFormula} from '../linear-attention/MathFormula';
import {CacheView,OverlapView} from './LessonExplorer';
import {deriveLesson,LESSON_DEFAULTS,LESSON_SOURCE,GEMM_SOURCE} from './lesson-model';
import ExpertComparison from './ExpertComparison';
import {EplbShiftPanel,KernelBuffers,SchedulingLab} from './MechanismPanels';
import {i18n} from './lesson-content';
import './connected.css';
import SystemAtlas,{BenefitPath} from './SystemAtlas';
import './atlas.css';
const COST=String.raw`c_{\mathrm{token}}=\frac{C_{\mathrm{total}}}{Q_{\mathrm{SLO}}}`;
const copy={zh:{
 lead:'DeepInfer 分开部署输入处理与逐步生成，再用共享历史、专家批量和异步执行提高资源利用率。从一条请求出发，看这些选择如何减少重算、重复读取和等待。',
 back:'返回系统总览',system:'推理服务',
 layoutTitle:'Attention 与 MoE 的并行方式',layoutText:'Attention 按请求划分：每张卡读取自己请求的历史。进入 MoE 后，输入表示按专家重新聚集，结果再回到来源卡。切换 Prefill 与 Decode，对比批量大小如何决定 EP 规模。',layoutNote:'图中是官方 V4.1 Flash 的部署范围，不是开源引擎必须使用的卡数。后面的 8 卡例子只用于解释分组与权重复用。',
 layoutP:'Prefill · 处理未命中输入',layoutD:'Decode · 逐 Token 生成',layoutPBatch:'单请求 256+ Token · 本地批量已饱满',layoutDBatch:'每请求 1 Token · 需要跨卡汇集批量',layoutPRange:'较小通信域 · EP2–8',layoutDRange:'宽专家并行 · EP64–128',layoutPSummary:'Prefill 已有较大 Token 批量，官方部署选显存容得下的较小 EP（2–8），减少跨卡分发范围。',layoutDSummary:'Decode 每步每请求只贡献极少 Token，用更宽的 EP（64–128）把更多请求汇到同一份专家权重上。',layoutPSub:'Attention DP · 大批量',layoutDSub:'Attention DP · 1 Token/请求',
 expertsTitle:'宽 EP：把输入汇到同一份权重',expertsText:'每个独立 EP 组都持有一套完整的逻辑专家。把四个 EP2 组合成一个 EP8 组后，同一专家不再在四个组中分别读入，而是用一份权重处理汇集后的多行输入。选择 E1，可以同时追踪它在两种布局里的所有副本。',expertsAfter:'并发少时，跨组重复命中的专家也少，宽组未必能省下读取。热门专家集中时，还要等最忙的卡；EPLB 用额外物理副本分摊 Token，代价是显存和权重搬运。',
 kernelTitle:'Mega MoE：按块交叠通信与计算',kernelText:'Token 聚到专家后，要经过分发、两次矩阵乘及 SwiGLU、结果合并。Mega MoE 把这些操作融合，按块衔接通信与计算。下图取同一专家所在卡的三个输入块 A、B、C：输入到齐即可计算，专家贡献可以提前写回；最终输出还要等相关卡完成写入，再在来源卡归约。',
 cacheTitle:'共享历史：减少重算，放开路由',cacheText:'入口先查前缀元数据，再把请求交给有剩余配额的 Prefill 引擎。所有 P 实例都能从 3FS 读取块 KV，因此请求不必回到上次处理它的忙机器。改变命中块数、接收实例或点击阶段，观察同一批 H/N 块如何流转。',cacheAfter:'持久块 KV 存于 3FS，异步取到主机后逐层装入 HBM（GDR 经 RDMA 搬运，不占 SM）；SWA 状态存于主机内存并通过目录定位，缺失时可用有界重放恢复。',ced:'CED 共享 KV 与 SWA 重放原理',play:'播放',pause:'暂停',next:'下一步',reset:'重置',
 schedulingTitle:'调度：同时看批量与历史长度',schedulingText:'Prefill 用上下文分桶和时间配额分配工作：已命中前缀与本次 chunk 长度共同决定成本。Decode 则要同时看请求数和 KV 总长度；点击下方两种策略，直接在上方 GPU 负载条上观察新请求接入后的变化。',schedulingAfter:'这些策略安排的是设备应该接多少工作。CPU/GPU 异步执行解决另一层等待：设备已经有采样结果时，可以继续下一轮前向，CPU 稍后更新请求状态。',overlap:'补充：引擎内 CPU/GPU 交叠',
 resultsTitle:'实测吞吐与单位成本',resultsText:'权重读取少了，不代表端到端一定同比加速。官方曲线比较的是单用户速度与每 GPU 输出吞吐的取舍；选定一个用户速度要求，再比较能交付多少吞吐，才与服务成本有关。',plotNote:'读图约数，不是从演示计数换算的性能：在单用户速度约 200 Token/s 附近，蓝色 EP64 曲线在 20k Token/s/GPU 以上，橙色 EP8 在约 13k 附近。这里只读曲线的位置，不把插值当作一个额外实测点。',plotConditions:'官方图：上下文 131,072，nextn=3，逐 Token 接受率 75%；专家副本配置也不同。所有数值和适用条件以原图为准。',cost:'同一观察窗口内，以总费用除以满足延迟目标的有效输出量；总费用包含计算、存储、网络和备用资源。',release:'155T Token/天和 38 美元/GPU·小时收入是完整生产服务的报告口径。开源仓库提供离线核心引擎；完整缓存服务、跨副本负载均衡和分离部署还需配套，不能据收入直接推出利润或回本周期。',source:'官方资料与版本',in:'本卡请求',route:'按专家分发',compute:'专家执行',combine:'合并回原卡',
},en:{
 lead:'DeepInfer separates input processing from token generation. Shared history, larger expert batches and asynchronous execution reduce recomputation, repeated weight reads and waiting.',
 back:'Return to the system',system:'Serving system',
 layoutTitle:'Two cooperating forms of parallelism',layoutText:'Attention partitions requests so each rank reads its own history; MoE regroups representations by expert and returns results to source ranks. Switch Prefill and Decode to see how batch size drives EP width.',layoutNote:'The map shows the official V4.1 Flash deployment range, not a mandatory size for the public engine. The eight-rank example below isolates group structure and weight reuse.',
 layoutP:'Prefill · uncached input',layoutD:'Decode · token-by-token',layoutPBatch:'256+ tokens/req · local batch already full',layoutDBatch:'1 token/req · needs wide batch gathering',layoutPRange:'Compact domain · EP2–8',layoutDRange:'Wide expert parallel · EP64–128',layoutPSummary:'Prefill already has large token batches, so production chooses a smaller EP group (2–8) that fits HBM and limits dispatch scope.',layoutDSummary:'Decode contributes few tokens per request per step, so wider EP (64–128) gathers more requests onto each expert weight copy.',layoutPSub:'Attention DP · large batch',layoutDSub:'Attention DP · 1 tok/req',
 expertsTitle:'Same eight ranks, fewer repeated weight reads',expertsText:'Each independent EP group holds a complete logical expert set. Combining four EP2 groups into one EP8 group lets one weight copy serve gathered input rows instead of loading that expert separately in four groups. Choose E1 to trace all of its physical copies on both sides.',expertsAfter:'At low concurrency, repeated expert activations across groups may be scarce. Hotspots also make the group wait for its busiest rank. EPLB spreads tokens across extra physical copies, at a cost in memory and weight movement.',
 kernelTitle:'From expert input to output: what is ready?',kernelText:'Tokens pass through dispatch, two GEMMs with SwiGLU, and combine. Mega MoE fuses these operations and connects communication to computation block by block. A, B and C are three input blocks on one expert-owner rank: ready input enables computation and contributions can be written back early; final output still waits for the relevant ranks and source-side reduction.',
 cacheTitle:'Shared history frees the routing decision',cacheText:'The entrypoint matches prefix metadata before sending work to a Prefill engine with spare quota. Every P instance can fetch block KV from 3FS, so a request need not return to its previous busy machine. Change the hit length, receiver or click any stage to trace H/N blocks.',cacheAfter:'Persistent block KV lives on 3FS, fetches asynchronously to host and loads layer-by-layer into HBM (GDR via RDMA avoids SM usage); SWA lives in host memory via a directory or recovers by bounded replay.',ced:'CED shared KV and SWA replay',play:'Play',pause:'Pause',next:'Next',reset:'Reset',
 schedulingTitle:'Fewer requests can still mean more work',schedulingText:'Prefill uses context buckets and time quotas while Decode balances request count and total KV length. Click either policy below to highlight its chosen GPU and delta bars above.',schedulingAfter:'These policies decide which work reaches the device. CPU/GPU overlap addresses a different gap: once sampling results are on device, the next forward pass can proceed while the host later updates request state.',overlap:'Further detail: CPU/GPU overlap',
 resultsTitle:'Connect the mechanism to measured performance',resultsText:'Fewer ideal weight reads do not imply the same end-to-end speedup. The official curves trade per-user speed against output throughput per GPU. Compare useful throughput at a common user-speed target before drawing serving-cost conclusions.',plotNote:'Approximate reading of the curves, not performance inferred from the toy: near 200 tokens/s/user, blue EP64 is above 20k tokens/s/GPU while orange EP8 is near 13k. Curve interpolation is not an additional measured point.',plotConditions:'Official figure: context 131,072; nextn=3; per-token acceptance 75%. Expert-replica configurations also differ. The original figure defines the full comparison conditions.',cost:'Total expenditure (compute, storage, networking and reserves) divided by useful output meeting latency targets in the same time window.',release:'155T tokens/day and $38 revenue/GPU-hour describe the complete production service. The public repository supplies an offline core engine; complete caching, replica balancing and disaggregated serving require integration. Revenue alone does not determine profit or payback.',source:'Official sources and version',in:'Local requests',route:'Dispatch by expert',compute:'Expert execution',combine:'Combine to source',
}};

Object.assign(copy.zh,{layoutNav:'Attention 与 MoE 并行',expertsNav:'宽 EP 与权重复用',kernelNav:'Mega MoE 交叠执行',cacheNav:'共享历史与路由',schedulingNav:'批量与历史调度',resultsNav:'实测吞吐与成本',evidenceTitle:'官方 Decode 曲线 · 64 请求/rank',evidenceUnits:'单用户 Token/s / 每 GPU Token/s · 读图约数，副本配置不同 →',benchmarkLocate:'定位图上同一请求数的点',original:'打开原图',requestsRank:'请求 / rank',userSpeed:'单用户速度',gpuThroughput:'每 GPU 吞吐',readUnits:'单位：Token/s；从原图标点读取的约数。',pointMeaning:'同请求数下，宽组曲线同时更靠右、也更高。但这不是固定同一用户速度的比较；两组专家冗余配置也不同。',pointMechanism:'专家图解释权重为什么能被更多输入行复用；这里检验整个执行栈在给定条件下的结果，两者不能用一个倍率替换。'});
Object.assign(copy.en,{layoutNav:'Attention & MoE parallelism',expertsNav:'Wide EP weight reuse',kernelNav:'Mega MoE overlap',cacheNav:'Shared history & routing',schedulingNav:'Batch & context scheduling',resultsNav:'Throughput & unit cost',evidenceTitle:'Official Decode curve · 64 requests/rank',evidenceUnits:'User tokens/s / GPU tokens/s · approximate, different replicas →',benchmarkLocate:'Locate equal request-count points',original:'Open original',requestsRank:'requests / rank',userSpeed:'Per-user speed',gpuThroughput:'GPU throughput',readUnits:'Units: tokens/s; approximate readings of original marked points.',pointMeaning:'At equal request count, the wide-group point is further right and higher. This does not fix per-user speed, and replica configurations also differ.',pointMechanism:'The expert view explains reuse across input rows. This curve measures the execution stack under stated conditions; ideal read counts do not replace it.'});

function ParallelPath({t}){
 const [stage,setStage]=useState('decode');
 const isP=stage==='prefill';
 const subs=isP?[t('layoutPSub'),'All-to-All · EP2–8','GEMM / SwiGLU','Attention DP']:[t('layoutDSub'),'All-to-All · EP64–128','GEMM / SwiGLU','Attention DP'];
 return <div className={`cx-parallel-lab ${stage}`}>
  <div className="cx-controls">
   <button type="button" aria-pressed={isP} onClick={()=>setStage('prefill')}>{t('layoutP')}</button>
   <button type="button" aria-pressed={!isP} onClick={()=>setStage('decode')}>{t('layoutD')}</button>
   <span className="cx-stage-pill">{t(isP?'layoutPBatch':'layoutDBatch')}</span>
   <span className="cx-stage-pill ep">{t(isP?'layoutPRange':'layoutDRange')}</span>
  </div>
  <div className="cx-local-path">{['in','route','compute','combine'].map((key,i)=><React.Fragment key={key}>{i>0&&<ArrowRight size={16}/>}<div className={i===1||i===2?'highlight':''}><strong>{t(key)}</strong><small>{subs[i]}</small></div></React.Fragment>)}</div>
  <p className="cx-caption">{t(isP?'layoutPSummary':'layoutDSummary')}</p>
 </div>;
}

function CacheLab({config,setConfig,lang}){
 const [step,setStep]=useState(1),[playing,setPlaying]=useState(false),model=deriveLesson(config,'cache',step),t=k=>i18n[lang][k],labels=copy[lang];
 const done=step===3;
 useEffect(()=>{if(!playing||done){if(done)setPlaying(false);return undefined;}const timer=setTimeout(()=>setStep(v=>Math.min(3,v+1)),900);return()=>clearTimeout(timer);},[playing,step,done]);
 const onStep=next=>{setPlaying(false);setStep(next);};
 return <div className="cx-cache">
  <div className="cx-controls">
   <div className="chapter-playback">
    <button type="button" aria-label={labels.reset} title={labels.reset} onClick={()=>{setPlaying(false);setStep(0);}}><RotateCcw size={15}/></button>
    <button type="button" aria-label={playing?labels.pause:labels.play} title={playing?labels.pause:labels.play} onClick={()=>{if(done)setStep(0);setPlaying(v=>!v);}}>{playing?<Pause size={15}/>:<Play size={15}/>}</button>
    <button type="button" aria-label={labels.next} title={labels.next} disabled={done} onClick={()=>{setPlaying(false);setStep(v=>Math.min(3,v+1));}}><SkipForward size={15}/></button>
   </div>
   <span>{step} / 3</span>
  </div>
  <CacheView model={model} t={t} step={step} onStep={onStep} compact update={(k,v)=>{setConfig({...config,[k]:v});setPlaying(false);setStep(0);}}/>
 </div>;
}

function BenchmarkEvidence({lang,t}){const [point,setPoint]=useState(64),rows=point===64?[["EP64",250,16000],["EP8",200,12500]]:[["EP64",300,9500],["EP8",220,7000]];return <div className="cx-benchmark-pair"><figure className="cx-benchmark"><div className="cx-plot-wrap"><img src="./deepinfer-wide-ep.png" alt={i18n[lang].figureAlt}/><svg viewBox="0 0 1350 930" aria-hidden="true">{(point===64?[[961,457],[800,520]]:[[1130,585],[875,636]]).map(([x,y])=><g key={x}><circle cx={x} cy={y} r="24" fill="none" stroke="white" strokeWidth="7"/><circle cx={x} cy={y} r="24" fill="none" stroke="#0f172a" strokeWidth="3" strokeDasharray="7 5"/></g>)}</svg></div><figcaption>{t('plotConditions')} <a href="./deepinfer-wide-ep.png" target="_blank" rel="noreferrer">{t('original')}</a></figcaption></figure><div className="cx-benchmark-inspector"><strong>{t('benchmarkLocate')}</strong><div className="cx-controls">{[64,32].map(n=><button key={n} aria-pressed={point===n} onClick={()=>setPoint(n)}>{n} {t('requestsRank')}</button>)}</div><table><thead><tr><th>EP</th><th>{t('userSpeed')}</th><th>{t('gpuThroughput')}</th></tr></thead><tbody>{rows.map(row=><tr key={row[0]}>{row.map((v,i)=><td key={i}>{i===0?v:`≈ ${v.toLocaleString()}`}</td>)}</tr>)}</tbody></table><small>{t('readUnits')}</small><p>{t('pointMeaning')}</p><p>{t('pointMechanism')}</p></div></div>;}
function ReportSection({id,parent,children,t,back}){return <section className="cx-section" data-connected-section={id}><nav className="cx-breadcrumb"><button onClick={back}>{t('system')}</button>{parent!==t('system')&&<><span>›</span><span>{parent}</span></>}</nav><h2 data-section-anchor={`di-${id}`} data-section-label={t(`${id}Nav`)}>{t(`${id}Title`)}</h2>{children}<button className="cx-back" onClick={back}><CornerUpLeft size={14}/>{t('back')}</button></section>;}
export default function ConnectedReport({lang}){
 const t=k=>copy[lang][k], [config,setConfig]=useExperimentState('DeepInfer.lesson',LESSON_DEFAULTS),[selected,setSelected]=useState('layout'),[overlap,setOverlap]=useState(false),mapRef=useRef(null);
 const go=id=>{setSelected(id);document.querySelector(`[data-section-anchor="di-${id}"]`)?.scrollIntoView({block:'start',behavior:'instant'});};
 const back=()=>{mapRef.current?.scrollIntoView({block:'start',behavior:'instant'});};

 return <article className="cx-report"><p className="cx-lead">{t('lead')}</p><button className="da-evidence-link" onClick={()=>go('results')}><span>{t('evidenceTitle')}</span><span>EP8 <b>≈200 / 12.5k</b> → EP64 <b>≈250 / 16k</b></span><small>{t('evidenceUnits')}</small></button><BenefitPath lang={lang} config={config} go={go}/><SystemAtlas lang={lang} config={config} selected={selected} select={setSelected} go={go} mapRef={mapRef}/>
 <ReportSection t={t} back={back} id="layout" parent="Prefill / Decode"><p>{t('layoutText')}</p><ParallelPath t={t}/><p className="cx-caption">{t('layoutNote')}</p></ReportSection>
 <ReportSection t={t} back={back} id="experts" parent="Decode › MoE"><p>{t('expertsText')}</p><ExpertComparison lang={lang} config={config} setConfig={setConfig}/><EplbShiftPanel lang={lang}/><p>{t('expertsAfter')}</p></ReportSection>
 <ReportSection t={t} back={back} id="kernel" parent="Decode › MoE › Mega MoE"><p>{t('kernelText')}</p><KernelBuffers lang={lang}/><a className="cx-source" href={GEMM_SOURCE} target="_blank" rel="noreferrer">{t('source')}</a></ReportSection>
 <ReportSection t={t} back={back} id="cache" parent="Prefill / KV"><p>{t('cacheText')}</p><CacheLab lang={lang} config={config} setConfig={setConfig}/><p>{t('cacheAfter')}</p><a className="cx-source" href="#cachearch">{t('ced')} →</a></ReportSection>
 <ReportSection t={t} back={back} id="scheduling" parent="Prefill / Decode"><p>{t('schedulingText')}</p><SchedulingLab lang={lang}/><p>{t('schedulingAfter')}</p><details onToggle={e=>setOverlap(e.currentTarget.open)}><summary>{t('overlap')}</summary>{overlap&&<OverlapView model={deriveLesson(config)} t={k=>i18n[lang][k]} update={(k,v)=>setConfig({...config,[k]:v})}/>}</details></ReportSection>
 <ReportSection t={t} back={back} id="results" parent={t('system')}><p>{t('resultsText')}</p><BenchmarkEvidence lang={lang} t={t}/><p className="cx-plot-read">{t('plotNote')}</p><div className="cx-formula"><MathFormula>{COST}</MathFormula><span>{t('cost')}</span></div><p>{t('release')}</p><a className="cx-source" href={LESSON_SOURCE} target="_blank" rel="noreferrer">{t('source')}</a></ReportSection>
 </article>;
}
