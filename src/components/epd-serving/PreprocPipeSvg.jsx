import React from 'react';

export default function PreprocPipeSvg({ preprocMode = 'async_nvjpeg', lang = 'zh' }) {
  const isAsync = preprocMode === 'async_nvjpeg';
  const isZh = lang === 'zh';
  return (
    <svg
      className="ep-svg"
      viewBox="0 0 600 124"
      role="img"
      aria-label={isZh ? '多模态媒体异步预处理流水线' : 'Multimodal Media Preprocessing Pipeline'}
    >
      <rect className="ep-svg-bg" x="4" y="4" width="592" height="116" rx="8" />
      <text className="ep-svg-hdr" x="14" y="21">
        {isAsync
          ? (isZh ? '异步预处理池 + GPU 硬件 nvJPEG + 锁页环形缓冲（Batch N+1 与 GPU 计算完全重叠）' : 'Async Media Pool + GPU Hardware nvJPEG + Pinned Ring Buffer (Overlaps Batch N+1 With Compute)')
          : (isZh ? '同步 Python PIL / OpenCV 主循环解码（GPU 有 44% 时间空等 CPU 像素）' : 'Synchronous Python PIL / OpenCV Main-Loop Decode (GPU Sits Idle 44% Waiting on CPU)')}
      </text>

      {[
        {
          x: 14,
          w: 122,
          cls: 'blue',
          t: isZh ? '1. HTTP / Base64' : '1. HTTP / Base64',
          s: isZh ? '4× 4K JPEG 字节' : '4× 4K JPEG Bytes',
        },
        {
          x: 158,
          w: 132,
          cls: isAsync ? 'emerald' : 'amber',
          t: isAsync ? (isZh ? '2. GPU nvJPEG/DALI' : '2. GPU nvJPEG/DALI') : (isZh ? '2. CPU PIL 解码' : '2. CPU PIL Decode'),
          s: isAsync ? (isZh ? '12 ms 硬件异步' : '12 ms HW Async') : (isZh ? '48 ms 同步 GIL' : '48 ms Sync GIL'),
        },
        {
          x: 312,
          w: 132,
          cls: isAsync ? 'emerald' : 'amber',
          t: isAsync ? (isZh ? '3. 锁页 H2D 环' : '3. Pinned H2D Ring') : (isZh ? '3. 分页阻塞拷贝' : '3. Pageable Copy'),
          s: isAsync ? (isZh ? 'DMA 异步流重叠' : 'DMA Overlap Stream') : (isZh ? '阻塞 H2D 同步' : 'Blocking H2D Sync'),
        },
        {
          x: 466,
          w: 120,
          cls: 'indigo',
          t: isZh ? '4. ViT 编码 GPU' : '4. ViT Encode GPU',
          s: isAsync ? (isZh ? '94% SM 繁忙 ✓' : '94% SM Busy ✓') : (isZh ? '56% SM 繁忙 ⚠' : '56% SM Busy ⚠'),
        },
      ].map((n, idx, arr) => (
        <g key={n.t}>
          <g className={`ep-svg-node ${n.cls}`}>
            <rect x={n.x} y="34" width={n.w} height="52" rx="6" />
            <text className="ep-svg-t" x={n.x + n.w / 2} y="54" textAnchor="middle">{n.t}</text>
            <text className="ep-svg-s" x={n.x + n.w / 2} y="72" textAnchor="middle">{n.s}</text>
          </g>
          {idx < arr.length - 1 && (
            <line
              className={`ep-svg-edge ${isAsync ? 'hi' : ''}`}
              x1={n.x + n.w}
              y1="60"
              x2={arr[idx + 1].x}
              y2="60"
            />
          )}
        </g>
      ))}

      <text className="ep-svg-s" x="14" y="106">
        {isAsync
          ? (isZh ? '独立媒体 Worker 搭配 GPU NVDEC/nvJPEG 将下一批像素异步解码至锁页内存，彻底消除 Python GIL 阻塞。' : 'Media workers + GPU NVDEC/nvJPEG decode into pinned host buffers while GPU executes Batch N—eliminating GIL stalls.')
          : (isZh ? '在调度主事件循环里同步解码 4 张 4K 图会冻结每次 GPU 前向计算，直接拉垮集群有效吞吐。' : 'Decoding 4 uncompressed 4K images on the scheduler event loop stalls every GPU forward pass and crashes goodput.')}
      </text>
    </svg>
  );
}
