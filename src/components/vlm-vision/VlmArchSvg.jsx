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

export default function VlmArchSvg({ activePin, onSelectPin, lang = 'zh' }) {
  const hi = (n) => (activePin === n ? 'hl' : '');
  const isZh = lang === 'zh';

  return (
    <svg
      className="vl-svg"
      viewBox="0 0 600 202"
      role="img"
      aria-label={isZh ? 'VLM 多模态推理端到端数据流架构' : 'VLM Multimodal Vision-Language Inference Architecture'}
    >
      <rect className="vl-svg-bg" x="6" y="6" width="588" height="190" rx="9" />
      <text className="vl-svg-hdr" x="18" y="24">
        {isZh
          ? 'VLM 端到端数据流 · 动态切片 → ViT 编码器 → Token 压缩投影 → LLM 混合 KV'
          : 'VLM Inference Pipeline · Native Patchify → ViT Encoder → Token Compressor → LLM KV'}
      </text>

      {/* ① Dynamic Patchify */}
      <g className={`vl-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
        <rect x="18" y="38" width="122" height="104" rx="7" />
        <text className="vl-svg-t" x="79" y="60" textAnchor="middle">{isZh ? '图像 / 视频' : 'Image / Video'}</text>
        <text className="vl-svg-t" x="79" y="74" textAnchor="middle">{isZh ? '动态分块打包' : 'Dynamic Patch'}</text>
        <text className="vl-svg-s" x="79" y="94" textAnchor="middle">{isZh ? 'AnyRes 切片或' : 'AnyRes Tiles or'}</text>
        <text className="vl-svg-s" x="79" y="108" textAnchor="middle">{isZh ? 'NaViT 原生打包' : 'NaViT Native Pack'}</text>
        <text className="vl-svg-s" x="79" y="126" textAnchor="middle">{isZh ? '14×14 px 图像块' : '14×14 px Patches'}</text>
      </g>

      <line className="vl-svg-edge" x1="140" y1="90" x2="160" y2="90" />

      {/* ② ViT Encoder */}
      <g className={`vl-svg-node indigo ${hi(2)}`} onClick={() => onSelectPin(2)}>
        <rect x="160" y="38" width="128" height="104" rx="7" />
        <text className="vl-svg-t" x="224" y="60" textAnchor="middle">{isZh ? '视觉编码器' : 'Vision Encoder'}</text>
        <text className="vl-svg-t" x="224" y="74" textAnchor="middle">(ViT / SigLIP)</text>
        <text className="vl-svg-s" x="224" y="94" textAnchor="middle">{isZh ? '2D 窗口 + 全局层' : '2D Window + Full'}</text>
        <text className="vl-svg-s" x="224" y="108" textAnchor="middle">{isZh ? '无状态并行计算' : 'Stateless Compute'}</text>
        <text className="vl-svg-s" x="224" y="126" textAnchor="middle">{isZh ? '突发 SM 算力尖峰' : 'Burst SM Load'}</text>
      </g>

      <line className="vl-svg-edge hi" x1="288" y1="90" x2="308" y2="90" />

      {/* ③ Projector / Compressor */}
      <g className={`vl-svg-node amber ${hi(3)}`} onClick={() => onSelectPin(3)}>
        <rect x="308" y="38" width="128" height="104" rx="7" />
        <text className="vl-svg-t" x="372" y="60" textAnchor="middle">{isZh ? '投影器与' : 'Projector &'}</text>
        <text className="vl-svg-t" x="372" y="74" textAnchor="middle">{isZh ? 'Token 合并压缩' : 'Token Merger'}</text>
        <text className="vl-svg-s" x="372" y="94" textAnchor="middle">2×2 Pixel-Shuffle</text>
        <text className="vl-svg-s" x="372" y="108" textAnchor="middle">{isZh ? '4:1 / 8:1 降维' : '4:1 / 8:1 Compress'}</text>
        <text className="vl-svg-s" x="372" y="126" textAnchor="middle">{isZh ? '对齐至 d_LLM' : 'Align → d_LLM'}</text>
      </g>

      <line className="vl-svg-edge hi" x1="436" y1="90" x2="456" y2="90" />

      {/* ④ LLM Backbone + M-RoPE */}
      <g className={`vl-svg-node emerald ${hi(4)}`} onClick={() => onSelectPin(4)}>
        <rect x="456" y="38" width="126" height="104" rx="7" />
        <text className="vl-svg-t" x="519" y="60" textAnchor="middle">{isZh ? 'LLM 骨干网' : 'LLM Backbone'}</text>
        <text className="vl-svg-t" x="519" y="74" textAnchor="middle">+ 3D M-RoPE</text>
        <text className="vl-svg-s" x="519" y="94" textAnchor="middle">{isZh ? '[文本, 视觉, 文本]' : '[Text, Vis, Text]'}</text>
        <text className="vl-svg-s" x="519" y="108" textAnchor="middle">{isZh ? '共享分页 KV 池' : 'Shared Paged KV'}</text>
        <text className="vl-svg-s" x="519" y="126" textAnchor="middle">{isZh ? '因果 Prefill/Decode' : 'Causal Prefill/Dec'}</text>
      </g>

      <rect className="vl-svg-inner" x="18" y="154" width="564" height="30" rx="6" />
      <text className="vl-svg-s" x="300" y="173" textAnchor="middle">
        {isZh
          ? '视觉 Token 与文本共占 LLM KV Cache —— 每次 4× 合并可将下游 Attention 算力压至 1/16、KV 显存压至 1/4'
          : 'Visual tokens enter LLM KV Cache alongside text — every 4× merge cuts downstream Attention FLOPs by 16× and KV bytes by 4×'}
      </text>

      <Pin num={1} x={18} y={38} active={activePin === 1} onSelect={onSelectPin} />
      <Pin num={2} x={160} y={38} active={activePin === 2} onSelect={onSelectPin} />
      <Pin num={3} x={308} y={38} active={activePin === 3} onSelect={onSelectPin} />
      <Pin num={4} x={456} y={38} active={activePin === 4} onSelect={onSelectPin} />
    </svg>
  );
}
