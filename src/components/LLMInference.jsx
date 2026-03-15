import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Cpu, Database, Zap, AlignLeft, Code, ArrowDown, CornerDownRight, Network, Repeat, SlidersHorizontal, Orbit, Globe } from 'lucide-react';

const i18n = {
  zh: {
    title: 'LLM 推理全景可视化',
    subtitle: '完全掌控大模型的底层脉络：看透注意力、稀疏路由、深度循环与采样艺术',
    reset: '重置',
    play: '播放',
    next: '下一步',
    langToggle: 'EN',
    dense: 'Dense (稠密)',
    moe: 'MoE (稀疏)',
    adjustRandomness: '调整生成随机性',
    tempLabel: '温度(T):',
    sequenceTitle: '序列 (Sequence) - 观察自回归回路',
    promptLabel: 'Prompt (输入提示词):',
    generationLabel: 'Generation (模型生成):',
    kvCacheTitle: 'KV Cache (显存)',
    slots: '槽位',
    modelPipeline: '模型内部流水线',
    moeArch: 'MoE 架构 (MoE Architecture)',
    denseArch: '稠密架构 (Dense Architecture)',
    prefill: 'Prefill',
    decode: 'Decode',
    currentInput: '当前输入: [完整 Prompt - 6 个 Token]',
    autoRegInput: '自回归输入:',
    asInput: '作为输入',
    ropeWait: '等待输入序列...',
    ropePrefill: '依据绝对位置 m 进行多维旋转',
    ropeDecode: '当前生成词绝对位置: m=',
    transformerBlock: 'Transformer Block (×32 Layers)',
    loopingLayer: 'Looping Layer: ',
    top2Fusion: 'Top-2 融合:',
    waitingRouter: '等待 Router 打分分发...',
    lmHeadSample: 'LM Head & 温度采样',
    probDist: '采样概率分布 (Softmax)',
    predDone: '预测完成 ✓',
    waitStack: '等待层循环堆叠完成...',
    waitCalc: '等待计算...',
    codeTitle: '底层代码',
    pyCode: '(Python 伪代码)',
    c_emb1: '# Embedding',
    c_emb2: '# [L, d]',
    c_rope1: '# RoPE: 注入旋转位置编码 (让模型感知词序)',
    c_rope2: '# m 为绝对位置',
    c_loop1: '# 层循环堆叠',
    c_attn1: '# 注意力与 KV Cache',
    c_ffn1: '# Dense FFN',
    c_ffn2: '# 残差连接并进入下一层',
    c_moe1: '# Sparse MoE: 路由分发',
    c_moe2: '# 残差连接',
    c_lm1: '# LM Head & 温度采样',
    c_lm2: '# 映射到词表',
    c_lm3: '# 温度调整缩放',
    stateTitle: '当前微观执行状态',
    waitStartMsg1: '等待开始。当前选择：',
    moeSparse: 'MoE 稀疏架构',
    denseDense: 'Dense 稠密架构',
    waitStartMsg2: '。请点击“播放”。',
    stateEmbTitle: 'Embedding 阶段',
    stateEmbPrefill: '并行读取整个 Prompt。',
    stateEmbDecode: '【自回归现象】提取上轮生成的 Token 作为当前唯一输入。',
    stateRopeTitle: 'RoPE 位置编码',
    stateRopeDesc1: 'Transformer 本身是无视词序的。RoPE 通过将词向量当作复数平面的点，根据其所在的绝对位置 m，进行特定角度 θ 的旋转变换。',
    stateRopeDesc2: '这样后续在算 Attention 向量点积时，模型就能自动感知词与词之间的相对距离！',
    stateAttnTitle: 'Attention 机制与缓存',
    stateAttnPrefill: '将计算出的 K, V 并行写入显存池。',
    stateAttnDecode: '【显存墙瓶颈】模型必须读取全部历史 KV Cache (粉色维度) 来计算当前的注意力分布。',
    stateDenseTitle: 'Dense FFN',
    stateDenseDesc: '全量激活巨大的矩阵网络提取知识特征。',
    stateMoeTitle: 'MoE 稀疏路由',
    stateMoeDesc1: 'Router 对 8 个专家进行打分，仅激活 ',
    stateMoeDesc2: ' 专家进行推理，最后加权融合。',
    stateLoopTitle: '深度循环堆叠 (N-Layers)',
    stateLoopDesc1: '大模型的“大”也体现在深度上。Attention 和 FFN 组成了一个 Block，数据不是走一遍就结束了，而是要通过残差连接，',
    stateLoopDesc2: '反复堆叠计算 ',
    stateLoopDesc3: ' 次',
    stateLoopDesc4: ' 才能进入最后阶段！',
    stateLmTitle: 'LM Head & 温度采样',
    stateLmDesc1: '特征被映射为涵盖整个词表的 Logits (得分)。',
    stateLmDesc2: '温度(T)缩放：',
    stateLmDesc3: '你可以拖动上方滑块试试！',
    stateLmDesc4: '`T < 1`: 放大概率差异，强制模型输出最可能的词（适合写代码）。',
    stateLmDesc5: '`T > 1`: 缩小概率差异，长尾词也能被抽中（适合发散创作）。',
    stateDoneTitle: 'Token 生成完毕',
    stateDoneDesc: '通过采样掷骰子选中下一个词，准备丢回起点循环。',
    routerMatrix: 'Router 矩阵'
  },
  en: {
    title: 'LLM Inference Panorama',
    subtitle: 'Understand attention, sparse routing, deep layer loop and sampling',
    reset: 'Reset',
    play: 'Play',
    next: 'Next',
    langToggle: '中文',
    dense: 'Dense',
    moe: 'MoE (Sparse)',
    adjustRandomness: 'Adjust generation randomness',
    tempLabel: 'Temp(T):',
    sequenceTitle: 'Sequence - Observe Autoregressive Loop',
    promptLabel: 'Prompt (Input):',
    generationLabel: 'Generation (Model Output):',
    kvCacheTitle: 'KV Cache (Memory)',
    slots: 'Slots',
    modelPipeline: 'Model Internal Pipeline',
    moeArch: 'MoE Architecture',
    denseArch: 'Dense Architecture',
    prefill: 'Prefill',
    decode: 'Decode',
    currentInput: 'Current Input: [Full Prompt - 6 Tokens]',
    autoRegInput: 'Autoregressive Input:',
    asInput: 'As Input',
    ropeWait: 'Waiting for input sequence...',
    ropePrefill: 'Multi-dimensional rotation by absolute pos m',
    ropeDecode: 'Current generated token abs pos: m=',
    transformerBlock: 'Transformer Block (×32 Layers)',
    loopingLayer: 'Looping Layer: ',
    top2Fusion: 'Top-2 Fusion:',
    waitingRouter: 'Waiting for Router scoring...',
    lmHeadSample: 'LM Head & Temp Sampling',
    probDist: 'Probability Distribution (Softmax)',
    predDone: 'Prediction Done ✓',
    waitStack: 'Waiting for layer loop stacking...',
    waitCalc: 'Waiting for calculation...',
    codeTitle: 'Underlying Code',
    pyCode: '(Python Pseudocode)',
    c_emb1: '# Embedding',
    c_emb2: '# [L, d]',
    c_rope1: '# RoPE: Inject rotary position embedding (seq awareness)',
    c_rope2: '# m is absolute position',
    c_loop1: '# Layer stacking loop',
    c_attn1: '# Attention & KV Cache',
    c_ffn1: '# Dense FFN',
    c_ffn2: '# Residual connection & next layer',
    c_moe1: '# Sparse MoE: Routing distribution',
    c_moe2: '# Residual connection',
    c_lm1: '# LM Head & Temp Sampling',
    c_lm2: '# Map to vocabulary',
    c_lm3: '# Temperature scaling',
    stateTitle: 'Current Micro Execution State',
    waitStartMsg1: 'Waiting to start. Current selection: ',
    moeSparse: 'MoE Sparse Architecture',
    denseDense: 'Dense Architecture',
    waitStartMsg2: '. Please click "Play".',
    stateEmbTitle: 'Embedding Phase',
    stateEmbPrefill: 'Read the entire Prompt in parallel.',
    stateEmbDecode: '[Autoregressive] Extract the last generated token as the sole input.',
    stateRopeTitle: 'RoPE Position Embedding',
    stateRopeDesc1: 'Transformers are inherently order-agnostic. RoPE treats word vectors as points on a complex plane and rotates them by angle θ based on absolute position m.',
    stateRopeDesc2: 'This allows the model to automatically perceive the relative distance between words when calculating Attention dot products!',
    stateAttnTitle: 'Attention Mechanism & Cache',
    stateAttnPrefill: 'Compute K, V and write them in parallel to the memory pool.',
    stateAttnDecode: '[Memory Wall Bottleneck] The model must read the entire historical KV Cache (pink dimension) to compute the current attention distribution.',
    stateDenseTitle: 'Dense FFN',
    stateDenseDesc: 'Fully activate the massive matrix network to extract knowledge features.',
    stateMoeTitle: 'MoE Sparse Routing',
    stateMoeDesc1: 'Router scores 8 experts and activates only ',
    stateMoeDesc2: ' experts for inference, followed by weighted fusion.',
    stateLoopTitle: 'Deep Stacking Loop (N-Layers)',
    stateLoopDesc1: 'The "large" in LLM is also reflected in depth. Attention and FFN form a Block. Data does not pass through just once; via residual connections, it is ',
    stateLoopDesc2: 'repeatedly stacked and computed ',
    stateLoopDesc3: ' times ',
    stateLoopDesc4: ' before entering the final phase!',
    stateLmTitle: 'LM Head & Temp Sampling',
    stateLmDesc1: 'Features are mapped to Logits (scores) covering the entire vocabulary.',
    stateLmDesc2: 'Temp(T) Scaling: ',
    stateLmDesc3: 'Drag the slider above to try it!',
    stateLmDesc4: '`T < 1`: Amplifies probability diffs, forcing the model to output the most likely word (good for coding).',
    stateLmDesc5: '`T > 1`: Shrinks probability diffs, allowing long-tail words to be chosen (good for creative writing).',
    stateDoneTitle: 'Token Generation Complete',
    stateDoneDesc: 'Select the next word via probability sampling and throw it back to the start of the loop.',
    routerMatrix: 'Router Matrix'
  }
};

const getInitialLang = () => (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().includes('zh') ? 'zh' : 'en');

// 模拟 Router 动态打分与选择
const MOCK_EXPERT_ROUTING = [
  { topK: [2, 5], weights: [0.65, 0.25] }, { topK: [1, 7], weights: [0.55, 0.35] },
  { topK: [0, 4], weights: [0.48, 0.42] }, { topK: [3, 6], weights: [0.70, 0.15] },
  { topK: [2, 7], weights: [0.60, 0.38] }, { topK: [0, 5], weights: [0.50, 0.45] }
];

const TOTAL_LAYERS = 32; // 模拟如 Llama-3 常见的 32 层 Transformer Block

const App = () => {
  const [modelType, setModelType] = useState('moe');
  const [temperature, setTemperature] = useState(1.0);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [phase, setPhase] = useState('idle');
  const [step, setStep] = useState(0);
  
  // activeModule 扩充: 0(未开始), 1(Embedding), 1.5(RoPE位置编码), 2(Attention), 3(FFN/MoE), 4(循环层), 5(LM Head), 6(Token完成)
  const [activeModule, setActiveModule] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState(getInitialLang());
  const t = (k) => i18n[lang][k] ?? k;

  // 根据语言动态提供 Token 与 Prompt 数据
  const { promptTokens, generatedTokens } = useMemo(() => {
    if (lang === 'zh') {
      return {
        promptTokens: ["人工", "智能", "的", "发展", "将", "会"],
        generatedTokens: [
          { token: "带来", probs: [{t: "带来", p: 0.85}, {t: "导致", p: 0.10}, {t: "让", p: 0.05}] },
          { token: "深远", probs: [{t: "深远", p: 0.72}, {t: "巨大", p: 0.20}, {t: "很多", p: 0.08}] },
          { token: "的", probs: [{t: "的", p: 0.99}, {t: "地", p: 0.005}, {t: "得", p: 0.005}] },
          { token: "变革", probs: [{t: "变革", p: 0.65}, {t: "影响", p: 0.30}, {t: "改变", p: 0.05}] },
          { token: "。", probs: [{t: "。", p: 0.95}, {t: "！", p: 0.03}, {t: "？", p: 0.02}] },
          { token: "<EOS>", probs: [{t: "<EOS>", p: 0.99}, {t: "\n", p: 0.01}] }
        ]
      };
    } else {
      return {
        promptTokens: ["The", " develop", "ment", " of", " AI", " will"],
        generatedTokens: [
          { token: " bring", probs: [{t: " bring", p: 0.85}, {t: " cause", p: 0.10}, {t: " let", p: 0.05}] },
          { token: " profound", probs: [{t: " profound", p: 0.72}, {t: " massive", p: 0.20}, {t: " many", p: 0.08}] },
          { token: " changes", probs: [{t: " changes", p: 0.99}, {t: " impacts", p: 0.005}, {t: " shifts", p: 0.005}] },
          { token: " to", probs: [{t: " to", p: 0.65}, {t: " for", p: 0.30}, {t: " in", p: 0.05}] },
          { token: " society.", probs: [{t: " society.", p: 0.95}, {t: " world.", p: 0.03}, {t: " us.", p: 0.02}] },
          { token: "<EOS>", probs: [{t: "<EOS>", p: 0.99}, {t: "\n", p: 0.01}] }
        ]
      };
    }
  }, [lang]);

  // 1. 自动播放与阶段推进逻辑
  useEffect(() => {
    let timer;
    if (activeModule === 4) {
      if (currentLayer < TOTAL_LAYERS) {
        timer = setTimeout(() => setCurrentLayer(prev => prev + 1), 30);
      } else {
        timer = setTimeout(() => setActiveModule(5), 300);
      }
    } 
    else if (isPlaying) {
      let delay = 1000;
      if (activeModule === 6) delay = 1500;
      if (activeModule === 0 && phase === 'idle') delay = 500;
      if (activeModule === 1.5) delay = 1200; // 为 RoPE 留出展示时间
      if (activeModule === 3 && modelType === 'moe') delay = 1500;
      timer = setTimeout(() => handleNextStep(), delay);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, phase, activeModule, step, modelType, currentLayer]);

  const handleNextStep = () => {
    if (phase === 'idle') {
      setPhase('prefill');
      setStep(0);
      setActiveModule(1);
      setCurrentLayer(1);
    } else if (phase === 'done' || activeModule === 4) {
      // do nothing
    } else {
      if (activeModule < 6) {
        // 特殊处理 1 到 1.5 (RoPE)，再到 2
        if (activeModule === 1) setActiveModule(1.5);
        else if (activeModule === 1.5) setActiveModule(2);
        else setActiveModule(activeModule + 1);
      } else {
        if (phase === 'prefill') {
          setPhase('decode');
          setStep(1);
          setActiveModule(1);
          setCurrentLayer(1);
        } else if (phase === 'decode') {
          if (step + 1 < generatedTokens.length) {
            setStep(step + 1);
            setActiveModule(1);
            setCurrentLayer(1);
          } else {
            setPhase('done');
            setActiveModule(0);
            setIsPlaying(false);
          }
        }
      }
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setPhase('idle');
    setStep(0);
    setActiveModule(0);
    setCurrentLayer(1);
  };

  const togglePlay = () => {
    if (phase === 'done') reset();
    setIsPlaying(!isPlaying);
  };

  const handleModelTypeChange = (type) => {
    if (type !== modelType) {
      setModelType(type);
      reset();
    }
  };

  // 2. 动态计算带温度的概率 (Temperature Scaling)
  const currentProbs = activeModule >= 5 ? generatedTokens[step].probs : null;
  const displayProbs = useMemo(() => {
    if (!currentProbs) return null;
    if (temperature === 1.0) return currentProbs; // T=1 时保持原样
    // 温度公式：p_i^(1/T) 然后重新归一化
    const adjusted = currentProbs.map(p => ({ ...p, weight: Math.pow(p.p, 1 / temperature) }));
    const sum = adjusted.reduce((acc, p) => acc + p.weight, 0);
    return adjusted.map(p => ({ t: p.t, p: p.weight / sum }));
  }, [currentProbs, temperature]);

  const kvCacheSize = phase === 'idle' ? 0 : 
    (phase === 'prefill' ? (activeModule >= 2 ? promptTokens.length : 0) : 
    (promptTokens.length + step - 1 + (activeModule >= 2 ? 1 : 0)));

  const renderTokens = (tokens, isInput) => (
    <div className="flex flex-wrap gap-2 mb-4">
      {tokens.map((token, index) => {
        let isHighlight = phase === 'prefill' && activeModule === 1 && isInput;
        let isProcessed = false;
        let isJustGenerated = false;
        let isAutoRegressiveInput = false;

        if (isInput) {
          isProcessed = phase !== 'idle' && !(phase === 'prefill' && activeModule < 2);
        } else {
          if (index > step || (index === step && activeModule < 5)) return null; 
          if (index < step) {
            isProcessed = true; 
            if (phase === 'decode' && index === step - 1 && activeModule === 1) isAutoRegressiveInput = true;
          } else if (index === step && activeModule >= 5) {
            isProcessed = true; 
            isJustGenerated = activeModule === 5 || activeModule === 6; 
          }
        }

        return (
          <div key={index} className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-300 relative
            ${isInput ? 'border-blue-200' : 'border-green-200'}
            ${isHighlight ? 'scale-110 shadow-lg ring-4 ring-opacity-50 z-10 bg-blue-500 text-white ring-blue-300 border-blue-500' : ''}
            ${isAutoRegressiveInput ? 'scale-110 bg-indigo-600 text-white ring-4 ring-indigo-300 border-indigo-500 shadow-xl z-20 animate-pulse' : ''}
            ${isJustGenerated ? 'scale-105 bg-green-100 border-green-400 text-green-800 ring-2 ring-green-200 shadow-md' : ''}
            ${isProcessed && !isHighlight && !isAutoRegressiveInput && !isJustGenerated ? (isInput ? 'bg-blue-50 text-blue-800' : 'bg-green-50 text-green-800') : ''}
            ${!isProcessed && !isHighlight && !isAutoRegressiveInput && !isJustGenerated ? 'bg-gray-50 text-gray-400 border-gray-200' : ''}
          `}>
            {isAutoRegressiveInput && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-indigo-600 whitespace-nowrap animate-bounce flex items-center gap-1">
                {t('asInput')} <CornerDownRight size={12} />
              </div>
            )}
            {token}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 lg:p-6 selection:bg-indigo-100">
      <div className="max-w-[90rem] mx-auto space-y-6">
        
        {/* Header & Controls */}
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-indigo-900">
              <Zap className="text-amber-500" />
              {t('title')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{t('subtitle')}</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* 采样温度滑块 (Temperature) */}
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 mr-2" title={t('adjustRandomness')}>
              <SlidersHorizontal size={14} className="text-purple-600" />
              <span className="text-xs font-semibold text-purple-800">{t('tempLabel')}</span>
              <input type="range" min="0.1" max="2.0" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-20 accent-purple-500" />
              <span className="text-xs font-mono font-bold text-purple-700 w-6 text-right">{temperature.toFixed(1)}</span>
            </div>

            {/* Model Type Selector */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
              <button onClick={() => handleModelTypeChange('dense')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all ${modelType === 'dense' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                {t('dense')}
              </button>
              <button onClick={() => handleModelTypeChange('moe')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all ${modelType === 'moe' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Network size={14} /> {t('moe')}
              </button>
            </div>

            <button onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))} className="px-2 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition flex items-center gap-1" title="Language"><Globe size={16} /> {t('langToggle')}</button>
            <button onClick={reset} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition" title={t('reset')}><RotateCcw size={20} /></button>
            <button onClick={togglePlay} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition shadow-sm bg-blue-600 hover:bg-blue-700`}>
              <>{isPlaying ? <Pause size={18} /> : <Play size={18} />} {t('play')}</>
            </button>
            <button onClick={() => { setIsPlaying(false); handleNextStep(); }} disabled={isPlaying || phase === 'done' || activeModule === 4} className="flex items-center gap-2 px-4 py-2 w-48 justify-center rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 disabled:opacity-50 transition shadow-sm font-semibold">
              <SkipForward size={18} /> <span className="text-sm">{t('next')}</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* 顶层：序列与 KV Cache 并排布局 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* 左侧：Sequence */}
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlignLeft className="text-indigo-500" size={20} />
                  {t('sequenceTitle')}
                </h2>
                <div className="mb-2 text-sm text-slate-500 font-medium">{t('promptLabel')}</div>
                {renderTokens(promptTokens, true)}
                <div className="mt-8 mb-2 text-sm text-slate-500 font-medium">{t('generationLabel')}</div>
                <div className="min-h-[60px]">
                  {renderTokens(generatedTokens.map(t => t.token), false)}
                </div>
              </div>

              {/* 右侧：KV Cache */}
              <div className="border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-12">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Database className="text-indigo-500" size={20} /> {t('kvCacheTitle')}
                </h2>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-bold text-indigo-600">{kvCacheSize}</span>
                  <span className="text-slate-500 text-sm mb-1">/ {promptTokens.length + generatedTokens.length - 1} {t('slots')}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-6">
                  {Array.from({ length: promptTokens.length + generatedTokens.length - 1 }).map((_, i) => (
                    <div key={i} className={`h-8 md:h-10 flex-1 rounded-sm transition-all duration-300 ${i < kvCacheSize ? (i < promptTokens.length ? 'bg-blue-400' : 'bg-green-400') : 'bg-slate-100'}`} title={i < kvCacheSize ? `Cached Token ${i}` : 'Empty Space'}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 中间层：流水线与底层代码 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* 左侧：模型内部流水线 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-full flex flex-col min-w-0">
               <h2 className="text-lg font-semibold mb-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Cpu className="text-indigo-500" size={20} /> {t('modelPipeline')}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-mono ${modelType === 'moe' ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                  {modelType === 'moe' ? t('moeArch') : t('denseArch')}
                </span>
              </h2>

              <div className="relative p-4 md:p-6 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/30 flex-1 overflow-x-auto">
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all
                    ${phase === 'prefill' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400 scale-105' : 'bg-slate-100 text-slate-400'}`}>
                    {t('prefill')}
                  </span>
                </div>
                <div className="absolute top-4 right-4 z-10">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all
                    ${phase === 'decode' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400 scale-105' : 'bg-slate-100 text-slate-400'}`}>
                    {t('decode')}
                  </span>
                </div>

                <div className={`mx-auto w-full max-w-sm mt-10 md:mt-12 rounded-xl p-3 md:p-4 flex flex-col relative transition-all duration-500 shadow-xl border bg-white
                  ${phase === 'prefill' ? 'border-amber-300 ring-4 ring-amber-400/20' : phase === 'decode' ? 'border-emerald-300 ring-4 ring-emerald-400/20' : 'border-slate-200'}`}
                >
                  <div className="text-center mb-4 h-8 flex items-center justify-center">
                    {phase === 'prefill' && activeModule > 0 && <span className="text-xs md:text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 animate-fade-in">{t('currentInput')}</span>}
                    {phase === 'decode' && activeModule > 0 && step > 0 && <span className="text-xs md:text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 flex items-center gap-2 animate-fade-in"><CornerDownRight size={14} /> {t('autoRegInput')} "{generatedTokens[step-1].token}"</span>}
                  </div>
                  
                  <div className="relative z-10 flex flex-col">
                    {(() => {
                      const L_seq = phase === 'idle' ? "?" : (phase === 'prefill' ? promptTokens.length : 1);
                      const L_cache = phase === 'idle' ? "?" : (phase === 'prefill' ? promptTokens.length : promptTokens.length + step);
                      const dimD = "d"; const dimV = "V"; 
                      const seqColorClass = phase === 'prefill' ? 'text-amber-600' : (phase === 'decode' ? 'text-emerald-600' : 'text-slate-400');
                      const currentRouting = MOCK_EXPERT_ROUTING[Math.min(step, MOCK_EXPERT_ROUTING.length - 1)];

                      return (
                        <>
                          {/* Module 1: Embedding */}
                          <div className={`p-2 rounded border transition-all duration-300 shadow-sm ${activeModule === 1 ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 scale-105 z-10' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                            <div className={`font-semibold text-xs md:text-sm text-center ${activeModule === 1 ? 'text-indigo-900' : 'text-slate-500'}`}>Input Embedding</div>
                            <div className="mt-2 text-[10px] md:text-xs font-mono bg-white p-1.5 rounded border border-indigo-100 flex flex-col gap-1">
                              <div className="flex justify-between px-1">
                                <span className="font-serif tracking-wide text-[11px] md:text-[13px]">Output (<span className="italic">X</span>) :</span> 
                                <span className={`${seqColorClass} font-bold text-xs bg-slate-100 px-1 rounded`}>[{L_seq}, {dimD}]</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center -my-1 relative z-0"><ArrowDown className={`${activeModule === 1 || activeModule === 1.5 ? 'text-indigo-400 animate-bounce' : 'text-slate-200'}`} size={16} /></div>

                          {/* Module 1.5: RoPE 位置编码 */}
                          <div className={`p-2 rounded border transition-all duration-300 shadow-sm ${activeModule === 1.5 ? 'bg-fuchsia-50 border-fuchsia-400 ring-2 ring-fuchsia-200 scale-105 z-10' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                            <div className={`font-semibold text-xs md:text-sm text-center flex items-center justify-center gap-1 ${activeModule === 1.5 ? 'text-fuchsia-900' : 'text-slate-500'}`}>
                              <Orbit size={14} className={activeModule === 1.5 ? 'animate-spin' : ''} /> RoPE
                            </div>
                            <div className="mt-1 text-[10px] md:text-xs font-mono bg-white p-1.5 rounded border border-fuchsia-100 flex flex-col gap-1.5">
                              <div className="text-center text-fuchsia-700 font-semibold mb-1 opacity-80 border-b border-fuchsia-100 pb-1">
                                {phase === 'idle' ? t('ropeWait') : (phase === 'prefill' ? t('ropePrefill') : `${t('ropeDecode')}${promptTokens.length + step}`)}
                              </div>
                              <div className="flex justify-between items-center bg-fuchsia-50 -mx-1 px-2 py-0.5 rounded border border-fuchsia-100">
                                <span className="font-serif text-[11px] md:text-[13px] tracking-wide">
                                  <span className="italic">X</span><sub className="not-italic">rope</sub> = <span className="italic">X</span> &middot; cos(<span className="italic">m&theta;</span>) + <span className="italic">X'</span> &middot; sin(<span className="italic">m&theta;</span>)
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center -my-1 relative z-0"><ArrowDown className={`${activeModule === 1.5 ? 'text-fuchsia-400 animate-bounce' : 'text-slate-200'}`} size={16} /></div>

                          {/* --- 层堆叠循环框 (Transformer Block) --- */}
                          <div className={`border-2 rounded-xl p-2 relative transition-all duration-300 mt-2 mb-2 
                            ${activeModule === 4 ? 'border-amber-400 bg-amber-50/50 ring-4 ring-amber-200/50 scale-105 z-20 shadow-xl' : 'border-slate-200 border-dashed'}`}>
                             <div className="absolute -left-2 -top-3 bg-white px-2 text-[10px] font-bold text-slate-500 flex items-center gap-1 rounded border border-slate-200">
                               <Repeat size={12} className={activeModule === 4 ? 'animate-spin text-amber-500' : ''}/> 
                               {t('transformerBlock')}
                             </div>
                             
                             {/* 光速循环层数指示器 */}
                             {activeModule === 4 && (
                               <div className="absolute right-2 -top-4 bg-amber-500 text-white px-3 py-0.5 rounded-full text-[11px] font-bold shadow-lg animate-pulse flex items-center gap-1">
                                 <Zap size={12}/> {t('loopingLayer')}{currentLayer} / {TOTAL_LAYERS}
                               </div>
                             )}

                            {/* Module 2: Attention */}
                            <div className={`mt-3 p-2 rounded border transition-all duration-300 shadow-sm ${(activeModule === 2 || activeModule === 4) ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-200' : 'bg-slate-50 border-slate-200 opacity-60'} ${activeModule === 2 ? 'scale-105 z-10 shadow-lg' : ''}`}>
                              <div className={`font-semibold text-xs md:text-sm mb-2 text-center ${(activeModule === 2 || activeModule === 4) ? 'text-blue-900' : 'text-slate-500'}`}>Masked Self-Attention</div>
                              <div className="text-[10px] md:text-xs font-mono bg-white p-1.5 rounded border border-blue-100 flex flex-col gap-1.5">
                                <div className="flex justify-between px-1">
                                  <span className="font-serif text-[11px] md:text-[13px] tracking-wide"><span className="italic">Q, K, V</span> = <span className="italic">XW</span><sub className="not-italic">q,k,v</sub> :</span> 
                                  <span className={`${seqColorClass} font-bold text-xs bg-slate-100 px-1 rounded`}>[{L_seq}, {dimD}]</span>
                                </div>
                                <div className={`flex justify-between items-center px-1 md:px-2 py-0.5 rounded border -mx-1 ${(activeModule === 2 || activeModule === 4) ? 'bg-pink-50 border-pink-200' : 'border-transparent'}`}>
                                  <span className={`font-serif text-[11px] md:text-[13px] tracking-wide ${(activeModule === 2 || activeModule === 4) ? 'text-pink-900' : 'text-slate-600'}`}>
                                    <span className="italic">Scores</span> = <span className="italic">QK</span><sup className="not-italic">T</sup> :
                                  </span> 
                                  <span className="text-slate-600 font-bold text-xs">[{L_seq}, <span className={`${(activeModule === 2 || activeModule === 4) ? 'bg-pink-200 text-pink-800' : 'bg-slate-100 text-slate-600'} px-1 rounded transition-all`}>{L_cache}</span>]</span>
                                </div>
                                <div className="flex justify-between px-1">
                                  <span className="font-serif text-[11px] md:text-[13px] tracking-wide"><span className="italic">Attn_out</span> = Softmax(<span className="italic">Scores</span>)<span className="italic">V</span> :</span> 
                                  <span className={`${seqColorClass} font-bold text-xs bg-slate-100 px-1 rounded`}>[{L_seq}, {dimD}]</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-center -my-1 relative z-0"><ArrowDown className={`${(activeModule === 2 || activeModule === 4) ? 'text-blue-400' : 'text-slate-200'}`} size={16} /></div>

                            {/* Module 3: FFN vs MoE */}
                            {modelType === 'dense' ? (
                              <div className={`p-2 rounded border transition-all duration-300 shadow-sm ${(activeModule === 3 || activeModule === 4) ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'} ${activeModule === 3 ? 'scale-105 z-10 shadow-lg' : ''}`}>
                                <div className={`font-semibold text-xs md:text-sm text-center ${(activeModule === 3 || activeModule === 4) ? 'text-indigo-900' : 'text-slate-500'}`}>Dense Feed Forward (MLP)</div>
                                <div className="mt-1 text-[10px] md:text-xs font-mono bg-white p-1.5 rounded border border-indigo-100 flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center bg-indigo-50 -mx-1 px-2 py-0.5 rounded border border-indigo-100">
                                    <span className="font-serif text-[11px] md:text-[13px] tracking-wide"><span className="italic">H</span> = GELU(<span className="italic">XW</span><sub className="not-italic">up</sub>) :</span> 
                                    <span className={`${seqColorClass} font-bold text-xs bg-slate-100 px-1 rounded`}>[{L_seq}, <span className="text-indigo-600">4d</span>]</span>
                                  </div>
                                  <div className="flex justify-between px-1">
                                    <span className="font-serif text-[11px] md:text-[13px] tracking-wide">Output = <span className="italic">HW</span><sub className="not-italic">down</sub> :</span> 
                                    <span className={`${seqColorClass} font-bold text-xs bg-slate-100 px-1 rounded`}>[{L_seq}, {dimD}]</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className={`p-2 rounded border transition-all duration-300 shadow-sm ${(activeModule === 3 || activeModule === 4) ? 'bg-teal-50 border-teal-400 ring-1 ring-teal-200' : 'bg-slate-50 border-slate-200 opacity-60'} ${activeModule === 3 ? 'scale-105 z-10 shadow-lg' : ''}`}>
                                <div className={`font-semibold text-xs md:text-sm text-center flex items-center justify-center gap-1 ${(activeModule === 3 || activeModule === 4) ? 'text-teal-900' : 'text-slate-500'}`}>
                                  <Network size={14}/> Sparse MoE Layer
                                </div>
                                <div className="mt-1 text-[10px] md:text-xs font-mono bg-white p-1 md:p-1.5 rounded border border-teal-100 flex flex-col gap-1.5">
                                  <div className="flex justify-between px-1 opacity-60">
                                    <span className="font-serif text-[11px] md:text-[13px] tracking-wide">{t('routerMatrix')} <span className="italic">W</span><sub className="not-italic">g</sub>:</span> 
                                    <span>[{dimD}, <span className="text-teal-600 font-bold">8</span>]</span>
                                  </div>
                                  <div className={`flex justify-between px-1 rounded transition-colors ${(activeModule === 3 || activeModule === 4) ? 'bg-amber-50 text-amber-800 border border-amber-200' : ''}`}>
                                    <span className="font-serif text-[11px] md:text-[13px] tracking-wide"><span className="italic">Scores</span> = Softmax(<span className="italic">XW</span><sub className="not-italic">g</sub>)</span>
                                  </div>
                                  <div className="flex justify-between items-end gap-0.5 md:gap-1 mt-1 mb-1">
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map(e => {
                                      const isMoEActive = activeModule >= 3;
                                      const isExpertSelected = currentRouting.topK.includes(e);
                                      const isActive = isMoEActive && isExpertSelected;
                                      const weightStr = isActive ? currentRouting.weights[currentRouting.topK.indexOf(e)].toFixed(2) : (isMoEActive ? "0.01" : "-");
                                      return (
                                        <div key={e} className="flex flex-col items-center justify-end w-full">
                                          <div className={`text-[8px] mb-0.5 transition-all duration-500 ${isActive ? 'text-teal-700 font-bold scale-125' : 'text-slate-300 opacity-50'}`}>{weightStr}</div>
                                          <div className={`w-full h-4 md:h-5 rounded border flex items-center justify-center text-[8px] md:text-[10px] transition-all duration-300 ${isActive ? 'bg-teal-100 border-teal-400 text-teal-800 font-bold shadow ring-1 ring-teal-300 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>E{e}</div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  {/* 恢复 Top-K 融合计算式 */}
                                  <div className={`flex flex-col bg-teal-50 -mx-1 px-1 md:px-2 py-1 rounded border transition-colors ${(activeModule === 3 || activeModule === 4) ? 'border-teal-300' : 'border-teal-100'}`}>
                                    <div className="flex justify-between items-center w-full mb-1">
                                      <span className="text-teal-800 font-semibold">{t('top2Fusion')}</span>
                                      <span className={`${seqColorClass} font-bold text-[10px] bg-white px-1 rounded border border-teal-100`}>[{L_seq}, {dimD}]</span>
                                    </div>
                                    <div className="text-[10px] md:text-[12px] text-teal-900 text-center tracking-wide font-serif">
                                      {activeModule >= 3 
                                        ? <><span className="italic font-bold">Output</span> = {currentRouting.weights[0].toFixed(2)} &middot; <span className="italic">E</span><sub className="not-italic">{currentRouting.topK[0]}</sub> + {currentRouting.weights[1].toFixed(2)} &middot; <span className="italic">E</span><sub className="not-italic">{currentRouting.topK[1]}</sub></>
                                        : <span className="font-sans font-normal text-[10px]">{t('waitingRouter')}</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          {/* --- 循环框结束 --- */}

                          <div className="flex justify-center -my-1 relative z-0"><ArrowDown className={`${activeModule >= 4 ? 'text-purple-400 animate-bounce' : 'text-slate-200'}`} size={16} /></div>

                          {/* Module 4: LM Head & Probabilities */}
                          <div className={`p-2 md:p-3 rounded border transition-all duration-300 shadow-sm ${activeModule >= 5 ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200 scale-105 z-10' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                            <div className={`font-semibold text-xs md:text-sm text-center mb-2 ${activeModule >= 5 ? 'text-purple-900' : 'text-slate-500'}`}>{t('lmHeadSample')} (T={temperature.toFixed(1)})</div>
                            <div className="text-[10px] md:text-xs font-mono bg-white p-1.5 rounded border border-purple-100 flex flex-col gap-1.5">
                              <div className="flex justify-between items-center bg-purple-50 -mx-1 px-2 py-0.5 rounded border border-purple-100">
                                <span className="font-serif text-[11px] md:text-[13px] tracking-wide"><span className="italic">Logits</span> = <span className="italic">XW</span><sub className="not-italic">vocab</sub> :</span> 
                                <span className={`${seqColorClass} font-bold text-xs bg-slate-100 px-1 rounded`}>[{L_seq}, <span className="text-purple-600">{dimV}</span>]</span>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-purple-200">
                               <div className="text-[10px] font-semibold text-purple-600 mb-2 uppercase tracking-wider flex justify-between">
                                 <span>{t('probDist')}</span>
                                 {activeModule === 6 && <span className="text-emerald-600 font-bold animate-pulse">{t('predDone')}</span>}
                               </div>
                               {displayProbs ? (
                                 <div className="space-y-1.5 animate-fade-in">
                                   {displayProbs.map((prob, idx) => (
                                     <div key={idx} className="flex items-center gap-2">
                                       <div className="w-8 md:w-10 text-xs font-medium text-right text-purple-900">{prob.t}</div>
                                       <div className="flex-1 h-2.5 bg-purple-100 rounded-full overflow-hidden relative">
                                         <div className={`h-full rounded-full transition-all duration-300 ease-out ${idx === 0 ? 'bg-purple-500' : 'bg-purple-300'}`} style={{ width: `${prob.p * 100}%` }}></div>
                                       </div>
                                       <div className="w-8 text-[10px] text-purple-600 text-right font-mono">{(prob.p * 100).toFixed(0)}%</div>
                                     </div>
                                   ))}
                                 </div>
                               ) : (
                                 <div className="text-center text-purple-400 text-[10px] italic py-2">
                                   {activeModule > 0 && activeModule < 5 ? t('waitStack') : t('waitCalc')}
                                 </div>
                               )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：代码级原理解析 (Pseudocode) */}
            <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 text-slate-300 h-full flex flex-col min-w-0">
               <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-white shrink-0">
                 <div className="flex items-center gap-2">
                   <Code className="text-emerald-400" size={20} /> {t('codeTitle')} <span className="text-xs text-slate-400 font-normal ml-2">{t('pyCode')}</span>
                 </div>
                 {modelType === 'moe' && <span className="text-xs bg-teal-900/50 text-teal-400 px-2 py-1 rounded border border-teal-800">MoE Enabled</span>}
              </h2>
              <div className="font-mono text-[10px] md:text-xs xl:text-sm overflow-x-auto bg-[#0d1117] p-4 rounded-lg border border-slate-800 flex-1 leading-relaxed">
                <div className={`transition-all duration-500 whitespace-pre block`}>
                  <div><span className="text-emerald-400">def</span> <span className="text-blue-400">{phase === 'prefill' ? 'prefill' : 'decode'}</span>(input_tokens, kv_cache, temp={temperature.toFixed(1)}):</div>
                  
                  {/* Emb 高亮 */}
                  <div className={activeModule === 1 ? "bg-indigo-900/60 text-indigo-200 px-1 -mx-1 rounded" : "text-slate-400"}>
                    <div>  <span className="text-slate-500">{t('c_emb1')}</span></div>
                    <div>  x = embedding(input_tokens) <span className="text-slate-500">{t('c_emb2')}</span></div>
                  </div>
                  <br/>

                  {/* RoPE 高亮 */}
                  <div className={activeModule === 1.5 ? "bg-fuchsia-900/50 text-fuchsia-200 px-1 -mx-1 rounded" : "text-slate-400"}>
                    <div>  <span className="text-slate-500">{t('c_rope1')}</span></div>
                    <div>  <span className="text-emerald-400">for</span> m, seq_x <span className="text-emerald-400">in</span> enumerate(x): <span className="text-slate-500">{t('c_rope2')}</span></div>
                    <div>      x[m] = apply_rotary_emb(seq_x, pos=m) </div>
                  </div>
                  <br/>

                  {/* Transformer Loop */}
                  <div className={activeModule === 4 ? "bg-amber-900/40 text-amber-200 px-1 -mx-1 rounded font-bold border-l-2 border-amber-400" : "text-emerald-400"}>
                      <span className="text-emerald-400">for</span> layer <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>({TOTAL_LAYERS}): <span className="text-slate-500 font-normal">{t('c_loop1')}</span>
                  </div>

                  {/* Attention 高亮 */}
                  <div className={activeModule === 2 ? "bg-blue-900/60 text-blue-200 px-1 -mx-1 rounded" : "text-slate-400"}>
                    <div>      <span className="text-slate-500">{t('c_attn1')}</span></div>
                    <div>      q, k, v = x@W_q, x@W_k, x@W_v</div>
                    <div className={activeModule === 2 && phase === 'decode' ? "text-pink-300 font-bold" : ""}>      {phase === 'prefill' ? 'kv_cache.append(k, v)' : 'kv_cache.K = concat([kv_cache.K, k]); kv_cache.V = ...'}</div>
                    <div>      scores = (q @ kv_cache.K.T) / sqrt(d)</div>
                    <div>      attn_out = softmax(scores) @ kv_cache.V</div>
                  </div>
                  <br/>

                  {/* FFN / MoE 高亮 */}
                  {modelType === 'dense' ? (
                    <div className={activeModule === 3 ? "bg-indigo-900/60 text-indigo-200 px-1 -mx-1 rounded" : "text-slate-400"}>
                      <div>      <span className="text-slate-500">{t('c_ffn1')}</span></div>
                      <div>      hidden = gelu(attn_out @ W_up)</div>
                      <div>      x = x + (hidden @ W_down) <span className="text-slate-500">{t('c_ffn2')}</span></div>
                    </div>
                  ) : (
                    <div className={activeModule === 3 ? "bg-teal-900/50 text-teal-200 px-1 -mx-1 rounded" : "text-slate-400"}>
                      <div>      <span className="text-slate-500">{t('c_moe1')}</span></div>
                      <div className={activeModule === 3 ? "text-amber-200 font-bold" : ""}>      r_scores = softmax(attn_out @ W_gate) </div>
                      <div className={activeModule === 3 ? "text-amber-200" : ""}>      weights, experts = topk(r_scores, k=2)</div>
                      <div>      moe_out = zeros_like(attn_out)</div>
                      <div>      <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(2):</div>
                      <div>          e_idx = experts[i]; w = weights[i]</div>
                      <div>          e_out = gelu(attn_out @ W_up[e_idx]) @ W_down[e_idx]</div>
                      <div className={activeModule === 3 ? "text-amber-200" : ""}>          moe_out += w * e_out</div>
                      <div>      x = x + moe_out <span className="text-slate-500">{t('c_moe2')}</span></div>
                    </div>
                  )}
                  <br/>

                  {/* LM Head 高亮 */}
                  <div className={activeModule >= 5 ? "bg-purple-900/60 text-purple-200 px-1 -mx-1 rounded" : "text-slate-400"}>
                    <div>  <span className="text-slate-500">{t('c_lm1')}</span></div>
                    <div>  logits = x[-1] @ W_vocab <span className="text-slate-500">{t('c_lm2')}</span></div>
                    <div className={activeModule >= 5 && temperature !== 1.0 ? "text-purple-300 font-bold" : ""}>  logits = logits / temp   <span className="text-slate-500">{t('c_lm3')}</span></div>
                    <div>  probs = softmax(logits)</div>
                    <div>  <span className="text-emerald-400">return</span> sample(probs)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底层：状态面板与原理解释 */}
          <div className="bg-indigo-900 text-indigo-50 rounded-2xl p-6 md:p-8 shadow-lg">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
              <Zap className="text-amber-400" size={24}/>
              {t('stateTitle')}
            </h3>
            
            <div className="space-y-4 text-sm md:text-base leading-relaxed max-w-5xl">
              {activeModule === 0 && (
                <p className="opacity-90">{t('waitStartMsg1')}<strong className="text-amber-300">{modelType === 'moe' ? t('moeSparse') : t('denseDense')}</strong>{t('waitStartMsg2')}</p>
              )}
              
              {activeModule === 1 && (
                <div className="animate-fade-in">
                  <h4 className="font-bold text-indigo-300 text-base mb-2">{t('stateEmbTitle')}</h4>
                  <p className="opacity-90">{phase === 'prefill' ? t('stateEmbPrefill') : t('stateEmbDecode')}</p>
                </div>
              )}

              {activeModule === 1.5 && (
                <div className="animate-fade-in">
                  <h4 className="font-bold text-fuchsia-300 text-base mb-2 flex items-center gap-2"><Orbit size={16}/> {t('stateRopeTitle')}</h4>
                  <p className="opacity-90">
                    {t('stateRopeDesc1')}<br/>
                    <span className="text-xs text-fuchsia-200 mt-1 block">{t('stateRopeDesc2')}</span>
                  </p>
                </div>
              )}

              {activeModule === 2 && (
                <div className="animate-fade-in">
                  <h4 className="font-bold text-blue-300 text-base mb-2">{t('stateAttnTitle')}</h4>
                  <p className="opacity-90">{phase === 'prefill' ? t('stateAttnPrefill') : t('stateAttnDecode')}</p>
                </div>
              )}

              {activeModule === 3 && (
                <div className="animate-fade-in">
                  {modelType === 'dense' ? (
                    <><h4 className="font-bold text-indigo-300 text-base mb-2">{t('stateDenseTitle')}</h4><p className="opacity-90">{t('stateDenseDesc')}</p></>
                  ) : (
                    <><h4 className="font-bold text-teal-300 text-base mb-2 flex items-center gap-2"><Network size={16}/> {t('stateMoeTitle')}</h4>
                      <p className="opacity-90">{t('stateMoeDesc1')}<strong className="text-amber-300">Top-2</strong>{t('stateMoeDesc2')}</p>
                    </>
                  )}
                </div>
              )}

              {activeModule === 4 && (
                <div className="animate-fade-in">
                  <h4 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2"><Repeat size={16}/> {t('stateLoopTitle')}</h4>
                  <p className="opacity-90">{t('stateLoopDesc1')}<strong className="text-white">{t('stateLoopDesc2')}{TOTAL_LAYERS}{t('stateLoopDesc3')}</strong>{t('stateLoopDesc4')}</p>
                </div>
              )}

              {activeModule >= 5 && (
                <div className="animate-fade-in">
                  <h4 className="font-bold text-purple-300 text-base mb-2 flex items-center gap-2"><SlidersHorizontal size={16}/> {t('stateLmTitle')}</h4>
                  <ul className="list-disc pl-4 space-y-2 opacity-90">
                    <li>{t('stateLmDesc1')}</li>
                    <li><strong className="text-amber-300">{t('stateLmDesc2')}</strong>{t('stateLmDesc3')}
                      <br/>{t('stateLmDesc4')}
                      <br/>{t('stateLmDesc5')}
                    </li>
                  </ul>
                </div>
              )}

              {activeModule === 6 && (
                <div className="animate-fade-in py-4 border-t border-indigo-700/50 mt-4 pt-4 flex items-center gap-4">
                  <div className="p-3 bg-emerald-800 rounded-full shrink-0"><Zap className="text-emerald-400" size={24} /></div>
                  <div>
                    <h4 className="font-bold text-emerald-300 text-base md:text-lg">{t('stateDoneTitle')}</h4>
                    <p className="opacity-80 mt-1 text-sm">{t('stateDoneDesc')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
