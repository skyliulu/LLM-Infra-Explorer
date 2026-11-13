// A complete, untrained numerical specimen, not a slice of production weights.
// Full-prefix evaluation makes the pure model reproducible; causal old K/V are
// identical to those retained by incremental decoding at every layer.
export const NUMERIC_D = 4;
export const NUMERIC_FFN = 6;
export const NUMERIC_VOCAB = 6;
export const matmul = (a,b) => a.map(row=>b[0].map((_,c)=>row.reduce((s,x,k)=>s+x*b[k][c],0)));
const transpose = a=>a[0].map((_,c)=>a.map(row=>row[c]));
const add = (a,b)=>a.map((row,r)=>row.map((x,c)=>x+b[r][c]));
const weights = (seed,rows,cols)=>Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>Math.sin(seed*1.73+r*2.11+c*.97)*.45));
export const numericSoftmax = row=>{
 const max=Math.max(...row),exp=row.map(x=>Number.isFinite(x)?Math.exp(x-max):0),sum=exp.reduce((s,x)=>s+x,0);
 return exp.map(x=>x/sum);
};
export const numericNorm = a=>a.map(row=>{const rms=Math.sqrt(row.reduce((s,x)=>s+x*x,0)/row.length+1e-6);return row.map(x=>x/rms);});
export const numericGelu = x=>.5*x*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+.044715*x*x*x)));
const rope = a=>a.map((row,p)=>row.map((_,c)=>{
 const pair=c-c%2,angle=p/Math.pow(10000,pair/row.length),cos=Math.cos(angle),sin=Math.sin(angle);
 return c%2?row[pair]*sin+row[c]*cos:row[c]*cos-row[pair+1]*sin;
}));

export function runNumericInference({tokenIds,layer=1,totalLayers=32,modelType='dense',expertCount=8}) {
 const embeddingTable=weights(2,NUMERIC_VOCAB,NUMERIC_D);
 const embedding=tokenIds.map(id=>[...embeddingTable[((id%NUMERIC_VOCAB)+NUMERIC_VOCAB)%NUMERIC_VOCAB]]);
 let x=embedding,selected;
 for(let l=1;l<=totalLayers;l++){
  const seed=l*17,input=x,normalized=numericNorm(input);
  const wq=weights(seed+1,4,4),wk=weights(seed+2,4,4),wv=weights(seed+3,4,4),wo=weights(seed+4,4,4);
  const q=rope(matmul(normalized,wq)),k=rope(matmul(normalized,wk)),v=matmul(normalized,wv);
  const scores=matmul(q,transpose(k)).map(row=>row.map(s=>s/Math.sqrt(NUMERIC_D)));
  const mask=scores.map((row,r)=>row.map((_,c)=>c>r));
  const probabilities=scores.map((row,r)=>numericSoftmax(row.map((s,c)=>mask[r][c]?-Infinity:s)));
  const attentionOutput=matmul(probabilities,v),attentionProjected=matmul(attentionOutput,wo);
  const attentionResidual=add(input,attentionProjected),ffnInput=numericNorm(attentionResidual);
  const ffnUpWeight=weights(seed+5,4,6),ffnDownWeight=weights(seed+6,6,4);
  const denseHidden=matmul(ffnInput,ffnUpWeight).map(row=>row.map(numericGelu));
  const routerWeight=weights(seed+7,4,expertCount),routerValues=matmul(ffnInput,routerWeight).map(numericSoftmax);
  const routes=routerValues.map((row,r)=>{
   const topK=row.map((p,e)=>({p,e})).sort((a,b)=>b.p-a.p||a.e-b.e).slice(0,2).map(item=>item.e);
   const mass=topK.reduce((s,e)=>s+row[e],0);
   return {row:r,topK,weights:topK.map(e=>row[e]/mass)};
  });
  const experts=Array.from({length:expertCount},(_,e)=>{
   const up=weights(seed+20+e*2,4,6),down=weights(seed+21+e*2,6,4);
   const hidden=matmul(ffnInput,up).map(row=>row.map(numericGelu));
   return {up,down,hidden,output:matmul(hidden,down)};
  });
  const ffnOutput=modelType==='moe'
   ?routes.map(route=>Array.from({length:4},(_,c)=>route.topK.reduce((s,e,i)=>s+route.weights[i]*experts[e].output[route.row][c],0)))
   :matmul(denseHidden,ffnDownWeight);
  x=add(attentionResidual,ffnOutput);
  if(l===layer)selected={input,normalized,q,k,v,wq,wk,wv,wo,scores,mask,probabilities,attentionOutput,attentionProjected,attentionResidual,ffnInput,ffnUpWeight,ffnDownWeight,denseHidden,routerWeight,routerValues,routes,experts,ffnOutput,layerOutput:x};
 }
 const vocabWeight=weights(19,4,NUMERIC_VOCAB),lastHidden=numericNorm([x.at(-1)]),logits=matmul(lastHidden,vocabWeight);
 return {...selected,embeddingTable,embedding,lastHidden,vocabWeight,logits,vocabularyProbabilities:numericSoftmax(logits[0]),tokenIds};
}

export const samplingDraw = step=>[.73,.21,.92,.47,.61,.15][Math.max(0,step)%6];
export function chooseSamplingCandidate(distribution,draw=.5){
 if(!distribution?.candidates?.length)return null;
 const u=Math.max(0,Math.min(1-Number.EPSILON,Number(draw)||0));
 let cumulative=0;
 for(const candidate of distribution.candidates){cumulative+=candidate.finalProbability;if(u<cumulative)return candidate;}
 return distribution.candidates.filter(c=>c.finalProbability>0).at(-1);
}
