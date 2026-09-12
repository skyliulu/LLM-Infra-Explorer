import {TOKENS_PER_PAGE,PAGE_TOKENS} from './hicache-story.js';
export function deriveHiCacheLayoutState({page='P0',layout='layer_first',operation='layer',layer=1,pool='mha',backend='kernel',storage='scatter',registered=true,copyTime=3,computeTime=4,step=0}={}){
 if(!PAGE_TOKENS[page])page='P0';if(!['layer_first','page_first','page_first_direct'].includes(layout))layout='layer_first';if(!['layer','page'].includes(operation))operation='layer';pool=pool==='mla'?'mla':'mha';layer=Math.max(0,Math.min(2,Math.floor(Number(layer)||0)));
 const allowed=layout==='page_first'?['kernel']:layout==='page_first_direct'?['direct']:['kernel','direct'];if(!allowed.includes(backend))backend=allowed[0];
 if(!['scatter','file','direct_file'].includes(storage))storage='scatter';
 const pages=[...new Set(['P0','P1',page,'A'])].slice(0,3);if(!pages.includes(page))pages[2]=page;
 const channels=pool==='mla'?['C']:['K','V'];const cells=[];
 for(const channel of channels)for(const p of pages)for(let token=0;token<TOKENS_PER_PAGE;token++)for(let l=0;l<3;l++)cells.push({id:`${channel}:${p}:${token}:${l}`,channel,page:p,token,layer:l,word:PAGE_TOKENS[p][token]});
 const pindex=p=>pages.indexOf(p);
 const rank=c=>layout==='layer_first'?c.layer*6+pindex(c.page)*2+c.token:layout==='page_first'?pindex(c.page)*6+c.token*3+c.layer:pindex(c.page)*6+c.layer*2+c.token;
 cells.sort((a,b)=>channels.indexOf(a.channel)-channels.indexOf(b.channel)||rank(a)-rank(b));
 cells.forEach((c,i)=>{c.offset=i*32;c.selected=operation==='layer'?c.layer===layer:c.page===page;});
 const selected=cells.filter(c=>c.selected),segments=[];
 for(const c of selected){const last=segments.at(-1);if(last&&last.end===c.offset&&last.channel===c.channel){last.end+=32;last.ids.push(c.id);}else segments.push({start:c.offset,end:c.offset+32,channel:c.channel,ids:[c.id]});}
 const perPageBytes=2*3*32*channels.length;
 const pack=operation==='page'&&storage==='file'&&segments.length>channels.length;
 const alignment=2*3*32%4096===0; // per-channel page stride, not aggregate K+V size
 const eligible=operation==='layer'||storage==='file'||storage==='scatter'&&registered||storage==='direct_file'&&registered&&alignment;
 copyTime=Math.max(1,Math.min(10,Number(copyTime)||3));computeTime=Math.max(1,Math.min(10,Number(computeTime)||4));
 const schedule=[];let priorCompute=0;for(let l=0;l<3;l++){const transferStart=l*copyTime,transferEnd=transferStart+copyTime,computeStart=Math.max(transferEnd,priorCompute),computeEnd=computeStart+computeTime;schedule.push({layer:l,transferStart,transferEnd,computeStart,computeEnd,wait:computeStart-priorCompute});priorCompute=computeEnd;}
 const limit=eligible?segments.length:0;step=Math.max(0,Math.min(limit,Math.floor(Number(step)||0)));
 const completedIds=segments.slice(0,step).flatMap(s=>s.ids);
 return{page,pages,layout,operation,layer,pool,backend,allowed,storage,registered,cells,selected,segments,perPageBytes,totalBytes:cells.length*32,requestedBytes:selected.length*32,packBytes:pack?selected.length*32:0,pack,alignment,eligible,step,limit,completedIds,completedBytes:completedIds.length*32,copyTime,computeTime,schedule,serialTime:3*(copyTime+computeTime),overlapTime:priorCompute};
}
