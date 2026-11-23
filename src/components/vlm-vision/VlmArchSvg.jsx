import React from 'react';

function Pin({ num, x, y, active, onSelect }) {
  return (
    <g
      className={`vl-arch-pin ${active ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(num); }}
      role="button"
      tabIndex={0}
      aria-label={`Inspect VLM stage ${num}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(num); } }}
    >
      <circle cx={x} cy={y} r={10} />
      <text x={x} y={y + 3.5} textAnchor="middle">{num}</text>
    </g>
  );
}

export default function VlmArchSvg({ activePin, onSelectPin }) {
  const hi = (n) => (activePin === n ? 'hl' : '');

  return (
    <svg className="vl-svg" viewBox="0 0 600 202" role="img" aria-label="VLM Multimodal Vision-Language Inference Architecture">
      <rect className="vl-svg-bg" x="6" y="6" width="588" height="190" rx="9" />
      <text className="vl-svg-hdr" x="18" y="24">VLM Inference Pipeline · Native Patchify → ViT Encoder → Token Compressor → LLM KV</text>

      {/* ① Dynamic Patchify */}
      <g className={`vl-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
        <rect x="18" y="38" width="122" height="104" rx="7" />
        <text className="vl-svg-t" x="79" y="60" textAnchor="middle">Image / Video</text>
        <text className="vl-svg-t" x="79" y="74" textAnchor="middle">Dynamic Patch</text>
        <text className="vl-svg-s" x="79" y="94" textAnchor="middle">AnyRes Tiles or</text>
        <text className="vl-svg-s" x="79" y="108" textAnchor="middle">NaViT Native Pack</text>
        <text className="vl-svg-s" x="79" y="126" textAnchor="middle">14×14 px Patches</text>
      </g>

      <line className="vl-svg-edge" x1="140" y1="90" x2="160" y2="90" />

      {/* ② ViT Encoder */}
      <g className={`vl-svg-node indigo ${hi(2)}`} onClick={() => onSelectPin(2)}>
        <rect x="160" y="38" width="128" height="104" rx="7" />
        <text className="vl-svg-t" x="224" y="60" textAnchor="middle">Vision Encoder</text>
        <text className="vl-svg-t" x="224" y="74" textAnchor="middle">(ViT / SigLIP)</text>
        <text className="vl-svg-s" x="224" y="94" textAnchor="middle">2D Window + Full</text>
        <text className="vl-svg-s" x="224" y="108" textAnchor="middle">Stateless Compute</text>
        <text className="vl-svg-s" x="224" y="126" textAnchor="middle">Burst SM Load</text>
      </g>

      <line className="vl-svg-edge hi" x1="288" y1="90" x2="308" y2="90" />

      {/* ③ Projector / Compressor */}
      <g className={`vl-svg-node amber ${hi(3)}`} onClick={() => onSelectPin(3)}>
        <rect x="308" y="38" width="128" height="104" rx="7" />
        <text className="vl-svg-t" x="372" y="60" textAnchor="middle">Projector &amp;</text>
        <text className="vl-svg-t" x="372" y="74" textAnchor="middle">Token Merger</text>
        <text className="vl-svg-s" x="372" y="94" textAnchor="middle">2×2 Pixel-Shuffle</text>
        <text className="vl-svg-s" x="372" y="108" textAnchor="middle">4:1 / 8:1 Compress</text>
        <text className="vl-svg-s" x="372" y="126" textAnchor="middle">Align → d_LLM</text>
      </g>

      <line className="vl-svg-edge hi" x1="436" y1="90" x2="456" y2="90" />

      {/* ④ LLM Backbone + M-RoPE */}
      <g className={`vl-svg-node emerald ${hi(4)}`} onClick={() => onSelectPin(4)}>
        <rect x="456" y="38" width="126" height="104" rx="7" />
        <text className="vl-svg-t" x="519" y="60" textAnchor="middle">LLM Backbone</text>
        <text className="vl-svg-t" x="519" y="74" textAnchor="middle">+ 3D M-RoPE</text>
        <text className="vl-svg-s" x="519" y="94" textAnchor="middle">[Text, Vis, Text]</text>
        <text className="vl-svg-s" x="519" y="108" textAnchor="middle">Shared Paged KV</text>
        <text className="vl-svg-s" x="519" y="126" textAnchor="middle">Causal Prefill/Dec</text>
      </g>

      <rect className="vl-svg-inner" x="18" y="154" width="564" height="30" rx="6" />
      <text className="vl-svg-s" x="300" y="173" textAnchor="middle">
        Visual tokens enter LLM KV Cache alongside text tokens — every 4× merge cuts downstream Attention FLOPs by 16× and KV bytes by 4×
      </text>

      <Pin num={1} x={18} y={38} active={activePin === 1} onSelect={onSelectPin} />
      <Pin num={2} x={160} y={38} active={activePin === 2} onSelect={onSelectPin} />
      <Pin num={3} x={308} y={38} active={activePin === 3} onSelect={onSelectPin} />
      <Pin num={4} x={456} y={38} active={activePin === 4} onSelect={onSelectPin} />
    </svg>
  );
}
