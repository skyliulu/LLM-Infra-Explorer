// Stable English index labels, independent of the content language.
export const MODULE_LABELS = {
  llm: 'LLM Inference',
  parallel: 'Parallel Strategy',
  flash: 'Flash Attention',
  sparseattn: 'Sparse Attention',
  cachearch: 'DeepSeek CED',
  flashdecode: 'Flash Decode',
  speculative: 'Spec Decode',
  quantization: 'Quantization',
  engram: 'Engram',
  radixcache: 'Radix HiCache',
  dpattention: 'DP Attention',
  linearattn: 'Linear Attention',
};

export const getModuleLabel = id => MODULE_LABELS[id];
