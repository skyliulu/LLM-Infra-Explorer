import React from 'react';

export default function VAttnCompareSvg({ mode = 'pagedattention' }) {
  const isVattn = mode === 'vattention';

  return (
    <svg className="pk-svg" viewBox="0 0 540 166" role="img" aria-label="PagedAttention vs vAttention Memory Architecture">
      <rect className="pk-svg-bg" x="6" y="6" width="528" height="154" rx="8" />
      <text className="pk-svg-hdr" x="18" y="24">
        {isVattn
          ? 'vAttention: Contiguous Virtual Address Space + CUDA VMM On-Demand Physical Mapping'
          : 'PagedAttention: Software Block Table Indirection Inside Paged Attention Kernel'}
      </text>

      {isVattn ? (
        <>
          <g className="pk-svg-node emerald">
            <rect x="20" y="38" width="152" height="50" rx="6" />
            <text className="pk-svg-t" x="96" y="59" textAnchor="middle">Unmodified FlashAttn</text>
            <text className="pk-svg-s" x="96" y="75" textAnchor="middle">Sees Contiguous KV Tensor</text>
          </g>
          <line className="pk-svg-edge hi" x1="172" y1="63" x2="198" y2="63" />
          <g className="pk-svg-node blue">
            <rect x="198" y="38" width="144" height="50" rx="6" />
            <text className="pk-svg-t" x="270" y="59" textAnchor="middle">CUDA VMM Layer</text>
            <text className="pk-svg-s" x="270" y="75" textAnchor="middle">cuMemMap (64KB–2MB)</text>
          </g>
          <line className="pk-svg-edge hi" x1="342" y1="63" x2="368" y2="63" />
          <g className="pk-svg-node indigo">
            <rect x="368" y="38" width="152" height="50" rx="6" />
            <text className="pk-svg-t" x="444" y="59" textAnchor="middle">Physical HBM Pages</text>
            <text className="pk-svg-s" x="444" y="75" textAnchor="middle">Lazy Mapped on Growth</text>
          </g>
          <rect className="pk-svg-shell" x="20" y="102" width="500" height="44" rx="6" />
          <text className="pk-svg-t" x="270" y="121" textAnchor="middle">Virtual Address Range: [0x7F00_0000 .. 0x7F00_FFFF] (Contiguous VA)</text>
          <text className="pk-svg-s" x="270" y="136" textAnchor="middle">Hardware GPU MMU translates VA → PA transparently; coarser page granularity than 16-tok blocks</text>
        </>
      ) : (
        <>
          <g className="pk-svg-node indigo">
            <rect x="20" y="38" width="152" height="50" rx="6" />
            <text className="pk-svg-t" x="96" y="59" textAnchor="middle">PagedAttention Kernel</text>
            <text className="pk-svg-s" x="96" y="75" textAnchor="middle">Reads Block Table B_r[i]</text>
          </g>
          <line className="pk-svg-edge" x1="172" y1="63" x2="198" y2="63" />
          <g className="pk-svg-node amber">
            <rect x="198" y="38" width="144" height="50" rx="6" />
            <text className="pk-svg-t" x="270" y="59" textAnchor="middle">Block Table Lookup</text>
            <text className="pk-svg-s" x="270" y="75" textAnchor="middle">16-Token Fine Blocks</text>
          </g>
          <line className="pk-svg-edge" x1="342" y1="63" x2="368" y2="63" />
          <g className="pk-svg-node emerald">
            <rect x="368" y="38" width="152" height="50" rx="6" />
            <text className="pk-svg-t" x="444" y="59" textAnchor="middle">Scattered HBM Pool</text>
            <text className="pk-svg-s" x="444" y="75" textAnchor="middle">Native CoW &amp; Radix Share</text>
          </g>
          <rect className="pk-svg-shell" x="20" y="102" width="500" height="44" rx="6" />
          <text className="pk-svg-t" x="270" y="121" textAnchor="middle">KV Pool Tensor: [num_blocks, 2, H_kv, block_size=16, d_h]</text>
          <text className="pk-svg-s" x="270" y="136" textAnchor="middle">Zero driver dependency &amp; exact 16-token sharing, at the cost of kernel-level page indirection</text>
        </>
      )}
    </svg>
  );
}
