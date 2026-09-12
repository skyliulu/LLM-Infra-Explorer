// A single deterministic history; requests never reset residency.
// Readable teaching tokens, not the output of a particular production tokenizer.
export const TOKENS_PER_PAGE=2;
export const PAGE_TOKENS={P0:['You','are'],P1:['a','helpful'],A:['coding','assistant'],B:['writing','assistant'],X:['an','expert'],Y:['travel','planner'],Z:['for','families'],C:['Explain','caching']};
export const REQUESTS = [
 {ids:['P0','P1','A'],name:'first'},
 {ids:['P0','P1','B'],name:'branch'},
 {ids:['P0','X','Y','Z'],name:'pressure'},
 {ids:['P0','P1','A','C'],name:'return'},
];
export const requestSharedPrefix=index=>{
 const ids=REQUESTS[index].ids;
 return Math.max(0,...REQUESTS.slice(0,index).map(previous=>{let count=0;while(count<ids.length&&ids[count]===previous.ids[count])count++;return count;}));
};
export const sharedPage=id=>REQUESTS.filter(r=>r.ids.includes(id)).length>1;
export function deriveHiCacheStoryState(step=0){
 const pools={gpu:Array(4).fill(null),host:Array(5).fill(null),storage:Array(12).fill(null)};
 const paths=[],ends=new Set(),known=new Set(),history=[],age={};let clock=0,request=0,locked=[],routes=[],traffic=0,computed=0;
 const tree=()=>{const root={id:'root',pages:[],children:[]};for(const path of paths){let n=root;for(const id of path){let child=n.children.find(c=>c.id===id);if(!child){child={id,pages:[id],children:[]};n.children.push(child);}n=child;}}const flatten=(n,parent=null,out=[])=>{while(n.id!=='root'&&n.children.length===1&&!ends.has(n.pages.at(-1))){const child=n.children[0];n.pages.push(...child.pages);n.children=child.children;}out.push({id:n.id,pages:n.pages,parent});n.children.forEach(c=>flatten(c,n.id,out));return out;};return flatten(root);};
 const capture=(kind,ids=[],from=null,to=null)=>history.push({kind,ids,from,to,request,pools:structuredClone(pools),tree:tree(),locked:[...locked],routes:structuredClone(routes),traffic,computed});
 capture('idle');
 const evict=tier=>{const candidates=pools[tier].filter(id=>id&&!locked.includes(id));const leaves=candidates.filter(id=>!paths.some(p=>{const at=p.indexOf(id);return at>=0&&p.slice(at+1).some(v=>pools[tier].includes(v));}));const victim=(leaves.length?leaves:candidates).sort((a,b)=>(age[a]||0)-(age[b]||0))[0];if(!victim)throw Error('No safe victim');pools[tier][pools[tier].indexOf(victim)]=null;capture('evict',[victim],tier);};
 const put=(tier,id)=>{if(pools[tier].includes(id))return;if(!pools[tier].includes(null))evict(tier);pools[tier][pools[tier].indexOf(null)]=id;};
 const copy=(id,from,to,kind)=>{if(!pools[from].includes(id))throw Error('Missing source');put(to,id);traffic++;capture(kind,[id],from,to);};
 REQUESTS.forEach((r,index)=>{request=index;routes=[];locked=[];capture('arrive',r.ids);
  let missed=false;routes=r.ids.map(id=>{const source=missed?'miss':['gpu','host','storage'].find(t=>pools[t].includes(id))||'miss';if(source==='miss')missed=true;return{id,source};});
  locked=r.ids.filter(id=>pools.gpu.includes(id));capture('match',r.ids);
  // Matching splits metadata at the existing prefix boundary, before KV allocation.
  let prefix=[];for(const id of r.ids){if(!known.has(id))break;prefix.push(id);}if(prefix.length&&tree().some(n=>n.pages.includes(prefix.at(-1))&&n.pages.at(-1)!==prefix.at(-1))){ends.add(prefix.at(-1));capture('split',prefix);}
  if(routes.some(v=>v.source==='storage'))capture('query',routes.filter(v=>v.source==='storage').map(v=>v.id));
  for(const route of routes){const{id,source}=route;if(source==='storage')copy(id,'storage','host','prefetch');if(source==='host'||source==='storage'){copy(id,'host','gpu','load');locked.push(id);}if(source==='miss'){put('gpu',id);locked.push(id);computed++;known.add(id);const path=r.ids.slice(0,r.ids.indexOf(id)+1);paths.push(path);capture('compute',[id]);}age[id]=++clock;}
  ends.add(r.ids.at(-1));
  // Teaching policy: acknowledged write-through; cold unlocked leaf first eviction.
  // Completed GPU references are released before cache maintenance.
  locked=[];capture('release',r.ids);
  for(const id of r.ids){if(!pools.host.includes(id))copy(id,'gpu','host','backup');if(!pools.storage.includes(id))copy(id,'host','storage','persist');}
  capture('complete',r.ids);
 });
 const limit=history.length-1;step=Math.max(0,Math.min(limit,Math.floor(Number(step)||0)));
 return {...history[step],step,limit,history,done:step===limit,phase:step===0?'idle':step===limit?'done':'running',capacity:{gpu:4,host:5,storage:12}};
}

