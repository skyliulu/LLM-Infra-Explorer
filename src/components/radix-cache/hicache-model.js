export const HC_SCENARIOS=['mixed','gpu','host','miss','pressure','peer','split'];
export const HC_PREFETCH=['wait_complete','timeout','best_effort'];
export const HC_WRITE=['write_through','write_through_selective','write_back'];
export const HC_PAGE_TOKENS=64;
export const HC_REQUEST=['P0','P1','P2','P3','P4'];
const safe=(value,values)=>values.includes(value)?value:values[0];
export function deriveHiCacheState({scenario='mixed',prefetch='wait_complete',write='write_through',storageMode='hierarchical',step=0}={}){
 storageMode=safe(storageMode,['hierarchical','gpu']);
 const hierarchical=storageMode==='hierarchical';
 scenario=safe(scenario,HC_SCENARIOS);prefetch=safe(prefetch,HC_PREFETCH);write=safe(write,HC_WRITE);
 const initial={gpu:scenario==='gpu'?['P0','P1','P2','P3']:scenario==='mixed'||scenario==='pressure'?['P0']:[],host:scenario==='host'?['P0','P1','P2','P3']:scenario==='mixed'||scenario==='pressure'?['P0','P1']:[],storage:scenario==='mixed'||scenario==='pressure'||scenario==='peer'?['P0','P1','P2','P3']:[]};
 if(scenario==='pressure')initial.gpu.push('X','Y');
 if(scenario==='split')initial.gpu.push('P0','P1','A');
 if(!hierarchical){initial.host=[];initial.storage=[];}
 const gpuPrefix=HC_REQUEST.findIndex(id=>!initial.gpu.includes(id));
 const localPrefix=HC_REQUEST.findIndex(id=>!initial.gpu.includes(id)&&!initial.host.includes(id));
 const remote=!hierarchical?[]:scenario==='peer'?['P0','P1','P2','P3']:scenario==='mixed'||scenario==='pressure'?['P2','P3']:[];
 // Illustrative arrival schedule: GPU ready before the first L3 page; timeout after one.
 const fetched=remote.slice(0,prefetch==='wait_complete'?remote.length:prefetch==='timeout'?1:0);
 const reused=localPrefix+fetched.length,computed=HC_REQUEST.slice(reused);
 const load=HC_REQUEST.slice(gpuPrefix,reused),events=[];
 const add=(kind,ids=[],from=null,to=null)=>events.push({kind,ids,from,to});
 add('match',HC_REQUEST.slice(0,localPrefix));
 if(scenario==='split')add('split',['P0','P1','A']);
 if(hierarchical)add('query',remote);
 if(remote.length){if(fetched.length)add('prefetch',fetched,'storage','host');add('policy',fetched);}
 if(scenario==='pressure'){
  if(hierarchical&&write==='write_back')add('backupVictim',['X'],'gpu','host');
  add('evict',['X'],'gpu');
 }
 if(load.length)add('load',load,'host','gpu');
 add('compute',computed,null,'gpu');
 const hostAtWrite=new Set([...initial.host,...fetched]);
 const toHost=HC_REQUEST.filter(id=>!hostAtWrite.has(id)&&(write==='write_through'||write==='write_through_selective'&&id==='P0'));
 if(hierarchical&&write!=='write_back'&&toHost.length)add('backup',toHost,'gpu','host');
 const toStore=HC_REQUEST.filter(id=>!initial.storage.includes(id)&&(write==='write_through'||write==='write_through_selective'&&id==='P0'));
 if(hierarchical&&write!=='write_back'&&toStore.length)add('persist',toStore,'host','storage');
 add('release',HC_REQUEST);
 const limit=events.length;
 step=Number.isFinite(step)?Math.max(0,Math.min(limit,Math.floor(step))):0;
 const capacity={gpu:scenario==='pressure'?6:8,host:hierarchical?12:0,storage:hierarchical?24:0};
 const pools=Object.fromEntries(Object.entries(initial).map(([k,v])=>[k,new Set(v)]));
 const slots=Object.fromEntries(Object.entries(initial).map(([k,v])=>[k,Array.from({length:capacity[k]},(_,i)=>v[i]??null)]));
 const allocate=(tier,id)=>{if(slots[tier].includes(id))return;const free=slots[tier].indexOf(null);if(free<0)throw new Error('Teaching pool capacity exhausted');slots[tier][free]=id;pools[tier].add(id);};
 let queried=false,transfers=0,prefilled=0,locked=[];
 for(const event of events.slice(0,step)){
  if(event.kind==='match'&&scenario!=='split'||event.kind==='split')locked=HC_REQUEST.slice(0,gpuPrefix);
  if(event.kind==='query')queried=true;
  if(event.from&&event.to){event.ids.forEach(id=>allocate(event.to,id));transfers+=event.ids.length;}
  if(event.kind==='load')locked=HC_REQUEST.slice(0,reused);
  if(event.kind==='evict')event.ids.forEach(id=>{pools.gpu.delete(id);slots.gpu[slots.gpu.indexOf(id)]=null;});
  if(event.kind==='compute'){event.ids.forEach(id=>allocate('gpu',id));prefilled=event.ids.length;locked=[...HC_REQUEST];}
  if(event.kind==='release')locked=[];
 }
 const event=step?events[step-1]:null;
 const pages=[...HC_REQUEST,...(scenario==='pressure'?['X','Y']:[]),...(scenario==='split'?['A']:[])].map((id,i)=>({id,parent:id==='A'?'P1':id==='P0'||id==='X'||id==='Y'?null:HC_REQUEST[i-1],start:id==='A'?129:i*64+1,end:id==='A'?192:(i+1)*64,locked:locked.includes(id),locations:Object.keys(pools).filter(tier=>pools[tier].has(id)),remoteKnown:(queried&&HC_REQUEST.indexOf(id)>=localPrefix&&HC_REQUEST.includes(id))||events.slice(0,step).some(ev=>ev.to==='storage'&&ev.ids.includes(id)),hit:id==='P0'?3:1}));
 const splitDone=events.slice(0,step).some(ev=>ev.kind==='split');
 const tree=scenario==='split'&&!splitDone?[{id:'compressed',pages:['P0','P1','A'],parent:null}]:scenario==='split'?[{id:'shared',pages:['P0','P1'],parent:null},{id:'A',pages:['A'],parent:'shared'},...HC_REQUEST.slice(2).map((id,i)=>({id,pages:[id],parent:i===0?'shared':HC_REQUEST[i+1]}))]:pages.map(p=>({id:p.id,pages:[p.id],parent:p.parent}));
 const routes=HC_REQUEST.map((id,i)=>({id,source:initial.gpu.includes(id)?'gpu':initial.host.includes(id)?'host':initial.storage.includes(id)?'storage':'miss',accepted:i<reused,decision:initial.gpu.includes(id)?'direct':initial.host.includes(id)?'load':i<reused?'fetch':'recompute'}));
 return {phase:step===0?'idle':step===limit?'done':'running',storageMode,hierarchical,tree,splitDone,routes,scenario,prefetch,write,step,limit,events,event,done:step===limit,overview:step===0,queried,pools:slots,pages,reused,computed:computed.length,gpuPrefix,localPrefix,fetched:fetched.length,remote:remote.length,transfers,prefilled,capacity,baselineTokens:(5-gpuPrefix)*64,recomputeTokens:computed.length*64,loadingPages:load.length+fetched.length,requestTokens:320};
}
