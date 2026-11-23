import React from 'react';

export default function KvTransferSvg({ isAsym = true }) {
  return (
    <svg className="pd-svg" viewBox="0 0 460 154" role="img" aria-label="P to D KV Cache Resharding Topology">
      <rect className="pd-svg-bg" x="6" y="6" width="448" height="142" rx="8" />
      <text className="pd-svg-hdr" x="18" y="24">
        {isAsym ? 'Asymmetric Resharding: P-Node (TP=4) → D-Node (TP=2) Head Gather' : 'Symmetric Direct Copy: P-Node (TP=4) → D-Node (TP=4) 1:1 Rank'}
      </text>

      {/* Left: 4 Prefill GPUs */}
      {[0, 1, 2, 3].map((p) => {
        const y = 34 + p * 27;
        return (
          <g key={p} className="pd-svg-node indigo">
            <rect x="20" y={y} width="128" height="22" rx="4" />
            <text className="pd-svg-s" x="84" y={y + 14} textAnchor="middle">P-GPU {p} · KV Heads [{p * 2},{p * 2 + 1}]</text>
          </g>
        );
      })}

      {/* Center RDMA / NIXL */}
      <g className="pd-svg-node amber">
        <rect x="190" y="50" width="80" height="66" rx="6" />
        <text className="pd-svg-t" x="230" y="78" textAnchor="middle">RDMA /</text>
        <text className="pd-svg-t" x="230" y="92" textAnchor="middle">NIXL</text>
        <text className="pd-svg-s" x="230" y="106" textAnchor="middle">{isAsym ? '2P→1D' : '1P→1D'}</text>
      </g>

      {/* Right: Decode GPUs */}
      {isAsym ? (
        [0, 1].map((d) => {
          const y = 42 + d * 54;
          return (
            <g key={d} className="pd-svg-node emerald">
              <rect x="312" y={y} width="128" height="40" rx="5" />
              <text className="pd-svg-t" x="376" y={y + 17} textAnchor="middle">D-GPU {d} (TP=2)</text>
              <text className="pd-svg-s" x="376" y={y + 31} textAnchor="middle">Merged Heads [{d * 4}..{d * 4 + 3}]</text>
            </g>
          );
        })
      ) : (
        [0, 1, 2, 3].map((d) => {
          const y = 34 + d * 27;
          return (
            <g key={d} className="pd-svg-node emerald">
              <rect x="312" y={y} width="128" height="22" rx="4" />
              <text className="pd-svg-s" x="376" y={y + 14} textAnchor="middle">D-GPU {d} · KV Heads [{d * 2},{d * 2 + 1}]</text>
            </g>
          );
        })
      )}

      {/* Connections */}
      {[0, 1, 2, 3].map((p) => {
        const yP = 45 + p * 27;
        const yD = isAsym ? (p < 2 ? 62 : 116) : yP;
        return (
          <g key={p}>
            <line className="pd-svg-edge hi" x1="148" y1={yP} x2="190" y2={62 + p * 14} />
            <line className="pd-svg-edge hi" x1="270" y1={62 + p * 14} x2="312" y2={yD} />
          </g>
        );
      })}
    </svg>
  );
}
