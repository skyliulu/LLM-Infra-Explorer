import {REQUESTS,PAGE_TOKENS,TOKENS_PER_PAGE} from './hicache-story.js';
export const ENGINE_DEFAULTS={prefetch:'wait_complete',write:'write_through',fault:'none',concurrent:true,pool:'mha',minLoad:2};
export const pageBytes=pool=>TOKENS_PER_PAGE*3*32*(pool==='mla'?1:2);
export function deriveHiCacheEngineState(step=0,options={}){
 const opts={...ENGINE_DEFAULTS,...options};
 const allowed={prefetch:['wait_complete','timeout','best_effort'],write:['write_through','write_through_selective','write_back'],fault:['none','host_pressure','gpu_pressure','partial_read','rank_lag'],pool:['mha','mla']};
 for(const [k,v] of Object.entries(allowed))if(!v.includes(opts[k]))opts[k]=ENGINE_DEFAULTS[k];opts.concurrent=Boolean(opts.concurrent);opts.minLoad=Number(opts.minLoad)===4?4:2;
 const pools={gpu:Array(4).fill(null),host:Array(5).fill(null),storage:Array(12).fill(null)};
 const ready={gpu:new Set(),host:new Set(),storage:new Set()},local=new Set(),ends=new Set(),paths=[];
 const gpuRefs={},hostRefs={},age={},hits={};let tick=0,request=0,routes=[],transfer=null,traffic=0,computed=0,tail=null,reader=false,rankResult=null,received=0,committed=0;
 const history=[];
 const count=(refs,id)=>refs[id]||0;
 const ref=(refs,ids,delta)=>ids.forEach(id=>{refs[id]=Math.max(0,count(refs,id)+delta);});
 const tree=()=>{const root={id:'root',pages:[],children:[]};for(const path of paths){let n=root;for(const id of path){if(!local.has(id))break;let c=n.children.find(c=>c.id===id);if(!c){c={id,pages:[id],children:[]};n.children.push(c);}n=c;}}const out=[];const flatten=(n,parent=null)=>{while(n.id!=='root'&&n.children.length===1&&!ends.has(n.pages.at(-1))){const c=n.children[0];n.pages.push(...c.pages);n.children=c.children;}out.push({id:n.id,pages:n.pages,parent});n.children.forEach(c=>flatten(c,n.id));};flatten(root);return out;};
 const isLeaf=(id,tier)=>!paths.some(p=>{const i=p.indexOf(id);return i>=0&&p.slice(i+1).some(x=>ready[tier].has(x));});
 const candidates=tier=>pools[tier].filter(id=>id&&ready[tier].has(id)&&!count(tier==='gpu'?gpuRefs:hostRefs,id)&&(tier!=='host'||!ready.gpu.has(id))&&isLeaf(id,tier)).sort((a,b)=>(age[a]||0)-(age[b]||0));
 const capture=(kind,ids=[],from=null,to=null)=>history.push({kind,ids,from,to,request,pools:structuredClone(pools),ready:Object.fromEntries(Object.entries(ready).map(([k,s])=>[k,[...s]])),tree:tree(),gpuRefs:{...gpuRefs},hostRefs:{...hostRefs},locked:Object.keys(gpuRefs).filter(id=>gpuRefs[id]>0),candidates:{gpu:candidates('gpu'),host:candidates('host')},routes:structuredClone(routes),transfer:transfer?{...transfer}:null,traffic,computed,tail:tail?{...tail}:null,reader,rankResult:rankResult?[...rankResult]:null,received,committed});
 const remove=(tier,id)=>{pools[tier][pools[tier].indexOf(id)]=null;ready[tier].delete(id);capture('evict',[id],tier);if(!ready.gpu.has(id)&&!ready.host.has(id)){local.delete(id);capture('prune',[id]);}};
 const insert=id=>{local.add(id);const path=REQUESTS[request].ids.slice(0,REQUESTS[request].ids.indexOf(id)+1);if(path.length)paths.push(path);};
 const reserve=(tier,id)=>{if(pools[tier].includes(id))return true;if(!pools[tier].includes(null)&&!evict(tier))return false;pools[tier][pools[tier].indexOf(null)]=id;return true;};
 const copy=(id,from,to,operation)=>{
  if(ready[to].has(id))return true;if(!ready[from].has(id))throw Error(`Unreadable source ${from}:${id}`);
  const refs=from==='gpu'?gpuRefs:hostRefs;if(from!=='storage')ref(refs,[id],1);
  const ok=reserve(to,id);if(!ok){if(from!=='storage')ref(refs,[id],-1);capture('allocation_failed',[id],from,to);return false;}
  transfer={id,from,to,operation,state:'reserved'};capture('allocate',[id],from,to);
  transfer.state='queued';capture('queued',[id],from,to);
  transfer.state='inflight';capture('inflight',[id],from,to);
  if(from==='storage'){
   const read=opts.prefetch==='timeout'||opts.fault==='partial_read'?1:TOKENS_PER_PAGE;received+=read;
   rankResult=[received,opts.fault==='rank_lag'?0:received];committed=Math.floor(Math.min(...rankResult)/TOKENS_PER_PAGE)*TOKENS_PER_PAGE;capture('consensus',[id]);
   if(read<TOKENS_PER_PAGE||opts.fault==='rank_lag'){traffic+=read*pageBytes(opts.pool)/TOKENS_PER_PAGE;pools.host[pools.host.indexOf(id)]=null;transfer.state='discarded';routes.find(v=>v.id===id).action='compute';capture('prefetch_stop',[id],from,to);transfer=null;return false;}
  }
  ready[to].add(id);traffic+=pageBytes(opts.pool);if(to==='host'&&from==='storage')insert(id);
  transfer.state='ready';if(from!=='storage')ref(refs,[id],-1);if(to==='gpu')ref(gpuRefs,[id],1);capture(operation,[id],from,to);transfer=null;return true;
 };
 const evict=tier=>{const id=candidates(tier)[0];if(!id)return false;capture('victim',[id],tier);
  if(tier==='gpu'&&opts.write==='write_back'&&!ready.host.has(id)){if(copy(id,'gpu','host','backup'))copy(id,'host','storage','persist');else capture('drop_unbacked',[id]);}
  remove(tier,id);return true;};
 capture('idle');
 REQUESTS.forEach((r,index)=>{request=index;routes=[];tail=null;rankResult=null;received=0;committed=0;capture('arrive',r.ids);
  let gap=false;routes=r.ids.map(id=>{const source=gap?'unknown':ready.gpu.has(id)?'gpu':ready.host.has(id)?'host':'unknown';if(source==='unknown')gap=true;return{id,source,action:source==='gpu'?'direct':source==='host'?'load':'unknown'};});
  const held=r.ids.filter(id=>ready.gpu.has(id));ref(gpuRefs,held,1);capture('match',held);
  const localPrefix=routes.filter(v=>v.source!=='unknown').map(v=>v.id);const end=localPrefix.at(-1);
  if(end&&tree().some(n=>n.pages.includes(end)&&n.pages.at(-1)!==end)){ends.add(end);capture('split',localPrefix);}
  if(index===1&&opts.concurrent){reader=true;ref(gpuRefs,['P0','P1'],1);capture('reader_acquire',['P0','P1']);}
  // Only a backend result may turn an unknown suffix into a remote hit.
  const unknown=routes.filter(v=>v.source==='unknown');if(unknown.length){capture('query_pending',unknown.map(v=>v.id));let missing=false;for(const v of unknown){v.source=!missing&&ready.storage.has(v.id)?'storage':'miss';if(v.source==='miss')missing=true;v.action=v.source==='storage'?'fetch':'compute';}capture('query',unknown.map(v=>v.id));}
  const remote=routes.filter(v=>v.source==='storage');
  if(remote.length&&opts.prefetch==='best_effort'){remote.forEach(v=>{v.action='compute';});rankResult=[0,0];capture('prefetch_stop',remote.map(v=>v.id));}
  const loadTokens=routes.filter(v=>['load','fetch'].includes(v.action)).length*TOKENS_PER_PAGE;
  if(loadTokens>0&&loadTokens<opts.minLoad){routes.forEach(v=>{if(['load','fetch'].includes(v.action))v.action='compute';});capture('threshold_reject');}
  for(const route of routes){const {id}=route;
   if(route.action==='fetch'){
    if(opts.fault==='host_pressure'){route.action='compute';capture('host_pressure',[id]);capture('allocation_failed',[id],'storage','host');}
    else if(!copy(id,'storage','host','prefetch'))route.action='compute';
   }
   if(route.action==='load'||route.action==='fetch'){
    if(opts.fault==='gpu_pressure'&&index===3){route.action='compute';capture('quota_reject',[id]);}
    else if(copy(id,'host','gpu','load')){held.push(id);}else route.action='compute';
   }
   if(route.action==='compute'){
    if(!reserve('gpu',id))throw Error('Teaching request exceeds available GPU pages');ref(gpuRefs,[id],1);held.push(id);
    tail={id,tokens:1,published:false};capture('chunk', [id]); // Incomplete page remains request-owned.
    ready.gpu.add(id);computed+=TOKENS_PER_PAGE;insert(id);tail=null;capture('compute',[id]);
   }
   hits[id]=(hits[id]||0)+1;age[id]=++tick;
  }
  ends.add(r.ids.at(-1));
  if(reader){reader=false;ref(gpuRefs,['P0','P1'],-1);capture('reader_release',['P0','P1']);}
  // Write-through completion is protected, independent of request references.
  if(opts.write!=='write_back')for(const id of r.ids){if(opts.write==='write_through_selective'&&hits[id]<2){capture('cold_skip',[id]);continue;}if(!ready.host.has(id))copy(id,'gpu','host','backup');if(ready.host.has(id)&&!ready.storage.has(id))copy(id,'host','storage','persist');}
  ref(gpuRefs,held,-1);capture('release',r.ids);capture('complete',r.ids);
 });
 const limit=history.length-1;step=Math.max(0,Math.min(limit,Math.floor(Number(step)||0)));const s=history[step];
 let readyPrefix=0;for(const id of REQUESTS[s.request].ids){if(!s.ready.gpu.includes(id))break;readyPrefix+=TOKENS_PER_PAGE;}
 return {...s,readyPrefix,history,limit,step,done:step===limit,phase:step===0?'idle':step===limit?'done':'running',capacity:{gpu:4,host:5,storage:12},options:opts,pageBytes:pageBytes(opts.pool),pages:PAGE_TOKENS};
}

