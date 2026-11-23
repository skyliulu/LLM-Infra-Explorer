import React from 'react';

export default function PrefixHashSvg({ blockSize = 16, editedBlock1 = false }) {
  return (
    <svg className="pk-svg" viewBox="0 0 600 138" role="img" aria-label="Automatic Prefix Caching Chained Block Hash">
      <rect className="pk-svg-bg" x="4" y="4" width="592" height="130" rx="8" />
      <text className="pk-svg-hdr" x="14" y="21">
        Automatic Prefix Caching (APC): Chained Hash H_i = SHA256(H_(i-1) || Block_i Tokens || LoRA || Salt)
      </text>

      {/* Block 0 — always full & hit */}
      <g className="pk-svg-node emerald">
        <rect x="14" y="34" width="128" height="62" rx="6" />
        <text className="pk-svg-t" x="78" y="52" textAnchor="middle">Block 0 ({blockSize}/{blockSize})</text>
        <text className="pk-svg-s" x="78" y="67" textAnchor="middle">H0 = 0x7f3a…</text>
        <text className="pk-svg-s" x="78" y="83" textAnchor="middle">FULL · CACHE HIT ✓</text>
      </g>
      <line className="pk-svg-edge hi" x1="142" y1="65" x2="168" y2="65" />

      {/* Block 1 — hit or mutated */}
      <g className={`pk-svg-node ${editedBlock1 ? 'warn' : 'emerald'}`}>
        <rect x="170" y="34" width="132" height="62" rx="6" />
        <text className="pk-svg-t" x="236" y="52" textAnchor="middle">Block 1 ({blockSize}/{blockSize})</text>
        <text className="pk-svg-s" x="236" y="67" textAnchor="middle">{editedBlock1 ? 'H1′ = 0x9c1b… (1 tok edit)' : 'H1 = 0x4b20…'}</text>
        <text className="pk-svg-s" x="236" y="83" textAnchor="middle">{editedBlock1 ? 'MISS · RE-PREFILL' : 'FULL · CACHE HIT ✓'}</text>
      </g>
      <line className={`pk-svg-edge ${editedBlock1 ? '' : 'hi'}`} x1="302" y1="65" x2="328" y2="65" />

      {/* Block 2 — cascading invalidation if Block 1 changed */}
      <g className={`pk-svg-node ${editedBlock1 ? 'warn' : 'emerald'}`}>
        <rect x="330" y="34" width="128" height="62" rx="6" />
        <text className="pk-svg-t" x="394" y="52" textAnchor="middle">Block 2 ({blockSize}/{blockSize})</text>
        <text className="pk-svg-s" x="394" y="67" textAnchor="middle">{editedBlock1 ? 'H2′ ≠ H2 (Cascade)' : 'H2 = 0xe108…'}</text>
        <text className="pk-svg-s" x="394" y="83" textAnchor="middle">{editedBlock1 ? 'INVALIDATED ✗' : 'FULL · CACHE HIT ✓'}</text>
      </g>
      <line className="pk-svg-edge" x1="458" y1="65" x2="480" y2="65" />

      {/* Tail Block 3 — partial block NEVER cached */}
      <g className="pk-svg-node amber">
        <rect x="482" y="34" width="104" height="62" rx="6" strokeDasharray="4 2" />
        <text className="pk-svg-t" x="534" y="52" textAnchor="middle">Tail ({Math.max(1, blockSize - 5)}/{blockSize})</text>
        <text className="pk-svg-s" x="534" y="67" textAnchor="middle">Unhashed</text>
        <text className="pk-svg-s" x="534" y="83" textAnchor="middle">Private / Mutable</text>
      </g>

      <text className="pk-svg-s" x="14" y="118">
        {editedBlock1
          ? 'Causal attention makes downstream KV depend on prior tokens: editing 1 token in Block 1 cascades misses to Block 2+ while Block 0 hits.'
          : 'Only full S-token blocks enter the global Hash Table; partial tail blocks stay private until filled, protecting shared pages.'}
      </text>
    </svg>
  );
}
