export const MODES = ['exact', 'linear', 'gla', 'deltanet'];

export const TRACKS = {
  exact: ['exactScores', 'exactMask', 'exactAggregate', 'exactBottleneck'],
  linear: ['linearMap', 'linearReorder', 'linearRecurrence', 'linearOutput'],
  gla: ['glaProblem', 'glaGate', 'glaRecurrence', 'glaOutput'],
  deltanet: ['deltaRead', 'deltaError', 'deltaUpdate', 'deltaOutput'],
};

export const FORMULAS = {
  projections: String.raw`\begin{aligned}q_t&=x_tW_Q\\k_t&=x_tW_K\\v_t&=x_tW_V\end{aligned}`,
  exactScore: String.raw`s_{tj}=\frac{q_tk_j^\top}{\sqrt{d_k}}`,
  exactWeights: String.raw`a_{tj}=\operatorname{softmax}(s_{t,1:t})_j`,
  exactOutput: String.raw`o_t=\sum_{j\le t}a_{tj}v_j`,
  exactMatrix: String.raw`\operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}+M\right)V`,
  featureMap: String.raw`\phi(x)=\operatorname{ELU}(x)+1`,
  outerUpdate: String.raw`\Delta S_t=\phi(k_t)^\top v_t`,
  associationLeft: String.raw`\bigl(\phi(Q)\phi(K)^\top\bigr)V`,
  associationRight: String.raw`\phi(Q)\bigl(\phi(K)^\top V\bigr)`,
  state: String.raw`S_t=S_{t-1}+\phi(k_t)^\top v_t`,
  normalizer: String.raw`z_t=z_{t-1}+\phi(k_t)`,
  linearOutput: String.raw`o_t=\frac{\phi(q_t)S_t}{\phi(q_t)z_t^\top+\varepsilon}`,
  gate: String.raw`G_t=\alpha_t^\top\beta_t,\quad \alpha_t\in(0,1)^{1\times d_k},\ \beta_t\in(0,1)^{1\times d_v}`,
  glaMapGate: String.raw`\alpha_t=\sigma(x_tW_\alpha),\quad\beta_t=\sigma(x_tW_\beta),\quad G_t=\alpha_t^\top\beta_t`,
  glaDecay: String.raw`\widetilde S_{t-1}=G_t\odot S_{t-1}`,
  glaWrite: String.raw`S_t=\widetilde S_{t-1}+k_t^\top v_t`,
  gatedState: String.raw`S_t=(\alpha_t^\top\beta_t)\odot S_{t-1}+k_t^\top v_t`,
  glaOutput: String.raw`o_t=q_tS_t`,
  deltaRead: String.raw`\hat v_t=\alpha_t k_t S_{t-1}`,
  deltaError: String.raw`\delta_t=v_t-\hat v_t`,
  deltaUpdate: String.raw`S_t=\alpha_t S_{t-1}+\beta_t k_t^\top\delta_t`,
  deltaOutput: String.raw`o_t=q_tS_t`,
};

const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const round = (value) => Math.round(value * 100) / 100;

export const vectorFor = (index, salt = 0, size = 4) => Array.from({ length: size }, (_, dim) => {
  const wave = Math.sin((index + 1) * (dim + 1) * 0.71 + salt * 1.37);
  const detail = Math.cos((index + 2) * (dim + 1) * 0.29 + salt * 0.61);
  return round(wave * 0.72 + detail * 0.28);
});

export const featureMap = (vector) => vector.map((value) => round(value >= 0 ? value + 1 : Math.exp(value)));

const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);

const outer = (left, right) => left.map((leftValue) => right.map((rightValue) => round(leftValue * rightValue)));

const zeroMatrix = (rows = 4, columns = 4) => Array.from({ length: rows }, () => Array(columns).fill(0));

const addMatrix = (left, right) => left.map((row, rowIndex) => row.map((value, columnIndex) => round(value + right[rowIndex][columnIndex])));

const multiplyMatrix = (left, right) => left.map((row, rowIndex) => row.map((value, columnIndex) => round(value * right[rowIndex][columnIndex])));

const softmax = (values) => {
  const max = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - max));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / denominator);
};

const weightedSum = (weights, values) => values[0].map((_, dim) => round(values.reduce((sum, value, index) => sum + weights[index] * value[dim], 0)));

const matrixRead = (query, matrix) => matrix[0].map((_, column) => round(matrix.reduce((sum, row, rowIndex) => sum + query[rowIndex] * row[column], 0)));

const retentionVector = (index, gateStrength, salt) => Array.from({ length: 4 }, (_, dim) => round(clamp(
  1 - gateStrength * (0.28 + 0.58 * ((Math.sin((index + 1) * (dim + 2) + salt) + 1) / 2)),
  0.08,
  0.995,
)));

const accumulateKernelLinear = (endIndex) => {
  let state = zeroMatrix();
  let normalizer = Array(4).fill(0);
  let previousState = zeroMatrix();
  let previousNormalizer = Array(4).fill(0);
  let update = zeroMatrix();

  for (let index = 0; index <= endIndex; index += 1) {
    const key = featureMap(vectorFor(index, 2));
    const value = vectorFor(index, 3);
    previousState = state;
    previousNormalizer = normalizer;
    update = outer(key, value);
    state = addMatrix(previousState, update);
    normalizer = previousNormalizer.map((entry, dim) => round(entry + key[dim]));
  }

  return {
    state,
    normalizer,
    previousState,
    previousNormalizer,
    decayedState: previousState,
    decayedNormalizer: previousNormalizer,
    update,
    retention: Array(4).fill(1),
    retentionKey: Array(4).fill(1),
    retentionValue: Array(4).fill(1),
    gateMatrix: Array.from({ length: 4 }, () => Array(4).fill(1)),
  };
};

const accumulateGla = (endIndex, gated, gateStrength) => {
  let state = zeroMatrix();
  let previousState = zeroMatrix();
  let decayedState = zeroMatrix();
  let update = zeroMatrix();
  let retentionKey = Array(4).fill(1);
  let retentionValue = Array(4).fill(1);
  let gateMatrix = Array.from({ length: 4 }, () => Array(4).fill(1));

  for (let index = 0; index <= endIndex; index += 1) {
    const key = vectorFor(index, 2);
    const value = vectorFor(index, 3);
    retentionKey = gated ? retentionVector(index, gateStrength, 0.35) : Array(4).fill(1);
    retentionValue = gated ? retentionVector(index, gateStrength, 1.55) : Array(4).fill(1);
    gateMatrix = outer(retentionKey, retentionValue);
    previousState = state;
    decayedState = multiplyMatrix(previousState, gateMatrix);
    update = outer(key, value);
    state = addMatrix(decayedState, update);
  }

  return {
    state,
    normalizer: null,
    previousState,
    previousNormalizer: null,
    decayedState,
    decayedNormalizer: null,
    update,
    retention: retentionKey,
    retentionKey,
    retentionValue,
    gateMatrix,
  };
};

const normalizeVec = (vec) => {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => round(v / norm));
};

const accumulateDeltaNet = (endIndex, gateStrength) => {
  let state = zeroMatrix();
  let previousState = zeroMatrix();
  let decayedState = zeroMatrix();
  let update = zeroMatrix();
  let predictedValue = Array(4).fill(0);
  let deltaError = Array(4).fill(0);
  let scaledDeltaError = Array(4).fill(0);
  let deltaKey = Array(4).fill(0);
  const alpha = round(clamp(1 - gateStrength * 0.45, 0.35, 0.98));
  const beta = 0.9;
  const gateMatrix = Array.from({ length: 4 }, () => Array(4).fill(alpha));

  for (let index = 0; index <= endIndex; index += 1) {
    deltaKey = normalizeVec(vectorFor(index, 2));
    const value = vectorFor(index, 3);
    previousState = state;
    decayedState = previousState.map((row) => row.map((cell) => round(cell * alpha)));
    predictedValue = matrixRead(deltaKey, decayedState);
    deltaError = value.map((v, i) => round(v - predictedValue[i]));
    scaledDeltaError = deltaError.map((d) => round(d * beta));
    update = outer(deltaKey, scaledDeltaError);
    state = addMatrix(decayedState, update);
  }

  return {
    state,
    normalizer: null,
    previousState,
    previousNormalizer: null,
    decayedState,
    decayedNormalizer: null,
    update,
    deltaKey,
    predictedValue,
    deltaError,
    scaledDeltaError,
    deltaAlpha: alpha,
    deltaBeta: beta,
    retention: Array(4).fill(alpha),
    retentionKey: Array(4).fill(alpha),
    retentionValue: Array(4).fill(beta),
    gateMatrix,
  };
};

export const getAttentionState = ({ mode, step, tokenIndex, n, dk, dv, gateStrength }) => {
  const query = vectorFor(tokenIndex, 1);
  const key = vectorFor(tokenIndex, 2);
  const value = vectorFor(tokenIndex, 3);
  const phiQuery = featureMap(query);
  const phiKey = featureMap(key);
  const prefixKeys = Array.from({ length: tokenIndex + 1 }, (_, index) => vectorFor(index, 2));
  const prefixValues = Array.from({ length: tokenIndex + 1 }, (_, index) => vectorFor(index, 3));
  const scores = prefixKeys.map((entry) => round(dot(query, entry) / 2));
  const weights = softmax(scores);
  const exactOutput = weightedSum(weights, prefixValues);
  const isGla = mode === 'gla';
  const isDelta = mode === 'deltanet';
  const isDirectRead = isGla || isDelta;
  const recurrent = isDelta ? accumulateDeltaNet(tokenIndex, gateStrength) : isGla ? accumulateGla(tokenIndex, true, gateStrength) : accumulateKernelLinear(tokenIndex);
  const plainRecurrent = isDelta ? accumulateGla(tokenIndex, true, gateStrength) : isGla ? accumulateGla(tokenIndex, false, gateStrength) : accumulateKernelLinear(tokenIndex);
  const readQuery = isDirectRead ? query : phiQuery;
  const numerator = matrixRead(readQuery, recurrent.state);
  const denominator = isDirectRead ? 1 : Math.max(0.001, dot(phiQuery, recurrent.normalizer));
  const linearOutput = isDirectRead ? numerator : numerator.map((entry) => round(entry / denominator));
  const plainNumerator = matrixRead(readQuery, plainRecurrent.state);
  const plainDenominator = isDirectRead ? 1 : Math.max(0.001, dot(phiQuery, plainRecurrent.normalizer));
  const plainOutput = isDirectRead ? plainNumerator : plainNumerator.map((entry) => round(entry / plainDenominator));
  const sampledN = Math.min(n, 8);
  const currentSampleRow = Math.min(sampledN - 1, Math.round((tokenIndex / Math.max(1, n - 1)) * (sampledN - 1)));

  return {
    mode,
    step,
    tokenIndex,
    n,
    dk,
    dv,
    query,
    key,
    deltaKey: isDelta ? recurrent.deltaKey : normalizeVec(key),
    value,
    phiQuery,
    phiKey,
    scores,
    weights,
    exactOutput,
    numerator,
    denominator: round(denominator),
    linearOutput,
    plainOutput,
    glaBaselineOutput: isDelta ? plainOutput : null,
    plainState: plainRecurrent.state,
    plainNormalizer: plainRecurrent.normalizer,
    sampledN,
    currentSampleRow,
    scoreCells: n * n,
    exactScoreBytes: n * n * 2,
    // Recurrent state S (and z for kernel linear) is stored in FP32 (4 B/elem) for numerical stability
    recurrentBytes: (isDirectRead ? dk * dv : dk * dv + dk) * 4,
    ...recurrent,
  };
};

export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes >= 10240 ? 0 : 1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
