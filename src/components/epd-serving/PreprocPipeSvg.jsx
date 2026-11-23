import React from 'react';

export default function PreprocPipeSvg({ preprocMode = 'async_nvjpeg' }) {
  const isAsync = preprocMode === 'async_nvjpeg';
  return (
    <svg className="ep-svg" viewBox="0 0 600 124" role="img" aria-label="Multimodal Media Preprocessing Pipeline">
      <rect className="ep-svg-bg" x="4" y="4" width="592" height="116" rx="8" />
      <text className="ep-svg-hdr" x="14" y="21">
        {isAsync
          ? 'Async Media Pool + Hardware nvJPEG + Pinned Ring Buffer (Overlaps Batch N+1 With GPU Compute)'
          : 'Synchronous Python PIL / OpenCV Main-Loop Decode (GPU Sits Idle 44% Waiting on CPU)'}
      </text>

      {[
        { x: 14, w: 122, cls: 'blue', t: '1. HTTP / Base64', s: '4× 4K JPEG Bytes' },
        { x: 158, w: 132, cls: isAsync ? 'emerald' : 'amber', t: isAsync ? '2. nvJPEG / DALI' : '2. CPU PIL Decode', s: isAsync ? '12 ms HW Async' : '48 ms Sync GIL' },
        { x: 312, w: 132, cls: isAsync ? 'emerald' : 'amber', t: isAsync ? '3. Pinned H2D Ring' : '3. Pageable Copy', s: isAsync ? 'DMA Overlap Stream' : 'Blocking H2D Sync' },
        { x: 466, w: 120, cls: 'indigo', t: '4. ViT Encode GPU', s: isAsync ? '94% SM Busy ✓' : '56% SM Busy ⚠' },
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
          ? 'Media workers decode, resize, and normalize into pinned host buffers while GPU executes Batch N—eliminating Python GIL stalls.'
          : 'Decoding 4 uncompressed 4K images on the scheduler event loop stalls every GPU forward pass and crashes cluster goodput.'}
      </text>
    </svg>
  );
}
