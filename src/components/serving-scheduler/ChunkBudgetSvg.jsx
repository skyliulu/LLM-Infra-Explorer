import React from 'react';

export default function ChunkBudgetSvg({ model }) {
  const { tokenBudget, promptLen, activeDecodes, prefillRoom, chunks, unchunkedStallMs, chunkedTpotMs } = model;
  const shownChunks = Math.min(4, chunks);

  return (
    <svg className="sc2-svg" viewBox="0 0 600 150" role="img" aria-label="Chunked Prefill Token Budget Packing">
      <rect className="sc2-svg-bg" x="4" y="4" width="592" height="142" rx="8" />
      <text className="sc2-svg-hdr" x="14" y="21">
        Sarathi / vLLM V1 Chunked Prefill: {promptLen.toLocaleString()}-tok Prompt Split Into {chunks} Chunks (Budget = {tokenBudget})
      </text>

      {/* Top row: Unchunked Monolithic Stall */}
      <text className="sc2-svg-s" x="14" y="44">Unchunked:</text>
      <g className="sc2-svg-node warn">
        <rect x="92" y="31" width="380" height="24" rx="5" />
        <text className="sc2-svg-s" x="282" y="46" textAnchor="middle">
          Monolithic {promptLen.toLocaleString()}-tok Prefill ({unchunkedStallMs} ms Decode Freeze!)
        </text>
      </g>
      <g className="sc2-svg-node emerald">
        <rect x="478" y="31" width="108" height="24" rx="5" />
        <text className="sc2-svg-s" x="532" y="46" textAnchor="middle">Decode Resumes</text>
      </g>

      {/* Bottom row: Chunked Piggyback Iterations */}
      <text className="sc2-svg-s" x="14" y="88">Chunked:</text>
      {Array.from({ length: shownChunks }, (_, idx) => {
        const w = 114;
        const x = 92 + idx * (w + 8);
        return (
          <g key={idx}>
            <rect x={x} y="66" width={w} height="48" rx="6" className="sc2-svg-inner" />
            <text className="sc2-svg-s" x={x + w / 2} y="78" textAnchor="middle">Iter {idx + 1} ({chunkedTpotMs}ms)</text>
            <g className="sc2-svg-node emerald">
              <rect x={x + 6} y="83" width="38" height="24" rx="4" />
              <text className="sc2-svg-s" x={x + 25} y="98" textAnchor="middle">{activeDecodes}D</text>
            </g>
            <g className="sc2-svg-node indigo">
              <rect x={x + 48} y="83" width="60" height="24" rx="4" />
              <text className="sc2-svg-s" x={x + 78} y="98" textAnchor="middle">{prefillRoom}P</text>
            </g>
          </g>
        );
      })}
      {chunks > 4 && (
        <text className="sc2-svg-t" x="582" y="94" textAnchor="end">+{chunks - 4}</text>
      )}

      <text className="sc2-svg-s" x="14" y="133">
        Each iteration piggybacks {prefillRoom} prefill tokens onto {activeDecodes} decodes: Tensor Cores stay busy while TPOT drops {unchunkedStallMs}ms → {chunkedTpotMs}ms.
      </text>
    </svg>
  );
}
