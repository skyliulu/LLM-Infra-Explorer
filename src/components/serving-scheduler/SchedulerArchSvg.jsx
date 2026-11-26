import React from 'react';

export default function SchedulerArchSvg({ activePin = 2, onSelectPin, lang = 'zh' }) {
  const pick = (n) => () => onSelectPin?.(n);
  const isZh = lang === 'zh';

  return (
    <svg
      className="sc2-svg"
      viewBox="0 0 600 176"
      role="img"
      aria-label={isZh ? '在线调度器端到端架构' : 'Online Serving Scheduler Architecture'}
    >
      <rect className="sc2-svg-bg" x="4" y="4" width="592" height="168" rx="8" />
      <text className="sc2-svg-hdr" x="14" y="21">
        {isZh
          ? '迭代级调度主循环：等待队列 → Token 预算规划 → 融合运行批次 ↔ 显存抢占'
          : 'Iteration-Level Serving Scheduler: Waiting → Token Budget Planner → Running Batch ↔ Preempted'}
      </text>

      {/* 1. Waiting Queue */}
      <g className={`sc2-svg-node blue ${activePin === 1 ? 'hl' : ''}`} onClick={pick(1)}>
        <rect x="14" y="34" width="124" height="82" rx="7" />
        <text className="sc2-svg-t" x="76" y="54" textAnchor="middle">{isZh ? '等待队列' : 'Waiting Queue'}</text>
        <text className="sc2-svg-s" x="76" y="70" textAnchor="middle">FCFS / SJF / LPM</text>
        <text className="sc2-svg-s" x="76" y="84" textAnchor="middle">{isZh ? '优先级 + 老化' : 'Priority + Aging'}</text>
        <text className="sc2-svg-s" x="76" y="100" textAnchor="middle">{isZh ? 'KV 充足时准入' : 'Admit on Free KV'}</text>
      </g>

      <line className="sc2-svg-edge hi" x1="138" y1="75" x2="160" y2="75" />

      {/* 2. Token Budget Planner */}
      <g className={`sc2-svg-node indigo ${activePin === 2 ? 'hl' : ''}`} onClick={pick(2)}>
        <rect x="162" y="34" width="134" height="82" rx="7" />
        <text className="sc2-svg-t" x="229" y="54" textAnchor="middle">{isZh ? '预算规划器' : 'Budget Planner'}</text>
        <text className="sc2-svg-s" x="229" y="70" textAnchor="middle">{isZh ? 'Decode 优先入批' : 'Decode Tokens 1st'}</text>
        <text className="sc2-svg-s" x="229" y="84" textAnchor="middle">{isZh ? '+ Prefill 分块填充' : '+ Prefill Chunks'}</text>
        <text className="sc2-svg-s" x="229" y="100" textAnchor="middle">≤ max_batched_tok</text>
      </g>

      <line className="sc2-svg-edge hi" x1="296" y1="75" x2="318" y2="75" />

      {/* 3. Running Ragged Batch */}
      <g className={`sc2-svg-node emerald ${activePin === 3 ? 'hl' : ''}`} onClick={pick(3)}>
        <rect x="320" y="34" width="134" height="82" rx="7" />
        <text className="sc2-svg-t" x="387" y="54" textAnchor="middle">{isZh ? '融合运行批次' : 'Running Batch'}</text>
        <text className="sc2-svg-s" x="387" y="70" textAnchor="middle">{isZh ? '扁平变长张量' : 'Flat Ragged Tensor'}</text>
        <text className="sc2-svg-s" x="387" y="84" textAnchor="middle">{isZh ? '零 PAD · 变长 FA' : '0 PAD · Varlen FA'}</text>
        <text className="sc2-svg-s" x="387" y="100" textAnchor="middle">15–30 ms / Step</text>
      </g>

      <line className="sc2-svg-edge" x1="454" y1="75" x2="474" y2="75" />

      {/* 4. Preempted / Swapped */}
      <g className={`sc2-svg-node amber ${activePin === 4 ? 'hl' : ''}`} onClick={pick(4)}>
        <rect x="476" y="34" width="110" height="82" rx="7" />
        <text className="sc2-svg-t" x="531" y="54" textAnchor="middle">{isZh ? '显存抢占' : 'Preempted'}</text>
        <text className="sc2-svg-s" x="531" y="70" textAnchor="middle">{isZh ? '块耗尽 LIFO 踢出' : 'LIFO on OOM'}</text>
        <text className="sc2-svg-s" x="531" y="84" textAnchor="middle">{isZh ? '重算 / 换出' : 'Recompute / Swap'}</text>
        <text className="sc2-svg-s" x="531" y="100" textAnchor="middle">{isZh ? '优先恢复' : 'Priority Resume'}</text>
      </g>

      {/* Iteration feedback bar */}
      <rect className="sc2-svg-inner" x="14" y="130" width="572" height="30" rx="5" />
      <text className="sc2-svg-s" x="300" y="148" textAnchor="middle">
        {isZh
          ? '每一步前向后：已完成序列立即退出并归还物理 KV 块 → 等待队列新请求零空泡补入下一步迭代'
          : 'Every GPU step: Finished seqs exit immediately (freeing KV blocks) → New waiting seqs enter next iteration with zero PAD bubbles'}
      </text>

      {[
        { n: 1, x: 24, y: 38 },
        { n: 2, x: 172, y: 38 },
        { n: 3, x: 330, y: 38 },
        { n: 4, x: 486, y: 38 },
      ].map((p) => (
        <g key={p.n} className={`sc2-arch-pin ${activePin === p.n ? 'on' : ''}`} onClick={pick(p.n)}>
          <circle cx={p.x} cy={p.y} r="10" />
          <text x={p.x} y={p.y + 3.5} textAnchor="middle">{p.n}</text>
        </g>
      ))}
    </svg>
  );
}
