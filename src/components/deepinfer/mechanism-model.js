import {deriveFusion} from './lesson-model.js';

export function getKernelBuffers(time = 3) {
 const total=14;
 const tick = Math.max(0, Math.min(total, Number.isFinite(Number(time)) ? Math.floor(Number(time)) : 0));
 const fusion = deriveFusion();
 return {
  time:tick,total,
  paths:['serial','fused'].map(id=>{
   // All ABC blocks belong to one expert-owner rank. After its final remote
   // output store, publish readiness / wait for selected peers, then reduce.
   // The one-owner/top-1 example has one selected peer; durations are schematic.
   const writesEnd=Math.max(...fusion[id].filter(op=>op.type==='combine').map(op=>op.end));
   const final={ready:writesEnd,reduceStart:writesEnd+1,end:writesEnd+2};
   const completion=tick<final.ready?'awaitOwner':tick<final.reduceStart?'awaitPeers':tick<final.end?'reducing':'returned';
   return {id,final,rankReady:tick>=final.ready,completion,blocks:[0,1,2].map(tile=>{
   const ops=fusion[id],dispatch=ops.find(o=>o.tile===tile&&o.type==='dispatch'),compute=ops.find(o=>o.tile===tile&&o.type==='compute'),combine=ops.find(o=>o.tile===tile&&o.type==='combine');
   const active=op=>tick>=op.start&&tick<op.end;
   return {id:['A','B','C'][tile],
    input:tick<dispatch.start?'empty':active(dispatch)?'writing':tick<compute.start?'readable':active(compute)?'reading':'consumed',
    compute:tick<compute.start?'waiting':active(compute)?'computing':'computed',
    output:tick<combine.start?'empty':active(combine)?'writing':tick<final.reduceStart?'written':tick<final.end?'reading':'consumed',
    partialWritten:tick>=combine.end,
    rankReady:tick>=final.ready,completion,
    returned:tick>=final.end,
    active:active(dispatch)?'dispatch':active(compute)?'compute':active(combine)?'combine':completion,
    dispatch,computeOperation:compute,combine};
  })};})
 };
}

export const DECODE_CANDIDATES = Object.freeze([
 {id:'A',requests:4,kv:96},
 {id:'B',requests:8,kv:24},
 {id:'C',requests:6,kv:64},
 {id:'D',requests:9,kv:40},
]);
export function getDecodeRouting(request='long',method='dual') {
 const type=request==='short'?'short':'long',policy=method==='count'?'count':'dual',incoming=type==='short'?8:64;
 // A small counterexample, not an implementation of the production load balancer.
 const metric=policy==='count'||type==='short'?'requests':'kv';
 const target=DECODE_CANDIDATES.reduce((best,gpu)=>gpu[metric]<best[metric]?gpu:best);
 return {request:type,method:policy,incoming,target:target.id,metric,
  before:DECODE_CANDIDATES.map(gpu=>({...gpu})),
  after:DECODE_CANDIDATES.map(gpu=>({...gpu,requests:gpu.requests+(gpu.id===target.id?1:0),kv:gpu.kv+(gpu.id===target.id?incoming:0)}))};
}

export const PREFILL_PREFIX_OPTIONS = [0, 16, 64, 128];
export const PREFILL_BUDGET_OPTIONS = [20, 40, 80];

export function solvePrefillChunkBudget({ prefixK = 16, budget = 40 } = {}) {
  const c = PREFILL_PREFIX_OPTIONS.includes(Number(prefixK)) ? Number(prefixK) : 16;
  const B = PREFILL_BUDGET_OPTIONS.includes(Number(budget)) ? Number(budget) : 40;
  // Illustrative fitted cost(q, c) = 0.6*q + 0.04*q*(c + q/2) in K-tokens (capped at 32K).
  const cost = (q, pref) => 0.6 * q + 0.04 * q * (pref + q / 2);
  const solveFor = (pref) => {
    let best = 1;
    for (let q = 1; q <= 32; q += 1) {
      if (cost(q, pref) <= B) best = q;
      else break;
    }
    return best;
  };
  const dpRanks = [
    { rank: 0, prefixK: c, qStarK: solveFor(c) },
    { rank: 1, prefixK: 4, qStarK: solveFor(4) },
    { rank: 2, prefixK: 16, qStarK: solveFor(16) },
    { rank: 3, prefixK: 64, qStarK: solveFor(64) },
  ];
  const minAlignedK = Math.min(...dpRanks.map((r) => r.qStarK));
  return { prefixK: c, budget: B, qStarK: dpRanks[0].qStarK, dpRanks, minAlignedK };
}

export function deriveEplbShift({ traffic = 'math', dynamic = true } = {}) {
  const safeTraffic = traffic === 'code' ? 'code' : 'math';
  // 4 GPUs: static layout has extra replica of E1 (code hot); math shifts hot traffic to E4 on GPU 3.
  const loads = safeTraffic === 'code'
    ? [26, 25, 25, 24]
    : dynamic
      ? [25, 26, 25, 24]
      : [14, 16, 18, 52];
  const peak = Math.max(...loads);
  return {
    traffic: safeTraffic,
    dynamic: Boolean(dynamic),
    loads,
    peak,
    imbalance: Number((peak / 25).toFixed(2)),
  };
}
