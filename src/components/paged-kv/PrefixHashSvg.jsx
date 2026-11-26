import React from 'react';

export default function PrefixHashSvg({ blockSize = 16, editedBlock1 = false, lang = 'zh' }) {
  const isZh = lang === 'zh';
  return (
    <svg
      className="pk-svg"
      viewBox="0 0 600 138"
      role="img"
      aria-label={isZh ? '自动前缀缓存链式块哈希' : 'Automatic Prefix Caching Chained Block Hash'}
    >
      <rect className="pk-svg-bg" x="4" y="4" width="592" height="130" rx="8" />
      <text className="pk-svg-hdr" x="14" y="21">
        {isZh
          ? '自动前缀缓存 (APC) 链式哈希: H_i = SHA256(H_(i-1) || Block_i Tokens || LoRA || Salt)'
          : 'Automatic Prefix Caching (APC): Chained Hash H_i = SHA256(H_(i-1) || Block_i Tokens || LoRA || Salt)'}
      </text>

      <g className="pk-svg-node emerald">
        <rect x="14" y="34" width="128" height="62" rx="6" />
        <text className="pk-svg-t" x="78" y="52" textAnchor="middle">Block 0 ({blockSize}/{blockSize})</text>
        <text className="pk-svg-s" x="78" y="67" textAnchor="middle">H0 = 0x7f3a…</text>
        <text className="pk-svg-s" x="78" y="83" textAnchor="middle">{isZh ? '满块 · 缓存命中 ✓' : 'FULL · CACHE HIT ✓'}</text>
      </g>
      <line className="pk-svg-edge hi" x1="142" y1="65" x2="168" y2="65" />

      <g className={`pk-svg-node ${editedBlock1 ? 'warn' : 'emerald'}`}>
        <rect x="170" y="34" width="132" height="62" rx="6" />
        <text className="pk-svg-t" x="236" y="52" textAnchor="middle">Block 1 ({blockSize}/{blockSize})</text>
        <text className="pk-svg-s" x="236" y="67" textAnchor="middle">
          {editedBlock1 ? (isZh ? 'H1′=0x9c1b… (改1词)' : 'H1′ = 0x9c1b… (1 edit)') : 'H1 = 0x4b20…'}
        </text>
        <text className="pk-svg-s" x="236" y="83" textAnchor="middle">
          {editedBlock1 ? (isZh ? '未命中 · 重新 Prefill' : 'MISS · RE-PREFILL') : (isZh ? '满块 · 缓存命中 ✓' : 'FULL · CACHE HIT ✓')}
        </text>
      </g>
      <line className={`pk-svg-edge ${editedBlock1 ? '' : 'hi'}`} x1="302" y1="65" x2="328" y2="65" />

      <g className={`pk-svg-node ${editedBlock1 ? 'warn' : 'emerald'}`}>
        <rect x="330" y="34" width="128" height="62" rx="6" />
        <text className="pk-svg-t" x="394" y="52" textAnchor="middle">Block 2 ({blockSize}/{blockSize})</text>
        <text className="pk-svg-s" x="394" y="67" textAnchor="middle">
          {editedBlock1 ? (isZh ? 'H2′ ≠ H2 (级联失效)' : 'H2′ ≠ H2 (Cascade)') : 'H2 = 0xe108…'}
        </text>
        <text className="pk-svg-s" x="394" y="83" textAnchor="middle">
          {editedBlock1 ? (isZh ? '级联失效 ✗' : 'INVALIDATED ✗') : (isZh ? '满块 · 缓存命中 ✓' : 'FULL · CACHE HIT ✓')}
        </text>
      </g>
      <line className="pk-svg-edge" x1="458" y1="65" x2="480" y2="65" />

      <g className="pk-svg-node amber">
        <rect x="482" y="34" width="104" height="62" rx="6" strokeDasharray="4 2" />
        <text className="pk-svg-t" x="534" y="52" textAnchor="middle">
          {isZh ? `尾块 (${Math.max(1, blockSize - 5)}/${blockSize})` : `Tail (${Math.max(1, blockSize - 5)}/${blockSize})`}
        </text>
        <text className="pk-svg-s" x="534" y="67" textAnchor="middle">{isZh ? '不入哈希表' : 'Unhashed'}</text>
        <text className="pk-svg-s" x="534" y="83" textAnchor="middle">{isZh ? '私有 / 可写' : 'Private / Mutable'}</text>
      </g>

      <text className="pk-svg-s" x="14" y="118">
        {editedBlock1
          ? (isZh
            ? '因果注意力令下游 KV 依赖所有前序 Token：改动 Block 1 中 1 个词会级联失效 Block 2+，仅 Block 0 命中。'
            : 'Causal attention makes downstream KV depend on prior tokens: editing 1 token in Block 1 cascades misses to Block 2+ while Block 0 hits.')
          : (isZh
            ? '仅填满 S 个 Token 的整块才写入全局哈希表；未满尾块保持私有可写，避免污染共享页。'
            : 'Only full S-token blocks enter the global Hash Table; partial tail blocks stay private until filled, protecting shared pages.')}
      </text>
    </svg>
  );
}
