import {getAttentionState} from './model.js';
const triangle=n=>n*(n+1)/2;
export function deriveLinearComparison({mode='linear',context='decode',n=1024,dk=32,dv=32,gateStrength=.45,cursor=null}) {
 const count=8;
 const events=kind=>{
  const list=[{token:context==='decode'?7:0,phase:'ready',count:0}];
  for(let token=context==='decode'?7:0;token<8;token++){
   if(kind==='full'){
    for(let j=1;j<=token+1;j++)list.push({token,phase:'score',count:j});
    list.push({token,phase:'softmax',count:token+1});
    for(let j=1;j<=token+1;j++)list.push({token,phase:'value',count:j});
   } else {
    for(const phase of mode==='gla'?['gate','outer','write','read']:['map','outer','write','normalizer','read','divide'])list.push({token,phase,count:token+1});
   }
  }
  list.push({token:7,phase:'done',count:8});return list;
 };
 const fullEvents=events('full'),stateEvents=events('state'),total=Math.max(fullEvents.length,stateEvents.length)-1,tick=cursor===null?total:Math.max(0,Math.min(total,cursor));
 const lane=(kind,list)=>{
  const event=list[Math.min(tick,list.length-1)],s=getAttentionState({mode,tokenIndex:event.token,step:0,n:8,dk,dv,gateStrength});
  const finished=event.phase==='done',idle=event.phase==='ready';
  const end=context==='decode'?n:Math.ceil(n*(event.token+1)/8),start=context==='decode'?0:Math.ceil(n*event.token/8);
  const pairs=context==='decode'?n:triangle(end)-triangle(start),prior=context==='decode'?0:triangle(start),span=context==='decode'?1:end-start;
  let mac=0,reads=0;
  if(kind==='full'){
   const scored=idle?0:event.phase==='score'?event.count/(event.token+1):1,valued=event.phase==='value'?event.count/(event.token+1):finished?1:0;
   mac=prior*(dk+dv)+pairs*(scored*dk+valued*dv);reads=mac;
  }else{
   const stages=mode==='gla'?['gate','outer','write','read']:['map','outer','write','normalizer','read','divide'];
   const at=finished?stages.length:stages.indexOf(event.phase),has=p=>at>=stages.indexOf(p)&&!idle;
   const per=2*dk*dv+(mode==='gla'?dk*dv:dk),readPer=2*dk*dv+(mode==='gla'?0:2*dk);
   mac=start*per+span*((has('outer')?dk*dv:0)+(has('read')?dk*dv+(mode==='gla'?0:dk):0)+(mode==='gla'&&has('gate')?dk*dv:0));
   reads=start*readPer+span*((has(mode==='gla'?'gate':'write')?dk*dv:0)+(has('read')?dk*dv:0)+(mode==='linear'?(has('normalizer')?dk:0)+(has('read')?dk:0):0));
  }
  const storage=kind==='full'?end*(dk+dv):dk*dv+(mode==='linear'?dk:0);
  return {...event,s,mac:Math.round(mac),readBytes:Math.round(reads*2),storedBytes:storage*2,done:finished};
 };
 return {full:lane('full',fullEvents),state:lane('state',stateEvents),total,tick,done:tick===total};
}
