import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Database, Network, GitMerge, Trash2, Code, Activity, Lock, Unlock, ArrowDownToLine, Grid2X2, SplitSquareHorizontal, Info } from 'lucide-react';

const i18n = {
  zh: {
    title: 'Radix Cache 原理全景可视化',
    subtitle: 'SGLang: 基于基数树的 Prompt 全局共享与动态物理显存管理',
    langToggle: 'EN',
    standard: '标准 KV Cache',
    radix: 'Radix Cache (树形)',
    reset: '重置',
    pause: '暂停',
    replay: '重播',
    play: '播放',
    next: '下一步',
    
    // Steps
    step0: '等待请求接入...',
    step1: '1. 请求 A 到达 (前缀 + 后缀 A)',
    step2: '2. 请求 A 完成 (解除锁定，保留物理缓存)',
    step3: '3. 请求 B 到达 (相同前缀 + 新后缀 B)',
    step4: '4. 前缀匹配与动态分裂 (Lazy Splitting)',
    step5: '5. 挂载后缀并复用物理块 (零显存冗余)',
    step6: '6. 请求 C 到达 (全新请求，无复用)',
    step7: '7. 显存告急！触发 Evict (淘汰) 机制',
    step8: '8. 驱逐无引用的 LRU 叶子节点 (释放物理块)',
    step9: '9. 级联检查 (No Merge): 保留单链，父节点若空则入堆',
    
    // UI Elements
    memUsage: '显存池占用 (物理块)',
    lockRef: '引用锁',
    hitRate: '全局命中率',
    savedMem: '节省显存块',
    logicalLayout: '逻辑层：Memory Layout',
    physicalPool: '物理层：底层 KV Cache 显存池',
    underlyingCode: 'Python 伪代码与核心数据结构',
    principleAnalysis: '深度原理解析',
    incomingReq: '待处理请求流 (Incoming Requests)',
    split: '分裂',
    merge: '合并',
    waiting: '等待中...',
    prefixNode: '共享前缀',
    reqASuffix: 'Req A 后缀',
    reqBSuffix: 'Req B 后缀',
    reqBMerged: 'Req B (合并)',
    reqA: '请求 A',
    reqB: '请求 B',
    reqC: '请求 C',
    blks: '块',
    tokens: '词元',
    pyComment1: '# 线性分配物理块，完全隔离无复用',
    pyComment2: '# 再次分配，前缀部分的物理块完全重复冗余',
    pyComment3: '# 从树根遍历，寻找最长匹配的前缀 Token 序列',
    pyComment4: '# 命中部分 Token，按 prefix_len 切分原节点的 key 和 value',
    pyComment5: '# 将新请求的后缀挂载，底层物理块不再重复申请',
    pyComment6: '# 显存不足，从可驱逐堆中弹出最少使用的节点并释放物理块',
    pyComment9: '# SGLang不主动合并，仅当父节点变为空叶子时入堆',
    
    // Deep Dive
    memWallTitle: '传统 KV Cache 的显存黑洞',
    memWallDesc: '在并发请求中，多个请求往往共享相同的 System Prompt 或长文档（如 RAG 场景）。传统的 KV Cache 为每个请求独立分配连续的物理显存块，导致大量完全相同的 KV Tensor 冗余，极大地限制了并发量（Batch Size）。',
    radixTreeTitle: '1. 基数树 (Radix Tree) 逻辑共享',
    radixTreeDesc: '将 KV Cache 升级为全局树。具有相同 Token ID 前缀的请求在物理显存中只存一份，后续请求的逻辑节点直接将指针映射到已有的物理块（PagedAttention）上，实现零额外开销。',
    lazySplitTitle: '2. 动态分裂 (Lazy Splitting)',
    lazySplitDesc: '为了减少树的层级开销，多个 Token 被压缩在同一个节点中。当新请求的 Token 序列只匹配了当前节点的前半部分时，系统会动态调用 _split_node 将其切分成两个节点，这保证了最细粒度的复用且不产生数据搬运。',
    evictTitle: '3. 引用计数与物理块回收',
    evictDesc: '引入 lock_ref 机制。当请求正在处理时，路径节点加锁（物理块受保护）。请求结束，锁释放。当显存池告急时，系统根据 LRU 策略，从底层“叶子节点”向上修剪，调用 allocator.free 真正释放物理显存块。',
  },
  en: {
    title: 'Radix Cache Principle Visualization',
    subtitle: 'SGLang: Global Prompt Sharing & Dynamic VRAM Management',
    langToggle: '中文',
    standard: 'Standard KV Cache',
    radix: 'Radix Cache (Tree)',
    reset: 'Reset',
    pause: 'Pause',
    replay: 'Replay',
    play: 'Play',
    next: 'Next',
    
    step0: 'Waiting for requests...',
    step1: '1. Req A Arrives (Prefix + Suffix A)',
    step2: '2. Req A Finishes (Unlocked, keep blocks)',
    step3: '3. Req B Arrives (Same Prefix + New Suffix B)',
    step4: '4. Prefix Match & Lazy Splitting',
    step5: '5. Mount Suffix & Reuse Blocks (Zero Redundancy)',
    step6: '6. Req C Arrives (New Request, No Match)',
    step7: '7. OOM Warning! Trigger Evict Mechanism',
    step8: '8. Evict Unreferenced LRU Leaf (Free blocks)',
    step9: '9. Cascade Check (No Merge): Push parent if it becomes empty',
    
    memUsage: 'Memory Pool (Blocks)',
    lockRef: 'Lock Ref',
    hitRate: 'Cache Hit Rate',
    savedMem: 'Saved Blocks',
    logicalLayout: 'Logical: Memory Layout',
    physicalPool: 'Physical: Underly KV Cache Pool',
    underlyingCode: 'Python Pseudocode & Core Structures',
    principleAnalysis: 'Deep Principle Analysis',
    incomingReq: 'Incoming Requests Stream',
    split: 'Split',
    merge: 'Merge',
    waiting: 'Waiting...',
    prefixNode: 'Prefix Node',
    reqASuffix: 'Req A Suffix',
    reqBSuffix: 'Req B Suffix',
    reqBMerged: 'Req B (Merged)',
    reqA: 'Req A',
    reqB: 'Req B',
    reqC: 'Req C',
    blks: 'Blks',
    tokens: 'Tokens',
    pyComment1: '# Linear block allocation, isolated, no reuse',
    pyComment2: '# Allocate again, prefix blocks are entirely duplicated',
    pyComment3: '# Traverse from root to find longest matching prefix tokens',
    pyComment4: '# Partial match found, execute lazy split on node.key and node.value',
    pyComment5: '# Mount new suffix, underlying physical blocks are NOT duplicated',
    pyComment6: '# OOM: pop least used node from heap and free physical blocks',
    pyComment9: '# SGLang skips merge, pushes parent to heap if childless',
    
    memWallTitle: 'The Memory Black Hole of Traditional KV Cache',
    memWallDesc: 'In concurrent requests, many share the same System Prompt or long documents (e.g., RAG). Traditional KV Cache allocates independent memory blocks for each request, causing massive redundancy of identical KV Tensors, severely limiting concurrency (Batch Size).',
    radixTreeTitle: '1. Radix Tree Logical Sharing',
    radixTreeDesc: 'Upgrades to a global tree. Requests with identical Token ID prefixes store only one physical copy. Subsequent requests directly map their logical node pointers to existing physical blocks (PagedAttention), achieving zero-overhead reuse.',
    lazySplitTitle: '2. Lazy Splitting',
    lazySplitDesc: 'To reduce tree hierarchy overhead, multiple tokens are compressed into a single node. When a new request matches only the first half of a node, the system dynamically calls _split_node to divide it into two. This ensures fine-grained reuse without data moving.',
    evictTitle: '3. Ref Counting & Physical Reclaim',
    evictDesc: 'Introduces lock_ref. Nodes are locked (blocks protected) while a request processes and unlocked when done. When memory is low, LRU strategies prune from "leaf nodes" up, calling allocator.free to physically reclaim VRAM blocks.',
  }
};

const getInitialLang = () => (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().includes('zh') ? 'zh' : 'en');

// ==========================================
// Strict Ratio: 4 Tokens = 1 Block
// ==========================================
const PREFIX_TOKENS = '[1, 93, 24, 15, 8, 304, 11, 42'; // 8 tokens (2 Blocks)
const SUFFIX_A_TOKENS = ', 19, 7, 501, 8]'; // 4 tokens (1 Block)
const SUFFIX_B_TOKENS = ', 66, 31, 9, 102]'; // 4 tokens (1 Block)
const REQC_TOKENS = '[55, 91, 19, 23, 77, 88, 12, 34]'; // 8 tokens (2 Blocks)

const REQS = {
  A: { full: PREFIX_TOKENS + SUFFIX_A_TOKENS, color: 'emerald', blocks: 3, prefixBlocks: 2, suffixBlocks: 1, tkCount: 12 },
  B: { full: PREFIX_TOKENS + SUFFIX_B_TOKENS, color: 'amber', blocks: 3, prefixBlocks: 2, suffixBlocks: 1, tkCount: 12 },
  C: { full: REQC_TOKENS, color: 'rose', blocks: 2, prefixBlocks: 0, suffixBlocks: 2, tkCount: 8 }
};

const TOTAL_BLOCKS = 10;

const App = () => {
  const [modelType, setModelType] = useState('radix'); 
  const [step, setStep] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState(getInitialLang());
  const t = (k) => i18n[lang][k] ?? k;

  // Derive block states from current step and modelType
  const getBlockStates = () => {
    let blocks = Array(TOTAL_BLOCKS).fill({ status: 'empty' });
    let usedCount = 0;
    let savedCount = 0;

    if (modelType === 'standard') {
      let cursor = 0;
      if (step >= 1) { // Req A (3 blocks)
        for(let i=0; i<REQS.A.blocks; i++) {
          blocks[cursor] = { status: 'used', color: i < REQS.A.prefixBlocks ? 'indigo' : REQS.A.color, seq: 'A', locked: step === 1, idx: cursor };
          cursor++;
        }
      }
      if (step >= 3) { // Req B (3 blocks)
        for(let i=0; i<REQS.B.blocks; i++) {
          if (cursor < TOTAL_BLOCKS) {
             blocks[cursor] = { status: 'used', color: i < REQS.B.prefixBlocks ? 'indigo' : REQS.B.color, seq: 'B', locked: true, isDup: i < REQS.B.prefixBlocks, idx: cursor };
             cursor++;
          }
        }
      }
      if (step >= 6) { // Req C (2 blocks)
        for(let i=0; i<REQS.C.blocks; i++) {
          if (cursor < TOTAL_BLOCKS) {
            blocks[cursor] = { status: 'used', color: REQS.C.color, seq: 'C', locked: true, idx: cursor };
            cursor++;
          }
        }
      }
      usedCount = cursor;
    } else {
      // Radix Model
      let cursor = 0;
      if (step >= 1) {
        // Prefix (2 blocks)
        for(let i=0; i<REQS.A.prefixBlocks; i++) {
          const isLocked = step === 1 || step >= 5; 
          blocks[cursor] = { status: 'used', color: 'indigo', seq: 'P', locked: isLocked, idx: cursor };
          cursor++;
        }
        // Req A Suffix (1 block)
        for(let i=0; i<REQS.A.suffixBlocks; i++) {
           if (step < 8) { // if not evicted
             blocks[cursor] = { status: step === 7 ? 'targeted' : 'used', color: REQS.A.color, seq: 'A', locked: step === 1, idx: cursor };
           }
           cursor++; 
        }
      }
      if (step >= 5) { // Req B Suffix (1 block)
        for(let i=0; i<REQS.B.suffixBlocks; i++) {
          blocks[cursor] = { status: 'used', color: REQS.B.color, seq: 'B', locked: true, idx: cursor };
          cursor++;
        }
        savedCount = REQS.B.prefixBlocks; // Saved 2 blocks
      }
      if (step >= 6) { // Req C (2 blocks)
        for(let i=0; i<REQS.C.blocks; i++) {
          if (cursor < TOTAL_BLOCKS) {
             blocks[cursor] = { status: 'used', color: REQS.C.color, seq: 'C', locked: true, idx: cursor };
             cursor++;
          }
        }
      }
      
      usedCount = blocks.filter(b => b.status === 'used' || b.status === 'targeted').length;
    }

    const hitRate = savedCount > 0 ? ((savedCount / (usedCount + savedCount)) * 100).toFixed(1) + '%' : '0.0%';

    return { blocks, usedCount, savedCount, hitRate };
  };

  const pState = getBlockStates();

  // Define Tree Structure Data depending on step
  const getRadixTreeData = () => {
    if (step === 0) return { root: [] };
    
    if (step === 1 || step === 2) {
      return {
        root: [
          { 
            id: 'n1', 
            tokens: REQS.A.full, 
            label: t('reqA'),
            lock: step === 1 ? 1 : 0,
            active: step === 1,
            isNew: step === 1,
            color: 'indigo',
            blockRefs: [0, 1, 2]
          }
        ]
      };
    }

    if (step === 3) {
      return {
        root: [
          { 
            id: 'n1', 
            tokens: REQS.A.full, 
            label: t('reqA'),
            lock: 0,
            active: true, 
            highlightPrefix: true,
            color: 'indigo',
            blockRefs: [0, 1, 2]
          }
        ]
      };
    }

    if (step === 4 || step === 5) {
      return {
        root: [
          {
            id: 'n1a',
            tokens: PREFIX_TOKENS + ']',
            label: t('prefixNode'),
            lock: step === 5 ? 2 : 1, 
            active: true,
            splitAnim: step === 4,
            color: 'indigo',
            blockRefs: [0, 1],
            children: [
              { 
                id: 'n1b', 
                tokens: '[' + SUFFIX_A_TOKENS.substring(2),
                label: t('reqASuffix'),
                lock: 0, 
                active: false,
                color: REQS.A.color,
                blockRefs: [2]
              },
              ...(step === 5 ? [{
                id: 'n2',
                tokens: '[' + SUFFIX_B_TOKENS.substring(2),
                label: t('reqBSuffix'),
                lock: 1,
                active: true,
                isNew: true,
                color: REQS.B.color,
                blockRefs: [3]
              }] : [])
            ]
          }
        ]
      };
    }

    if (step >= 6 && step <= 8) {
      return {
        root: [
          {
            id: 'n1a',
            tokens: PREFIX_TOKENS + ']',
            label: t('prefixNode'),
            lock: 1, 
            active: false,
            color: 'indigo',
            blockRefs: [0, 1],
            children: [
              ...(step < 8 ? [{ 
                id: 'n1b', 
                tokens: '[' + SUFFIX_A_TOKENS.substring(2),
                label: t('reqASuffix'),
                lock: 0, 
                active: false,
                evictWarning: step === 7,
                color: REQS.A.color,
                blockRefs: [2]
              }] : []),
              {
                id: 'n2',
                tokens: '[' + SUFFIX_B_TOKENS.substring(2),
                label: t('reqBSuffix'),
                lock: 1,
                active: false,
                color: REQS.B.color,
                blockRefs: [3]
              }
            ]
          },
          {
            id: 'n3',
            tokens: REQS.C.full,
            label: t('reqC'),
            lock: 1,
            active: step === 6,
            isNew: step === 6,
            color: REQS.C.color,
            blockRefs: [4, 5]
          }
        ]
      };
    }

    if (step >= 9) {
      return {
        root: [
          {
            id: 'n1a',
            tokens: PREFIX_TOKENS + ']',
            label: t('prefixNode'),
            lock: 1, 
            active: true,
            color: 'indigo',
            blockRefs: [0, 1],
            children: [
              {
                id: 'n2',
                tokens: '[' + SUFFIX_B_TOKENS.substring(2),
                label: t('reqBSuffix'),
                lock: 1,
                active: true,
                color: REQS.B.color,
                blockRefs: [3]
              }
            ]
          },
          {
            id: 'n3',
            tokens: REQS.C.full,
            label: t('reqC'),
            lock: 1,
            active: false,
            color: 'rose',
            blockRefs: [4, 5]
          }
        ]
      };
    }

    return { root: [] };
  };

  const treeData = getRadixTreeData();

  // Auto playback logic
  useEffect(() => {
    let timer;
    if (isPlaying) {
      const maxSteps = modelType === 'standard' ? 6 : 9;
      if (step < maxSteps) {
        let delay = 3500;
        if (step === 4 || step === 7 || step === 8) delay = 2500; 
        timer = setTimeout(() => setStep(s => s + 1), delay);
      } else {
        setIsPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, step, modelType]);

  const handleModelTypeChange = (type) => {
    if (type !== modelType) {
      setModelType(type);
      setStep(0);
      setIsPlaying(false);
    }
  };

  const getStepText = () => t(`step${Math.min(step, modelType === 'standard' && step > 6 ? 6 : 9)}`);

  // Vertical Tree Node Renderer
  const TreeNode = ({ node, isFirst = false, isLast = false, hasSiblings = false }) => {
    const colorMap = {
      indigo: 'bg-indigo-50 border-indigo-300 text-indigo-800',
      emerald: 'bg-emerald-50 border-emerald-300 text-emerald-800',
      amber: 'bg-amber-50 border-amber-300 text-amber-800',
      rose: 'bg-rose-50 border-rose-300 text-rose-800',
    };
    
    return (
      <div className="flex flex-col items-center relative group animate-fade-in-fast">
        {/* Vertical line from horizontal branch to this node */}
        {!isRoot(node) && <div className="w-px h-6 bg-slate-300 absolute -top-6 left-1/2 -translate-x-1/2 z-0"></div>}
        
        {/* Horizontal branch lines handling dynamic widths perfectly */}
        {hasSiblings && isFirst && (
          <div className="absolute h-px bg-slate-300 -top-6 left-1/2 z-0" style={{ width: 'calc(50% + 1rem)' }}></div>
        )}
        {hasSiblings && isLast && (
          <div className="absolute h-px bg-slate-300 -top-6 right-1/2 z-0" style={{ width: 'calc(50% + 1rem)' }}></div>
        )}
        {hasSiblings && !isFirst && !isLast && (
          <div className="absolute h-px bg-slate-300 -top-6 left-[-1rem] right-[-1rem] z-0"></div>
        )}

        {/* Node Card */}
        <div className={`relative flex flex-col gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all duration-500 shadow-sm z-10 w-64 md:w-72 mt-0
          ${node.active ? 'ring-4 ring-indigo-500/20 scale-105' : ''}
          ${colorMap[node.color] || 'bg-white border-slate-200 text-slate-700'}
          ${node.lock > 0 ? 'border-t-4 border-t-emerald-500' : ''}
          ${node.evictWarning ? 'bg-rose-100 border-rose-500 text-rose-900 animate-pulse ring-4 ring-rose-500/30' : ''}
          ${node.isNew ? 'scale-[1.05] shadow-lg border-indigo-500' : 'scale-100'}
          ${node.splitAnim || node.mergeAnim ? 'border-dashed border-indigo-400' : ''}
        `}>
          {/* Split Icons floating out of the way */}
          {node.splitAnim && (
            <div className="absolute -top-4 -right-3 bg-white rounded-lg p-1.5 shadow-lg border-2 border-indigo-300 text-indigo-600 z-30 flex items-center gap-1 scale-90">
              <SplitSquareHorizontal size={12} className="rotate-90"/>
              <span className="text-[9px] font-black">{t('split')}</span>
            </div>
          )}

          {/* Main Label */}
          <div className="flex justify-between items-start">
            <span className={`font-mono text-xs font-bold leading-relaxed break-all ${node.highlightPrefix ? 'text-indigo-600' : ''}`}>
               {node.highlightPrefix ? (
                 <>
                   <span className="bg-indigo-100 px-1 py-0.5 rounded inline-block mb-1 border border-indigo-200">{PREFIX_TOKENS}</span>
                   <span className="opacity-40">{SUFFIX_A_TOKENS}</span>
                 </>
               ) : node.tokens}
            </span>
            {node.evictWarning && <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 font-bold border border-rose-400 absolute -top-3 right-2 shadow-sm z-20"><Trash2 size={10}/> TARGET</span>}
          </div>
          
          <div className="flex justify-between items-end mt-1 pt-1.5 border-t border-black/10">
             <div className="flex flex-col">
               <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{node.label}</span>
               <span className="text-[9px] font-mono font-bold text-slate-500 flex items-center gap-1 mt-0.5"><Database size={10}/> {t('blks')}: [{node.blockRefs.join(', ')}]</span>
             </div>
             {/* Lock Indicator Badge */}
             <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider h-fit
               ${node.lock > 0 ? 'bg-emerald-500 text-white border-emerald-600 shadow-inner' : 'bg-white text-slate-400 border-slate-200'}
             `}>
               {node.lock > 0 ? <Lock size={10}/> : <Unlock size={10}/>} {t('lockRef')}={node.lock}
             </span>
          </div>
        </div>

        {/* Children Render (Vertical layout) */}
        {node.children && node.children.length > 0 && (
          <div className="flex flex-col items-center w-full mt-0">
            {/* Vertical line going down to horizontal fork */}
            <div className="w-px h-6 bg-slate-300 relative z-0"></div>
            
            <div className="flex flex-row justify-center gap-8 relative pt-6 w-full items-start">
              {node.children.map((child, idx) => (
                <TreeNode 
                  key={child.id} 
                  node={child} 
                  isFirst={idx === 0} 
                  isLast={idx === node.children.length - 1} 
                  hasSiblings={node.children.length > 1} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const isRoot = (node) => {
    // A simplistic check based on id to avoid passing it deeply
    return node.id === 'n1' || node.id === 'n1a' || node.id === 'n_merged' || node.id === 'n3';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 lg:p-6 selection:bg-indigo-100">
      <div className="max-w-[90rem] mx-auto space-y-4 md:space-y-6">
        
        {/* Top Control Bar */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex flex-col text-center xl:text-left">
            <h1 className="text-xl md:text-2xl font-bold flex items-center justify-center xl:justify-start gap-2 text-indigo-900">
              <Network className="text-indigo-500" />
              {t('title')}
            </h1>
            <p className="text-slate-500 text-[12px] md:text-sm mt-1">
              {t('subtitle')}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button onClick={() => handleModelTypeChange('standard')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] md:text-sm font-semibold rounded-md transition-all ${modelType === 'standard' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Database size={14} /> {t('standard')}
              </button>
              <button onClick={() => handleModelTypeChange('radix')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] md:text-sm font-semibold rounded-md transition-all ${modelType === 'radix' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Network size={14} /> {t('radix')}
              </button>
            </div>
            <button onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition text-sm font-bold w-10 text-center">{t('langToggle')}</button>
            <button onClick={() => {setStep(0); setIsPlaying(false)}} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition" title={t('reset')}><RotateCcw size={18} /></button>
            <button onClick={() => {if(step >= (modelType==='standard'?6:9)) setStep(0); setIsPlaying(!isPlaying);}} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition shadow-sm bg-indigo-600 hover:bg-indigo-700`}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />} {t('play')}
            </button>
            <button onClick={() => { setIsPlaying(false); if(step < (modelType==='standard'?6:9)) setStep(s=>s+1); }} disabled={isPlaying || step >= (modelType==='standard'?6:9)} className="flex items-center gap-2 px-4 py-2 w-32 md:w-48 justify-center rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-bold disabled:opacity-50 transition shadow-sm">
              <SkipForward size={16} /> <span className="truncate">{t('next')}</span>
            </button>
          </div>
        </div>

        {/* Incoming Request Banner (Always shown clearly on top) */}
        <div className="w-full bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-inner flex flex-col gap-3 relative overflow-hidden">
           <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><ArrowDownToLine size={14}/> {t('incomingReq')}</div>
           <div className="flex flex-col gap-2">
             <div className={`text-xs md:text-sm font-mono px-3 py-2 rounded border flex items-center justify-between transition-all ${step >= 1 ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                <span><strong className="text-white mr-2">{t('reqA')}:</strong> {REQS.A.full}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${step >= 1 ? 'bg-emerald-800/50 text-emerald-200' : 'bg-slate-700 text-slate-400'}`}>12 {t('tokens')} | 3 {t('blks')}</span>
             </div>
             <div className={`text-xs md:text-sm font-mono px-3 py-2 rounded border flex items-center justify-between transition-all ${step >= 3 ? 'bg-amber-900/50 text-amber-300 border-amber-700/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                <span><strong className="text-white mr-2">{t('reqB')}:</strong> {REQS.B.full}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${step >= 3 ? 'bg-amber-800/50 text-amber-200' : 'bg-slate-700 text-slate-400'}`}>12 {t('tokens')} | 3 {t('blks')}</span>
             </div>
             <div className={`text-xs md:text-sm font-mono px-3 py-2 rounded border flex items-center justify-between transition-all ${step >= 6 ? 'bg-rose-900/50 text-rose-300 border-rose-700/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                <span><strong className="text-white mr-2">{t('reqC')}:</strong> {REQS.C.full}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${step >= 6 ? 'bg-rose-800/50 text-rose-200' : 'bg-slate-700 text-slate-400'}`}>8 {t('tokens')} | 2 {t('blks')}</span>
             </div>
           </div>
        </div>

        {/* Side-by-Side: Memory Layout + Physical Pool (Left) and Python Pseudocode (Right) */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          
          {/* Left: Main Visualization Area (Tree/Linear View + Physical Pool) - spans 3 columns */}
          <div className="xl:col-span-3 flex flex-col">
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 relative flex flex-col flex-1">
              
              {/* Header & Metrics */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 font-semibold text-lg text-slate-700">
                      {modelType === 'radix' ? <Network className="text-indigo-500" /> : <Database className="text-slate-500" />} 
                      {modelType === 'radix' ? t('logicalLayout') : t('logicalLayout')}
                    </div>
                  </div>
                  <div className={`text-sm font-bold px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-colors duration-300 w-fit mt-1 ${step > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    <Activity size={16} className={step > 0 && isPlaying ? 'animate-pulse' : ''}/>
                    {getStepText()}
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="flex gap-3 mt-2 md:mt-0">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-end min-w-[120px]">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{t('memUsage')}</span>
                    <span className={`text-2xl font-black font-mono transition-all ${pState.usedCount > TOTAL_BLOCKS * 0.8 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {pState.usedCount} <span className="text-xs text-slate-400 font-sans font-normal">/ {TOTAL_BLOCKS}</span>
                    </span>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${pState.usedCount > TOTAL_BLOCKS * 0.8 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{width: `${Math.min(100, (pState.usedCount / TOTAL_BLOCKS) * 100)}%`}}></div>
                    </div>
                  </div>
                  
                  {modelType === 'radix' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col items-end min-w-[120px] transition-all">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase">{t('hitRate')}</span>
                      <span className="text-2xl font-black font-mono text-emerald-600 flex items-baseline gap-1">
                        {pState.hitRate}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold mt-1">{t('savedMem')}: {pState.savedCount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* The Tree / Linear View Container */}
              <div className="bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 p-6 overflow-x-auto flex items-start justify-center relative min-h-[350px] scrollbar-thin">
                
                {step === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-30 flex-col gap-4 text-slate-500">
                    <Database size={48} className="animate-bounce" />
                    <span className="font-bold font-mono tracking-widest">{t('step0')}</span>
                  </div>
                )}

                {modelType === 'radix' && step > 0 && (
                   <div className="flex flex-col items-center pt-2 w-full">
                     {/* Fake Root Node */}
                     <div className="w-12 h-12 bg-slate-800 rounded-xl shadow-lg flex items-center justify-center text-white font-black z-20 shrink-0 border-2 border-slate-600 relative">
                       R
                     </div>
                     <div className="w-px h-6 bg-slate-300 relative z-0"></div>
                     
                     <div className="flex flex-row justify-center relative pt-6 gap-8 w-full items-start">
                       {treeData.root.map((node, idx) => (
                         <TreeNode 
                           key={node.id} 
                           node={node} 
                           isFirst={idx === 0} 
                           isLast={idx === treeData.root.length - 1} 
                           hasSiblings={treeData.root.length > 1} 
                         />
                       ))}
                     </div>
                   </div>
                )}

                {modelType === 'standard' && step > 0 && (
                  <div className="w-full flex flex-col gap-4 max-w-[600px] mx-auto">
                    <div className="flex flex-col gap-2 w-full bg-white p-4 rounded-xl border shadow-sm">
                      <div className="font-bold text-slate-700 text-sm border-b pb-2 flex justify-between items-center">
                         <span>{t('reqA')}</span>
                         <div className="flex gap-2">
                           <span className="text-[11px] font-mono text-slate-500 border px-1.5 py-0.5 rounded bg-slate-50 flex items-center gap-1"><Database size={10}/> {t('blks')}: [0, 1, 2]</span>
                           <span className="text-[11px] font-mono text-slate-400 border px-1.5 py-0.5 rounded bg-slate-50">Lock=1</span>
                         </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono px-3 py-2 rounded break-all leading-relaxed">
                        <span className="bg-indigo-100 text-indigo-800 px-1 rounded border border-indigo-200 font-bold">{PREFIX_TOKENS}</span>
                        <span className="font-bold">{SUFFIX_A_TOKENS}</span>
                      </div>
                    </div>
                    
                    {step >= 3 && (
                      <div className="flex flex-col gap-2 w-full bg-white p-4 rounded-xl border shadow-sm animate-fade-in-fast relative">
                        {/* Redundancy Warning */}
                        <div className="absolute -top-3 right-4 bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-300 flex items-center gap-1 shadow-sm"><Info size={12}/> {t('pyComment2')}</div>
                        <div className="font-bold text-slate-700 text-sm border-b pb-2 flex justify-between items-center">
                           <span>{t('reqB')}</span>
                           <div className="flex gap-2">
                             <span className="text-[11px] font-mono text-slate-500 border px-1.5 py-0.5 rounded bg-slate-50 flex items-center gap-1"><Database size={10}/> {t('blks')}: [3, 4, 5]</span>
                             <span className="text-[11px] font-mono text-slate-400 border px-1.5 py-0.5 rounded bg-slate-50">Lock=1</span>
                           </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono px-3 py-2 rounded break-all leading-relaxed relative">
                           <span className="bg-rose-100 text-rose-800 px-1 rounded border border-rose-300 relative font-bold">
                             {PREFIX_TOKENS}
                             <span className="absolute -top-2 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>
                           </span>
                           <span className="font-bold">{SUFFIX_B_TOKENS}</span>
                        </div>
                      </div>
                    )}

                    {step >= 6 && (
                      <div className="flex flex-col gap-2 w-full bg-white p-4 rounded-xl border shadow-sm animate-fade-in-fast relative">
                        {pState.usedCount >= TOTAL_BLOCKS && <div className="absolute inset-0 bg-rose-500/10 border-2 border-rose-500 rounded-xl z-20 pointer-events-none"></div>}
                        <div className="font-bold text-slate-700 text-sm border-b pb-2 flex justify-between items-center">
                           <span>{t('reqC')}</span>
                           <div className="flex gap-2">
                             <span className="text-[11px] font-mono text-slate-500 border px-1.5 py-0.5 rounded bg-slate-50 flex items-center gap-1"><Database size={10}/> {t('blks')}: [6, 7]</span>
                             <span className="text-[11px] font-mono text-slate-400 border px-1.5 py-0.5 rounded bg-slate-50">Lock=1</span>
                           </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono px-3 py-2 rounded break-all leading-relaxed font-bold">
                           {REQS.C.full}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Divider between Layout and Physical Pool */}
              <div className="border-t border-slate-200 mt-6 pt-4">
                <h2 className="text-sm font-semibold mb-4 text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Grid2X2 className="text-indigo-500" size={16} /> {t('physicalPool')}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Capacity: {TOTAL_BLOCKS} {t('blks')}</span>
                </h2>
                
                <div className="flex flex-col justify-center items-center w-full">
                    <div className="flex flex-col gap-4 w-full">
                      {[
                        { label: 'K Cache Pool', icon: '🔑' },
                        { label: 'V Cache Pool', icon: '📦' }
                      ].map(pool => (
                        <div key={pool.label} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner w-full">
                          <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5 px-1"><span className="text-sm">{pool.icon}</span> {pool.label}</div>
                          <div className="flex w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 gap-3 pb-4 pt-1 px-1 relative items-center justify-start">
                             {pState.blocks.map((b, idx) => {
                               let colorClasses = 'bg-white border-slate-200 text-transparent'; // empty
                               if (b.status === 'used') {
                                  if (b.color === 'indigo') colorClasses = 'bg-indigo-500 border-indigo-600 text-white shadow-sm';
                                  if (b.color === 'emerald') colorClasses = 'bg-emerald-500 border-emerald-600 text-white shadow-sm';
                                  if (b.color === 'amber') colorClasses = 'bg-amber-500 border-amber-600 text-white shadow-sm';
                                  if (b.color === 'rose') colorClasses = 'bg-rose-500 border-rose-600 text-white shadow-sm';
                                  if (b.isDup) colorClasses += ' ring-2 ring-rose-400 ring-offset-1 ring-inset border-dashed';
                               } else if (b.status === 'targeted') {
                                  colorClasses = 'bg-rose-50 border-rose-400 text-rose-800 border-dashed animate-pulse ring-2 ring-rose-300 ring-offset-1';
                               }
        
                               return (
                                 <div key={idx} className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 shrink-0 rounded-lg border-2 transition-all duration-500 flex flex-col items-center justify-center relative group
                                   ${colorClasses}
                                   ${b.status !== 'empty' && step > 0 ? 'scale-100' : 'scale-95 opacity-60'}
                                 `}>
                                   <span className="absolute top-0.5 left-1 text-[11px] lg:text-xs font-black font-mono opacity-80">#{idx}</span>
                                   {/* Lock Icon Overlay */}
                                   {b.locked && (
                                     <div className="absolute -bottom-1.5 -right-1.5 bg-slate-800 text-white p-1 rounded-full shadow-sm z-10 scale-[0.65] border border-slate-600">
                                       <Lock size={12} />
                                     </div>
                                   )}
                                   
                                   {/* Label */}
                                   {b.status !== 'empty' && (
                                      <span className="text-xs lg:text-sm font-black font-mono text-center leading-none mt-3">
                                        {b.seq}
                                      </span>
                                   )}
                                 </div>
                               )
                             })}
                          </div>
                        </div>
                      ))}
                    </div>
                  
                  {/* Legend */}
                  {step > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4 justify-center items-center text-[10px] text-slate-600 font-mono w-full px-2">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-500 border border-indigo-600"></div> Prefix (P)</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600"></div> Req A</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-500 border border-amber-600"></div> Req B</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-500 border border-rose-600"></div> Req C</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-100 border-2 border-slate-200"></div> Empty</div>
                      <div className="flex items-center gap-1"><Lock size={10} className="text-slate-700"/> Locked</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Python Pseudocode - spans 2 columns */}
          <div className="xl:col-span-2 flex flex-col">
            <div className="bg-[#0f172a] rounded-2xl p-4 md:p-5 shadow-lg border border-slate-800 text-slate-300 flex flex-col flex-1 relative overflow-hidden h-full">
               {/* Terminal dots decoration */}
               <div className="flex gap-1.5 absolute top-4 left-4">
                 <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
               </div>
               
               <h2 className="text-sm font-semibold mb-4 text-white border-b border-slate-700 pb-2 flex items-center justify-between mt-6">
                 <div className="flex items-center gap-2">
                   <Code className="text-emerald-400" size={16} /> {t('underlyingCode')}
                 </div>
                 <span className="text-[9px] text-slate-400 font-mono border border-slate-700 px-1.5 py-0.5 rounded bg-slate-800">Python</span>
              </h2>

              <div className="font-mono text-[10px] md:text-[11px] overflow-y-auto overflow-x-auto bg-[#080c12] p-3 rounded-xl border border-slate-800 flex-1 leading-relaxed shadow-inner scrollbar-thin">
                {modelType === 'standard' ? (
                  <div className="whitespace-pre">
                    <div><span className="text-blue-400">class</span> <span className="text-amber-300">StandardKVCache</span>:</div>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">__init__</span>(self):</div>
                    <div>        self.allocator = TokenPoolAllocator()</div>
                    <br/>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">schedule_req</span>(self, req):</div>
                    <div className={step === 1 || step === 3 ? "bg-slate-800/80 px-1 -mx-1 border-l-2 border-slate-500 text-slate-200" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{step === 3 ? t('pyComment2') : t('pyComment1')}</span></div>
                      <div>        kv_indices = self.allocator.alloc(req.tokens.length)</div>
                      <div>        req.kv_indices = kv_indices</div>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre">
                    <div><span className="text-blue-400">class</span> <span className="text-amber-300">TreeNode</span>:</div>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">__init__</span>(self):</div>
                    <div>        self.key = []              <span className="text-slate-600"># 节点对应的 Token 序列</span></div>
                    <div>        self.value = []            <span className="text-slate-600"># 底层物理 Block 索引</span></div>
                    <div>        self.children = {'{}'}             <span className="text-slate-600"># 子节点字典</span></div>
                    <div>        self.parent = <span className="text-purple-400">None</span>           <span className="text-slate-600"># 父节点指针</span></div>
                    <div>        self.lock_ref = <span className="text-purple-400">0</span>          <span className="text-slate-600"># 引用计数锁</span></div>
                    <br/>
                    <div><span className="text-blue-400">class</span> <span className="text-amber-300">RadixCache</span>:</div>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">match_prefix</span>(self, tokens):</div>
                    <div className={step === 3 ? "bg-indigo-900/40 px-1 -mx-1 border-l-2 border-indigo-400 text-indigo-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyComment3')}</span></div>
                      <div>        prefix_len = key_match_fn(child.key, tokens)</div>
                      <div>        <span className="text-emerald-400">return</span> prefix_len, node</div>
                    </div>
                    <br/>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">insert</span>(self, tokens, prefix_len, node):</div>
                    <div className={step === 4 ? "bg-amber-900/40 px-1 -mx-1 border-l-2 border-amber-400 text-amber-100" : "text-slate-500"}>
                      <div>        <span className="text-emerald-400">if</span> prefix_len &lt; <span className="text-blue-300">len</span>(node.key):</div>
                      <div>            <span className="text-slate-600">{t('pyComment4')}</span></div>
                      <div>            node = self._split_node(node, prefix_len)</div>
                    </div>
                    <div className={step === 5 || step === 1 || step === 6 ? "bg-emerald-900/40 px-1 -mx-1 border-l-2 border-emerald-400 text-emerald-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyComment5')}</span></div>
                      <div>        self._insert_suffix(node, tokens[prefix_len:])</div>
                      <div>        self.inc_lock_ref(node)</div>
                    </div>
                    <br/>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">evict</span>(self, num_blocks):</div>
                    <div className={step >= 7 && step < 9 ? "bg-rose-900/40 px-1 -mx-1 border-l-2 border-rose-400 text-rose-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyComment6')}</span></div>
                      <div>        _, node = heapq.heappop(self.evictable_leaves)</div>
                      <div>        self.allocator.free(node.value) <span className="text-slate-600"># 释放物理块</span></div>
                      <div>        self._delete_leaf(node)</div>
                    </div>
                    <div className={step >= 9 ? "bg-amber-900/40 px-1 -mx-1 border-l-2 border-amber-400 text-amber-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyComment9')}</span></div>
                      <div>        <span className="text-emerald-400">if</span> <span className="text-blue-300">len</span>(node.parent.children) == <span className="text-purple-400">0</span> \</div>
                      <div>           <span className="text-emerald-400">and</span> node.parent.lock_ref == <span className="text-purple-400">0</span>:</div>
                      <div>            heapq.heappush(self.evictable_leaves, node.parent)</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Deep Principle Analysis Bottom Bar */}
        <div className="w-full mt-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-20 opacity-60 pointer-events-none"></div>
            
            <h3 className="text-lg font-bold mb-6 text-indigo-950 pb-3 flex items-center gap-2 border-b border-indigo-100 w-fit pr-10">
              <Info size={20} className="text-indigo-500"/> {t('principleAnalysis')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 relative z-10">
              <div className="flex flex-col gap-2">
                <div className="font-bold text-rose-600 text-sm flex items-center gap-1.5 pb-1"><Database size={16}/> {t('memWallTitle')}</div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{t('memWallDesc')}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-bold text-indigo-600 text-sm flex items-center gap-1.5 pb-1"><Network size={16}/> {t('radixTreeTitle')}</div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{t('radixTreeDesc')}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-bold text-amber-600 text-sm flex items-center gap-1.5 pb-1"><SplitSquareHorizontal size={16}/> {t('lazySplitTitle')}</div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{t('lazySplitDesc')}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-bold text-emerald-600 text-sm flex items-center gap-1.5 pb-1"><Trash2 size={16}/> {t('evictTitle')}</div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{t('evictDesc')}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// Required Tailwind Keyframes for smooth animations
const customStyles = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fade-in-fast {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
  .animate-fade-in-fast { animation: fade-in-fast 0.3s ease-out forwards; }
`;

// Inject custom styles safely
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = customStyles;
  document.head.appendChild(styleSheet);
}

export default App;
