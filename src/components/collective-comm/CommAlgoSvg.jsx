import React from 'react';

export default function CommAlgoSvg({ algo = 'ring' }) {
  if (algo === 'tree') {
    return (
      <svg className="cc-svg" viewBox="0 0 420 182" role="img" aria-label="Double-Binary Tree Collective Topology">
        <rect className="cc-svg-bg" x="6" y="6" width="408" height="170" rx="8" />
        <text className="cc-svg-hdr" x="18" y="24">Double-Binary Tree · O(log P) Hops · Dual Complementary Trees</text>

        {/* Root */}
        <g className="cc-svg-node indigo">
          <rect x="172" y="34" width="76" height="30" rx="6" />
          <text className="cc-svg-t" x="210" y="53" textAnchor="middle">GPU 0 (Root)</text>
        </g>

        {/* Mid level */}
        <line className="cc-svg-edge" x1="190" y1="64" x2="112" y2="86" />
        <line className="cc-svg-edge" x1="230" y1="64" x2="308" y2="86" />
        <g className="cc-svg-node blue">
          <rect x="74" y="86" width="76" height="28" rx="6" />
          <text className="cc-svg-t" x="112" y="104" textAnchor="middle">GPU 1</text>
        </g>
        <g className="cc-svg-node blue">
          <rect x="270" y="86" width="76" height="28" rx="6" />
          <text className="cc-svg-t" x="308" y="104" textAnchor="middle">GPU 2</text>
        </g>

        {/* Leaves */}
        <line className="cc-svg-edge" x1="96" y1="114" x2="58" y2="136" />
        <line className="cc-svg-edge" x1="128" y1="114" x2="164" y2="136" />
        <line className="cc-svg-edge" x1="292" y1="114" x2="256" y2="136" />
        <line className="cc-svg-edge" x1="324" y1="114" x2="362" y2="136" />
        {[
          { x: 24, label: 'GPU 3' },
          { x: 130, label: 'GPU 4' },
          { x: 222, label: 'GPU 5' },
          { x: 328, label: 'GPU 6..P-1' },
        ].map((leaf) => (
          <g key={leaf.label} className="cc-svg-node">
            <rect x={leaf.x} y="136" width="68" height="26" rx="5" />
            <text className="cc-svg-s" x={leaf.x + 34} y="153" textAnchor="middle">{leaf.label}</text>
          </g>
        ))}
      </svg>
    );
  }

  if (algo === 'nvls') {
    return (
      <svg className="cc-svg" viewBox="0 0 420 182" role="img" aria-label="NVLS SHARP In-Switch Reduction Topology">
        <rect className="cc-svg-bg" x="6" y="6" width="408" height="170" rx="8" />
        <text className="cc-svg-hdr" x="18" y="24">NVLS SHARP · O(1) Hops · In-Switch Hardware Reduction</text>

        {/* NVSwitch SHARP core */}
        <g className="cc-svg-node emerald">
          <rect x="82" y="36" width="256" height="44" rx="8" />
          <text className="cc-svg-t" x="210" y="55" textAnchor="middle">NVSwitch SHARP Engine (Σ in Silicon)</text>
          <text className="cc-svg-s" x="210" y="70" textAnchor="middle">1×M Upload → Hardware Sum → 1×M Multicast</text>
        </g>

        {/* GPUs */}
        {[0, 1, 2, 3].map((g) => {
          const x = 24 + g * 98;
          return (
            <g key={g}>
              <line className="cc-svg-edge hi" x1={x + 40} y1="126" x2={122 + g * 58} y2="80" />
              <g className="cc-svg-node indigo">
                <rect x={x} y="126" width="80" height="36" rx="6" />
                <text className="cc-svg-t" x={x + 40} y="142" textAnchor="middle">GPU {g}</text>
                <text className="cc-svg-s" x={x + 40} y="155" textAnchor="middle">2–4 SMs only</text>
              </g>
            </g>
          );
        })}
      </svg>
    );
  }

  // Ring default
  return (
    <svg className="cc-svg" viewBox="0 0 420 182" role="img" aria-label="Ring All-Reduce Topology">
      <rect className="cc-svg-bg" x="6" y="6" width="408" height="170" rx="8" />
      <text className="cc-svg-hdr" x="18" y="24">Ring All-Reduce · 2(P-1) Sequential Hops · Bandwidth-Optimal</text>

      {/* Ring loop */}
      <rect className="cc-svg-ring" x="78" y="54" width="264" height="84" rx="18" />

      {[
        { id: 'GPU 0', x: 34, y: 40 },
        { id: 'GPU 1', x: 298, y: 40 },
        { id: 'GPU 2', x: 298, y: 120 },
        { id: 'GPU 3', x: 34, y: 120 },
      ].map((n) => (
        <g key={n.id} className="cc-svg-node indigo">
          <rect x={n.x} y={n.y} width="88" height="34" rx="6" />
          <text className="cc-svg-t" x={n.x + 44} y={n.y + 21} textAnchor="middle">{n.id}</text>
        </g>
      ))}

      <text className="cc-svg-s" x="210" y="92" textAnchor="middle">Phase 1: Reduce-Scatter (P-1 hops)</text>
      <text className="cc-svg-s" x="210" y="108" textAnchor="middle">Phase 2: All-Gather (P-1 hops)</text>
    </svg>
  );
}
