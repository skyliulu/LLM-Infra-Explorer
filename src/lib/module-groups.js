export const MODULE_GROUPS = [
  { id: 'execution', label: { en: 'Execution', zh: '推理执行' }, chapters: ['llm', 'speculative'] },
  { id: 'attention', label: { en: 'Attention', zh: '注意力' }, chapters: ['flash', 'sparseattn', 'flashdecode', 'linearattn'] },
  { id: 'memory', label: { en: 'Memory & precision', zh: '缓存与精度' }, chapters: ['quantization', 'engram', 'radixcache'] },
  { id: 'distributed', label: { en: 'Parallelism', zh: '并行策略' }, chapters: ['parallel', 'dpattention'] },
];
