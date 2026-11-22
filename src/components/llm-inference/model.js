import {runNumericInference} from './numeric-model.js';
export const TOTAL_LAYERS = 32;
export const EXPERT_COUNT = 8;

export const MODULE = {
  idle: 0,
  embedding: 1,
  attention: 2,
  ffn: 3,
  lmHead: 5,
  tokenDone: 6,
};

const stageOrder = {
  embedding: MODULE.embedding,
  attention: MODULE.attention,
  ffn: MODULE.ffn,
  lmHead: MODULE.lmHead,
};

export const getStageStatus = (stage, activeModule) => {
  if (activeModule === MODULE.idle) return 'pending';
  const order = stageOrder[stage];
  if (activeModule === order) return 'active';
  return activeModule > order ? 'passed' : 'pending';
};

const normalizeWeights = (values) => {
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.map((value) => total > 0 ? value / total : 0);
};

export const deriveSamplingDistribution = ({ candidates, temperature, topK, topP }) => {
  if (!candidates?.length) return null;

  const normalizedTemperature = Math.min(1.5, Math.max(0.1, Number(temperature) || 0.7));
  const normalizedTopK = Math.min(candidates.length, Math.max(1, Math.round(Number(topK) || 1)));
  const normalizedTopP = Math.min(1, Math.max(0.1, Number(topP) || 0.9));
  const temperatureProbabilities = normalizeWeights(
    candidates.map((candidate) => Math.pow(Math.max(candidate.p, Number.EPSILON), 1 / normalizedTemperature)),
  );
  const ranked = candidates
    .map((candidate, index) => ({ ...candidate, sourceIndex: index, temperatureProbability: temperatureProbabilities[index] }))
    .sort((a, b) => b.temperatureProbability - a.temperatureProbability);
  const topKMass = ranked.slice(0, normalizedTopK).reduce((sum, candidate) => sum + candidate.temperatureProbability, 0);
  let cumulative = 0;
  let keptCount = 0;
  const withCutoffs = ranked.map((candidate, rank) => {
    const topKProbability = rank < normalizedTopK ? candidate.temperatureProbability / topKMass : 0;
    const accepted = rank < normalizedTopK && cumulative < normalizedTopP;
    if (rank < normalizedTopK) cumulative += topKProbability;
    if (accepted) {
      keptCount += 1;
    }
    return {
      ...candidate,
      rank,
      topKProbability,
      cumulativeProbability: rank < normalizedTopK ? Math.min(1, cumulative) : 1,
      accepted,
    };
  });
  const acceptedMass = withCutoffs.reduce(
    (sum, candidate) => sum + (candidate.accepted ? candidate.temperatureProbability : 0),
    0,
  );

  return {
    temperature: normalizedTemperature,
    topK: normalizedTopK,
    topP: normalizedTopP,
    keptCount,
    totalCount: candidates.length,
    candidates: withCutoffs.map((candidate) => ({
      ...candidate,
      finalProbability: candidate.accepted ? candidate.temperatureProbability / acceptedMass : 0,
    })),
  };
};

const getLayerCacheTokens = ({
  phase,
  activeModule,
  currentLayer,
  layer,
  promptLength,
  step,
}) => {
  if (phase === 'idle') return 0;
  const isPrefill = phase === 'prefill';
  const baseTokens = isPrefill ? 0 : promptLength + Math.max(0, step - 1);
  const targetTokens = isPrefill ? promptLength : baseTokens + 1;
  if (activeModule >= MODULE.lmHead) return targetTokens;
  if (layer < currentLayer) return targetTokens;
  if (layer === currentLayer && activeModule >= MODULE.attention) return targetTokens;
  return baseTokens;
};

export const deriveInferenceTensorSnapshot = ({
  phase,
  activeModule,
  currentLayer,
  step,
  promptLength,
  modelType,
  totalLayers = TOTAL_LAYERS,
  expertCount = EXPERT_COUNT,
  tokenIds,
}) => {
  const isPrefill = phase === 'idle' || phase === 'prefill';
  const sequenceRows = isPrefill ? promptLength : 1;
  const keyRows = isPrefill ? promptLength : promptLength + step;
  const displaySequenceRows = Math.max(1, Math.min(sequenceRows, 6));
  const displayKeyRows = Math.max(1, keyRows);
  const layerCacheTokens = Array.from({ length: totalLayers }, (_, index) => getLayerCacheTokens({
    phase,
    activeModule,
    currentLayer,
    layer: index + 1,
    promptLength,
    step,
  }));
  const cacheTargetTokens = isPrefill ? promptLength : promptLength + step;
  const currentLayerCacheTokens = layerCacheTokens[currentLayer - 1] ?? 0;
  const completedLayerCount = layerCacheTokens.filter((count) => count === cacheTargetTokens).length;
  const stageStatus = {
    embedding: getStageStatus('embedding', activeModule),
    attention: getStageStatus('attention', activeModule),
    ffn: getStageStatus('ffn', activeModule),
    lmHead: getStageStatus('lmHead', activeModule),
  };
  const ids=Array.from({length:keyRows},(_,i)=>tokenIds?.[i]??i%6);
  const numeric=runNumericInference({tokenIds:ids,layer:currentLayer,totalLayers,modelType,expertCount});
  const visibleRows=matrix=>isPrefill?matrix.slice(0,displaySequenceRows):matrix.slice(-1);
  const attention={queryRows:sequenceRows,keyRows,displayRows:displaySequenceRows,displayCols:displayKeyRows,
    scores:visibleRows(numeric.scores),probabilities:visibleRows(numeric.probabilities),mask:visibleRows(numeric.mask)};
  const routes=visibleRows(numeric.routes).map((route,row)=>({...route,row}));
  const selectedExpert=routes[0].topK[0],selected=numeric.experts[selectedExpert];
  const expertLoads=Array.from({length:expertCount},(_,e)=>routes.filter(r=>r.topK.includes(e)).length);

  return {
    phase,
    modelType,
    isPrefill,
    isLayerStage: activeModule === MODULE.attention || activeModule === MODULE.ffn,
    positionFormula: isPrefill
      ? String.raw`p=0,\ldots,${promptLength - 1}`
      : String.raw`p=${promptLength + Math.max(0, step - 1)}`,
    sequenceRows,
    keyRows,
    displaySequenceRows,
    displayKeyRows,
    stageStatus,
    layerProgress: `${currentLayer} / ${totalLayers}`,
    currentLayer,
    totalLayers,
    cache: {
      layerTokens: layerCacheTokens,
      currentLayerTokens: currentLayerCacheTokens,
      targetTokens: cacheTargetTokens,
      completedLayerCount,
      writeActive: activeModule === MODULE.attention,
      writeIndex: Math.max(0, cacheTargetTokens - 1),
    },
    numeric,
    numericShape: {d:4,ffn:6,vocab:6},
    tokenIds:isPrefill?ids:ids.slice(-1),
    tensors: {
      embeddingTable:numeric.embeddingTable,embedding:visibleRows(numeric.embedding),
      residual:visibleRows(numeric.input),q:visibleRows(numeric.q),k:numeric.k,v:numeric.v,
      attentionOutput:visibleRows(numeric.attentionOutput),ffnInput:visibleRows(numeric.ffnInput),
      ffnHidden:visibleRows(numeric.denseHidden),ffnOutput:visibleRows(numeric.ffnOutput),
      lastHidden:numeric.lastHidden,vocabWeight:numeric.vocabWeight,logits:numeric.logits,
      ffnUpWeight:numeric.ffnUpWeight,ffnDownWeight:numeric.ffnDownWeight,routerWeight:numeric.routerWeight,
      expertUpWeight:selected.up,expertDownWeight:selected.down,expertHidden:visibleRows(selected.hidden),
    },
    attention,
    moe:{expertCount,selectedExpert,routes,expertLoads,routerValues:visibleRows(numeric.routerValues)},
    lmHead: {
      inputRows: 1,
      logitsRows: 1,
    },
  };
};
