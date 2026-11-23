import React from 'react';

function Pin({ num, x, y, active, onSelect }) {
  return (
    <g
      className={`gr-arch-pin ${active ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(num); }}
      role="button"
      tabIndex={0}
      aria-label={`Highlight upgrade ${num}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(num); } }}
    >
      <circle cx={x} cy={y} r={10} />
      <text x={x} y={y + 3.5} textAnchor="middle">{num}</text>
    </g>
  );
}

export default function ArchDiagramSvg({ gen, activePin, onSelectPin }) {
  const hi = (n) => (activePin === n ? 'hl' : '');

  if (gen === 'volta') {
    return (
      <svg className="gr-arch-svg" viewBox="0 0 560 278" role="img" aria-label="Volta GV100 Architecture Diagram">
        {/* Outer Die */}
        <rect className="gr-svg-die" x="10" y="10" width="540" height="258" rx="10" />
        <text className="gr-svg-hdr" x="22" y="29">Volta GV100 Die · 80 SMs · 4 Sub-Partitions / SM</text>

        {/* Zoomed SM */}
        <rect className="gr-svg-shell" x="22" y="40" width="340" height="156" rx="8" />
        <text className="gr-svg-lbl" x="34" y="57">Zoomed Streaming Multiprocessor (SM)</text>

        {/* Sub-partition 0 & 1 */}
        <g className={`gr-svg-node blue ${hi(2)}`} onClick={() => onSelectPin(2)}>
          <rect x="34" y="66" width="152" height="34" rx="6" />
          <text className="gr-svg-t" x="110" y="81" textAnchor="middle">Warp Sched + ITS</text>
          <text className="gr-svg-s" x="110" y="93" textAnchor="middle">Per-Thread PC / Call Stack</text>
        </g>
        <g className={`gr-svg-node blue ${hi(2)}`} onClick={() => onSelectPin(2)}>
          <rect x="196" y="66" width="154" height="34" rx="6" />
          <text className="gr-svg-t" x="273" y="81" textAnchor="middle">64 KB Reg File / Sub-SM</text>
          <text className="gr-svg-s" x="273" y="93" textAnchor="middle">FP32 / INT32 CUDA Cores</text>
        </g>

        {/* Tensor Core (Pin 1) */}
        <g className={`gr-svg-node indigo ${hi(1)}`} onClick={() => onSelectPin(1)}>
          <rect x="34" y="108" width="316" height="36" rx="6" />
          <text className="gr-svg-t" x="192" y="124" textAnchor="middle">Gen-1 Tensor Core (8 / SM · 4×4×4 FP16→FP32 MMA)</text>
          <text className="gr-svg-s" x="192" y="137" textAnchor="middle">Replaces Scalar FMA Loops · Exposed via CUDA 9 WMMA</text>
        </g>

        {/* Unified L1 / Shared Memory (Pin 3) */}
        <g className={`gr-svg-node emerald ${hi(3)}`} onClick={() => onSelectPin(3)}>
          <rect x="34" y="152" width="316" height="34" rx="6" />
          <text className="gr-svg-t" x="192" y="167" textAnchor="middle">Unified L1 Data Cache + Shared Memory (128 KB)</text>
          <text className="gr-svg-s" x="192" y="180" textAnchor="middle">Merged low-latency on-chip SRAM path (up to 96 KB SMEM)</text>
        </g>

        {/* Right: Other SMs + L2 */}
        <rect className="gr-svg-shell" x="374" y="40" width="164" height="156" rx="8" />
        <text className="gr-svg-lbl" x="386" y="57">Chip Fabric</text>
        <rect className="gr-svg-box" x="386" y="66" width="140" height="48" rx="6" />
        <text className="gr-svg-t" x="456" y="87" textAnchor="middle">×80 SMs (6 GPCs)</text>
        <text className="gr-svg-s" x="456" y="101" textAnchor="middle">GigaThread Engine</text>

        <rect className="gr-svg-box" x="386" y="124" width="140" height="62" rx="6" />
        <text className="gr-svg-t" x="456" y="151" textAnchor="middle">6 MB L2 Cache</text>
        <text className="gr-svg-s" x="456" y="166" textAnchor="middle">Crossbar to HBM2</text>

        {/* Bottom: HBM2 + NVLink 2 (Pin 4) */}
        <g className={`gr-svg-node amber ${hi(4)}`} onClick={() => onSelectPin(4)}>
          <rect x="22" y="208" width="300" height="46" rx="7" />
          <text className="gr-svg-t" x="172" y="229" textAnchor="middle">32 GB HBM2 · 900 GB/s (4096-bit)</text>
          <text className="gr-svg-s" x="172" y="243" textAnchor="middle">Feeds FP16 Weights &amp; Activations into Tensor Cores</text>
        </g>
        <g className={`gr-svg-node amber ${hi(4)}`} onClick={() => onSelectPin(4)}>
          <rect x="334" y="208" width="204" height="46" rx="7" />
          <text className="gr-svg-t" x="436" y="229" textAnchor="middle">NVLink 2 (6 Links · 300 GB/s)</text>
          <text className="gr-svg-s" x="436" y="243" textAnchor="middle">Multi-GPU Mixed Precision</text>
        </g>

        <Pin num={1} x={34} y={108} active={activePin === 1} onSelect={onSelectPin} />
        <Pin num={2} x={34} y={66} active={activePin === 2} onSelect={onSelectPin} />
        <Pin num={3} x={34} y={152} active={activePin === 3} onSelect={onSelectPin} />
        <Pin num={4} x={334} y={208} active={activePin === 4} onSelect={onSelectPin} />
      </svg>
    );
  }

  if (gen === 'ampere') {
    return (
      <svg className="gr-arch-svg" viewBox="0 0 560 278" role="img" aria-label="Ampere GA100 Architecture Diagram">
        <rect className="gr-svg-die" x="10" y="10" width="540" height="258" rx="10" />
        <text className="gr-svg-hdr" x="22" y="29">Ampere GA100 (A100) · 108 SMs · Cloud &amp; Async Pipeline</text>

        {/* Zoomed SM */}
        <rect className="gr-svg-shell" x="22" y="40" width="318" height="156" rx="8" />
        <text className="gr-svg-lbl" x="34" y="57">A100 SM (4 Tensor Cores / SM)</text>

        <g className={`gr-svg-node indigo ${hi(1)}`} onClick={() => onSelectPin(1)}>
          <rect x="34" y="66" width="150" height="52" rx="6" />
          <text className="gr-svg-t" x="109" y="86" textAnchor="middle">Gen-3 Tensor Core</text>
          <text className="gr-svg-s" x="109" y="100" textAnchor="middle">TF32 · BF16 · FP16 · INT8</text>
          <text className="gr-svg-s" x="109" y="112" textAnchor="middle">Auto FP32→TF32 path</text>
        </g>
        <g className={`gr-svg-node emerald ${hi(2)}`} onClick={() => onSelectPin(2)}>
          <rect x="192" y="66" width="136" height="52" rx="6" />
          <text className="gr-svg-t" x="260" y="86" textAnchor="middle">2:4 Sparse MMA</text>
          <text className="gr-svg-s" x="260" y="100" textAnchor="middle">2-bit Index Metadata</text>
          <text className="gr-svg-s" x="260" y="112" textAnchor="middle">2× Peak Skip-Zero</text>
        </g>

        {/* cp.async path (Pin 4) */}
        <g className={`gr-svg-node blue ${hi(4)}`} onClick={() => onSelectPin(4)}>
          <rect x="34" y="128" width="294" height="58" rx="6" />
          <text className="gr-svg-t" x="181" y="147" textAnchor="middle">192 KB L1 / SMEM + cp.async Direct Copy</text>
          <text className="gr-svg-s" x="181" y="162" textAnchor="middle">Global → SMEM bypasses Register File</text>
          <text className="gr-svg-s" x="181" y="175" textAnchor="middle">Overlaps Async Prefetch with Tensor Core Compute</text>
        </g>

        {/* Right: MIG Hard Partitioning (Pin 3) */}
        <g className={`gr-svg-node amber ${hi(3)}`} onClick={() => onSelectPin(3)}>
          <rect x="352" y="40" width="186" height="156" rx="8" />
          <text className="gr-svg-t" x="445" y="60" textAnchor="middle">MIG Hardware Isolation</text>
          <text className="gr-svg-s" x="445" y="74" textAnchor="middle">Up to 7× Isolated GPU Instances</text>
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <rect className="gr-svg-box" x="366" y={84 + row * 34} width="158" height="26" rx="5" />
              <text className="gr-svg-s" x="445" y={100 + row * 34} textAnchor="middle">
                {row === 0 ? 'Instance 1: Dedicated SMs + L2 + HBM' : row === 1 ? 'Instance 2: Dedicated SMs + L2 + HBM' : 'Instance 3..7: QoS Fault-Isolated'}
              </text>
            </g>
          ))}
        </g>

        {/* Bottom: 40MB L2 + HBM2e + NVLink 3 (Pin 4) */}
        <g className={`gr-svg-node blue ${hi(4)}`} onClick={() => onSelectPin(4)}>
          <rect x="22" y="208" width="170" height="46" rx="7" />
          <text className="gr-svg-t" x="107" y="229" textAnchor="middle">40 MB Split L2 (6.7×)</text>
          <text className="gr-svg-s" x="107" y="243" textAnchor="middle">Higher Cache Residency</text>
        </g>
        <rect className="gr-svg-box" x="202" y="208" width="176" height="46" rx="7" />
        <text className="gr-svg-t" x="290" y="229" textAnchor="middle">80 GB HBM2e · 2.0 TB/s</text>
        <text className="gr-svg-s" x="290" y="243" textAnchor="middle">5120-bit Memory Bus</text>

        <rect className="gr-svg-box" x="388" y="208" width="150" height="46" rx="7" />
        <text className="gr-svg-t" x="463" y="229" textAnchor="middle">NVLink 3 · 600 GB/s</text>
        <text className="gr-svg-s" x="463" y="243" textAnchor="middle">12 Links · NVSwitch</text>

        <Pin num={1} x={34} y={66} active={activePin === 1} onSelect={onSelectPin} />
        <Pin num={2} x={192} y={66} active={activePin === 2} onSelect={onSelectPin} />
        <Pin num={3} x={352} y={40} active={activePin === 3} onSelect={onSelectPin} />
        <Pin num={4} x={34} y={128} active={activePin === 4} onSelect={onSelectPin} />
      </svg>
    );
  }

  if (gen === 'hopper') {
    return (
      <svg className="gr-arch-svg" viewBox="0 0 560 278" role="img" aria-label="Hopper GH100 Architecture Diagram">
        <rect className="gr-svg-die" x="10" y="10" width="540" height="258" rx="10" />
        <text className="gr-svg-hdr" x="22" y="29">Hopper GH100 (H100) · 132 SMs · Transformer Dataflow Engine</text>

        {/* Thread Block Cluster (Pin 3) */}
        <g className={`gr-svg-node emerald ${hi(3)}`} onClick={() => onSelectPin(3)}>
          <rect x="22" y="40" width="516" height="156" rx="8" />
          <text className="gr-svg-lbl" x="46" y="57">Thread Block Cluster (SM-to-SM Network · Distributed Shared Memory DSMEM)</text>
        </g>

        {/* SM 0 detailed */}
        <rect className="gr-svg-shell" x="34" y="66" width="328" height="120" rx="7" />
        <text className="gr-svg-lbl" x="44" y="81">SM 0 (Warp-Specialized Async Pipeline)</text>

        <g className={`gr-svg-node indigo ${hi(1)}`} onClick={() => onSelectPin(1)}>
          <rect x="44" y="88" width="194" height="44" rx="6" />
          <text className="gr-svg-t" x="141" y="106" textAnchor="middle">Gen-4 TC (FP8 + WGMMA)</text>
          <text className="gr-svg-s" x="141" y="121" textAnchor="middle">Transformer Engine Dynamic Scale</text>
        </g>
        <g className={`gr-svg-node amber ${hi(4)}`} onClick={() => onSelectPin(4)}>
          <rect x="246" y="88" width="106" height="44" rx="6" />
          <text className="gr-svg-t" x="299" y="106" textAnchor="middle">DPX + DevGraph</text>
          <text className="gr-svg-s" x="299" y="121" textAnchor="middle">GPU-side Launch</text>
        </g>

        <g className={`gr-svg-node blue ${hi(2)}`} onClick={() => onSelectPin(2)}>
          <rect x="44" y="138" width="150" height="40" rx="6" />
          <text className="gr-svg-t" x="119" y="155" textAnchor="middle">TMA Hardware DMA</text>
          <text className="gr-svg-s" x="119" y="169" textAnchor="middle">1-Thread 1D–5D Tile Copy</text>
        </g>
        <rect className="gr-svg-box" x="202" y="138" width="150" height="40" rx="6" />
        <text className="gr-svg-t" x="277" y="155" textAnchor="middle">228 KB SMEM / L1</text>
        <text className="gr-svg-s" x="277" y="169" textAnchor="middle">Feeds WGMMA directly</text>

        {/* Neighbor SM 1..3 in Cluster */}
        <line className="gr-svg-arrow" x1="362" y1="156" x2="386" y2="156" />
        <rect className="gr-svg-shell" x="386" y="66" width="140" height="120" rx="7" />
        <text className="gr-svg-t" x="456" y="104" textAnchor="middle">Neighbor SMs</text>
        <text className="gr-svg-s" x="456" y="120" textAnchor="middle">(SM 1 .. SM 7)</text>
        <rect className="gr-svg-box" x="398" y="136" width="116" height="38" rx="6" />
        <text className="gr-svg-t" x="456" y="153" textAnchor="middle">Remote SMEM</text>
        <text className="gr-svg-s" x="456" y="167" textAnchor="middle">Direct DSMEM R/W</text>

        {/* Bottom: L2 + HBM3 + NVLink 4 */}
        <rect className="gr-svg-box" x="22" y="208" width="142" height="46" rx="7" />
        <text className="gr-svg-t" x="93" y="229" textAnchor="middle">50 MB L2 Cache</text>
        <text className="gr-svg-s" x="93" y="243" textAnchor="middle">L2 Multicast</text>

        <rect className="gr-svg-box" x="174" y="208" width="194" height="46" rx="7" />
        <text className="gr-svg-t" x="271" y="229" textAnchor="middle">80 GB HBM3 · 3.35 TB/s</text>
        <text className="gr-svg-s" x="271" y="243" textAnchor="middle">Async TMA Tile Streams</text>

        <rect className="gr-svg-box" x="378" y="208" width="160" height="46" rx="7" />
        <text className="gr-svg-t" x="458" y="229" textAnchor="middle">NVLink 4 · 900 GB/s</text>
        <text className="gr-svg-s" x="458" y="243" textAnchor="middle">18 Links · NVSwitch 3</text>

        <Pin num={1} x={44} y={88} active={activePin === 1} onSelect={onSelectPin} />
        <Pin num={2} x={44} y={138} active={activePin === 2} onSelect={onSelectPin} />
        <Pin num={3} x={22} y={40} active={activePin === 3} onSelect={onSelectPin} />
        <Pin num={4} x={246} y={88} active={activePin === 4} onSelect={onSelectPin} />
      </svg>
    );
  }

  if (gen === 'blackwell') {
    return (
      <svg className="gr-arch-svg" viewBox="0 0 560 278" role="img" aria-label="Blackwell B200 / NVL72 Architecture Diagram">
        <rect className="gr-svg-die" x="10" y="10" width="540" height="258" rx="10" />
        <text className="gr-svg-hdr" x="22" y="29">Blackwell B200 / GB200 · Dual-Die Unified GPU &amp; Rack Fabric</text>

        {/* Die 0 */}
        <g className={`gr-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
          <rect x="22" y="42" width="214" height="148" rx="8" />
          <text className="gr-svg-lbl" x="44" y="59">Reticle-Limited Die 0</text>
        </g>
        <g className={`gr-svg-node indigo ${hi(2)}`} onClick={() => onSelectPin(2)}>
          <rect x="34" y="68" width="190" height="50" rx="6" />
          <text className="gr-svg-t" x="129" y="88" textAnchor="middle">Gen-5 Tensor Core</text>
          <text className="gr-svg-s" x="129" y="103" textAnchor="middle">NVFP4 / MXFP4 Micro-Scaling</text>
        </g>
        <g className={`gr-svg-node amber ${hi(3)}`} onClick={() => onSelectPin(3)}>
          <rect x="34" y="126" width="190" height="52" rx="6" />
          <text className="gr-svg-t" x="129" y="146" textAnchor="middle">2nd-Gen TE + RAS Engine</text>
          <text className="gr-svg-s" x="129" y="161" textAnchor="middle">FP4/FP6/FP8 · Confidential AI</text>
        </g>

        {/* 10 TB/s NV-HBI Bridge (Pin 1) */}
        <g className={`gr-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
          <rect x="242" y="76" width="76" height="82" rx="6" />
          <text className="gr-svg-t" x="280" y="106" textAnchor="middle">NV-HBI</text>
          <text className="gr-svg-t" x="280" y="122" textAnchor="middle">10 TB/s</text>
          <text className="gr-svg-s" x="280" y="138" textAnchor="middle">Coherent</text>
          <text className="gr-svg-s" x="280" y="150" textAnchor="middle">Single GPU</text>
        </g>

        {/* Die 1 */}
        <g className={`gr-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
          <rect x="324" y="42" width="214" height="148" rx="8" />
          <text className="gr-svg-lbl" x="336" y="59">Reticle-Limited Die 1</text>
        </g>
        <g className={`gr-svg-node indigo ${hi(2)}`} onClick={() => onSelectPin(2)}>
          <rect x="336" y="68" width="190" height="50" rx="6" />
          <text className="gr-svg-t" x="431" y="88" textAnchor="middle">Gen-5 Tensor Core</text>
          <text className="gr-svg-s" x="431" y="103" textAnchor="middle">Unified Cache-Coherent Compute</text>
        </g>
        <rect className="gr-svg-box" x="336" y="126" width="190" height="52" rx="6" />
        <text className="gr-svg-t" x="431" y="146" textAnchor="middle">192 GB HBM3e (8.0 TB/s)</text>
        <text className="gr-svg-s" x="431" y="161" textAnchor="middle">Shared across Die 0 + Die 1</text>

        {/* Bottom: NVLink 5 & GB200 NVL72 (Pin 4) */}
        <g className={`gr-svg-node emerald ${hi(4)}`} onClick={() => onSelectPin(4)}>
          <rect x="22" y="204" width="516" height="52" rx="8" />
          <text className="gr-svg-t" x="280" y="226" textAnchor="middle">NVLink 5 (1.8 TB/s / GPU) → GB200 NVL72 Rack Domain</text>
          <text className="gr-svg-s" x="280" y="242" textAnchor="middle">72 Blackwell GPUs + 36 Grace CPUs · 130 TB/s Coherent Scale-Up Fabric</text>
        </g>

        <Pin num={1} x={280} y={74} active={activePin === 1} onSelect={onSelectPin} />
        <Pin num={2} x={34} y={68} active={activePin === 2} onSelect={onSelectPin} />
        <Pin num={3} x={34} y={126} active={activePin === 3} onSelect={onSelectPin} />
        <Pin num={4} x={22} y={204} active={activePin === 4} onSelect={onSelectPin} />
      </svg>
    );
  }

  // Rubin / Vera Rubin NVL72 (Strictly System-Level Platform View!)
  return (
    <svg className="gr-arch-svg" viewBox="0 0 560 278" role="img" aria-label="Vera Rubin NVL72 System Platform Diagram">
      <rect className="gr-svg-die" x="10" y="10" width="540" height="258" rx="10" />
      <text className="gr-svg-hdr" x="22" y="29">Vera Rubin NVL72 · System-Level Platform View (Preliminary Public Specs)</text>

      {/* Outer Rack Unit (Pin 1) */}
      <g className={`gr-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
        <rect x="22" y="40" width="354" height="156" rx="8" />
        <text className="gr-svg-lbl" x="46" y="57">NVL72 Rack Supernode (Co-Designed Architecture Unit)</text>
      </g>

      {/* Vera CPUs */}
      <rect className="gr-svg-box" x="34" y="66" width="140" height="54" rx="6" />
      <text className="gr-svg-t" x="104" y="88" textAnchor="middle">36× Vera CPUs</text>
      <text className="gr-svg-s" x="104" y="103" textAnchor="middle">Host Control &amp; KV Offload</text>

      {/* Rubin GPUs + HBM4 (Pin 2) */}
      <g className={`gr-svg-node indigo ${hi(2)}`} onClick={() => onSelectPin(2)}>
        <rect x="184" y="66" width="180" height="54" rx="6" />
        <text className="gr-svg-t" x="274" y="86" textAnchor="middle">72× Rubin GPUs + HBM4</text>
        <text className="gr-svg-s" x="274" y="101" textAnchor="middle">288 GB &amp; 22 TB/s per GPU</text>
        <text className="gr-svg-s" x="274" y="113" textAnchor="middle">20.7 TB · 1,580 TB/s / Rack</text>
      </g>

      {/* NVLink 6 / NVSwitch (Pin 3) */}
      <g className={`gr-svg-node emerald ${hi(3)}`} onClick={() => onSelectPin(3)}>
        <rect x="34" y="130" width="330" height="54" rx="6" />
        <text className="gr-svg-t" x="199" y="152" textAnchor="middle">NVLink 6 + NVSwitch Scale-Up Fabric</text>
        <text className="gr-svg-s" x="199" y="168" textAnchor="middle">3.6 TB/s per GPU · 260 TB/s Rack All-to-All</text>
      </g>

      {/* Right: Scale-Out, DPU, Power & Cooling (Pin 4) */}
      <g className={`gr-svg-node amber ${hi(4)}`} onClick={() => onSelectPin(4)}>
        <rect x="388" y="40" width="150" height="156" rx="8" />
        <text className="gr-svg-t" x="463" y="64" textAnchor="middle">POD &amp; Offload Plane</text>
        <rect className="gr-svg-box" x="400" y="76" width="126" height="32" rx="5" />
        <text className="gr-svg-s" x="463" y="96" textAnchor="middle">ConnectX-9 SuperNIC</text>
        <rect className="gr-svg-box" x="400" y="114" width="126" height="32" rx="5" />
        <text className="gr-svg-s" x="463" y="134" textAnchor="middle">BlueField-4 DPU</text>
        <rect className="gr-svg-box" x="400" y="152" width="126" height="32" rx="5" />
        <text className="gr-svg-s" x="463" y="172" textAnchor="middle">Liquid Cooling &amp; Power</text>
      </g>

      {/* Bottom Scale-Out Banner */}
      <rect className="gr-svg-box" x="22" y="208" width="516" height="46" rx="7" />
      <text className="gr-svg-t" x="280" y="229" textAnchor="middle">Multi-Rack AI Factory POD · InfiniBand / Spectrum-X Scale-Out</text>
      <text className="gr-svg-s" x="280" y="243" textAnchor="middle">System-level view only — internal SM / cache microarchitecture intentionally not speculated</text>

      <Pin num={1} x={22} y={40} active={activePin === 1} onSelect={onSelectPin} />
      <Pin num={2} x={184} y={66} active={activePin === 2} onSelect={onSelectPin} />
      <Pin num={3} x={34} y={130} active={activePin === 3} onSelect={onSelectPin} />
      <Pin num={4} x={388} y={40} active={activePin === 4} onSelect={onSelectPin} />
    </svg>
  );
}
