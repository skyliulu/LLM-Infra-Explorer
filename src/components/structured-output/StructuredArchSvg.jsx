import React from 'react';

function Pin({ num, x, y, active, onSelect }) {
  return (
    <g
      className={`so-arch-pin ${active ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(num); }}
      role="button"
      tabIndex={0}
      aria-label={`Inspect stage ${num}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(num); } }}
    >
      <circle cx={x} cy={y} r={10} />
      <text x={x} y={y + 3.5} textAnchor="middle">{num}</text>
    </g>
  );
}

export default function StructuredArchSvg({ activePin, onSelectPin }) {
  const hi = (n) => (activePin === n ? 'hl' : '');

  return (
    <svg className="so-svg" viewBox="0 0 600 206" role="img" aria-label="Structured Output Constrained Decoding Architecture">
      <rect className="so-svg-bg" x="6" y="6" width="588" height="194" rx="9" />
      <text className="so-svg-hdr" x="18" y="24">Constrained Decoding Engine · Offline Adaptive Bitmask + GPU Logits Masking</text>

      {/* ① Offline Compiler */}
      <g className={`so-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
        <rect x="18" y="38" width="126" height="106" rx="7" />
        <text className="so-svg-t" x="81" y="60" textAnchor="middle">Grammar Compiler</text>
        <text className="so-svg-s" x="81" y="76" textAnchor="middle">JSON Schema / CFG</text>
        <text className="so-svg-s" x="81" y="94" textAnchor="middle">99% Context-Indep.</text>
        <text className="so-svg-s" x="81" y="108" textAnchor="middle">Precomputed Bitmask</text>
        <text className="so-svg-s" x="81" y="126" textAnchor="middle">(~16 KB / state)</text>
      </g>

      <line className="so-svg-edge" x1="144" y1="90" x2="164" y2="90" />

      {/* ② Runtime PDA Stack */}
      <g className={`so-svg-node indigo ${hi(2)}`} onClick={() => onSelectPin(2)}>
        <rect x="164" y="38" width="128" height="106" rx="7" />
        <text className="so-svg-t" x="228" y="60" textAnchor="middle">Runtime PDA Stack</text>
        <text className="so-svg-s" x="228" y="76" textAnchor="middle">CPU Async Thread</text>
        <text className="so-svg-s" x="228" y="94" textAnchor="middle">Check ~1% Stack-Dep.</text>
        <text className="so-svg-s" x="228" y="108" textAnchor="middle">Boundary Tokens</text>
        <text className="so-svg-s" x="228" y="126" textAnchor="middle">~40 µs / step</text>
      </g>

      <line className="so-svg-edge hi" x1="292" y1="90" x2="312" y2="90" />

      {/* ③ GPU Logits Bitmask Kernel */}
      <g className={`so-svg-node amber ${hi(3)}`} onClick={() => onSelectPin(3)}>
        <rect x="312" y="38" width="130" height="106" rx="7" />
        <text className="so-svg-t" x="377" y="60" textAnchor="middle">GPU Mask Kernel</text>
        <text className="so-svg-s" x="377" y="76" textAnchor="middle">4096 × uint32 Mask</text>
        <text className="so-svg-s" x="377" y="94" textAnchor="middle">Invalid → -∞</text>
        <text className="so-svg-s" x="377" y="108" textAnchor="middle">Valid → Unchanged</text>
        <text className="so-svg-s" x="377" y="126" textAnchor="middle">Fused w/ Softmax</text>
      </g>

      <line className="so-svg-edge hi" x1="442" y1="90" x2="462" y2="90" />

      {/* ④ Sampler + Jump-Forward */}
      <g className={`so-svg-node emerald ${hi(4)}`} onClick={() => onSelectPin(4)}>
        <rect x="462" y="38" width="120" height="106" rx="7" />
        <text className="so-svg-t" x="522" y="60" textAnchor="middle">Sampler &amp; Jump</text>
        <text className="so-svg-s" x="522" y="76" textAnchor="middle">100% Valid Output</text>
        <text className="so-svg-s" x="522" y="94" textAnchor="middle">Skip 1-Edge Syntax</text>
        <text className="so-svg-s" x="522" y="108" textAnchor="middle">Mini-Prefill KV</text>
        <text className="so-svg-s" x="522" y="126" textAnchor="middle">Advance PDA State</text>
      </g>

      {/* Feedback loop */}
      <rect className="so-svg-inner" x="18" y="156" width="564" height="32" rx="6" />
      <text className="so-svg-s" x="300" y="176" textAnchor="middle">
        Feedback Loop: Committed Token IDs advance Runtime PDA State concurrently while GPU executes next-step Transformer layers
      </text>

      <Pin num={1} x={18} y={38} active={activePin === 1} onSelect={onSelectPin} />
      <Pin num={2} x={164} y={38} active={activePin === 2} onSelect={onSelectPin} />
      <Pin num={3} x={312} y={38} active={activePin === 3} onSelect={onSelectPin} />
      <Pin num={4} x={462} y={38} active={activePin === 4} onSelect={onSelectPin} />
    </svg>
  );
}
