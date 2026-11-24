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
  mooncake: 'Mooncake',
  dpattention: 'DP Attention',
  linearattn: 'Linear Attention',
  deepinfer: 'DeepInfer',
  gpucudagraph: 'GPU & CUDA',
  commcollective: 'Collective Comm',
  scheduler: 'Serving Scheduler',
  pdrouter: 'PD Disaggregation',
  pagedkv: 'PagedAttention',
  structuredoutput: 'Structured Output',
  vlmvision: 'VLM & Visual Tokens',
  epdserving: 'EPD Disaggregation',
  diffusiondit: 'Diffusion & DiT Infra',
};

export const getModuleLabel = id => MODULE_LABELS[id];
