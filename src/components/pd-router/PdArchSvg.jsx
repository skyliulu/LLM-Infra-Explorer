import React from 'react';

function Pin({ num, x, y, active, onSelect }) {
  return (
    <g
      className={`pd-arch-pin ${active ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(num); }}
      role="button"
      tabIndex={0}
      aria-label={`Inspect tier ${num}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(num); } }}
    >
      <circle cx={x} cy={y} r={10} />
      <text x={x} y={y + 3.5} textAnchor="middle">{num}</text>
    </g>
  );
}

export default function PdArchSvg({ activePin, onSelectPin }) {
  const hi = (n) => (activePin === n ? 'hl' : '');

  return (
    <svg className="pd-svg" viewBox="0 0 600 228" role="img" aria-label="P/D Disaggregated Serving System Architecture">
      <rect className="pd-svg-bg" x="6" y="6" width="588" height="216" rx="9" />
      <text className="pd-svg-hdr" x="18" y="24">Disaggregated LLM Serving Cluster · Control Plane + Data Plane</text>

      {/* ① Gateway & Cache-Aware Router */}
      <g className={`pd-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
        <rect x="18" y="38" width="118" height="122" rx="7" />
        <text className="pd-svg-t" x="77" y="62" textAnchor="middle">API Gateway &amp;</text>
        <text className="pd-svg-t" x="77" y="76" textAnchor="middle">Cache Router</text>
        <text className="pd-svg-s" x="77" y="96" textAnchor="middle">Prefix Hash Index</text>
        <text className="pd-svg-s" x="77" y="110" textAnchor="middle">Queue + KV Load</text>
        <text className="pd-svg-s" x="77" y="126" textAnchor="middle">Pair (P_i, D_j)</text>
        <text className="pd-svg-s" x="77" y="144" textAnchor="middle">SLO Admission</text>
      </g>

      <line className="pd-svg-edge" x1="136" y1="98" x2="156" y2="98" />

      {/* ② Prefill Pool */}
      <g className={`pd-svg-node indigo ${hi(2)}`} onClick={() => onSelectPin(2)}>
        <rect x="156" y="38" width="128" height="122" rx="7" />
        <text className="pd-svg-t" x="220" y="60" textAnchor="middle">Prefill Pool (P)</text>
        <text className="pd-svg-s" x="220" y="75" textAnchor="middle">Compute-Bound · TTFT</text>
        <rect className="pd-svg-inner" x="166" y="84" width="108" height="28" rx="5" />
        <text className="pd-svg-s" x="220" y="102" textAnchor="middle">P0..P_k (TP=4 / Chunk)</text>
        <rect className="pd-svg-inner" x="166" y="118" width="108" height="32" rx="5" />
        <text className="pd-svg-s" x="220" y="132" textAnchor="middle">Prompt Forward</text>
        <text className="pd-svg-s" x="220" y="144" textAnchor="middle">→ Emit KV Blocks</text>
      </g>

      <line className="pd-svg-edge hi" x1="284" y1="98" x2="304" y2="98" />

      {/* ③ KV Transfer Fabric */}
      <g className={`pd-svg-node amber ${hi(3)}`} onClick={() => onSelectPin(3)}>
        <rect x="304" y="38" width="126" height="122" rx="7" />
        <text className="pd-svg-t" x="367" y="60" textAnchor="middle">KV Transfer Bus</text>
        <text className="pd-svg-s" x="367" y="75" textAnchor="middle">RDMA / NIXL / L3</text>
        <rect className="pd-svg-inner" x="314" y="84" width="106" height="30" rx="5" />
        <text className="pd-svg-s" x="367" y="98" textAnchor="middle">Layer-Wise Pipe</text>
        <text className="pd-svg-s" x="367" y="109" textAnchor="middle">Zero-Copy Write</text>
        <rect className="pd-svg-inner" x="314" y="120" width="106" height="30" rx="5" />
        <text className="pd-svg-s" x="367" y="134" textAnchor="middle">Asym Reshard</text>
        <text className="pd-svg-s" x="367" y="145" textAnchor="middle">P-Rank → D-Rank</text>
      </g>

      <line className="pd-svg-edge hi" x1="430" y1="98" x2="450" y2="98" />

      {/* ④ Decode Pool */}
      <g className={`pd-svg-node emerald ${hi(4)}`} onClick={() => onSelectPin(4)}>
        <rect x="450" y="38" width="132" height="122" rx="7" />
        <text className="pd-svg-t" x="516" y="60" textAnchor="middle">Decode Pool (D)</text>
        <text className="pd-svg-s" x="516" y="75" textAnchor="middle">Memory-Bound · TPOT</text>
        <rect className="pd-svg-inner" x="460" y="84" width="112" height="28" rx="5" />
        <text className="pd-svg-s" x="516" y="102" textAnchor="middle">D0..D_m (DP / MLA)</text>
        <rect className="pd-svg-inner" x="460" y="118" width="112" height="32" rx="5" />
        <text className="pd-svg-s" x="516" y="132" textAnchor="middle">Continuous Batch</text>
        <text className="pd-svg-s" x="516" y="144" textAnchor="middle">Stream → Free KV</text>
      </g>

      {/* Bottom: Shared Control Plane / Telemetry */}
      <rect className="pd-svg-inner" x="18" y="172" width="564" height="38" rx="6" />
      <text className="pd-svg-t" x="300" y="188" textAnchor="middle">Control Plane &amp; Observability (KubeRay / Dynamo · OTel Trace · Dynamic P:D Autoscaler)</text>
      <text className="pd-svg-s" x="300" y="202" textAnchor="middle">Tracks Waiting → Prefill → KV Transfer → Decode Handoff → Finished · Rebalances P:D Ratio on Workload Drift</text>

      <Pin num={1} x={18} y={38} active={activePin === 1} onSelect={onSelectPin} />
      <Pin num={2} x={156} y={38} active={activePin === 2} onSelect={onSelectPin} />
      <Pin num={3} x={304} y={38} active={activePin === 3} onSelect={onSelectPin} />
      <Pin num={4} x={450} y={38} active={activePin === 4} onSelect={onSelectPin} />
    </svg>
  );
}
