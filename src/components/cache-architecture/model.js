// Pinned inference/config.json: zero-based source IDs, excluding three MTP layers.
export const KV_SOURCES = [2,8,14,20];
export const INDEX_SOURCES = [2,8,14,20,24,28,32,36];
export const RECORD = {main:288,index:68};
export const LAYERS = Array.from({length:40},(_,id)=>({id,
  owner:id<2?null:KV_SOURCES.filter(v=>v<=id).at(-1),
  indexOwner:id<2?null:INDEX_SOURCES.filter(v=>v<=id).at(-1),
  ratio:id<2?0:id<20?2:1,
  mode:id<2?'local':KV_SOURCES.includes(id)?'full':INDEX_SOURCES.includes(id)?'reindex':'reuse',
  half:id<20?'encoder':'decoder',
}));
export function deriveCacheArchitectureModel({tokens=4096,layer=20,phase='prefill',entry=0}={}) {
  tokens=Math.max(1,Math.min(1000000,Math.trunc(Number.isFinite(tokens)?tokens:4096)));
  layer=Math.max(0,Math.min(39,Math.trunc(Number.isFinite(layer)?layer:20)));
  phase=phase==='decode'?'decode':'prefill';
  const selected=LAYERS[layer];
  const groups=KV_SOURCES.map((owner,i)=>{
    const ratio=owner<20?2:1, count=Math.floor(tokens/ratio);
    return {id:i,owner,ratio,count,pending:tokens%ratio,consumers:LAYERS.filter(l=>l.owner===owner),mainBytes:count*RECORD.main,indexBytes:count*RECORD.index,total:count*(RECORD.main+RECORD.index)};
  });
  const group=groups.find(g=>g.owner===selected.owner) || null;
  entry=Math.max(0,Math.min(Math.max(0,(group?.count||0)-1),Math.trunc(Number.isFinite(entry)?entry:0)));
  const total=groups.reduce((s,g)=>s+g.total,0), entries=groups.reduce((s,g)=>s+g.count,0);
  const unsharedEntries=18*Math.floor(tokens/2)+20*tokens;
  const replay=Math.min(tokens,128);
  const baselineWork=phase==='prefill'?40*tokens:40;
  const encoderWork=phase==='prefill'?20*tokens:20, decoderWork=phase==='prefill'?20*replay:20;
  const benefits={workBefore:baselineWork,workAfter:encoderWork+decoderWork,
    workReduction:1-(encoderWork+decoderWork)/baselineWork,
    globalBefore:3514,globalAfter:890,globalReduction:1-890/3514,capacityRatio:3514/890,
    persistentBefore:100,persistentAfter:12.5,
    exactReplay:Math.min(tokens,20*128),boundedReplay:replay};
  const technical={inputRows:phase==='prefill'?tokens:1,decoderRows:phase==='prefill'?replay:1,
    skippedRows:phase==='prefill'?tokens-replay:0,projectionRows:phase==='prefill'?tokens:1,
    windowStart:phase==='prefill'?tokens-replay+1:tokens,windowEnd:tokens,
    firstHalfWork:encoderWork,secondHalfWork:decoderWork};
  return {tokens,layer,phase,selected,groups,group,entry,total,entries,benefits,technical,
    sourceTokens:group?.count?Array.from({length:group.ratio},(_,i)=>entry*group.ratio+i+1):[],
    mainBytes:entries*RECORD.main,indexBytes:entries*RECORD.index,
    unshared16:unsharedEntries*1280,shared16:entries*1280,
    replay,globalStart:phase==='prefill'?1:tokens,globalEnd:tokens,tailStart:phase==='prefill'?tokens-replay+1:tokens,hiddenDim:5120,mainDim:512,indexDim:128,encoderWork:phase==='prefill'?20*tokens:20,decoderWork:phase==='prefill'?20*replay:20,
    baselineWork:phase==='prefill'?40*tokens:40,
    pending:groups.reduce((s,g)=>s+g.pending,0),
    localRecords:40*Math.min(tokens,128),asymptotic:890,
  };
}
