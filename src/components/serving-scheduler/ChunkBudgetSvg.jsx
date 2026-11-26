import React from 'react';

export default function ChunkBudgetSvg({ model, lang = 'zh' }) {
  const { tokenBudget, promptLen, activeDecodes, prefillRoom, chunks, unchunkedStallMs, chunkedTpotMs, decodePct } = model;
  const shownChunks = Math.min(4, chunks);
  const isZh = lang === 'zh';

  // Reactive proportional split inside each chunk card (total inner bar = 102px)
  const decW = Math.max(26, Math.min(54, Math.round((decodePct / 100) * 102)));
  const preW = 102 - decW - 4;

  return (
    <svg
      className="sc2-svg"
      viewBox="0 0 600 150"
      role="img"
      aria-label={isZh ? 'Chunked Prefill Token 预算切分图' : 'Chunked Prefill Token Budget Packing'}
    >
      <rect className="sc2-svg-bg" x="4" y="4" width="592" height="142" rx="8" />
      <text className="sc2-svg-hdr" x="14" y="21">
        {isZh
          ? `Sarathi / vLLM V1 分块 Prefill：${promptLen.toLocaleString()} tok 切分为 ${chunks} 块（单步预算 = ${tokenBudget}）`
          : `Sarathi / vLLM V1 Chunked Prefill: ${promptLen.toLocaleString()}-tok Prompt Split Into ${chunks} Chunks (Budget = ${tokenBudget})`}
      </text>

      {/* Top row: Unchunked Monolithic Stall */}
      <text className="sc2-svg-s" x="14" y="44">{isZh ? '未分块:' : 'Unchunked:'}</text>
      <g className="sc2-svg-node warn">
        <rect x="92" y="31" width="380" height="24" rx="5" />
        <text className="sc2-svg-s" x="282" y="46" textAnchor="middle">
          {isZh
            ? `整段 ${promptLen.toLocaleString()}-tok Prefill（同批 Decode 冻结 ${unchunkedStallMs} ms！）`
            : `Monolithic ${promptLen.toLocaleString()}-tok Prefill (${unchunkedStallMs} ms Decode Freeze!)`}
        </text>
      </g>
      <g className="sc2-svg-node emerald">
        <rect x="478" y="31" width="108" height="24" rx="5" />
        <text className="sc2-svg-s" x="532" y="46" textAnchor="middle">{isZh ? 'Decode 恢复' : 'Decode Resumes'}</text>
      </g>

      {/* Bottom row: Chunked Piggyback Iterations */}
      <text className="sc2-svg-s" x="14" y="88">{isZh ? '分块后:' : 'Chunked:'}</text>
      {Array.from({ length: shownChunks }, (_, idx) => {
        const w = 114;
        const x = 92 + idx * (w + 8);
        return (
          <g key={idx}>
            <rect x={x} y="66" width={w} height="48" rx="6" className="sc2-svg-inner" />
            <text className="sc2-svg-s" x={x + w / 2} y="78" textAnchor="middle">
              {isZh ? `步 ${idx + 1} (${chunkedTpotMs}ms)` : `Iter ${idx + 1} (${chunkedTpotMs}ms)`}
            </text>
            <g className="sc2-svg-node emerald">
              <rect x={x + 6} y="83" width={decW} height="24" rx="4" />
              <text className="sc2-svg-s" x={x + 6 + decW / 2} y="98" textAnchor="middle">{activeDecodes}D</text>
            </g>
            <g className="sc2-svg-node indigo">
              <rect x={x + 6 + decW + 4} y="83" width={preW} height="24" rx="4" />
              <text className="sc2-svg-s" x={x + 6 + decW + 4 + preW / 2} y="98" textAnchor="middle">{prefillRoom}P</text>
            </g>
          </g>
        );
      })}
      {chunks > 4 && (
        <text className="sc2-svg-t" x="582" y="94" textAnchor="end">+{chunks - 4}</text>
      )}

      <text className="sc2-svg-s" x="14" y="133">
        {isZh
          ? `每步以 ~8% 分块额外开销换取流畅解码：将 ${prefillRoom} Prefill Token 搭便车拼入 ${activeDecodes} 路 Decode，单步 TPOT 从 ${unchunkedStallMs} ms 降至 ${chunkedTpotMs} ms。`
          : `Pays ~8% chunking overhead for smooth streaming: piggybacks ${prefillRoom} prefill tokens onto ${activeDecodes} decodes, cutting TPOT ${unchunkedStallMs}ms → ${chunkedTpotMs}ms.`}
      </text>
    </svg>
  );
}
