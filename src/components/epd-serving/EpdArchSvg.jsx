import React from 'react';

function Pin({ num, x, y, active, onSelect }) {
  return (
    <g
      className={`ep-arch-pin ${active ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(num); }}
      role="button"
      tabIndex={0}
      aria-label={`Inspect EPD stage ${num}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(num); } }}
    >
      <circle cx={x} cy={y} r={10} />
      <text x={x} y={y + 3.5} textAnchor="middle">{num}</text>
    </g>
  );
}

export default function EpdArchSvg({ activePin, onSelectPin }) {
  const hi = (n) => (activePin === n ? 'hl' : '');

  return (
    <svg className="ep-svg" viewBox="0 0 600 206" role="img" aria-label="EPD 3-Stage Multimodal Serving Architecture">
      <rect className="ep-svg-bg" x="6" y="6" width="588" height="194" rx="9" />
      <text className="ep-svg-hdr" x="18" y="24">EPD Disaggregated Multimodal Serving · E→P (~16 MB Emb) vs P→D (~1.28 GB KV)</text>

      {/* ① Async Media Preprocess */}
      <g className={`ep-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
        <rect x="18" y="38" width="118" height="106" rx="7" />
        <text className="ep-svg-t" x="77" y="60" textAnchor="middle">Media Worker</text>
        <text className="ep-svg-s" x="77" y="76" textAnchor="middle">CPU / nvJPEG</text>
        <text className="ep-svg-s" x="77" y="94" textAnchor="middle">Decode + Resize</text>
        <text className="ep-svg-s" x="77" y="109" textAnchor="middle">Pinned H2D DMA</text>
        <text className="ep-svg-s" x="77" y="126" textAnchor="middle">Async Pool</text>
      </g>

      <line className="ep-svg-edge" x1="136" y1="90" x2="154" y2="90" />

      {/* ② Encode Pool */}
      <g className={`ep-svg-node indigo ${hi(2)}`} onClick={() => onSelectPin(2)}>
        <rect x="154" y="38" width="132" height="106" rx="7" />
        <text className="ep-svg-t" x="220" y="60" textAnchor="middle">Encode Pool (E)</text>
        <text className="ep-svg-s" x="220" y="76" textAnchor="middle">Stateless ViT GPUs</text>
        <text className="ep-svg-s" x="220" y="94" textAnchor="middle">SHA256 Emb Cache</text>
        <text className="ep-svg-s" x="220" y="109" textAnchor="middle">Patch-Budget Batch</text>
        <text className="ep-svg-s" x="220" y="126" textAnchor="middle">→ 16 MB Emb</text>
      </g>

      <line className="ep-svg-edge hi" x1="286" y1="90" x2="310" y2="90" />
      <text className="ep-svg-s" x="298" y="82" textAnchor="middle">16MB</text>

      {/* ③ Prefill Pool */}
      <g className={`ep-svg-node amber ${hi(3)}`} onClick={() => onSelectPin(3)}>
        <rect x="310" y="38" width="126" height="106" rx="7" />
        <text className="ep-svg-t" x="373" y="60" textAnchor="middle">Prefill Pool (P)</text>
        <text className="ep-svg-s" x="373" y="76" textAnchor="middle">70B LLM Compute</text>
        <text className="ep-svg-s" x="373" y="94" textAnchor="middle">Merge Vis + Text</text>
        <text className="ep-svg-s" x="373" y="109" textAnchor="middle">Text-Only Fast Path</text>
        <text className="ep-svg-s" x="373" y="126" textAnchor="middle">→ 1.28 GB KV</text>
      </g>

      <line className="ep-svg-edge hi" x1="436" y1="90" x2="462" y2="90" />
      <text className="ep-svg-s" x="449" y="82" textAnchor="middle">RDMA</text>

      {/* ④ Decode Pool */}
      <g className={`ep-svg-node emerald ${hi(4)}`} onClick={() => onSelectPin(4)}>
        <rect x="462" y="38" width="120" height="106" rx="7" />
        <text className="ep-svg-t" x="522" y="60" textAnchor="middle">Decode Pool (D)</text>
        <text className="ep-svg-s" x="522" y="76" textAnchor="middle">Memory-Bound</text>
        <text className="ep-svg-s" x="522" y="94" textAnchor="middle">Zero ViT Jitter</text>
        <text className="ep-svg-s" x="522" y="109" textAnchor="middle">Smooth 19ms TPOT</text>
        <text className="ep-svg-s" x="522" y="126" textAnchor="middle">Stream → Free KV</text>
      </g>

      <rect className="ep-svg-inner" x="18" y="156" width="564" height="32" rx="6" />
      <text className="ep-svg-s" x="300" y="176" textAnchor="middle">
        Modality-Aware Router: Pure-Text requests bypass E-Pool directly into P-Pool; E→P Bounded Credits prevent Embedding OOM
      </text>

      <Pin num={1} x={18} y={38} active={activePin === 1} onSelect={onSelectPin} />
      <Pin num={2} x={154} y={38} active={activePin === 2} onSelect={onSelectPin} />
      <Pin num={3} x={310} y={38} active={activePin === 3} onSelect={onSelectPin} />
      <Pin num={4} x={462} y={38} active={activePin === 4} onSelect={onSelectPin} />
    </svg>
  );
}
