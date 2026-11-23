import React from 'react';

export default function RdmaPathSvg({ rdmaMode = 'gpudirect_rdma' }) {
  const isTcp = rdmaMode === 'tcp_host';
  const isStorm = rdmaMode === 'roce_pfc_storm';

  return (
    <svg className="cc-svg" viewBox="0 0 560 190" role="img" aria-label="Cross-Node GPU RDMA Data Path">
      <rect className="cc-svg-bg" x="6" y="6" width="548" height="178" rx="8" />
      <text className="cc-svg-hdr" x="18" y="24">
        {isTcp
          ? 'Node A → Node B: TCP / Host-Bounce Path (4 CPU Copies + Kernel Stack)'
          : isStorm
            ? 'Node A → Node B: RoCEv2 Missing ECN → PFC Pause Storm Backpressure'
            : 'Node A → Node B: GPUDirect RDMA Zero-Copy + Rail-Optimized Leaf Switch'}
      </text>

      {/* Node A shell */}
      <rect className="cc-svg-shell" x="18" y="34" width="176" height="136" rx="7" />
      <text className="cc-svg-s" x="28" y="49">Node A (PCIe Switch)</text>

      <g className="cc-svg-node indigo">
        <rect x="28" y="56" width="74" height="44" rx="5" />
        <text className="cc-svg-t" x="65" y="75" textAnchor="middle">GPU 0</text>
        <text className="cc-svg-s" x="65" y="90" textAnchor="middle">HBM</text>
      </g>
      <g className={`cc-svg-node ${isTcp ? 'warn' : 'muted'}`}>
        <rect x="110" y="56" width="74" height="44" rx="5" />
        <text className="cc-svg-t" x="147" y="75" textAnchor="middle">Host CPU</text>
        <text className="cc-svg-s" x="147" y="90" textAnchor="middle">{isTcp ? 'TCP Copy!' : 'Bypassed'}</text>
      </g>
      <g className={`cc-svg-node ${isStorm ? 'warn' : 'emerald'}`}>
        <rect x="28" y="114" width="156" height="44" rx="5" />
        <text className="cc-svg-t" x="106" y="133" textAnchor="middle">NIC 0 (400GbE HCA)</text>
        <text className="cc-svg-s" x="106" y="148" textAnchor="middle">{isTcp ? 'Host DRAM DMA' : 'PCIe P2P Direct DMA'}</text>
      </g>

      {/* Center Fabric Switch */}
      <g className={`cc-svg-node ${isStorm ? 'warn' : 'blue'}`}>
        <rect x="218" y="64" width="124" height="78" rx="7" />
        <text className="cc-svg-t" x="280" y="88" textAnchor="middle">Rail-0 Leaf Switch</text>
        <text className="cc-svg-s" x="280" y="105" textAnchor="middle">
          {isStorm ? 'PFC PAUSE FLOOD!' : isTcp ? 'Standard Ethernet' : 'Same-Rail 1-Hop'}
        </text>
        <text className="cc-svg-s" x="280" y="122" textAnchor="middle">
          {isStorm ? 'HoL Blocking (>980 µs)' : isTcp ? 'No RDMA Bypass' : 'ECN / DCQCN Active'}
        </text>
      </g>

      {/* Node B shell */}
      <rect className="cc-svg-shell" x="366" y="34" width="176" height="136" rx="7" />
      <text className="cc-svg-s" x="376" y="49">Node B (Same Rail 0)</text>

      <g className={`cc-svg-node ${isTcp ? 'warn' : 'muted'}`}>
        <rect x="376" y="56" width="74" height="44" rx="5" />
        <text className="cc-svg-t" x="413" y="75" textAnchor="middle">Host CPU</text>
        <text className="cc-svg-s" x="413" y="90" textAnchor="middle">{isTcp ? 'TCP Copy!' : 'Bypassed'}</text>
      </g>
      <g className="cc-svg-node indigo">
        <rect x="458" y="56" width="74" height="44" rx="5" />
        <text className="cc-svg-t" x="495" y="75" textAnchor="middle">GPU 0</text>
        <text className="cc-svg-s" x="495" y="90" textAnchor="middle">HBM</text>
      </g>
      <g className={`cc-svg-node ${isStorm ? 'warn' : 'emerald'}`}>
        <rect x="376" y="114" width="156" height="44" rx="5" />
        <text className="cc-svg-t" x="454" y="133" textAnchor="middle">NIC 0 (400GbE HCA)</text>
        <text className="cc-svg-s" x="454" y="148" textAnchor="middle">{isTcp ? 'Host DRAM DMA' : 'RDMA Write Direct'}</text>
      </g>

      {/* Paths */}
      {isTcp ? (
        <>
          <line className="cc-svg-edge warn" x1="102" y1="78" x2="110" y2="78" />
          <line className="cc-svg-edge warn" x1="147" y1="100" x2="147" y2="114" />
          <line className="cc-svg-edge warn" x1="184" y1="136" x2="218" y2="112" />
          <line className="cc-svg-edge warn" x1="342" y1="112" x2="376" y2="136" />
          <line className="cc-svg-edge warn" x1="413" y1="114" x2="413" y2="100" />
          <line className="cc-svg-edge warn" x1="450" y1="78" x2="458" y2="78" />
        </>
      ) : (
        <>
          <line className={`cc-svg-edge ${isStorm ? 'warn' : 'hi'}`} x1="65" y1="100" x2="65" y2="114" />
          <line className={`cc-svg-edge ${isStorm ? 'warn' : 'hi'}`} x1="184" y1="136" x2="218" y2="108" />
          <line className={`cc-svg-edge ${isStorm ? 'warn' : 'hi'}`} x1="342" y1="108" x2="376" y2="136" />
          <line className={`cc-svg-edge ${isStorm ? 'warn' : 'hi'}`} x1="495" y1="114" x2="495" y2="100" />
        </>
      )}
    </svg>
  );
}
