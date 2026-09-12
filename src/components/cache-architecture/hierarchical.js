import {LAYERS} from './model.js';

// Deterministic teaching scores, not model weights or benchmark measurements.
const score = (position, source) => ((position * 17 + Math.floor(position / 3) * 11 + source * (position % 7 + 1) * 13) % 97) / 10;
export function selectCandidateBlocks(scores, keepCount, blockSize = 8) {
 const blocks = Array.from({length:Math.ceil(scores.length/blockSize)},(_,id)=>({
  id, start:id*blockSize, end:Math.min(scores.length,(id+1)*blockSize),
  score:Math.max(...scores.slice(id*blockSize,(id+1)*blockSize)),
  pinned:id===Math.ceil(scores.length/blockSize)-1,
 }));
 const kept = new Set([...blocks].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.score-a.score||a.id-b.id).slice(0,keepCount).map(b=>b.id));
 return blocks.map(b=>({...b,kept:kept.has(b.id)}));
}
export function deriveHierarchicalIndexer({tokens=4096,layer=20}={}) {
 tokens=Number.isFinite(tokens)?Math.max(1,Math.min(1000000,Math.floor(tokens))):4096;
 layer=Number.isFinite(layer)?Math.max(0,Math.min(39,Math.floor(layer))):20;
 const selected=LAYERS[layer], enabled=layer>=20, source=enabled?selected.indexOwner:20;
 const length=Math.min(tokens,32), firstScores=Array.from({length},(_,i)=>score(i,20));
 const blocks=selectCandidateBlocks(firstScores,3);
 const rows=firstScores.map((first,id)=>({id,first,score:score(id,source),candidate:blocks[Math.floor(id/8)].kept}));
 // The source layer's own Top-K is GLOBAL, independent of its block-pool output.
 const ranked=rows.filter(r=>source===20||r.candidate).sort((a,b)=>b.score-a.score||a.id-b.id);
 const topIds=ranked.slice(0,Math.min(2,length)).map(r=>r.id).sort((a,b)=>a-b);
 const candidateBound=Math.min(tokens,2048*8);
 return {enabled,tokens,layer,source,reuse:selected.mode==='reuse',blocks,
  rows:rows.map(r=>({...r,selected:topIds.includes(r.id)})),topIds,
  candidateBound,topCount:Math.min(tokens,512),restricted:source>20,
  // Latest block is pinned. With a partial final block, the exact pool has fewer slots.
  candidateCount:tokens<=16384?tokens:2047*8+((tokens-1)%8+1),
  exampleLength:length,examplePool:rows.filter(r=>r.candidate).length,
  reduction:Math.max(0,1-candidateBound/tokens),
 };
}
