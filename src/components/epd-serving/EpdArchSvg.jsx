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

export default function EpdArchSvg({ activePin, onSelectPin, lang = 'zh' }) {
  const hi = (n) => (activePin === n ? 'hl' : '');
  const isZh = lang === 'zh';

  // Wide 640 viewBox with generous 36px gaps so 16MB & RDMA labels never touch node borders
  return (
    <svg
      className="ep-svg"
      viewBox="0 0 640 206"
      role="img"
      aria-label={isZh ? '多模态 EPD 三阶段分离架构图' : 'EPD 3-Stage Multimodal Serving Architecture'}
    >
      <rect className="ep-svg-bg" x="6" y="6" width="628" height="194" rx="9" />
      <text className="ep-svg-hdr" x="18" y="24">
        {isZh
          ? '多模态 EPD 三分离架构 · E→P (~16 MiB 视觉向量) vs P→D (~320 MiB 70B GQA KV)'
          : 'EPD Disaggregated Serving · E→P (~16 MiB Emb) vs P→D (~320 MiB 70B GQA KV)'}
      </text>

      {/* ① Async Media Preprocess */}
      <g className={`ep-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
        <rect x="16" y="38" width="122" height="106" rx="7" />
        <text className="ep-svg-t" x="77" y="60" textAnchor="middle">{isZh ? '媒体预处理池' : 'Media Worker'}</text>
        <text className="ep-svg-s" x="77" y="76" textAnchor="middle">{isZh ? 'CPU / GPU nvJPEG' : 'CPU / GPU nvJPEG'}</text>
        <text className="ep-svg-s" x="77" y="94" textAnchor="middle">{isZh ? '解码 + 缩放归一化' : 'Decode + Resize'}</text>
        <text className="ep-svg-s" x="77" y="109" textAnchor="middle">{isZh ? '锁页内存 DMA' : 'Pinned H2D DMA'}</text>
        <text className="ep-svg-s" x="77" y="126" textAnchor="middle">{isZh ? '异步无阻塞池' : 'Async Pool'}</text>
      </g>

      <line className="ep-svg-edge" x1="138" y1="90" x2="164" y2="90" />

      {/* ② Encode Pool */}
      <g className={`ep-svg-node indigo ${hi(2)}`} onClick={() => onSelectPin(2)}>
        <rect x="164" y="38" width="128" height="106" rx="7" />
        <text className="ep-svg-t" x="228" y="60" textAnchor="middle">{isZh ? 'Encode 编码池 (E)' : 'Encode Pool (E)'}</text>
        <text className="ep-svg-s" x="228" y="76" textAnchor="middle">{isZh ? '无状态 ViT 节点' : 'Stateless ViT GPUs'}</text>
        <text className="ep-svg-s" x="228" y="94" textAnchor="middle">{isZh ? 'SHA256 向量缓存' : 'SHA256 Emb Cache'}</text>
        <text className="ep-svg-s" x="228" y="109" textAnchor="middle">{isZh ? '按 Patch 预算拼批' : 'Patch-Budget Batch'}</text>
        <text className="ep-svg-s" x="228" y="126" textAnchor="middle">→ 16 MiB Emb</text>
      </g>

      <line className="ep-svg-edge hi" x1="292" y1="90" x2="334" y2="90" />
      <text className="ep-svg-s" x="313" y="81" textAnchor="middle">16MB</text>

      {/* ③ Prefill Pool */}
      <g className={`ep-svg-node amber ${hi(3)}`} onClick={() => onSelectPin(3)}>
        <rect x="334" y="38" width="128" height="106" rx="7" />
        <text className="ep-svg-t" x="398" y="60" textAnchor="middle">{isZh ? 'Prefill 计算池 (P)' : 'Prefill Pool (P)'}</text>
        <text className="ep-svg-s" x="398" y="76" textAnchor="middle">{isZh ? '70B LLM 算力池' : '70B LLM Compute'}</text>
        <text className="ep-svg-s" x="398" y="94" textAnchor="middle">{isZh ? '图文 Token 融合' : 'Merge Vis + Text'}</text>
        <text className="ep-svg-s" x="398" y="109" textAnchor="middle">{isZh ? '纯文本直通快路' : 'Text-Only Fast Path'}</text>
        <text className="ep-svg-s" x="398" y="126" textAnchor="middle">→ 320 MiB KV</text>
      </g>

      <line className="ep-svg-edge hi" x1="462" y1="90" x2="504" y2="90" />
      <text className="ep-svg-s" x="483" y="81" textAnchor="middle">RDMA</text>

      {/* ④ Decode Pool */}
      <g className={`ep-svg-node emerald ${hi(4)}`} onClick={() => onSelectPin(4)}>
        <rect x="504" y="38" width="120" height="106" rx="7" />
        <text className="ep-svg-t" x="564" y="60" textAnchor="middle">{isZh ? 'Decode 生成池 (D)' : 'Decode Pool (D)'}</text>
        <text className="ep-svg-s" x="564" y="76" textAnchor="middle">{isZh ? '显存带宽受限' : 'Memory-Bound'}</text>
        <text className="ep-svg-s" x="564" y="94" textAnchor="middle">{isZh ? '零 ViT 突刺干扰' : 'Zero ViT Jitter'}</text>
        <text className="ep-svg-s" x="564" y="109" textAnchor="middle">{isZh ? '平稳 19ms TPOT' : 'Smooth 19ms TPOT'}</text>
        <text className="ep-svg-s" x="564" y="126" textAnchor="middle">{isZh ? '流式输出 → 释放' : 'Stream → Free KV'}</text>
      </g>

      <rect className="ep-svg-inner" x="16" y="156" width="608" height="32" rx="6" />
      <text className="ep-svg-s" x="320" y="176" textAnchor="middle">
        {isZh
          ? '模态感知路由：纯文本请求绕过 E 池直入 P 池；E→P 有界信用反压防止视觉 Embedding 堆积 OOM'
          : 'Modality-Aware Router: Pure-Text requests bypass E-Pool directly into P-Pool; E→P Bounded Credits prevent Embedding OOM'}
      </text>

      <Pin num={1} x={16} y={38} active={activePin === 1} onSelect={onSelectPin} />
      <Pin num={2} x={164} y={38} active={activePin === 2} onSelect={onSelectPin} />
      <Pin num={3} x={334} y={38} active={activePin === 3} onSelect={onSelectPin} />
      <Pin num={4} x={504} y={38} active={activePin === 4} onSelect={onSelectPin} />
    </svg>
  );
}
