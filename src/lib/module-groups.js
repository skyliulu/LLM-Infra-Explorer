export const MODULE_GROUPS = [
  { id: 'foundations', label: { en: 'Foundations', zh: '推理基础' }, chapters: ['llm'] },
  { id: 'attention', label: { en: 'Attention', zh: '注意力' }, chapters: ['flash', 'flashdecode', 'sparseattn', 'linearattn'] },
  { id: 'memory', label: { en: 'Memory & Precision', zh: '缓存与精度' }, chapters: ['quantization', 'radixcache'] },
  { id: 'distributed', label: { en: 'Parallelism', zh: '并行策略' }, chapters: ['parallel', 'dpattention'] },
  { id: 'advanced', label: { en: 'Advanced Inference', zh: '进阶推理' }, chapters: ['speculative', 'engram', 'cachearch'] },
];
