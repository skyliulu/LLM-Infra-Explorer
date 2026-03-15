import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Cpu, Database, Zap, AlignLeft, Code, ArrowDown, ArrowUp, SplitSquareHorizontal, Combine, Braces, Calculator, HardDrive, MemoryStick, Info, Globe } from 'lucide-react';

const i18n = {
  zh: {
    title: 'Flash Decoding 原理可视化',
    subtitle: '打破长序列 Decoding 的显存墙：切分 KV Cache，多流并行计算，两步归约',
    reset: '重置',
    play: '播放',
    pause: '暂停',
    next: '下一步',
    langToggle: 'EN',
    challenge: '核心挑战：打破 Memory Wall (显存墙)',
    algSimple: '基础分块 (Simple)',
    algOptimized: 'LSE 优化版 (Optimized)',
    painPoint: '痛点',
    solution: '解法',
    challengeDesc1: 'Decode 阶段 Query 长度仅为 1，却需搬运历史成千上万 Token 的 KV Cache，严重受限于主存带宽。',
    challengeDesc2: '切分 KV Cache 动态指派给多个 SM 计算单元进行并行计算，利用中间状态暂存与二次归约合并结果。',
    dataFlow: '数据流与计算图',
    dimensions: '维度：',
    seqLen: '序列长',
    blockSize: '块大小',
    headDim: '头维度',
    hbmTitle: 'GPU HBM (主显存)',
    hbmWorkspace: 'HBM Workspace (中间态暂存)',
    sm3Reducing: 'SM 3 正在回读数据并进行归约...',
    globalResultWriteback: '✓ 全局结果写回 HBM',
    kernel1Batch1: '[Kernel 1] 调度批次 1 加载进 SRAM...',
    kernel1Batch2: '[Kernel 1] 批次 2 加载，同时写回批次 1 的暂存结果...',
    kernel2Assign: '[Kernel 2] 指派 SM 3 进行最终归约加载...',
    finalWriteback: '最终合并结果写回 HBM',
    gpuSms: 'GPU 物理流处理器 (SMs)',
    barrierSync: 'Kernel 级同步屏障 (Barrier Sync) 已越过，开启归约。',
    reduction: '(归约)',
    reductionDone: '归约与合并完成',
    standbyDone: '✓ 待命 (局部计算完成)',
    idle: '空闲 / 待命',
    pythonCode: '底层代码 (Python 伪代码)',
    py1Step1: '# [步骤 1] Seq 维度切块，准备并行',
    py1Step2: '# [步骤 2] Kernel 1: 局部注意力并行计算',
    py1DynamicLoad: '# 动态载入 SRAM',
    py1WriteWorkspace: '# 写回 Workspace',
    py1Step3: '# [步骤 3] Kernel 2 (归约): 求全局 Max',
    py1Step4: '# [步骤 4] 修正各块权重并合并',
    py1Return: '# 写回 HBM',
    py2Step1: '# [步骤 1] 切块并分配并行流',
    py2Step2: '# [步骤 2] Kernel 1: 分块局部计算 LSE',
    py2LseKey: '# 关键：Log-Sum-Exp',
    py2WriteHbm: '# 写入 HBM Workspace',
    py2Step3: '# [步骤 3] Kernel 2 (归约): 迭代求全局因子 S',
    py2Step4: '# [步骤 4] 利用 S_global 合并各流',
    py2WeightAlign: '# 权重对齐',
    py2Return: '# 写回结果',
    mathPrinciple: '核心数学原理与执行解析',
    waitStart: '等待开始。',
    clickPlay: '请点击顶部的“播放”按钮观察动态调度过程。',
    step1Title: '步骤 1',
    step1Name: '矩阵切块 (Tiling)',
    step1Desc: 'KV Cache 在 HBM 中被逻辑切分为 6 个分块。由于 SM 只有 4 个，硬件将无法一次性处理所有数据。Flash Decoding 将启动异步加载流水线。',
    step21Title: '步骤 2.1',
    step21Name: '局部计算 (批次 1)',
    step21Desc: '四个 SM 同时认领了 Block 0~3。数据被载入 SM 各自的高速片上缓存 SRAM。此时计算处于高并发、互不干扰的局部阶段，并将计算出的中间态及时写回 HBM Workspace。',
    step22Title: '步骤 2.2',
    step22Name: '动态调度 (批次 2)',
    step22Desc: '流水线在流动：SM 0 和 SM 1 算完上一块后立即接手了 Block 4 和 5。而 SM 2 和 SM 3 暂时空闲进入待命状态。这是 Flash Decoding 处理无限长上下文的核心：分批次榨干算力。',
    step3Title: '步骤 3',
    step3Name: 'Kernel 同步与状态归约',
    step3Desc1: '[重要转折点]：所有 SM 计算完毕并同步。此时启动第二个轻量级 Kernel，通常调度到某一个 SM (如 SM 3) 上执行。它通过 SRAM 载入 HBM Workspace 中的汇总数据，重新统一尺度。',
    step3Desc2Simple: '读取各块极大值 m_i，计算全局 m_global 以校准后续权重。',
    step3Desc2Opt: '使用 LSE 稳定迭代公式，在对数空间内合并所有分母信息。',
    step4Title: '步骤 4',
    step4Name: '最终合并 (Merge)',
    step4Desc: '归约 SM 利用同步好的全局比例尺，对之前分散在 HBM 中的各块 O_i 进行加权合并。这不仅修正了局部 Softmax 的误差，更在无需重新访问全量 KV 的情况下，完美输出了与传统 Attention 完全等价的结果。',
    doneTitle: 'Flash Decoding 完成',
    doneDesc: '最终结果已写回。通过“切分-局部计算-同步-全局归约”的四步走策略，我们成功把内存密集型的 Decoding 任务，转化为了计算与显存高效平衡的流水线。'
  },
  en: {
    title: 'Flash Decoding Visualization',
    subtitle: 'Break the decoding memory wall: tile KV cache, parallel streams, two-stage reduction',
    reset: 'Reset',
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    langToggle: '中文',
    challenge: 'Core Challenge: Break the Memory Wall',
    algSimple: 'Simple Tiling',
    algOptimized: 'LSE Optimized',
    painPoint: 'Pain Point',
    solution: 'Solution',
    challengeDesc1: 'In the Decode phase, Query length is only 1, but it needs to load thousands of historical KV Cache tokens, severely bottlenecked by memory bandwidth.',
    challengeDesc2: 'Split KV Cache and dynamically assign to multiple SMs for parallel computation, utilizing intermediate state storage and a secondary reduction to merge results.',
    dataFlow: 'Data Flow & Computation Graph',
    dimensions: 'Dimensions: ',
    seqLen: 'Seq Length',
    blockSize: 'Block Size',
    headDim: 'Head Dim',
    hbmTitle: 'GPU HBM (Main Memory)',
    hbmWorkspace: 'HBM Workspace (Intermediate Storage)',
    sm3Reducing: 'SM 3 is reading back data and reducing...',
    globalResultWriteback: '✓ Global result written back to HBM',
    kernel1Batch1: '[Kernel 1] Dispatch Batch 1 into SRAM...',
    kernel1Batch2: '[Kernel 1] Load Batch 2, write back Batch 1 intermediate results...',
    kernel2Assign: '[Kernel 2] Assign SM 3 for final reduction load...',
    finalWriteback: 'Final merged result written back to HBM',
    gpuSms: 'GPU Physical SMs',
    barrierSync: 'Kernel-level Barrier Sync passed, starting reduction.',
    reduction: '(Reduction)',
    reductionDone: 'Reduction & Merge Done',
    standbyDone: '✓ Standby (Local Compute Done)',
    idle: 'Idle / Standby',
    pythonCode: 'Underlying Code (Python Pseudocode)',
    py1Step1: '# [Step 1] Split along Seq dim, prepare for parallel',
    py1Step2: '# [Step 2] Kernel 1: Parallel local attention compute',
    py1DynamicLoad: '# Dynamically load to SRAM',
    py1WriteWorkspace: '# Write back to Workspace',
    py1Step3: '# [Step 3] Kernel 2 (Reduction): Find global Max',
    py1Step4: '# [Step 4] Rescale block weights and merge',
    py1Return: '# Write back to HBM',
    py2Step1: '# [Step 1] Tile and assign parallel streams',
    py2Step2: '# [Step 2] Kernel 1: Block local compute LSE',
    py2LseKey: '# Key: Log-Sum-Exp',
    py2WriteHbm: '# Write to HBM Workspace',
    py2Step3: '# [Step 3] Kernel 2 (Reduction): Iteratively find global S',
    py2Step4: '# [Step 4] Merge streams using S_global',
    py2WeightAlign: '# Weight alignment',
    py2Return: '# Write back result',
    mathPrinciple: 'Core Mathematical Principles & Execution Analysis',
    waitStart: 'Waiting to start.',
    clickPlay: 'Please click the "Play" button at the top to observe the dynamic scheduling process.',
    step1Title: 'Step 1',
    step1Name: 'Matrix Tiling',
    step1Desc: 'The KV Cache in HBM is logically split into 6 blocks. Since there are only 4 SMs, hardware cannot process all data at once. Flash Decoding initiates an asynchronous loading pipeline.',
    step21Title: 'Step 2.1',
    step21Name: 'Local Compute (Batch 1)',
    step21Desc: 'Four SMs concurrently claim Blocks 0~3. Data is loaded into their respective high-speed SRAMs. Computation is highly concurrent and independent, with intermediate states written back to HBM Workspace promptly.',
    step22Title: 'Step 2.2',
    step22Name: 'Dynamic Scheduling (Batch 2)',
    step22Desc: 'The pipeline flows: SM 0 and 1 immediately take over Blocks 4 and 5 after finishing previous ones. SM 2 and 3 enter standby. This is the core of Flash Decoding for infinite contexts: squeezing compute power in batches.',
    step3Title: 'Step 3',
    step3Name: 'Kernel Sync & State Reduction',
    step3Desc1: '[Critical Point]: All SMs finish and sync. A second lightweight Kernel is launched, usually on one SM (e.g., SM 3). It loads summary data from HBM Workspace via SRAM to unify the scale.',
    step3Desc2Simple: 'Read block maximums m_i, compute global m_global to calibrate subsequent weights.',
    step3Desc2Opt: 'Use stable LSE iteration formula to merge all denominator info in log space.',
    step4Title: 'Step 4',
    step4Name: 'Final Merge',
    step4Desc: 'The reduction SM uses the synchronized global scale to perform a weighted merge of previously scattered O_i blocks in HBM. This corrects local Softmax errors and perfectly outputs results equivalent to traditional Attention without re-accessing the full KV.',
    doneTitle: 'Flash Decoding Done',
    doneDesc: 'Final result written back. Through the 4-step "Split - Local Compute - Sync - Global Reduce" strategy, we successfully transformed a memory-intensive Decoding task into a highly balanced pipeline of compute and memory.'
  }
};

const getInitialLang = () => (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().includes('zh') ? 'zh' : 'en');

const NUM_KV_BLOCKS = 6; // 6个KV分块
const NUM_SMS = 4;       // 4个物理SM计算单元

// 动态调度的批次定义
const SM_BATCHES = [
  [0, 1, 2, 3], // 批次 1: SM0->块0, SM1->块1, SM2->块2, SM3->块3
  [4, 5, null, null] // 批次 2: SM0->块4, SM1->块5, SM2->空闲, SM3->空闲
];

const App = () => {
  const [algorithm, setAlgorithm] = useState('optimized'); // 'simple' | 'optimized'
  const [step, setStep] = useState(0); 
  /* Steps:
   0: Idle (等待开始)
   1: Split & Broadcast (切分KV)
   2: Local Compute Batch 1 (处理块0~3)
   3: Local Compute Batch 2 (处理块4~5)
   4: Global Stats (SM 3 载入中间结果并归约 S_global / m_global)
   5: Rescale & Merge (SM 3 计算最终 O_final)
   6: Done (写回 HBM)
  */
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState(getInitialLang());
  const t = (k) => i18n[lang][k] ?? k;

  // 自动播放逻辑
  useEffect(() => {
    let timer;
    if (isPlaying && step < 6) {
      let delay = 2500;
      if (step === 2 || step === 3 || step === 5) delay = 3500; 
      timer = setTimeout(() => setStep(s => s + 1), delay);
    } else if (step >= 6) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, step]);

  const togglePlay = () => {
    if (step >= 6) {
      setStep(0);
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const reset = () => { setIsPlaying(false); setStep(0); };
  const handleAlgChange = (alg) => { if (alg !== algorithm) { setAlgorithm(alg); reset(); } };

  // 渲染底层代码
  const renderPseudocode = () => {
    const isLocalCompute = step === 2 || step === 3; 

    if (algorithm === 'simple') {
      return (
        <div className="font-mono text-[10px] md:text-xs xl:text-sm overflow-x-auto bg-[#0d1117] p-4 rounded-lg border border-slate-800 flex-1 leading-relaxed whitespace-pre text-slate-400 block">
          <div><span className="text-emerald-400">def</span> <span className="text-blue-400">flash_decoding_simple</span>(q, k, v, block_size):</div>
          
          <div className={`mt-2 ${step === 1 ? "bg-indigo-900/60 text-indigo-200 px-2 py-1 -mx-2 rounded border-l-2 border-indigo-400" : ""}`}>
            <div className="text-indigo-400 font-bold text-[10px] mb-1">{t('py1Step1')}</div>
            <div>  num_blocks = seq_len_kv // block_size</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_blocks):</div>
          </div>
          
          <div className={`mt-2 ${isLocalCompute ? "bg-amber-900/40 text-amber-200 px-2 py-1 -mx-2 rounded border-l-2 border-amber-400" : ""}`}>
            <div className="text-amber-400 font-bold text-[10px] mb-1">{t('py1Step2')}</div>
            <div>      k_b, v_b = k[i], v[i] <span className="text-slate-500">{t('py1DynamicLoad')}</span></div>
            <div>      scores = (q @ k_b.T) / sqrt(d)</div>
            <div>      block_max[i] = max(scores)</div>
            <div>      exp_s = exp(scores - block_max[i])</div>
            <div>      block_sum_exp[i] = sum(exp_s)</div>
            <div>      block_out[i] = exp_s @ v_b <span className="text-slate-500">{t('py1WriteWorkspace')}</span></div>
          </div>

          <div className={`mt-2 ${step === 4 ? "bg-pink-900/40 text-pink-200 px-2 py-1 -mx-2 rounded border-l-2 border-pink-400" : ""}`}>
            <div className="text-pink-400 font-bold text-[10px] mb-1">{t('py1Step3')}</div>
            <div>  global_max = max(block_max)</div>
            <div>  total_sum_exp = 0</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_blocks):</div>
            <div>      total_sum_exp += block_sum_exp[i] * exp(block_max[i] - global_max)</div>
          </div>

          <div className={`mt-2 ${step === 5 ? "bg-purple-900/50 text-purple-200 px-2 py-1 -mx-2 rounded border-l-2 border-purple-400" : ""}`}>
            <div className="text-purple-400 font-bold text-[10px] mb-1">{t('py1Step4')}</div>
            <div>  final_out = 0</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_blocks):</div>
            <div>      weight = exp(block_max[i] - global_max)</div>
            <div>      final_out += block_out[i] * weight</div>
            <div>  final_out = final_out / total_sum_exp</div>
          </div>
          
          <div className={step === 6 ? "text-emerald-400 font-bold mt-2" : "mt-2"}>  <span className="text-emerald-400">return</span> final_out <span className="text-slate-500">{t('py1Return')}</span></div>
        </div>
      );
    } else {
      return (
        <div className="font-mono text-[10px] md:text-xs xl:text-sm overflow-x-auto bg-[#0d1117] p-4 rounded-lg border border-slate-800 flex-1 leading-relaxed whitespace-pre text-slate-400 block">
          <div><span className="text-emerald-400">def</span> <span className="text-blue-400">flash_decoding_lse</span>(q, k, v, num_streams):</div>
          
          <div className={`mt-2 ${step === 1 ? "bg-indigo-900/60 text-indigo-200 px-2 py-1 -mx-2 rounded border-l-2 border-indigo-400" : ""}`}>
            <div className="text-indigo-400 font-bold text-[10px] mb-1">{t('py2Step1')}</div>
            <div>  streams = []</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_streams):</div>
          </div>
          
          <div className={`mt-2 ${isLocalCompute ? "bg-amber-900/40 text-amber-200 px-2 py-1 -mx-2 rounded border-l-2 border-amber-400" : ""}`}>
            <div className="text-amber-400 font-bold text-[10px] mb-1">{t('py2Step2')}</div>
            <div>      scores = (q @ k[i].T) / sqrt(d)</div>
            <div>      m_i = max(scores)</div>
            <div>      l_i = sum(exp(scores - m_i))</div>
            <div>      O_i = (exp(scores - m_i) @ v[i]) / l_i </div>
            <div>      S_i = m_i + log(l_i) <span className="text-slate-500">{t('py2LseKey')}</span></div>
            <div>      streams.append((O_i, S_i)) <span className="text-slate-500">{t('py2WriteHbm')}</span></div>
          </div>

          <div className={`mt-2 ${step === 4 ? "bg-pink-900/40 text-pink-200 px-2 py-1 -mx-2 rounded border-l-2 border-pink-400" : ""}`}>
            <div className="text-pink-400 font-bold text-[10px] mb-1">{t('py2Step3')}</div>
            <div>  S_global = streams[0].S</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(1, num_streams):</div>
            <div>      S_max = max(S_global, streams[i].S)</div>
            <div>      S_min = min(S_global, streams[i].S)</div>
            <div>      S_global = S_max + log1p(exp(S_min - S_max))</div>
          </div>

          <div className={`mt-2 ${step === 5 ? "bg-purple-900/50 text-purple-200 px-2 py-1 -mx-2 rounded border-l-2 border-purple-400" : ""}`}>
            <div className="text-purple-400 font-bold text-[10px] mb-1">{t('py2Step4')}</div>
            <div>  O_global = 0</div>
            <div>  <span className="text-emerald-400">for</span> O_i, S_i <span className="text-emerald-400">in</span> streams:</div>
            <div>      weight = exp(S_i - S_global) <span className="text-slate-500">{t('py2WeightAlign')}</span></div>
            <div>      O_global += O_i * weight</div>
          </div>
          
          <div className={step === 6 ? "text-emerald-400 font-bold mt-2" : "mt-2"}>  <span className="text-emerald-400">return</span> O_global <span className="text-slate-500">{t('py2Return')}</span></div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 lg:p-6 selection:bg-indigo-100">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
      
      <div className="max-w-[90rem] mx-auto space-y-6">
        
        {/* 顶部控制栏 */}
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-indigo-900">
              <Zap className="text-amber-500" />
              {t('title')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{t('subtitle')}</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
              <button onClick={() => handleAlgChange('simple')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all ${algorithm === 'simple' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <AlignLeft size={14} /> {t('algSimple')}
              </button>
              <button onClick={() => handleAlgChange('optimized')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all ${algorithm === 'optimized' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Calculator size={14} /> {t('algOptimized')}
              </button>
            </div>

            <button onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))} className="px-2 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition flex items-center gap-1" title="Language"><Globe size={16} /> {t('langToggle')}</button>
            <button onClick={reset} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition" title={t('reset')}><RotateCcw size={20} /></button>
            <button onClick={togglePlay} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition shadow-sm bg-blue-600 hover:bg-blue-700`}>
              <>{isPlaying ? <Pause size={18} /> : <Play size={18} />} {t('play')}</>
            </button>
            <button onClick={() => { setIsPlaying(false); if(step<6) setStep(step+1); }} disabled={isPlaying || step === 6} className="flex items-center gap-2 px-4 py-2 w-48 justify-center rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 disabled:opacity-50 transition shadow-sm font-semibold">
              <SkipForward size={18} /> <span className="text-sm">{t('next')}</span>
            </button>
          </div>
        </div>

        <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 md:p-5 text-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-10px] p-4 text-indigo-200/40">
            <Database size={120} />
          </div>
          <h2 className="text-base md:text-lg font-bold mb-2 flex items-center gap-2 text-indigo-900">
            <HardDrive size={18} className="text-indigo-500"/> {t('challenge')}
          </h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed max-w-5xl space-y-1 relative z-10 text-slate-600">
            <li><strong>{t('painPoint')}</strong>：{t('challengeDesc1')}</li>
            <li><strong>{t('solution')}</strong>：{t('challengeDesc2')}</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col min-w-0 overflow-hidden relative xl:col-span-7">
             <div className="flex items-center justify-between shrink-0 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="text-indigo-500" size={20} /> {t('dataFlow')}
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full font-mono bg-blue-50 text-blue-700 border border-blue-200`}>
                Decoding Phase
              </span>
            </div>
            
            <div className="mb-2">
              <span className="text-[11px] md:text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md inline-block border border-slate-200">
                <strong>{t('dimensions')}</strong> 
                <code className="font-bold text-indigo-600 mx-1">N</code>={t('seqLen')} | 
                <code className="font-bold text-indigo-600 mx-1">b</code>={t('blockSize')} (N/6) | 
                <code className="font-bold text-indigo-600 mx-1">d</code>={t('headDim')}
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-x-auto pb-4 pt-2">
              
              <div className={`relative border-2 rounded-xl p-4 mt-2 transition-all duration-500
                ${(step === 1 || step === 3 || step >= 6) ? 'border-indigo-400 bg-indigo-50/30 ring-4 ring-indigo-50' : 'border-slate-200 bg-slate-50/50'}
              `}>
                <div className="absolute -top-3 left-4 bg-white px-2 flex items-center gap-1 text-xs font-bold text-slate-600 border border-slate-200 rounded">
                  <HardDrive size={14} className="text-indigo-500"/> {t('hbmTitle')}
                </div>

                <div className="flex flex-col items-center gap-3 mt-2 min-w-[480px]">
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-xs font-bold text-slate-600 w-10 text-right">Query</span>
                    <div className="px-4 py-1.5 bg-blue-100 border-2 border-blue-400 text-blue-800 font-mono text-xs font-bold rounded shadow-sm w-24 text-center">
                      <i>Q</i> <sub>[1, d]</sub>
                    </div>
                  </div>

                  {[ {l:'Key',k:'K'}, {l:'Value',k:'V'} ].map(row => (
                    <div key={row.k} className="flex items-center gap-3 w-full">
                      <span className="text-xs font-bold text-slate-600 w-10 text-right">{row.l}</span>
                      <div className={`flex w-full transition-all duration-700 ${step >= 1 ? 'gap-2' : 'gap-0'}`}>
                        {Array.from({length: NUM_KV_BLOCKS}).map((_, i) => {
                          const isBatch1 = step === 2 && i < 4;
                          const isBatch2 = step === 3 && i >= 4;
                          return (
                            <div key={i} className={`flex-1 flex items-center justify-center font-mono text-[9px] md:text-xs font-bold transition-all duration-700 h-8 whitespace-nowrap
                              ${step >= 1 ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-800 rounded' : 'bg-slate-200 border-y-2 border-slate-300 text-slate-500 first:rounded-l last:rounded-r first:border-l-2 last:border-r-2'}
                              ${(isBatch1 || isBatch2) ? 'ring-2 ring-amber-500 scale-105 z-10 shadow-md bg-amber-100 border-amber-400 text-amber-900' : ''}
                            `}>
                              {step >= 1 ? <span className="whitespace-nowrap"><i>{row.k}</i><sub>{i}</sub> <span className="font-normal text-[8px] opacity-70 ml-0.5 whitespace-nowrap">[b,d]</span></span> : (i === 2 ? <span className="whitespace-nowrap"><i>{row.k}</i> Cache <sub>[N, d]</sub></span> : '')}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  <div className={`w-full transition-all duration-700 overflow-hidden ${(step >= 3 && step <= 5) ? 'max-h-40 opacity-100 mt-2 pt-3 border-t-2 border-dashed border-indigo-200' : 'max-h-0 opacity-0 mt-0 pt-0 border-none'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                        <Database size={12}/> {t('hbmWorkspace')}
                      </span>
                      {step >= 4 && step <= 5 && <span className="text-[10px] text-amber-600 font-bold animate-pulse">{t('sm3Reducing')}</span>}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 w-full pb-1">
                      {Array.from({length: NUM_KV_BLOCKS}).map((_, i) => {
                        const isWritten = (step >= 3 && i < 4) || (step >= 4 && i >= 4);
                        return (
                          <div key={i} className={`flex-1 min-w-[60px] flex items-center justify-center py-1.5 text-[9px] font-mono rounded border transition-all duration-500 whitespace-nowrap
                            ${!isWritten ? 'bg-slate-100 border-slate-200 text-transparent scale-90' : 
                              (step === 4 || step === 5) ? 'bg-indigo-100 border-amber-500 text-indigo-800 shadow-md ring-2 ring-amber-400 animate-pulse z-10' : 
                              'bg-indigo-100 border-indigo-300 text-indigo-800 shadow-sm'
                            }`}>
                            {algorithm === 'simple' ? <span><i>O<sub>{i}</sub></i>, <i>m<sub>{i}</sub></i>, <i>l<sub>{i}</sub></i></span> : <span><i>O<sub>{i}</sub></i>, <i>S<sub>{i}</sub></i></span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {step === 6 && (
                    <div className="flex items-center gap-3 w-full mt-2 animate-fade-in border-t border-slate-200 pt-3">
                      <span className="text-xs font-bold text-slate-600 w-10 text-right">Output</span>
                      <div className="px-4 py-1.5 bg-emerald-500 border-2 border-emerald-600 text-white font-mono text-xs font-bold rounded shadow-md w-28 text-center">
                        <i>O</i> <sub>[1, d]</sub>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold ml-2">{t('globalResultWriteback')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex justify-center min-w-[480px] h-10 relative transition-all duration-500 ${(step >= 2 && step <= 6) ? 'opacity-100' : 'opacity-0'}`}>
                 <div className="absolute inset-0 flex flex-col items-center justify-center whitespace-nowrap">
                    {step === 2 && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mb-1"><ArrowDown size={14}/>{t('kernel1Batch1')}</span>}
                    {step === 3 && <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 mb-1"><ArrowUp size={14}/>{t('kernel1Batch2')}<ArrowDown size={14}/></span>}
                    {(step === 4 || step === 5) && <span className="text-[10px] font-bold text-pink-600 flex items-center gap-1 mb-1"><ArrowDown size={14}/>{t('kernel2Assign')}</span>}
                    {step === 6 && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mb-1"><ArrowUp size={14}/>{t('finalWriteback')}</span>}
                 </div>
              </div>

              <div className={`relative border-2 rounded-xl p-3 md:p-4 mt-2 transition-all duration-500
                ${(step === 2 || step === 3) ? 'border-amber-400 bg-amber-50/30 ring-4 ring-amber-50' : 
                  (step === 4 || step === 5) ? 'border-pink-300 bg-pink-50/30 ring-4 ring-pink-50 shadow-inner' : 'border-blue-200 bg-blue-50/30'}
              `}>
                <div className="absolute -top-3 left-4 bg-white px-2 flex items-center gap-1 text-xs font-bold text-blue-500 border border-blue-200 rounded shadow-sm z-10">
                  <MemoryStick size={14}/> {t('gpuSms')}
                </div>

                {step === 4 && (
                  <div className="absolute inset-x-0 -top-8 flex justify-center">
                    <div className="bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-lg animate-bounce whitespace-nowrap">
                      <Combine size={12}/> {t('barrierSync')}
                    </div>
                  </div>
                )}

                <div className={`grid gap-2 min-w-[480px] mt-4 transition-all duration-700 ${step >= 2 ? 'opacity-100' : 'opacity-30'}`} 
                     style={{ gridTemplateColumns: `repeat(${NUM_SMS}, minmax(0, 1fr))` }}>
                  {Array.from({length: NUM_SMS}).map((_, smIdx) => {
                    const isReductionWorker = (smIdx === 3 && step >= 4);
                    
                    let currentBlock = null;
                    if (step === 2) currentBlock = SM_BATCHES[0][smIdx];
                    if (step === 3) currentBlock = SM_BATCHES[1][smIdx];

                    const isComputingLocal = (step === 2 || step === 3) && currentBlock !== null;
                    const isIdle = !isComputingLocal && !isReductionWorker;
                    const blockId = isComputingLocal ? currentBlock : 'i';
                    const activeColor = isComputingLocal ? 'text-amber-700 font-bold' : 'text-slate-500';

                    return (
                      <div key={smIdx} className={`flex flex-col items-center p-2 rounded border shadow-sm transition-all duration-500 relative
                        ${isComputingLocal ? 'bg-white border-amber-300 ring-2 ring-amber-100' : 
                          isReductionWorker ? 'bg-white border-indigo-400 ring-2 ring-indigo-100 shadow-md z-10' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                        
                        <div className={`text-[10px] font-bold mb-1 border-b w-full text-center pb-1 whitespace-nowrap ${isReductionWorker ? 'text-indigo-700 border-indigo-200' : 'text-slate-700 border-slate-200'}`}>
                          SM {smIdx} {isReductionWorker && t('reduction')}
                        </div>
                        
                        <div className="h-14 flex flex-col items-center justify-center mb-1 w-full transition-all duration-300">
                          {isComputingLocal ? (
                            <>
                              <div className="flex flex-wrap gap-1 justify-center animate-fade-in">
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[8px] rounded border border-blue-200"><i>Q</i><sub>[1,d]</sub></span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] rounded border border-emerald-200"><i>K</i><sub>{currentBlock}</sub></span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] rounded border border-emerald-200"><i>V</i><sub>{currentBlock}</sub></span>
                              </div>
                              <ArrowDown size={12} className="text-amber-400 mt-1 animate-pulse"/>
                            </>
                          ) : isReductionWorker ? (
                            step === 6 ? (
                              <div className="flex flex-col items-center animate-fade-in text-emerald-600 font-bold gap-1 mt-1">
                                <Zap size={14} />
                                <span className="text-[10px]">{t('reductionDone')}</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-wrap gap-1 justify-center animate-fade-in">
                                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[8px] rounded border border-amber-500 ring-1 ring-amber-400 font-mono shadow-sm whitespace-nowrap">
                                    {algorithm === 'simple' ? <span><i>O<sub>0..5</sub></i>, <i>m<sub>0..5</sub></i>, <i>l<sub>0..5</sub></i></span> : <span><i>O<sub>0..5</sub></i>, <i>S<sub>0..5</sub></i></span>}
                                  </span>
                                </div>
                                <ArrowDown size={12} className="text-amber-500 mt-1 animate-pulse"/>
                              </>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-400 italic text-center leading-tight">
                              {step >= 4 ? t('standbyDone') : t('idle')}
                            </span>
                          )}
                        </div>

                        <div className={`p-1.5 md:p-2 rounded w-full text-left space-y-1.5 text-[8px] md:text-[9.5px] border transition-colors duration-500 flex flex-col justify-center
                          ${isComputingLocal ? 'bg-amber-50/50 border-amber-100' : 
                            isReductionWorker ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                          
                          {isReductionWorker ? (
                            algorithm === 'simple' ? (
                              <div className="space-y-1">
                                <div className={step === 4 ? "text-indigo-700 font-bold" : "text-slate-500"}><i>m<sub>g</sub></i> = max(<i>m<sub>0..5</sub></i>)</div>
                                <div className={step === 5 ? "text-indigo-700 font-bold" : "text-slate-500"}><i>w<sub>i</sub></i> = e<sup><i>m<sub>i</sub>-m<sub>g</sub></i></sup></div>
                                <div className={step >= 5 ? "text-indigo-700 font-bold flex flex-col pt-0.5" : "text-slate-500 flex flex-col pt-0.5"}>
                                  <span><i>O<sub>final</sub></i> = &Sigma; <i>O<sub>i</sub>w<sub>i</sub></i> / &Sigma; <i>w<sub>i</sub></i></span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className={step === 4 ? "text-indigo-700 font-bold leading-tight" : "text-slate-500 leading-tight"}><i>S<sub>new</sub></i> = <i>S<sub>max</sub></i> + ln(1+e<sup>&Delta;<i>S</i></sup>)</div>
                                <div className={step === 5 ? "text-indigo-700 font-bold" : "text-slate-500"}><i>w<sub>i</sub></i> = e<sup><i>S<sub>i</sub>-S<sub>g</sub></i></sup></div>
                                <div className={step >= 5 ? "text-indigo-700 font-bold flex flex-col pt-0.5" : "text-slate-500 flex flex-col pt-0.5"}>
                                  <span><i>O<sub>final</sub></i> = &Sigma; (<i>O<sub>i</sub>w<sub>i</sub></i>)</span>
                                </div>
                              </div>
                            )
                          ) : (
                            <div className={`space-y-1 transition-opacity duration-500 ${step >= 4 ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                              <div className="text-slate-500 border-b border-slate-200 pb-1 mb-1 leading-tight italic">
                                <i>S<sub>{blockId}</sub></i> = (<i>Q K<sub>{blockId}</sub><sup>T</sup></i>) / &radic;<i>d</i>
                              </div>
                              {algorithm === 'simple' ? (
                                <>
                                  <div className={activeColor}><i>m<sub>{blockId}</sub></i> = max(<i>S<sub>{blockId}</sub></i>)</div>
                                  <div className={activeColor}><i>l<sub>{blockId}</sub></i> = &Sigma; e<sup><i>S<sub>{blockId}</sub> &minus; m<sub>{blockId}</sub></i></sup></div>
                                  <div className={activeColor}><i>O<sub>{blockId}</sub></i> = e<sup><i>S<sub>{blockId}</sub> &minus; m<sub>{blockId}</sub></i></sup> <i>V<sub>{blockId}</sub></i></div>
                                </>
                              ) : (
                                <>
                                  <div className={activeColor}><i>m<sub>{blockId}</sub></i>=max(S), <i>l<sub>{blockId}</sub></i>=&Sigma;e<sup>..</sup></div>
                                  <div className={isComputingLocal ? 'text-amber-700 font-bold bg-amber-100/50 rounded px-1' : 'text-slate-500'}>
                                    <i>S<sub>new_{blockId}</sub></i> = <i>m<sub>{blockId}</sub></i> + ln(<i>l<sub>{blockId}</sub></i>)
                                  </div>
                                  <div className={isComputingLocal ? 'text-amber-700 font-bold bg-amber-100/50 rounded px-1' : 'text-slate-500'}>
                                    <i>O<sub>{blockId}</sub></i> = (e<sup>..</sup> / <i>l<sub>{blockId}</sub></i>) <i>V<sub>{blockId}</sub></i>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 md:p-6 shadow-lg border border-slate-800 text-slate-300 h-full flex flex-col min-w-0 xl:col-span-5">
             <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-white shrink-0">
               <div className="flex items-center gap-2">
                 <Code className="text-emerald-400" size={20} /> {t('pythonCode')}
               </div>
               <span className={`text-xs px-2 py-1 rounded border ${algorithm === 'optimized' ? 'bg-teal-900/50 text-teal-400 border-teal-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                 {algorithm === 'optimized' ? 'Optimized Tiling' : 'Simple Version'}
               </span>
            </h2>
            {renderPseudocode()}
          </div>
        </div>

        <div className="bg-indigo-900 text-indigo-50 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
          <div className="absolute bottom-0 right-0 p-4 opacity-5 rotate-12">
             <Cpu size={160} />
          </div>
          <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <Braces className="text-amber-400" size={24}/>
            {t('mathPrinciple')}
          </h3>
          
          <div className="space-y-4 text-sm md:text-base leading-relaxed max-w-5xl min-h-[160px] relative z-10">
            {step === 0 && (
              <p className="opacity-90">{t('waitStart')}<br/><span className="text-indigo-300 text-sm italic flex items-center gap-2 mt-2"><Info size={14}/> {t('clickPlay')}</span></p>
            )}
            
            {step === 1 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-indigo-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-0.5 rounded text-xs">{t('step1Title')}</span> 
                  <SplitSquareHorizontal size={18}/> {t('step1Name')}
                </h4>
                <p className="opacity-90 text-indigo-50">{t('step1Desc')}</p>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs">{t('step21Title')}</span> 
                  <Cpu size={18}/> {t('step21Name')}
                </h4>
                <p className="opacity-90">{t('step21Desc')}</p>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs">{t('step22Title')}</span> 
                  <Cpu size={18}/> {t('step22Name')}
                </h4>
                <p className="opacity-90">{t('step22Desc')}</p>
              </div>
            )}

            {step === 4 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-pink-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-pink-500 text-white px-2 py-0.5 rounded text-xs">{t('step3Title')}</span> 
                  <Combine size={18}/> {t('step3Name')}
                </h4>
                <p className="opacity-90 mb-2">{t('step3Desc1')}</p>
                <p className="opacity-90 italic text-indigo-200">
                  {algorithm === 'simple' ? t('step3Desc2Simple') : t('step3Desc2Opt')}
                </p>
              </div>
            )}

            {step === 5 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-purple-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-xs">{t('step4Title')}</span> 
                  <Calculator size={18}/> {t('step4Name')}
                </h4>
                <p className="opacity-90">{t('step4Desc')}</p>
              </div>
            )}

            {step === 6 && (
              <div className="animate-fade-in py-4 border-t border-indigo-700/50 mt-4 pt-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-800 rounded-full shrink-0 shadow-lg ring-2 ring-emerald-400"><Zap className="text-emerald-400" size={24} /></div>
                <div>
                  <h4 className="font-bold text-emerald-300 text-base md:text-lg">{t('doneTitle')}</h4>
                  <p className="opacity-90 mt-1 text-sm">{t('doneDesc')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
