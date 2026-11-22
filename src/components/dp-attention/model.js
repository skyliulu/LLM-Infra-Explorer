export const RANK_COUNT = 4;

export const DP_LOAD_PROFILES = ['balanced', 'skewed_empty', 'pd_collision'];
export const TBO_MODES = ['off', 'on'];

export const LOAD_PROFILE_CONFIG = {
  balanced: {
    rankTokens: [4, 4, 4, 4],
    rankKinds: ['decode', 'decode', 'decode', 'decode'],
    hasDummy: false,
    hasBarrierStall: false,
    barrierWaitRatio: 1,
  },
  skewed_empty: {
    rankTokens: [8, 4, 2, 0],
    rankKinds: ['decode', 'decode', 'decode', 'dummy'],
    hasDummy: true,
    hasBarrierStall: false,
    barrierWaitRatio: 4,
  },
  pd_collision: {
    rankTokens: [2048, 4, 4, 4],
    rankKinds: ['prefill', 'decode', 'decode', 'decode'],
    hasDummy: false,
    hasBarrierStall: true,
    barrierWaitRatio: 32,
  },
};

export const DP_ATTENTION_CONFIGS = {
  tp: {
    tpSize: 4,
    dpSize: 1,
    attentionTpSize: 4,
    moeTopology: 'tp',
  },
  dp: {
    tpSize: 4,
    dpSize: 4,
    attentionTpSize: 1,
  },
};
const PIPELINES = {
  tp: ['idle', 'input', 'attention', 'moe', 'output', 'done'],
  dpTp: ['idle', 'input', 'attention', 'gather', 'moe', 'reduceScatter', 'done'],
  dpEp: ['idle', 'input', 'attention', 'expertDispatch', 'moe', 'expertCombine', 'done'],
};

const normalizeMode = (mode) => (mode === 'tp' ? 'tp' : 'dp');
const normalizeMoeTopology = (mode, topology) => (
  mode === 'tp' ? 'tp' : topology === 'ep' ? 'ep' : 'tp'
);

export const getPipeline = (mode, moeTopology = 'tp') => {
  const normalizedMode = normalizeMode(mode);
  const normalizedTopology = normalizeMoeTopology(normalizedMode, moeTopology);
  if (normalizedMode === 'tp') return PIPELINES.tp;
  return normalizedTopology === 'ep' ? PIPELINES.dpEp : PIPELINES.dpTp;
};

export const getMaxStep = (mode, moeTopology = 'tp') => getPipeline(mode, moeTopology).length - 1;

export const normalizeDpAttentionState = ({ mode = 'dp', moeTopology = 'tp', step = 0 } = {}) => {
  const normalizedMode = normalizeMode(mode);
  const normalizedTopology = normalizeMoeTopology(normalizedMode, moeTopology);
  const maxStep = getMaxStep(normalizedMode, normalizedTopology);
  const numericStep = Number.isFinite(Number(step)) ? Number(step) : 0;
  return {
    mode: normalizedMode,
    moeTopology: normalizedTopology,
    step: Math.min(maxStep, Math.max(0, Math.trunc(numericStep))),
    maxStep,
  };
};

const getStageStatus = (pipeline, activeIndex, operation) => {
  const index = pipeline.indexOf(operation);
  if (index < 0) return 'absent';
  if (activeIndex === 0) return 'pending';
  if (activeIndex === pipeline.length - 1) return 'done';
  if (index < activeIndex) return 'passed';
  if (index === activeIndex) return 'active';
  return 'pending';
};

export const deriveDpAttentionSnapshot = (input = {}) => {
  const normalized = normalizeDpAttentionState(input);
  const { mode, moeTopology, step, maxStep } = normalized;
  const pipeline = getPipeline(mode, moeTopology);
  const operation = pipeline[step];
  const phase = step === 0 ? 'idle' : step === maxStep ? 'done' : 'running';
  const config = mode === 'tp'
    ? DP_ATTENTION_CONFIGS.tp
    : { ...DP_ATTENTION_CONFIGS.dp, moeTopology };
  const isDp = mode === 'dp';
  const cacheVisible = step >= pipeline.indexOf('attention');
  const replicationFactor = config.attentionTpSize;
  const perRankPercent = cacheVisible ? 100 / config.dpSize : 0;
  const clusterPercent = cacheVisible ? replicationFactor * 100 : 0;
  const communicationOperation = ['gather', 'reduceScatter', 'expertDispatch', 'expertCombine'].includes(operation)
    ? operation
    : null;
  const loadProfile = isDp && DP_LOAD_PROFILES.includes(input.loadProfile) ? input.loadProfile : 'balanced';
  const workloadConfig = LOAD_PROFILE_CONFIG[loadProfile];
  const tboEnabled = isDp && moeTopology === 'ep' && input.tbo === 'on';

  return {
    ...normalized,
    phase,
    operation,
    pipeline,
    config,
    queryLength:1,
    historyLength:Math.max(1,Math.trunc(Number(input.historyLength)||128)),
    isDp,
    communicationOperation,
    loadProfile,
    workload: {
      profile: loadProfile,
      rankTokens: workloadConfig.rankTokens,
      rankKinds: workloadConfig.rankKinds,
      hasDummy: workloadConfig.hasDummy,
      hasBarrierStall: workloadConfig.hasBarrierStall,
      barrierWaitRatio: workloadConfig.barrierWaitRatio,
    },
    tboEnabled,
    tboTimeline: [
      { slot: 'T1', compute: 'MB0 Attn', comm: '—' },
      { slot: 'T2', compute: 'MB1 Attn', comm: 'MB0 A2A Dispatch' },
      { slot: 'T3', compute: 'MB0 EP-MoE', comm: 'MB1 A2A Dispatch' },
      { slot: 'T4', compute: 'MB1 EP-MoE', comm: 'MB0 A2A Combine' },
      { slot: 'T5', compute: 'Next Layer', comm: 'MB1 A2A Combine' },
    ],
    statusKey: `status.${operation}`,
    assumptionKey: isDp
      ? moeTopology === 'ep' ? 'assumption.dpEp' : 'assumption.dpTp'
      : 'assumption.tp',
    cache: {
      visible: cacheVisible,
      perRankPercent,
      clusterPercent,
      replicationFactor,
      localRequestFraction: 1 / config.dpSize,
      shapeLatex: isDp
        ? String.raw`\left[\frac{B}{4},\,T_{\mathrm{KV}},\,d_c+d_h^R\right]`
        : String.raw`\left[B,\,T_{\mathrm{KV}},\,d_c+d_h^R\right]`,
      formulaLatex: String.raw`M_{\mathrm{KV}}=B\,T_{\mathrm{KV}}\,(d_c+d_h^R)\,b`,
      totalFormulaLatex: isDp
        ? String.raw`M_{\mathrm{cluster}}=\frac{p}{d}\,M_{\mathrm{KV}}=1\times M_{\mathrm{KV}}`
        : String.raw`M_{\mathrm{cluster}}=p\,M_{\mathrm{KV}}=4\times M_{\mathrm{KV}}`,
    },
    tensors: {
      inputShapeLatex: isDp ? String.raw`\left[\frac{B}{4},1,H\right]` : String.raw`[B,1,H]`,
      attentionOutputShapeLatex: isDp ? String.raw`\left[\frac{B}{4},1,H\right]` : String.raw`[B,1,H]`,
      moeInputShapeLatex: isDp && moeTopology === 'ep'
        ? String.raw`[T_{\mathrm{expert}},H]`
        : String.raw`[B,1,H]`,
      finalShapeLatex: isDp ? String.raw`\left[\frac{B}{4},1,H\right]` : String.raw`[B,1,H]`,
      querySource: 'hidden',
      kvSource: 'hidden',
    },
    views: {
      inputVisible: step >= pipeline.indexOf('input'),
      attentionVisible: step >= pipeline.indexOf('attention'),
      bridgeVisible: isDp && step >= 3,
      moeVisible: step >= pipeline.indexOf('moe'),
      returnVisible: isDp && step >= 5,
      outputVisible: phase === 'done' || operation === 'output' || operation === 'reduceScatter' || operation === 'expertCombine',
      gatherStatus: getStageStatus(pipeline, step, 'gather'),
      reduceScatterStatus: getStageStatus(pipeline, step, 'reduceScatter'),
      expertDispatchStatus: getStageStatus(pipeline, step, 'expertDispatch'),
      expertCombineStatus: getStageStatus(pipeline, step, 'expertCombine'),
      attentionStatus: getStageStatus(pipeline, step, 'attention'),
      moeStatus: getStageStatus(pipeline, step, 'moe'),
    },
  };
};
