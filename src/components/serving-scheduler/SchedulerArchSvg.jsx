import React from 'react';

export default function SchedulerArchSvg({ activePin = 2, onSelectPin }) {
  const pick = (n) => () => onSelectPin?.(n);

  return (
    <svg className="sc2-svg" viewBox="0 0 600 176" role="img" aria-label="Online Serving Scheduler Architecture">
      <rect className="sc2-svg-bg" x="4" y="4" width="592" height="168" rx="8" />
      <text className="sc2-svg-hdr" x="14" y="21">
        Iteration-Level Serving Scheduler: Waiting → Token Budget Planner → Running Ragged Batch ↔ Preempted
      </text>

      {/* 1. Waiting Queue */}
      <g className={`sc2-svg-node blue ${activePin === 1 ? 'hl' : ''}`} onClick={pick(1)}>
        <rect x="14" y="34" width="124" height="82" rx="7" />
        <text className="sc2-svg-t" x="76" y="54" textAnchor="middle">Waiting Queue</text>
        <text className="sc2-svg-s" x="76" y="70" textAnchor="middle">FCFS / SJF / LPM</text>
        <text className="sc2-svg-s" x="76" y="84" textAnchor="middle">Priority + Aging</text>
        <text className="sc2-svg-s" x="76" y="100" textAnchor="middle">KV &lt; 90% Admit</text>
      </g>

      <line className="sc2-svg-edge hi" x1="138" y1="75" x2="160" y2="75" />

      {/* 2. Token Budget Planner */}
      <g className={`sc2-svg-node indigo ${activePin === 2 ? 'hl' : ''}`} onClick={pick(2)}>
        <rect x="162" y="34" width="134" height="82" rx="7" />
        <text className="sc2-svg-t" x="229" y="54" textAnchor="middle">Budget Planner</text>
        <text className="sc2-svg-s" x="229" y="70" textAnchor="middle">Decode Tokens 1st</text>
        <text className="sc2-svg-s" x="229" y="84" textAnchor="middle">+ Prefill Chunks</text>
        <text className="sc2-svg-s" x="229" y="100" textAnchor="middle">≤ max_batched_tok</text>
      </g>

      <line className="sc2-svg-edge hi" x1="296" y1="75" x2="318" y2="75" />

      {/* 3. Running Ragged Batch */}
      <g className={`sc2-svg-node emerald ${activePin === 3 ? 'hl' : ''}`} onClick={pick(3)}>
        <rect x="320" y="34" width="134" height="82" rx="7" />
        <text className="sc2-svg-t" x="387" y="54" textAnchor="middle">Running Batch</text>
        <text className="sc2-svg-s" x="387" y="70" textAnchor="middle">Flat Ragged Tensor</text>
        <text className="sc2-svg-s" x="387" y="84" textAnchor="middle">0 PAD · Varlen FA</text>
        <text className="sc2-svg-s" x="387" y="100" textAnchor="middle">15–30ms / Iter</text>
      </g>

      <line className="sc2-svg-edge" x1="454" y1="75" x2="474" y2="75" />

      {/* 4. Preempted / Swapped */}
      <g className={`sc2-svg-node amber ${activePin === 4 ? 'hl' : ''}`} onClick={pick(4)}>
        <rect x="476" y="34" width="110" height="82" rx="7" />
        <text className="sc2-svg-t" x="531" y="54" textAnchor="middle">Preempted</text>
        <text className="sc2-svg-s" x="531" y="70" textAnchor="middle">KV ≥ 95% LIFO</text>
        <text className="sc2-svg-s" x="531" y="84" textAnchor="middle">Recompute / Swap</text>
        <text className="sc2-svg-s" x="531" y="100" textAnchor="middle">Priority Resume</text>
      </g>

      {/* Iteration feedback bar */}
      <rect className="sc2-svg-inner" x="14" y="130" width="572" height="30" rx="5" />
      <text className="sc2-svg-s" x="300" y="148" textAnchor="middle">
        Every GPU step: Finished seqs exit immediately (freeing KV blocks) → New waiting seqs enter next iteration with zero PAD bubbles
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
