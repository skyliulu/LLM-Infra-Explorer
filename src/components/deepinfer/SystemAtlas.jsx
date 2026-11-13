import React from 'react';
import {ArrowRight, Database, Layers, Cpu, Network, ChevronRight} from 'lucide-react';
import {deriveCache, deriveMoe} from './lesson-model';

const copy = {
 zh: {
  title:'三处关键优化', hint:'先看工作量怎样变化，再沿数据路径进入内部机制。以下是教学模型，不是性能测试。',
  cache:'避免重复处理历史',cacheSub:'H 为历史，N 为新增 · 128 位置/块',expert:'让一份权重服务更多输入',expertSub:'同样八张卡，合并专家批量',kernel:'让通信与计算接起来',kernelSub:'不等整批，按就绪块交接',
  reused:'位置复用',remaining:'位置未被块 KV 覆盖',reads:'活跃权重副本',compute:'计算',send:'待算',back:'部分写回',detail:'查看机制',
  system:'请求的数据路径',systemHint:'点选组件，在右侧查看它的职责；各组件共同组成服务。',request:'请求',history:'历史 H1–H6',new:'新增 N1–N2',match:'前缀匹配',schedule:'负载调度',p:'处理输入',d:'逐步生成',pNote:'大批量 → 较小 EP 组',dNote:'小批量 → 宽 EP 组',local:'本卡 Attention / KV',moe:'跨卡 MoE',weights:'专家批量',fusion:'融合内核',store:'共享历史',block:'块 KV · 3FS',swa:'SWA · 主机 / 目录',read:'读取命中前缀',write:'写回新历史',transfer:'KV + SWA',output:'新 Token',
  role:'组件职责',in:'接收',out:'交给下游',open:'进入这部分',layoutTitle:'Attention 留在原卡，MoE 按专家汇集',layoutText:'同一个请求在 Attention 中读取本卡历史，进入 MoE 后才跨卡分发。P 与 D 的 Token 批量不同，所以专家组规模也不同。',
  expertsTitle:'输入行变多，权重形状不变',expertsText:'多个小组分别读取同一专家；宽组把这些输入交给一份物理权重。低并发、热点和互联都会限制收益。',kernelTitle:'数据就绪后，下一步才能读',kernelText:'分发填入接收缓冲，专家贡献可以提前写回；来源卡仍需等待相关卡就绪，再归约成最终输出。',cacheTitle:'历史共享，计算可以换机器',cacheText:'匹配先于选机。命中的块 KV 从共享存储读到所选 P 实例；没命中的后缀仍需要计算。SWA 单独定位或恢复。',schedulingTitle:'按工作量分配，而不只数请求',schedulingText:'P 用时间预算决定本轮输入；D 同时看请求数与 KV 总长度，兼顾专家批量和历史读取。',
  layoutIn:'请求表示 + 本卡历史',layoutOut:'专家输出返回原 rank',expertsIn:'各 rank 的 Token 表示',expertsOut:'按来源合并的专家结果',kernelIn:'专家输入块 + 路由元数据',kernelOut:'回到来源 rank 的结果块',cacheIn:'前缀哈希 + 新增输入',cacheOut:'历史状态 + 待计算后缀',schedulingIn:'上下文、请求数、KV 总量',schedulingOut:'接收实例 + 本轮工作预算',
  deployment:'官方 V4.1 Flash 部署：P 的 MoE EP2–8，D 的 MoE EP64–128。图中只展开文本主路径；多模态另有视觉编码器。',scope:'从生产设计理解引擎；开源仓库提供离线核心，完整缓存和在线调度需另行集成。',
 },
 en: {
  title:'Three design choices',hint:'See how work changes, then follow the data path into each mechanism. This is an educational model, not a benchmark.',cache:'Reuse computed history',cacheSub:'H: history, N: new · 128 positions/block',expert:'More rows per weight copy',expertSub:'Regroup the same eight ranks',kernel:'Connect transfer and compute',kernelSub:'Hand off ready blocks',reused:'positions reused',remaining:'positions outside block KV',reads:'active weight copies',compute:'Compute',send:'Waiting',back:'Writeback',detail:'Explore',
  system:'The request data path',systemHint:'Select a component to inspect its role. These are cooperating subsystems.',request:'Request',history:'History H1–H6',new:'New N1–N2',match:'Prefix match',schedule:'Load scheduling',p:'Process input',d:'Generate tokens',pNote:'Large batch → smaller EP',dNote:'Small batch → wider EP',local:'Local Attention / KV',moe:'Cross-rank MoE',weights:'Expert batches',fusion:'Fused kernel',store:'Shared history',block:'Block KV · 3FS',swa:'SWA · host / directory',read:'Fetch matched prefix',write:'Persist new history',transfer:'KV + SWA',output:'New token',role:'Component role',in:'Receives',out:'Produces',open:'Explore this part',
  layoutTitle:'Local Attention, expert-routed MoE',layoutText:'Attention reads history on the source rank; MoE dispatches inputs across ranks. Different P/D token batches motivate different expert-group sizes.',expertsTitle:'More input rows, same weight shape',expertsText:'Small groups load the same expert independently. A wide group gathers those rows at one physical copy. Concurrency, hotspots and fabric limit the benefit.',kernelTitle:'Read only after the data is ready',kernelText:'Dispatch fills the receive buffer and expert contributions can be written back early. The source still waits for selected peers before reducing the final output.',cacheTitle:'Shared history frees placement',cacheText:'Match before routing. Fetch block KV into the chosen P instance and compute the unmatched suffix. Locate or restore SWA separately.',schedulingTitle:'Balance work, not just request count',schedulingText:'P solves each chunk from a time budget. D considers request count and total KV to balance expert batches and history reads.',
  layoutIn:'Representations + local history',layoutOut:'Expert results on source rank',expertsIn:'Token rows from each rank',expertsOut:'Expert results combined by source',kernelIn:'Expert blocks + routing metadata',kernelOut:'Result blocks on source rank',cacheIn:'Prefix hashes + new input',cacheOut:'History state + uncached suffix',schedulingIn:'Context, request count, KV length',schedulingOut:'Receiver + work budget',
  deployment:'Official V4.1 Flash deployment: P MoE EP2–8, D MoE EP64–128. The text path is shown; multimodal inputs also use a vision encoder.',scope:'This explains the production design. The public release is an offline core; complete caching and online routing require integration.',
 }
};

function Blocks({count=8,hit=6}) {
 return <div className="da-blocks" aria-hidden="true">{Array.from({length:count},(_,i)=><i className={i<hit?'history':'fresh'} key={i}>{i<6?`H${i+1}`:`N${i-5}`}</i>)}</div>;
}

export function BenefitPath({lang,config,go}) {
 const t=k=>copy[lang][k],cache=deriveCache(config,3),moe=[2,8].map(ep=>deriveMoe({...config,ep}));
 return <section className="da-benefits"><div className="da-section-intro"><h2>{t('title')}</h2><small>{t('hint')}</small></div><div className="da-benefit-grid">
  <button onClick={()=>go('cache')} className="da-benefit cache"><header><Database size={17}/><b>{t('cache')}</b><ChevronRight size={15}/></header><small>{t('cacheSub')}</small><Blocks hit={config.history}/><div className="da-mini-values"><span><strong>{cache.reusedPositions}</strong> {t('reused')}</span><span><strong>{cache.newPositions}</strong> {t('remaining')}</span></div></button>
  <button onClick={()=>go('experts')} className="da-benefit experts"><header><Layers size={17}/><b>{t('expert')}</b><ChevronRight size={15}/></header><small>{t('expertSub')}</small><div className="da-mini-ep"><span>EP2 <b>{moe[0].reads}</b></span><ArrowRight size={18}/><span>EP8 <b>{moe[1].reads}</b></span></div><div className="da-mini-values"><span>{t('reads')}</span><span>{moe[0].jobs} → {moe[1].jobs} Token</span></div></button>
  <button onClick={()=>go('kernel')} className="da-benefit kernel"><header><Cpu size={17}/><b>{t('kernel')}</b><ChevronRight size={15}/></header><small>{t('kernelSub')}</small><div className="da-mini-pipe"><span>{t('send')} C</span><span>{t('compute')} B</span><span>{t('back')} A</span></div><div className="da-mini-values"><span>A / B / C</span><span>{t('detail')} <ArrowRight size={12}/></span></div></button>
 </div></section>;
}

export default function SystemAtlas({lang,config,selected,select,go,mapRef}) {
 const t=k=>copy[lang][k];
 const node=(id,Icon,title,sub,cls='')=><button className={`da-node ${cls} ${selected===id?'selected':''}`} aria-pressed={selected===id} onClick={()=>select(id)}><Icon size={17}/><span><b>{title}</b><small>{sub}</small></span><ChevronRight size={13}/></button>;
 const current=selected||'layout';
 return <section ref={mapRef} className="da-atlas" data-testid="connected-system"><div className="da-section-intro"><h2 data-section-anchor="di-system">{t('system')}</h2><small>{t('systemHint')}</small></div><div className="da-atlas-grid"><div className="da-diagram">
  <div className="da-ingress"><div><b>{t('request')}</b><Blocks hit={config.history}/></div><ArrowRight size={18}/>{node('cache',Database,t('match'),`${config.history} / 8`)}<ArrowRight size={18}/>{node('scheduling',Network,t('schedule'),'P / D')}</div>
  <div className="da-branch-route"><span>↓ P</span><span>↓ D</span></div><div className="da-pools"><div className="da-pool p">{node('layout',Layers,`Prefill · ${t('p')}`,t('pNote'))}<div className="da-pool-flow"><span>{t('local')}</span><ArrowRight size={12}/><span>{t('moe')}</span></div><div className="da-gpus" aria-hidden="true">{['Attention DP','MoE EP2–8'].map(label=><i key={label}>{label}</i>)}</div></div><div className="da-between"><ArrowRight size={20}/><small>{t('transfer')}</small></div><div className="da-pool d">{node('experts',Cpu,`Decode · ${t('d')}`,t('dNote'))}<div className="da-pool-flow"><span>{t('local')}</span><ArrowRight size={12}/><span>{t('moe')}</span></div><div className="da-subsystems"><button aria-pressed={selected==='experts'} onClick={()=>select('experts')}>{t('weights')}</button><button aria-pressed={selected==='kernel'} onClick={()=>select('kernel')}>{t('fusion')}</button></div></div></div>
  <div className="da-storage-links"><span>↑ {t('read')}</span><span>↓ {t('write')}</span></div><div className="da-storage">{node('cache',Database,t('store'),`${t('block')} · ${t('swa')}`)}<span><ArrowRight size={14}/>{t('output')}</span></div>
  <small className="da-deployment">{t('deployment')}</small>
 </div><aside className={`da-inspector ${current}`} aria-live="polite"><small>{t('role')} · {current==='kernel'?'Decode / MoE':current==='experts'?'Decode':current==='cache'?'Prefill / KV':'Prefill / Decode'}</small><h3>{t(`${current}Title`)}</h3><p>{t(`${current}Text`)}</p><dl><div><dt>{t('in')}</dt><dd>{t(`${current}In`)}</dd></div><ArrowRight size={15}/><div><dt>{t('out')}</dt><dd>{t(`${current}Out`)}</dd></div></dl><button className="da-open" onClick={()=>go(current)}>{t('open')}<ArrowRight size={15}/></button></aside></div><small className="da-scope">{t('scope')}</small></section>;
}
