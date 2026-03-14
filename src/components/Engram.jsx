import React, { useState, useEffect } from 'react';
import { 
  Database, Cpu, Combine, Hash, ArrowRight, ArrowDown, ArrowUp, ArrowLeft,
  Layers, BrainCircuit, Play, Pause, SkipForward, RotateCcw, 
  Activity, SlidersHorizontal, BookOpen, Server, Network, 
  Clock, MemoryStick, HardDrive, Calculator, Boxes, Grid, SplitSquareHorizontal, FunctionSquare, FileCode2
} from 'lucide-react';

const MAX_GPUS = 16;
const Big = ({ children }) => <span className="text-lg align-middle">{children}</span>;

// --- 样式映射助手 ---
const getTensorColors = (color, active) => {
  const map = {
    blue: { layer1: 'bg-blue-300', layer2: 'bg-blue-400', main: 'bg-blue-600', shadow: 'shadow-[0_0_15px_rgba(37,99,235,0.5)]' },
    purple: { layer1: 'bg-purple-300', layer2: 'bg-purple-400', main: 'bg-purple-600', shadow: 'shadow-[0_0_15px_rgba(147,51,234,0.5)]' },
    emerald: { layer1: 'bg-emerald-300', layer2: 'bg-emerald-400', main: 'bg-emerald-600', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]' },
    rose: { layer1: 'bg-rose-300', layer2: 'bg-rose-400', main: 'bg-rose-600', shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.5)]' },
    indigo: { layer1: 'bg-indigo-300', layer2: 'bg-indigo-400', main: 'bg-indigo-600', shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.5)]' },
    amber: { layer1: 'bg-amber-300', layer2: 'bg-amber-400', main: 'bg-amber-600', shadow: 'shadow-[0_0_15px_rgba(217,119,6,0.5)]' },
    slate: { layer1: 'bg-slate-200', layer2: 'bg-slate-300', main: 'bg-slate-400', shadow: 'shadow-none' },
  };
  return active ? map[color] : map.slate;
};

const getLineColors = (color, active) => {
  const map = {
    blue: { bg: 'bg-blue-400', text: 'text-blue-500' },
    purple: { bg: 'bg-purple-400', text: 'text-purple-500' },
    emerald: { bg: 'bg-emerald-400', text: 'text-emerald-500' },
    rose: { bg: 'bg-rose-400', text: 'text-rose-500' },
    indigo: { bg: 'bg-indigo-400', text: 'text-indigo-500' },
    amber: { bg: 'bg-amber-400', text: 'text-amber-500' },
    slate: { bg: 'bg-slate-200', text: 'text-slate-300' },
  };
  return active ? map[color] : map.slate;
};

// --- 可视化组件库 ---
const DimBadge = ({ text, active, posClasses }) => (
  <div className={`absolute ${posClasses} text-[9px] font-mono whitespace-nowrap px-1.5 py-0.5 rounded transition-all duration-500 z-50 pointer-events-none
    ${active ? 'text-slate-600 bg-slate-50/90 backdrop-blur-sm border border-slate-200 shadow-sm scale-100' : 'text-slate-300 scale-90 opacity-0'}`}>
    {text}
  </div>
);

const LayeredTensor = ({ label, dim, color, active, left, top, wClass="w-12", hClass="h-16", badgePos }) => {
  const c = getTensorColors(color, active);
  return (
    <div className={`absolute flex flex-col items-center justify-center transition-all duration-500 z-20 ${active ? 'scale-110' : 'scale-90 opacity-60'}`} style={{ left, top, transform: `translate(-50%, -50%)` }}>
       <div className={`relative ${wClass} ${hClass}`}>
          <div className={`absolute inset-0 ${c.layer1} rounded-md translate-x-2 translate-y-2 opacity-40 transition-colors duration-500`}></div>
          <div className={`absolute inset-0 ${c.layer2} rounded-md translate-x-1 translate-y-1 opacity-70 transition-colors duration-500`}></div>
          <div className={`absolute inset-0 ${c.main} rounded-md flex items-center justify-center text-white font-serif text-lg ${c.shadow} transition-colors duration-500`}>
             {label}
          </div>
       </div>
       <DimBadge text={dim} active={active} posClasses={badgePos || "-bottom-6"} />
    </div>
  );
};

const FlatTensor = ({ label, dim, color, active, left, top, wClass="w-12", hClass="h-16", badgePos }) => {
  const c = getTensorColors(color, active);
  return (
    <div className={`absolute flex flex-col items-center justify-center transition-all duration-500 z-20 ${active ? 'scale-110' : 'scale-90 opacity-60'}`} style={{ left, top, transform: `translate(-50%, -50%)` }}>
       <div className={`relative ${wClass} ${hClass} ${c.main} rounded-md flex items-center justify-center text-white font-serif text-[15px] ${c.shadow} transition-colors duration-500`}>
          {label}
       </div>
       <DimBadge text={dim} active={active} posClasses={badgePos || "-bottom-6"} />
    </div>
  );
};

const SplicedFlatTensor = ({ label, dim, active, left, top, wClass="w-24", hClass="h-16", badgePos }) => {
  return (
    <div className={`absolute flex flex-col items-center justify-center transition-all duration-500 z-20 ${active ? 'scale-110' : 'scale-90 opacity-60'}`} style={{ left, top, transform: `translate(-50%, -50%)` }}>
       <div className={`relative ${wClass} ${hClass} rounded-md flex items-center justify-center text-white font-serif text-[15px] overflow-hidden shadow-[0_0_15px_rgba(147,51,234,0.4)] transition-all duration-500`}>
          <div className={`absolute inset-y-0 left-0 w-1/2 ${active ? 'bg-indigo-600' : 'bg-slate-400'} transition-colors duration-500`}></div>
          <div className={`absolute inset-y-0 right-0 w-1/2 ${active ? 'bg-purple-600' : 'bg-slate-400'} transition-colors duration-500 border-l border-white/20`}></div>
          <span className="relative z-10 drop-shadow-md">{label}</span>
       </div>
       <DimBadge text={dim} active={active} posClasses={badgePos || "-bottom-6"} />
    </div>
  );
};

const OpNode = ({ label, subLabel, active, color="slate", left, top, isCircle=false, textClass="text-base", subLabelPos="bottom" }) => {
  const c = getLineColors(color, active);
  const currentBg = active ? `border-${color}-400 bg-${color}-50 ${c.text} shadow-[0_0_10px_currentColor]` : 'border-slate-200 bg-slate-50 text-slate-400';
  let posClass = "absolute -bottom-4 whitespace-nowrap";
  if (subLabelPos === "right") posClass = "absolute -right-3 translate-x-full whitespace-nowrap top-1/2 -translate-y-1/2";
  if (subLabelPos === "left") posClass = "absolute -left-3 -translate-x-full whitespace-nowrap top-1/2 -translate-y-1/2";
  if (subLabelPos === "top") posClass = "absolute -top-5 whitespace-nowrap";

  return (
    <div className={`absolute flex flex-col items-center justify-center transition-all duration-500 z-20`} style={{ left, top, transform: `translate(-50%, -50%) scale(${active ? 1.1 : 0.9})` }}>
       <div className={`${isCircle ? 'w-10 h-10 rounded-full' : 'px-3 py-1.5 rounded-lg'} border-2 flex items-center justify-center font-bold transition-all duration-500 ${currentBg} ${textClass}`}>
          {label}
       </div>
       {subLabel && <span className={`${posClass} text-[9px] font-bold mt-1 transition-colors ${active ? c.text : 'text-slate-400'}`}>{subLabel}</span>}
    </div>
  );
};

const VLine = ({ left, top, bottom, height, active, color }) => {
  const c = getLineColors(color, active);
  return <div className={`absolute w-0.5 transition-all duration-500 z-0 ${active ? `${c.bg} shadow-[0_0_5px_currentColor]` : 'bg-slate-200'}`} style={{ left, top, bottom, height, transform: 'translateX(-50%)' }} />
};
const HLine = ({ left, right, top, width, active, color }) => {
  const c = getLineColors(color, active);
  return <div className={`absolute h-0.5 transition-all duration-500 z-0 ${active ? `${c.bg} shadow-[0_0_5px_currentColor]` : 'bg-slate-200'}`} style={{ left, right, top, width, transform: 'translateY(-50%)' }} />
};
const Arrow = ({ left, top, dir, active, color }) => {
  const icons = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight };
  const Icon = icons[dir];
  const c = getLineColors(color, active);
  return <Icon size={16} className={`absolute z-10 transition-colors duration-500 ${c.text}`} style={{ left, top, transform: 'translate(-50%, -50%)' }} />
};

const CodeLine = ({ active, indent=0, children, num }) => (
  <div className={`font-mono text-[11px] md:text-[12px] leading-relaxed py-[2px] border-l-[3px] transition-colors duration-300 flex ${active ? 'bg-blue-500/20 border-blue-400 text-blue-100 shadow-[inset_0_0_10px_rgba(59,130,246,0.15)]' : 'border-transparent text-slate-400'}`}>
     <span className="text-slate-600 select-none w-6 text-right pr-2 shrink-0">{num}</span>
     <div style={{ paddingLeft: `${indent * 1.2}rem` }} className="flex-1 whitespace-pre-wrap">
       {children}
     </div>
  </div>
);

const App = () => {
  const [step, setStep] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideIdx, setSlideIdx] = useState(2);
  const tokens = ['[BOS]', 'Only', 'Alexander', 'the', 'Great', 'could', 'tame'];

  useEffect(() => {
    let timer;
    if (isPlaying) {
      if (step < 9) {
        const delays = [0, 2000, 2000, 1500, 1500, 1500, 2000, 2000, 2000, 2000];
        timer = setTimeout(() => setStep(s => s + 1), delays[step + 1] || 2000); 
      } else if (step === 9) {
        timer = setTimeout(() => {
          setSlideIdx(prev => prev >= tokens.length - 1 ? 2 : prev + 1);
          setStep(1);
        }, 2500); 
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, step, tokens.length]);

  const togglePlay = () => {
    if (!isPlaying && step >= 9) {
      setSlideIdx(prev => prev >= tokens.length - 1 ? 2 : prev + 1);
      setStep(1);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNextStep = () => {
    setIsPlaying(false); 
    if(step < 9) {
      setStep(step + 1);
    } else {
      setSlideIdx(prev => prev >= tokens.length - 1 ? 2 : prev + 1);
      setStep(1);
    }
  };

  const getStepDesc = () => {
    switch(step) {
      case 0: return "等待输入";
      case 1: return "步骤 1: 滑动窗口提取 N-Gram";
      case 2: return "步骤 2: 位异或与哈希取模";
      case 3: return "步骤 3: 确定槽位并行查表";
      case 4: return "步骤 4: 提取多通道记忆向量";
      case 5: return "步骤 5: 维度展平为 E_t";
      case 6: return "步骤 6: 张量投影 K_t / V_t";
      case 7: return "步骤 7: 依赖建模与动态门控";
      case 8: return "步骤 8: 规范化卷积残差融合";
      case 9: return "步骤 9: 传递至后续 Block";
      default: return "";
    }
  };

  // --- 权重模块联动高亮状态逻辑 ---
  const isEmbActive = step >= 2 && step <= 5;
  const isProjActive = step === 6;
  const isNormActive = step === 7 || step === 8;
  const isConvActive = step === 8;

  // --- 拓扑与时间轴联动状态逻辑 ---
  const isVocabActive = step === 1;
  const isBlock0Active = step === 1;
  const isBlock1Active = step >= 2 && step <= 8;
  const isBlock2Active = step === 9;
  const isBlock15Active = step === 9;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-6 px-4 sm:px-6 md:px-8 overflow-x-hidden">
      <div className="max-w-[120rem] mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-slate-900">
              <Database className="text-purple-600" />
              DeepSeek Engram 架构可视化
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              条件记忆检索、微观张量流与硬件系统级预取过程演示
            </p>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => { setIsPlaying(false); setStep(0); setSlideIdx(2); }} className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition tooltip" title="重置">
                <RotateCcw size={18} />
             </button>
             <button onClick={togglePlay} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-white transition shadow-sm ${isPlaying ? 'bg-rose-500 hover:bg-rose-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
                {isPlaying ? <><Pause size={18} /> 暂停</> : <><Play size={18} /> 播放</>}
             </button>
             <button onClick={handleNextStep} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition shadow-sm font-semibold whitespace-nowrap">
                <SkipForward size={18} /> 下一步
             </button>
          </div>
        </div>

        {/* 第一行：并排三模块（拓扑 : 张量流 : 伪代码） */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          
          {/* 1. 骨干网络拓扑 (自上而下翻转) */}
          <div className="xl:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center mb-4 pb-3 border-b border-slate-100">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                 <Network className="text-indigo-500" size={20}/> 
                 骨干网络拓扑
               </h2>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-start w-full relative pt-2">
              
              {/* Input Tokens */}
              <div className="flex gap-1 justify-center w-full flex-wrap px-1">
                {tokens.map((t, i) => {
                  const isCurrentToken = step > 0 && i === slideIdx;
                  return (
                    <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded transition-all duration-300 border
                      ${isCurrentToken ? 'bg-rose-500 border-rose-600 text-white shadow-md scale-110 font-bold z-10' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                      {t === '[BOS]' ? 'BOS' : t}
                    </span>
                  )
                })}
              </div>

              <ArrowDown className="text-slate-400 my-1.5" size={14}/>

              <div className={`w-full text-[11px] font-bold py-2 rounded text-center transition-all duration-500 border
                 ${isVocabActive ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-[0_0_10px_rgba(244,63,94,0.4)] ring-1 ring-rose-300 scale-105 opacity-100' : 'bg-rose-50 border-rose-200 text-rose-700 opacity-80'}`}>
                Vocab Embedding
              </div>
              
              <ArrowDown className="text-slate-400 my-1.5" size={14}/>

              {/* Block 0 (Standard) */}
              <div className={`w-full border rounded-xl p-2 mb-1.5 transition-all duration-500
                 ${isBlock0Active ? 'bg-slate-50 border-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.4)] ring-1 ring-slate-300 scale-105 opacity-100' : 'bg-slate-50 border-slate-200 shadow-sm opacity-70'}`}>
                  <div className={`text-[10px] font-bold mb-1 text-center transition-colors ${isBlock0Active ? 'text-slate-700' : 'text-slate-500'}`}>Block 0 (Standard)</div>
                  <div className="flex gap-1">
                      <div className={`flex-1 text-[9px] font-bold py-1 rounded text-center transition-colors ${isBlock0Active ? 'bg-amber-50 border border-amber-400 text-amber-800 shadow-sm' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>MoE</div>
                      <div className={`flex-1 text-[9px] font-bold py-1 rounded text-center transition-colors ${isBlock0Active ? 'bg-amber-50 border border-amber-400 text-amber-800 shadow-sm' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>Attn</div>
                  </div>
              </div>

              <ArrowDown className="text-slate-400 mb-1.5" size={14}/>

              {/* Block 1 (w/ Engram) */}
              <div className={`border-2 rounded-xl p-2.5 w-full relative transition-all duration-500
                 ${isBlock1Active ? 'border-purple-400 bg-purple-50 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-[1.02] opacity-100' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                <div className={`text-[11px] font-bold mb-2 text-center flex items-center justify-center gap-1 transition-colors
                   ${isBlock1Active ? 'text-purple-800' : 'text-slate-500'}`}>
                   <Server size={12}/> Block 1 (w/ Engram)
                </div>
                
                <div className="flex gap-1 mb-1.5">
                   <div className={`flex-1 text-[10px] font-bold py-1 rounded text-center shadow-sm transition-colors ${isBlock1Active ? 'bg-amber-100 border border-amber-300 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>MoE</div>
                   <div className={`flex-1 text-[10px] font-bold py-1 rounded text-center shadow-sm transition-colors ${isBlock1Active ? 'bg-amber-100 border border-amber-300 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>Attn</div>
                </div>
                
                <div className={`border rounded-lg p-2 shadow-inner transition-all duration-500 relative
                   ${isBlock1Active ? 'border-purple-300 bg-white' : 'border-slate-200 bg-slate-100/50'}`}>
                   <div className={`text-[10px] font-bold text-center mb-1.5 border-b pb-1 flex items-center justify-center gap-1 transition-colors
                      ${isBlock1Active ? 'text-purple-700 border-purple-100' : 'text-slate-400 border-slate-200'}`}>
                     <BrainCircuit size={10}/> Engram Modules
                   </div>
                   <div className="grid grid-cols-2 gap-1.5 text-[8.5px] font-mono font-bold">
                      <div className={`transition-all duration-300 p-1 rounded text-center flex items-center justify-center ${isEmbActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)] scale-105 z-10' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'}`} title="MultiHeadEmbedding">Emb Table</div>
                      <div className={`transition-all duration-300 p-1 rounded text-center flex items-center justify-center ${isProjActive ? 'bg-emerald-600 text-white border-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.5)] scale-105 z-10' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`} title="value_proj">W_V Proj</div>
                      <div className={`col-span-2 transition-all duration-300 p-1 rounded text-center flex items-center justify-center leading-tight ${isProjActive ? 'bg-amber-600 text-white border-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.5)] scale-105 z-10' : 'bg-amber-50 border border-amber-200 text-amber-700'}`} title="key_projs (ModuleList)">W_K Projs (x HC)</div>
                      <div className={`col-span-2 transition-all duration-300 p-1 rounded text-center flex items-center justify-center leading-tight ${isConvActive ? 'bg-blue-600 text-white border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] scale-105 z-10' : 'bg-blue-50 border border-blue-200 text-blue-700'}`} title="short_conv">Conv1D Weights</div>
                      <div className={`col-span-2 transition-all duration-300 p-1 rounded text-center flex items-center justify-center ${isNormActive ? 'bg-slate-700 text-white border-slate-700 shadow-[0_0_10px_rgba(51,65,85,0.5)] scale-105 z-10' : 'bg-slate-50 border border-slate-200 text-slate-600'}`} title="norm1 & norm2">RMSNorm Params</div>
                   </div>
                </div>
              </div>

              <ArrowDown className="text-slate-400 my-1.5" size={14}/>

              {/* Block 2 (Standard) */}
              <div className={`w-full border rounded-xl p-2 mb-1.5 transition-all duration-500
                 ${isBlock2Active ? 'bg-slate-50 border-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.4)] ring-1 ring-slate-300 scale-105 opacity-100' : 'bg-slate-50 border-slate-200 shadow-sm opacity-70'}`}>
                  <div className={`text-[10px] font-bold mb-1 text-center transition-colors ${isBlock2Active ? 'text-slate-700' : 'text-slate-500'}`}>Block 2 (Standard)</div>
                  <div className="flex gap-1">
                      <div className={`flex-1 text-[9px] font-bold py-1 rounded text-center transition-colors ${isBlock2Active ? 'bg-amber-50 border border-amber-400 text-amber-800 shadow-sm' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>MoE</div>
                      <div className={`flex-1 text-[9px] font-bold py-1 rounded text-center transition-colors ${isBlock2Active ? 'bg-amber-50 border border-amber-400 text-amber-800 shadow-sm' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>Attn</div>
                  </div>
              </div>

              <div className="text-slate-300 text-lg leading-none my-1">⋮</div>

              <div className={`w-full border border-dashed rounded-lg p-1.5 mb-1 transition-all duration-500
                 ${isBlock15Active ? 'bg-purple-50 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)] ring-1 ring-purple-300 scale-105 opacity-100' : 'bg-purple-50/50 border-purple-200 opacity-80'}`}>
                <div className={`text-[10px] font-bold text-center transition-colors ${isBlock15Active ? 'text-purple-700' : 'text-purple-500'}`}>Block 15 (w/ Engram)</div>
              </div>
            </div>
          </div>

          {/* 2. Engram 模块微观张量流图 (自上而下翻转) */}
          <div className="xl:col-span-6 bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col relative overflow-x-auto overflow-y-hidden">
           <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 min-w-[700px]">
             <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
               <BrainCircuit className="text-purple-600" size={20}/>
               模块微观张量流图
             </h2>
             <span className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full font-bold border border-purple-200 shadow-sm transition-all duration-300">
               {getStepDesc()}
             </span>
           </div>

           {/* 全局维度图例 */}
           <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center bg-slate-100 p-2 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-600 mb-6 w-full max-w-4xl mx-auto shadow-inner min-w-[700px]">
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">B</span> Batch Size</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">L</span> Seq Len</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">D</span> Hidden Dim</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">HC</span> Hyper-Conn</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">E_D</span> Engram Dim</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">D_h</span> Head Dim</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">Vocab</span> Hash Size</div>
           </div>

           <div className="flex-1 flex flex-col items-center relative w-full min-w-[700px]">
             
             {/* ======================================================= */}
             {/* [层层下落] 1：Tokenizer 压缩与滑动窗口 */}
             {/* ======================================================= */}
             <div className={`w-full max-w-4xl border rounded-2xl p-4 transition-all duration-700 relative z-20 bg-white shadow-sm
                ${step >= 1 ? 'border-blue-200' : 'border-slate-200'}`}>
                
                <div className="absolute -top-3 left-6 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded shadow-sm z-40">
                  Tokenizer Compression & N-Gram Sliding Window
                </div>

                <div className="flex items-center justify-end mb-3">
                  {step >= 1 && <span className="font-serif italic text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 shadow-sm">g<sub>t,n</sub> = (x'<sub>t-n+1</sub>, ..., x'<sub>t</sub>)</span>}
                </div>

                <div className="flex w-full max-w-3xl mx-auto relative px-2 pb-4">
                   {tokens.map((tok, i) => {
                     const isTarget = i === slideIdx;
                     const is2Gram = i > slideIdx - 2 && i <= slideIdx;
                     const is3Gram = i > slideIdx - 3 && i <= slideIdx;
                     return (
                        <div key={i} className="flex-1 flex flex-col items-center relative">
                           <div className={`px-2 py-2 w-[95%] text-center rounded-lg border transition-all duration-300 font-mono text-[11px] md:text-xs z-10
                              ${isTarget ? 'bg-rose-100 border-rose-400 text-rose-800 font-bold shadow-[0_0_10px_rgba(251,113,133,0.4)] scale-110' :
                                (is2Gram || is3Gram) ? 'bg-blue-50 border-indigo-300 text-slate-800 shadow-sm' :
                                'bg-slate-50 border-slate-200 text-slate-400'}`}>
                              {tok}
                              {isTarget && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] px-1.5 py-[1px] rounded shadow-sm">t</div>}
                           </div>
                           
                           {/* Context Brackets Flowing DOWN */}
                           <div className="h-6 w-full relative mt-1.5">
                              {is2Gram && (
                                <div className={`absolute top-0 w-full h-1.5 bg-purple-200 ${i === slideIdx - 1 ? 'rounded-l-md' : ''} ${i === slideIdx ? 'rounded-r-md' : ''}`}></div>
                              )}
                              {i === slideIdx && is2Gram && (
                                <span className="absolute top-2 w-[200%] right-1/2 translate-x-1/2 text-center text-[9px] font-bold text-purple-600">2-Gram</span>
                              )}
                           </div>
                           <div className="h-6 w-full relative mt-1">
                              {is3Gram && (
                                <div className={`absolute top-0 w-full h-1.5 bg-indigo-200 ${i === slideIdx - 2 ? 'rounded-l-md' : ''} ${i === slideIdx ? 'rounded-r-md' : ''}`}></div>
                              )}
                              {i === slideIdx - 1 && is3Gram && (
                                <span className="absolute top-2 w-[200%] left-1/2 -translate-x-1/2 text-center text-[9px] font-bold text-indigo-600">3-Gram Context</span>
                              )}
                           </div>
                        </div>
                     );
                   })}
                </div>
             </div>

             {/* BRIDGE 0：Tokenizer 向下输出 */}
             <div className="w-full max-w-4xl relative h-10 z-0">
                <VLine left="25%" top="0" height="100%" active={step>=2} color="indigo" />
                <Arrow left="25%" top="20px" dir="down" active={step>=2} color="indigo" />
                <DimBadge text="[B, L]" active={step>=2} posClasses="left-[26%] top-1/2 -translate-y-1/2" />

                <VLine left="75%" top="0" height="100%" active={step>=2} color="purple" />
                <Arrow left="75%" top="20px" dir="down" active={step>=2} color="purple" />
                <DimBadge text="[B, L]" active={step>=2} posClasses="left-[76%] top-1/2 -translate-y-1/2" />
             </div>

             {/* ======================================================= */}
             {/* [层层下落] 2：多头哈希稀疏检索 (倒置翻转) */}
             {/* ======================================================= */}
             <div className={`w-full max-w-4xl border rounded-2xl px-2 py-5 transition-all duration-700 relative z-20
                ${step >= 2 ? 'bg-slate-50 border-indigo-200 shadow-md' : 'bg-slate-50/50 border-slate-200 opacity-50'}`}>
                <div className="absolute -top-3 left-6 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded shadow-sm z-30">
                  Multi-Head Hash Retrieval
                </div>

                <div className="flex w-full mt-3">
                  {[
                    { title: "2-Gram", n: 2, color: "indigo" },
                    { title: "3-Gram", n: 3, color: "purple" },
                  ].map((item, idx) => {
                    const isHashActive = step >= 2;
                    const isTableActive = step >= 3;
                    const isVectorActive = step >= 4;
                    const isConcatActive = step >= 5; 
                    const tColor = getTensorColors(item.color, true);
                    const lColor = getLineColors(item.color, true);

                    return (
                      <div key={idx} className={`w-1/2 rounded-xl p-3 mx-3 shadow-sm flex flex-col items-center transition-all duration-500
                        ${isHashActive ? `bg-${item.color}-50 border border-${item.color}-300` : 'bg-white border border-slate-200 opacity-60'}`}>
                         <div className={`text-xs font-bold mb-3 transition-colors ${isHashActive ? lColor.text : 'text-slate-500'}`}>{item.title} Channel</div>
                         
                         {/* ====== 顶部：倒置重构的哈希管道层 ====== */}
                         <div className="w-full flex flex-col relative mt-1 mb-2">
                            {/* 1. H Index 层 (接受上面下来的输入) */}
                            <div className="flex gap-1.5 w-full justify-between z-10">
                              {Array.from({length: 8}).map((_, k) => (
                                  <div key={`h-${k}`} className={`relative flex-1 py-1 text-center rounded border text-[8px] font-bold transition-all duration-500 ${isHashActive ? `bg-${item.color}-100 border-${item.color}-400 ${lColor.text} shadow-sm scale-110` : 'bg-white border-slate-300 text-slate-400'}`}>
                                    H{k+1}
                                  </div>
                              ))}
                            </div>

                            {/* 2. 中间共用的 Hash 公式层 */}
                            <div className="relative w-full flex justify-center my-2 z-20">
                                <div className={`w-[95%] py-1 rounded flex items-center justify-center text-[9px] font-mono font-bold transition-all duration-500 border ${isHashActive ? `bg-slate-800 text-${item.color}-300 border-${item.color}-400 shadow-[0_0_8px_rgba(0,0,0,0.6)] scale-105` : 'bg-slate-100 border-slate-300 text-slate-400 opacity-80'}`}>
                                   H<sub className="ml-[1px] mt-1">k</sub> = ⨁(tok<sub className="ml-[1px] mt-1">i</sub> × M<sub className="ml-[1px] mt-1">i</sub>) % Prime<sub className="ml-[1px] mt-1">k</sub>
                                </div>
                            </div>

                            {/* 3. Tabs 层 */}
                            <div className="flex gap-1.5 w-full justify-between z-10">
                              {Array.from({length: 8}).map((_, k) => (
                                  <div key={`tab-${k}`} className={`relative flex-1 py-1.5 text-center rounded border text-[6px] font-mono transition-all duration-500 ${isTableActive ? `bg-slate-800 border-slate-700 text-${item.color}-200 shadow-[0_0_6px_rgba(0,0,0,0.5)] scale-105` : 'bg-slate-200 border-slate-300 text-slate-400'}`}>
                                    T{k+1}
                                    {k === 0 && <DimBadge text="[Vocab,D_h]" active={isTableActive} posClasses="-left-[70px] top-1/2 -translate-y-1/2" />}
                                  </div>
                              ))}
                            </div>

                            {/* 连线 (向下至 Vector) */}
                            <div className="flex gap-1.5 w-full justify-between my-0.5">
                              {Array.from({length: 8}).map((_, k) => (
                                  <div key={`lv-${k}`} className="flex-1 flex justify-center">
                                     <div className={`h-2 w-0.5 transition-colors ${isVectorActive ? tColor.main : 'bg-slate-300'}`}></div>
                                  </div>
                              ))}
                            </div>

                            {/* 4. Vectors 层 */}
                            <div className="flex gap-1.5 w-full justify-between z-10">
                              {Array.from({length: 8}).map((_, k) => (
                                  <div key={`vec-${k}`} className={`relative flex-1 h-6 rounded transition-all duration-500 ${isVectorActive ? tColor.main + ' scale-110 shadow-sm' : 'bg-slate-300'}`}>
                                    {k === 0 && <DimBadge text="[B,L,D_h]" active={isVectorActive} posClasses="-left-[65px] top-1/2 -translate-y-1/2" />}
                                  </div>
                              ))}
                            </div>

                            {/* 连线 (向下至 Flatten) */}
                            <div className="flex w-[85%] justify-between mx-auto mt-2 relative">
                             {Array.from({length: 8}).map((_, k) => (
                               <ArrowDown key={k} size={12} className={`transition-colors duration-500 ${isConcatActive ? lColor.text : 'text-slate-300'}`} />
                             ))}
                           </div>
                         </div>
                         
                         {/* ====== 底部：展平节点 (Flatten -> E_t) ====== */}
                         <div className="w-full flex flex-col items-center relative">
                           <div className={`relative w-[90%] flex items-center justify-center gap-1.5 bg-white border rounded py-1 shadow-sm z-10 transition-all duration-500 mb-0.5
                             ${isConcatActive ? `border-${item.color}-300 scale-105 shadow-[0_0_10px_currentColor] ${lColor.text}` : 'border-slate-300 text-slate-400'}`}>
                             <span className="text-[10px] font-bold"><FunctionSquare size={10} className="inline mr-1 -mt-0.5"/>Flatten (⨁)</span>
                             <DimBadge text="[B, L, E_D]" active={isConcatActive} posClasses="-right-16 top-1/2 -translate-y-1/2" />
                           </div>

                           <div className={`h-3 w-0.5 my-0.5 transition-colors ${isConcatActive ? tColor.main : 'bg-slate-300'}`}></div>

                           <div className={`w-[80%] flex flex-col items-center transition-all duration-500 z-10 ${isConcatActive ? 'scale-110' : ''}`}>
                             <div className={`flex gap-[2px] w-full h-4 shadow-sm p-[2px] border rounded transition-colors duration-500
                                ${isConcatActive ? `bg-white border-${item.color}-300` : 'bg-slate-100 border-slate-200'}`}>
                               {Array.from({length: 8}).map((_, i) => (
                                  <div key={i} className={`flex-1 rounded-[1px] transition-colors duration-500 ${isConcatActive ? tColor.main : 'bg-slate-200'}`} />
                               ))}
                             </div>
                             <div className={`text-[12px] font-bold mt-1 transition-colors ${isConcatActive ? lColor.text : 'text-slate-400'}`}>E<sub>t,{item.n}</sub></div>
                           </div>
                         </div>
                      </div>
                    )
                  })}
                </div>
             </div>

             {/* BRIDGE 1：无遮挡数据总线 (Top-Down Flow) */}
             <div className="w-full max-w-4xl relative h-12 z-40 -my-1">
               {/* Indigo (Left) routes Down, Right, then Down to 75% column */}
               <VLine left="25%" top="0" bottom="50%" active={step>=5} color="indigo" />
               <HLine left="25%" width="50%" top="50%" active={step>=5} color="indigo" />
               <VLine left="75%" top="50%" bottom="0" active={step>=5} color="indigo" />
               <Arrow left="75%" top="40px" dir="down" active={step>=5} color="indigo" />
               
               {/* Purple (Right) straight Down */}
               <VLine left="75%" top="0" bottom="0" active={step>=5} color="purple" />
               <Arrow left="75%" top="40px" dir="down" active={step>=5} color="purple" />
             </div>

             {/* ======================================================= */}
             {/* [层层下落] 3: Context-aware Gating (翻转坐标系) */}
             {/* ======================================================= */}
             <div className={`w-full max-w-4xl border rounded-2xl px-2 py-6 transition-all duration-700 relative z-30
                ${step >= 6 ? 'bg-slate-50 border-blue-200 shadow-md' : 'bg-slate-50/50 border-slate-200 opacity-40'}`}>
                
                <div className="absolute -top-3 left-6 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded shadow-sm z-40">
                  Context-aware Gating
                </div>

                <div className="relative w-full h-[600px] mt-4">
                    {/* ====== 严格正交路由连线层 (自上而下) ====== */}
                    
                    {/* Trunk: H_in (y=80) down to Add (y=480) */}
                    <VLine left="10%" top="80px" height="400px" active={step>=6} color="blue" />
                    <Arrow left="10%" top="280px" dir="down" active={step>=6} color="blue" />
                    
                    {/* H_in Bypass (y=320) to Norm1 */}
                    <HLine left="10%" width="7%" top="320px" active={step>=7} color="blue" />
                    <Arrow left="14%" top="320px" dir="right" active={step>=7} color="blue" />
                    <HLine left="17%" width="8%" top="320px" active={step>=7} color="blue" />
                    <Arrow left="21%" top="320px" dir="right" active={step>=7} color="blue" />

                    {/* E_t (y=80) down to MatMul_V (y=180) */}
                    <VLine left="75%" top="80px" height="100px" active={step>=6} color="emerald" />
                    <Arrow left="75%" top="130px" dir="down" active={step>=6} color="emerald" />

                    {/* E_t bypass left to MatMul_K */}
                    <HLine left="45%" width="30%" top="80px" active={step>=6} color="amber" />
                    <Arrow left="60%" top="80px" dir="left" active={step>=6} color="amber" />
                    <VLine left="45%" top="80px" height="100px" active={step>=6} color="amber" />
                    <Arrow left="45%" top="130px" dir="down" active={step>=6} color="amber" />

                    <HLine left="33%" width="12%" top="180px" active={step>=6} color="amber" />
                    <Arrow left="39%" top="180px" dir="right" active={step>=6} color="amber" />

                    <VLine left="45%" top="180px" height="80px" active={step>=6} color="amber" />
                    <Arrow left="45%" top="220px" dir="down" active={step>=6} color="amber" />

                    <HLine left="75%" width="12%" top="180px" active={step>=6} color="emerald" />
                    <Arrow left="81%" top="180px" dir="left" active={step>=6} color="emerald" />

                    <VLine left="75%" top="180px" height="80px" active={step>=6} color="emerald" />
                    <Arrow left="75%" top="220px" dir="down" active={step>=6} color="emerald" />

                    <VLine left="45%" top="260px" height="60px" active={step>=7} color="amber" />
                    <HLine left="35%" width="10%" top="320px" active={step>=7} color="amber" />
                    <Arrow left="45%" top="290px" dir="down" active={step>=7} color="amber" />
                    <Arrow left="40%" top="320px" dir="left" active={step>=7} color="amber" />

                    <HLine left="25%" width="10%" top="320px" active={step>=7} color="amber" />
                    <Arrow left="30%" top="320px" dir="left" active={step>=7} color="amber" />

                    <VLine left="25%" top="320px" height="70px" active={step>=7} color="rose" />
                    <Arrow left="25%" top="355px" dir="down" active={step>=7} color="rose" />

                    <HLine left="25%" width="50%" top="390px" active={step>=7} color="rose" />
                    <Arrow left="50%" top="390px" dir="right" active={step>=7} color="rose" />

                    <VLine left="75%" top="260px" height="130px" active={step>=7} color="emerald" />
                    <Arrow left="75%" top="325px" dir="down" active={step>=7} color="emerald" />

                    <VLine left="75%" top="390px" height="90px" active={step>=7} color="emerald" />
                    <Arrow left="75%" top="435px" dir="down" active={step>=7} color="emerald" />

                    <HLine left="45%" width="30%" top="480px" active={step>=8} color="emerald" />
                    <Arrow left="60%" top="480px" dir="left" active={step>=8} color="emerald" />

                    <HLine left="10%" width="35%" top="480px" active={step>=8} color="indigo" />
                    <Arrow left="27%" top="480px" dir="left" active={step>=8} color="indigo" />

                    <VLine left="10%" top="480px" height="80px" active={step>=8} color="blue" />
                    <Arrow left="10%" top="520px" dir="down" active={step>=8} color="blue" />

                    {/* ====== 张量实体与算子层 (Y坐标全翻转) ====== */}
                    <LayeredTensor label={<span>H<sub>in</sub></span>} dim="[B, L, HC, D]" color="blue" active={step>=6} left="10%" top="80px" wClass="w-12" hClass="h-16" badgePos="-top-6 left-1/2 -translate-x-1/2" />
                    <SplicedFlatTensor label={<span>E<sub>t</sub></span>} dim="[B, L, E_D]" active={step>=5} left="75%" top="80px" wClass="w-24" hClass="h-16" badgePos="-right-[85px] top-1/2 -translate-y-1/2" />

                    <LayeredTensor label={<span>W<sub>K</sub></span>} dim="[HC, E_D, D]" color="amber" active={step>=6} left="33%" top="180px" wClass="w-12" hClass="h-24" badgePos="-left-[85px] top-1/2 -translate-y-1/2" />
                    <OpNode label="⊗" subLabel="MatMul" subLabelPos="right" isCircle active={step>=6} color="amber" left="45%" top="180px" textClass="text-xl" />
                    
                    <OpNode label="⊗" subLabel="MatMul" subLabelPos="left" isCircle active={step>=6} color="emerald" left="75%" top="180px" textClass="text-xl" />
                    <FlatTensor label={<span>W<sub>V</sub></span>} dim="[E_D, D]" color="emerald" active={step>=6} left="87%" top="180px" wClass="w-12" hClass="h-24" badgePos="-right-[65px] top-1/2 -translate-y-1/2" />

                    <LayeredTensor label={<span>K<sub>t</sub></span>} dim="[B, L, HC, D]" color="amber" active={step>=6} left="45%" top="260px" wClass="w-12" hClass="h-16" badgePos="-right-[85px] top-1/2 -translate-y-1/2" />
                    <FlatTensor label={<span>V<sub>t</sub></span>} dim="[B, L, D]" color="emerald" active={step>=6} left="75%" top="260px" wClass="w-12" hClass="h-16" badgePos="-right-[65px] top-1/2 -translate-y-1/2" />

                    <OpNode label="RMSNorm" active={step>=7} color="blue" left="17%" top="320px" textClass="text-[9px]" />
                    <OpNode label="∑" subLabel="Dot ➔ sgn√ ➔ σ" subLabelPos="top" isCircle active={step>=7} color="rose" left="25%" top="320px" textClass="text-xl" />
                    <OpNode label="RMSNorm" active={step>=7} color="amber" left="35%" top="320px" textClass="text-[9px]" />

                    <LayeredTensor label={<span>α<sub>t</sub></span>} dim="[B, L, HC, 1]" color="rose" active={step>=7} left="25%" top="390px" wClass="w-6" hClass="h-16" badgePos="-left-[80px] top-1/2 -translate-y-1/2" />
                    <OpNode label="×" subLabel="Broadcast" subLabelPos="right" isCircle active={step>=7} color="emerald" left="75%" top="390px" textClass="text-xl" />

                    <LayeredTensor label={<span>Ṽ<sub>t</sub></span>} dim="[B, L, HC, D]" color="emerald" active={step>=7} left="75%" top="480px" wClass="w-12" hClass="h-16" badgePos="-right-[85px] top-1/2 -translate-y-1/2" />

                    <div className={`absolute flex flex-col items-center justify-center transition-all duration-500 z-20 ${step >= 8 ? 'scale-110' : 'scale-90 opacity-60'}`} style={{ left: '45%', top: '480px', transform: 'translate(-50%, -50%)' }}>
                       <div className={`w-36 h-12 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.5)] border-2 flex flex-col items-center justify-center transition-colors duration-500 ${step >= 8 ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-50 border-slate-300 text-slate-400 shadow-none'}`}>
                          <div className="flex gap-1 mb-1">
                             <span className={`text-[8px] px-1 py-0.5 rounded ${step >= 8 ? 'bg-indigo-400' : 'bg-slate-200 text-slate-500'}`}>RMSNorm</span>
                             <span className={`text-[8px] px-1 py-0.5 rounded ${step >= 8 ? 'bg-indigo-400' : 'bg-slate-200 text-slate-500'}`}>SiLU</span>
                          </div>
                          <span className="text-[11px] font-bold"><Activity size={10} className="inline mr-1 -mt-0.5"/>Conv1D</span>
                       </div>
                       <DimBadge text="[B, L, HC, D]" active={step >= 8} posClasses="-bottom-6 left-1/2 -translate-x-1/2" />
                    </div>

                    <OpNode label="+" subLabel="Residual" subLabelPos="left" isCircle active={step>=8} color="blue" left="10%" top="480px" textClass="text-xl" />
                    
                    <LayeredTensor label={<span>H<sub>out</sub></span>} dim="[B, L, HC, D]" color="blue" active={step>=8} left="10%" top="560px" wClass="w-12" hClass="h-16" badgePos="-bottom-6 left-1/2 -translate-x-1/2" />
                </div>
             </div>

           </div>
          </div>

          {/* 3. Engram 伪代码深度展开 */}
          <div className="xl:col-span-4 bg-[#1E1E1E] rounded-2xl border border-slate-700 shadow-xl flex flex-col overflow-hidden h-full min-h-[700px]">
           <div className="bg-[#2D2D2D] px-4 py-3 flex items-center justify-between border-b border-slate-700">
             <div className="flex items-center gap-3">
               <div className="flex gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
               </div>
               <span className="text-slate-300 text-xs font-mono flex items-center gap-1.5"><FileCode2 size={14} className="text-blue-400"/> engram_forward.py</span>
             </div>
             <span className="text-[9px] text-slate-500 font-mono">Python Tracer</span>
           </div>
           
           <div className="py-3 overflow-y-auto flex-1 custom-scrollbar">
              <CodeLine num="1" active={false} indent={0}>
                <span className="text-purple-400">def</span> <span className="text-blue-400">forward</span>(self, hidden_states, input_ids):
              </CodeLine>
              <CodeLine num="2" active={step === 1} indent={1}>
                <span className="text-slate-500 italic"># 1. 滑动窗口提取多尺度 N-Gram 上下文</span>
              </CodeLine>
              <CodeLine num="3" active={step === 1} indent={1}>
                g_t = <span className="text-blue-200">dict</span>()
              </CodeLine>
              <CodeLine num="4" active={step === 1} indent={1}>
                <span className="text-purple-400">for</span> n <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(2, max_n + 1):
              </CodeLine>
              <CodeLine num="5" active={step === 1} indent={2}>
                g_t[n] = extract_ngram_window(input_ids, n)
              </CodeLine>
              <CodeLine num="6" active={false} indent={0}></CodeLine>
              
              <CodeLine num="7" active={step === 2} indent={1}>
                <span className="text-slate-500 italic"># 2. 深度展开: 多头异或哈希计算</span>
              </CodeLine>
              <CodeLine num="8" active={step === 2} indent={1}>
                hash_idx = torch.<span className="text-amber-200">zeros</span>(B, L, max_n, num_heads)
              </CodeLine>
              <CodeLine num="9" active={step === 2} indent={1}>
                <span className="text-purple-400">for</span> n <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(2, max_n + 1):
              </CodeLine>
              <CodeLine num="10" active={step === 2} indent={2}>
                <span className="text-slate-500 italic"># 逐位异或混合 Token 与随机乘子</span>
              </CodeLine>
              <CodeLine num="11" active={step === 2} indent={2}>
                mix = g_t[n][0] * M[n][0]
              </CodeLine>
              <CodeLine num="12" active={step === 2} indent={2}>
                <span className="text-purple-400">for</span> i <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(1, n):
              </CodeLine>
              <CodeLine num="13" active={step === 2} indent={3}>
                mix = torch.<span className="text-amber-200">bitwise_xor</span>(mix, g_t[n][i] * M[n][i])
              </CodeLine>
              <CodeLine num="14" active={step === 2} indent={2}>
                <span className="text-slate-500 italic"># 多头并行素数取模</span>
              </CodeLine>
              <CodeLine num="15" active={step === 2} indent={2}>
                <span className="text-purple-400">for</span> k <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(num_heads):
              </CodeLine>
              <CodeLine num="16" active={step === 2} indent={3}>
                hash_idx[:,:,n,k] = mix % primes[n][k]
              </CodeLine>
              <CodeLine num="17" active={false} indent={0}></CodeLine>

              <CodeLine num="18" active={step >= 3 && step <= 4} indent={1}>
                <span className="text-slate-500 italic"># 3~4. 并行查表提取头向量</span>
              </CodeLine>
              <CodeLine num="19" active={step >= 3 && step <= 4} indent={1}>
                embeddings = []
              </CodeLine>
              <CodeLine num="20" active={step >= 3 && step <= 4} indent={1}>
                <span className="text-purple-400">for</span> n <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(2, max_n + 1):
              </CodeLine>
              <CodeLine num="21" active={step >= 3 && step <= 4} indent={2}>
                <span className="text-purple-400">for</span> k <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(num_heads):
              </CodeLine>
              <CodeLine num="22" active={step >= 3 && step <= 4} indent={3}>
                tab = self.embed_tables[n][k]
              </CodeLine>
              <CodeLine num="23" active={step >= 3 && step <= 4} indent={3}>
                embeddings.append(tab(hash_idx[...,n,k]))
              </CodeLine>
              <CodeLine num="24" active={false} indent={0}></CodeLine>

              <CodeLine num="25" active={step === 5} indent={1}>
                <span className="text-slate-500 italic"># 5. 维度展平汇聚</span>
              </CodeLine>
              <CodeLine num="26" active={step === 5} indent={1}>
                E_t = torch.<span className="text-amber-200">cat</span>(embeddings, dim=-1)
              </CodeLine>
              <CodeLine num="27" active={false} indent={0}></CodeLine>

              <CodeLine num="28" active={step === 6 || step === 7} indent={1}>
                <span className="text-slate-500 italic"># 6~7. 依赖建模与动态门控</span>
              </CodeLine>
              <CodeLine num="29" active={step === 6 || step === 7} indent={1}>
                <span className="text-purple-400">for</span> hc <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(self.hc_mult):
              </CodeLine>
              <CodeLine num="30" active={step === 6} indent={2}>
                K_t = self.W_K[hc](E_t)
              </CodeLine>
              <CodeLine num="31" active={step === 6} indent={2}>
                V_t = self.W_V(E_t)
              </CodeLine>
              <CodeLine num="32" active={step === 7} indent={2}>
                norm_K = self.norm1[hc](K_t)
              </CodeLine>
              <CodeLine num="33" active={step === 7} indent={2}>
                norm_Q = self.norm2[hc](hidden[:,:,hc,:])
              </CodeLine>
              <CodeLine num="34" active={step === 7} indent={2}>
                gt = (norm_K * norm_Q).<span className="text-amber-200">sum</span>(-1) / <span className="text-amber-200">sqrt</span>(D)
              </CodeLine>
              <CodeLine num="35" active={step === 7} indent={2}>
                gt = gt.<span className="text-amber-200">abs</span>().<span className="text-amber-200">sqrt</span>() * gt.<span className="text-amber-200">sign</span>()
              </CodeLine>
              <CodeLine num="36" active={step === 7} indent={2}>
                gates.append(gt.<span className="text-amber-200">sigmoid</span>().<span className="text-amber-200">unsqueeze</span>(-1))
              </CodeLine>
              <CodeLine num="37" active={false} indent={0}></CodeLine>
              
              <CodeLine num="38" active={step === 7} indent={1}>
                V_tilde = gates * V_t.<span className="text-amber-200">unsqueeze</span>(2)
              </CodeLine>
              <CodeLine num="39" active={false} indent={0}></CodeLine>

              <CodeLine num="40" active={step === 8} indent={1}>
                <span className="text-slate-500 italic"># 8. 跨时间步平滑与残差相加</span>
              </CodeLine>
              <CodeLine num="41" active={step === 8} indent={1}>
                Y = V_tilde + self.short_conv(V_tilde)
              </CodeLine>
              <CodeLine num="42" active={false} indent={0}></CodeLine>

              <CodeLine num="43" active={step === 9} indent={1}>
                <span className="text-slate-500 italic"># 9. 融合输出传递</span>
              </CodeLine>
              <CodeLine num="44" active={step === 9} indent={1}>
                <span className="text-purple-400">return</span> Y
              </CodeLine>
           </div>
          </div>

        </div>

        {/* ======================================================= */}
        {/* 第二行：时间轴 满宽 */}
        {/* ======================================================= */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col relative mt-6">
            <div className="flex items-center mb-6 pb-3 border-b border-slate-100">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                 <Clock className="text-blue-500" size={20}/> 
                 硬件系统级异步预取时间轴
               </h2>
            </div>
            
            <div className="flex flex-col gap-5 w-full justify-center flex-1">
               {/* Timeline markers */}
               <div className="flex justify-between text-[11px] font-bold text-slate-400 pl-[90px] pr-2">
                  <span className={`transition-colors duration-500 ${step >= 1 ? 'text-slate-700' : ''}`}>T₀ 序列输入</span>
                  <span className={`transition-colors duration-500 ${step >= 2 ? 'text-slate-700' : ''}`}>T₁ 异步并行预取</span>
                  <span className={`transition-colors duration-500 ${step >= 6 ? 'text-slate-700' : ''}`}>T₂ 通信与同步</span>
                  <span className={`transition-colors duration-500 ${step >= 8 ? 'text-slate-700' : ''}`}>T₃ 特征融合</span>
               </div>
               
               {/* CPU Row */}
               <div className="flex items-center gap-3">
                  <div className="w-20 shrink-0 font-bold text-[11px] text-slate-600 flex flex-col items-center">
                     <HardDrive size={22} className="mb-1 text-slate-500"/> 
                     <span>CPU / Host</span>
                  </div>
                  <div className="flex-1 flex gap-1 h-14 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
                     <div className={`flex-[0.5] rounded flex items-center justify-center text-[10px] font-bold transition-all duration-500 
                        ${step === 1 ? 'bg-slate-300 text-slate-600 shadow-sm scale-[1.02]' : step > 1 ? 'bg-slate-200 text-slate-400' : 'bg-transparent text-transparent'}`}>
                        数据准备
                     </div>
                     <div className={`flex-[1.5] rounded flex items-center justify-center text-[10px] font-bold transition-all duration-500 
                        ${step >= 2 && step <= 5 ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] scale-[1.02] z-10' : step > 5 ? 'bg-purple-100 border border-purple-200 text-purple-400' : 'bg-transparent text-transparent'}`}>
                        计算 Hash 与并行查表 (T1)
                     </div>
                     <div className={`flex-[1.5] rounded flex items-center justify-center text-[10px] font-bold transition-all duration-500 
                        ${step >= 4 && step <= 5 ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)] animate-pulse scale-[1.02] z-10' : step > 5 ? 'bg-indigo-100 border border-indigo-200 text-indigo-400' : 'bg-transparent text-transparent'}`}>
                        PCIe 异步传输
                     </div>
                     <div className="flex-[2] rounded bg-transparent border border-dashed border-slate-200"></div>
                  </div>
               </div>
               
               {/* GPU Row */}
               <div className="flex items-center gap-3">
                  <div className="w-20 shrink-0 font-bold text-[11px] text-slate-600 flex flex-col items-center">
                     <MemoryStick size={22} className="mb-1 text-blue-500"/> 
                     <span>GPU / Device</span>
                  </div>
                  <div className="flex-1 flex gap-1 h-14 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
                     <div className={`flex-[0.5] rounded flex items-center justify-center text-[10px] font-bold transition-all duration-500 
                        ${step === 1 ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)] scale-[1.02] z-10' : step > 1 ? 'bg-rose-100 border border-rose-200 text-rose-400' : 'bg-transparent text-transparent'}`}>
                        Vocab / Block 0
                     </div>
                     <div className={`flex-[3.0] rounded flex items-center justify-center text-[10px] font-bold transition-all duration-500 
                        ${step >= 2 && step <= 5 ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)] scale-[1.02] z-10' : step > 5 ? 'bg-amber-100 border border-amber-200 text-amber-400' : 'bg-transparent text-transparent'}`}>
                        前置 Transformer Block 计算 (完全掩盖 CPU 传输延迟)
                     </div>
                     <div className={`flex-[1.5] rounded flex items-center justify-center text-[10px] font-bold transition-all duration-500 
                        ${step >= 6 && step <= 8 ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)] scale-[1.02] z-10' : step > 8 ? 'bg-blue-100 border border-blue-200 text-blue-400' : 'bg-transparent text-transparent'}`}>
                        Engram 门控融合
                     </div>
                     <div className={`flex-[0.5] rounded flex items-center justify-center text-[10px] font-bold transition-all duration-500 
                        ${step === 9 ? 'bg-slate-700 text-white shadow-[0_0_10px_rgba(51,65,85,0.5)] scale-[1.02] z-10' : 'bg-transparent text-transparent border border-dashed border-slate-200'}`}>
                        后续计算
                     </div>
                  </div>
               </div>
            </div>
        </div>

        {/* ======================================================= */}
        {/* 第三行：数学推导 满宽 */}
        {/* ======================================================= */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col relative mt-6">
           <div className="flex items-center mb-6 pb-3 border-b border-slate-100">
             <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
               <Calculator className="text-emerald-600" size={20}/>
               Engram 数学原理与维度推导
             </h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              {/* 阶段 1 */}
              <div className="flex flex-col gap-2">
                 <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px]">Phase 1</span> 记忆路由与特征检索</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   获取后缀 N-Gram，并通过多头乘法异或定位内存槽位，直接展平无需线性层。
                 </p>
                 <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg font-serif italic text-xs text-slate-700 space-y-2 shadow-sm mt-auto">
                    <div>1. <span className="text-slate-500 ml-1">g<sub>t,n</sub> = (x'<sub>t-n+1</sub>, ..., x'<sub>t</sub>)</span></div>
                    <div>2. <span className="text-slate-500 ml-1">H<sub>k</sub> = ⨁(g<sub>i</sub> × M<sub>i</sub>) % P<sub>k</sub></span></div>
                    <div className="pt-2 border-t border-slate-200 text-purple-700 font-bold">
                       E<sub>t</sub> = Flatten(E<sub>n,k</sub>[H<sub>k</sub>]) &isin; <span className="text-[10px] font-mono text-purple-500">&reals;<sup>B&times;L&times;E_D</sup></span>
                    </div>
                 </div>
              </div>

              {/* 阶段 2 */}
              <div className="flex flex-col gap-2">
                 <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px]">Phase 2</span> 依赖建模与动态门控</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   按 Hyper-Connection(HC) 切分。引入双侧 RMSNorm 与 <span className="font-mono bg-slate-200 px-1 rounded">sgn(x)√|x|</span> 平方根缩放解决内积数值爆炸。
                 </p>
                 <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg font-serif italic text-[11px] text-slate-700 space-y-2 shadow-sm mt-auto">
                    <div>1. <span className="text-slate-500 ml-1">K<sub>t</sub><sup>(c)</sup> = W<sub>K</sub><sup>(c)</sup> E<sub>t</sub>, V<sub>t</sub> = W<sub>V</sub> E<sub>t</sub></span></div>
                    <div className="pt-1">2. <span className="text-rose-600 font-bold ml-1">&alpha;<sub>t</sub><sup>(c)</sup> = &sigma; <Big>(</Big> sgn(x)&radic;<span className="border-l border-r border-rose-400 mx-px px-[1px]">x</span> <Big>)</Big></span></div>
                    <div className="pl-4 text-[10px] text-slate-400">其中 <span className="text-slate-500">x = &lang;Norm(H<sub>in</sub><sup>(c)</sup>), Norm(K<sub>t</sub><sup>(c)</sup>)&rang; / &radic;D</span></div>
                    <div className="pt-2 border-t border-slate-200 text-emerald-700 font-bold text-xs">
                       V&#772;<sub>t</sub> = &alpha;<sub>t</sub> &middot; V<sub>t</sub> &isin; <span className="text-[10px] font-mono text-emerald-500">&reals;<sup>B&times;L&times;HC&times;D</sup></span>
                    </div>
                 </div>
              </div>

              {/* 阶段 3 */}
              <div className="flex flex-col gap-2">
                 <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px]">Phase 3</span> 时序平滑与状态融合</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   门控后的特征序列再经过组内 RMSNorm 后，送入短上下文 1D 卷积进行平滑与残差相加。
                 </p>
                 <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg font-serif italic text-[12px] text-slate-700 space-y-2 shadow-sm mt-auto">
                    <div>1. <span className="text-slate-500 ml-1">V&#771; = [V&#772;<sub>1</sub>, ..., V&#772;<sub>T</sub>]</span></div>
                    <div className="pt-1">2. <span className="text-emerald-700 font-bold ml-1">Y = SiLU(Conv1D(<span className="text-indigo-600">Norm(V&#771;)</span>)) + V&#771;</span></div>
                    <div className="pt-2 border-t border-slate-200 text-blue-700 font-bold">
                       H<sub>out</sub> = H<sub>in</sub> + Y &isin; <span className="text-[10px] font-mono text-blue-500">&reals;<sup>B&times;L&times;HC&times;D</sup></span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default App;
