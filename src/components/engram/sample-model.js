// A reduced specimen of the pinned official demo: two heads for each n-gram,
// small canonical IDs/primes and synthetic table/projection weights.
export const SAMPLE_PRIMES=[5,7,11,13];
export const SAMPLE_MULTIPLIERS=[3,5,7]; // current position first
export function hashNgram(ids,primes,multipliers=SAMPLE_MULTIPLIERS){
 const mix=ids.slice().reverse().reduce((value,id,i)=>value^(BigInt(id)*BigInt(multipliers[i])),0n);
 return {mix:Number(mix),addresses:primes.map(p=>Number(mix%BigInt(p)))};
}
const norm=x=>{const rms=Math.sqrt(x.reduce((s,v)=>s+v*v,0)/x.length+1e-6);return x.map(v=>v/rms);};
export function engramGate(query,key,value){
 const q=norm(query),k=norm(key),score=q.reduce((s,v,i)=>s+v*k[i],0)/Math.sqrt(q.length);
 const transformed=Math.sign(score)*Math.sqrt(Math.max(Math.abs(score),1e-6));
 const gate=1/(1+Math.exp(-transformed));
 return {query,key,normalizedQuery:q,normalizedKey:k,score,transformed,gate,gatedValue:value.map(v=>v*gate)};
}
export function deriveEngramSample({preset='base',query='aligned'}={}){
 query=['aligned','opposite','orthogonal'].includes(query)?query:'aligned';
 const ids=preset==='collision'?[3,6,1]:[3,2,1];
 const hashes=[hashNgram(ids.slice(-2),SAMPLE_PRIMES.slice(0,2)),hashNgram(ids,SAMPLE_PRIMES.slice(2))];
 let offset=0;
 const heads=SAMPLE_PRIMES.map((prime,h)=>{
  const n=h<2?2:3,address=hashes[h<2?0:1].addresses[h%2];
  const head={id:h,n,head:h%2,prime,mix:hashes[h<2?0:1].mix,address,offset,row:offset+address,vector:[address+1,h+1]};
  offset+=prime;return head;
 });
 const embedding=heads.flatMap(h=>h.vector);
 // Shared W_V and branch-specific W_K. These simple sparse projections keep
 // every displayed value hand-checkable; no trained weights are implied.
 const value=[embedding[0]*.6,-embedding[4]/7];
 const keys=[[embedding[0]/5,embedding[2]/3],[embedding[4]/7,-embedding[6]/3]];
 const [a,b]=keys[0];
 const selectedQuery=query==='opposite'?[-a,-b]:query==='orthogonal'?[b,-a]:[a,b];
 return {preset:preset==='collision'?'collision':'base',query,ids,heads,embedding,value,
  branches:keys.map(key=>engramGate(selectedQuery,key,value)),
  baseFirstHeadAddress:4,stage:'gated-value-before-short-convolution'};
}
