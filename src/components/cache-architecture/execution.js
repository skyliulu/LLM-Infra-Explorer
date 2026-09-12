// Teaching checkpoints: five sequential layers per checkpoint, not parallel kernels.
export function deriveCedExecution(m, step = null) {
 const overview = step === null;
 const cursor = overview ? 10 : Math.max(0, Math.min(10, Math.trunc(step)));
 const encoderLayers = Math.min(cursor, 4) * 5;
 const projected = cursor >= 5;
 const decoderLayers = Math.max(0, Math.min(4, cursor - 5)) * 5;
 const done = cursor === 10;
 const stage = cursor === 0 ? 'input' : cursor <= 4 ? 'encoder' : cursor === 5 ? 'projection' : cursor <= 9 ? 'window' : 'generation';
 const existing = m.phase === 'decode' ? m.tokens - 1 : 0;
 const written = projected ? m.technical.projectionRows : 0;
 return { overview, cursor, done, stage, encoderLayers, decoderLayers, projected,
  existing, written, resident: existing + written, bytes: (existing + written) * 356,
  work: encoderLayers * m.technical.inputRows + decoderLayers * m.technical.decoderRows,
  status: {encoder: encoderLayers===20?'ready':encoderLayers>0?'active':'pending', projection:projected?'ready':'pending', window:decoderLayers===20?'ready':decoderLayers>0?'active':'pending', generation:done?'ready':'pending'},
 };
}
