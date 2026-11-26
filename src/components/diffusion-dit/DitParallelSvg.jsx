import React from 'react';

export function DitParallelSvg({ model, t, lang = 'zh' }) {
  const { mode, gpus, cfgRanks, ulyssesRanks, ringRanks } = model;
  const isZh = lang === 'zh';

  const caption =
    mode === 'single'
      ? t('svg_par_single')
      : mode === 'cfg'
        ? t('svg_par_cfg')
        : t('svg_par_usp');

  const spPerGroup = Math.max(1, Math.round(gpus / cfgRanks));

  return (
    <svg viewBox="0 0 880 198" className="dit-svg-frame" role="img" aria-label={caption}>
      <defs>
        <marker id="dit-par-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" className="dit-svg-marker-em" />
        </marker>
      </defs>

      <text x="18" y="24" className="dit-svg-sub">{caption}</text>

      {mode === 'single' && (
        <g>
          <rect x="220" y="42" width="440" height="132" rx="12" className="dit-svg-box-amber" />
          <text x="242" y="70" className="dit-svg-title">
            {isZh ? 'GPU 0（全序列 N · CFG 串行 Batch=2）' : 'GPU 0 (Full Sequence N · Batch = 2)'}
          </text>
          <rect x="242" y="84" width="186" height="44" rx="6" className="dit-svg-box-active" />
          <text x="256" y="104" className="dit-svg-badge-text">{isZh ? '条件分支 (c)' : 'Conditional (c)'}</text>
          <text x="256" y="120" className="dit-svg-sub">{isZh ? '完整 N Token' : 'Full N tokens'}</text>
          <rect x="448" y="84" width="190" height="44" rx="6" className="dit-svg-box-subtle" />
          <text x="462" y="104" className="dit-svg-title">{isZh ? '无条件分支 (∅)' : 'Unconditional (∅)'}</text>
          <text x="462" y="120" className="dit-svg-sub">{isZh ? '完整 N Token' : 'Full N tokens'}</text>
          <text x="242" y="156" className="dit-svg-sub">
            {isZh ? '零跨卡通信 · 单卡算力完全串行受限' : 'Zero inter-GPU comm · Serial compute bottleneck'}
          </text>
        </g>
      )}

      {mode === 'cfg' && (
        <g>
          <rect x="40" y="44" width="330" height="126" rx="12" className="dit-svg-box-active" />
          <text x="60" y="72" className="dit-svg-title">{isZh ? 'GPU 0 — 条件分支 (c)' : 'GPU 0 — Conditional Branch (c)'}</text>
          <text x="60" y="96" className="dit-svg-sub">{isZh ? 'Batch = 1 · 全序列 N' : 'Batch = 1 · Full Sequence N'}</text>
          <text x="60" y="120" className="dit-svg-sub">{isZh ? '独立前向计算 v_cond' : 'Computes v_cond independently'}</text>
          <text x="60" y="150" className="dit-svg-badge-text">{isZh ? '层内零 AllReduce 通信！' : 'No intra-layer AllReduce!'}</text>

          <rect x="510" y="44" width="330" height="126" rx="12" className="dit-svg-box-emerald" />
          <text x="530" y="72" className="dit-svg-title">{isZh ? 'GPU 1 — 无条件分支 (∅)' : 'GPU 1 — Unconditional Branch (∅)'}</text>
          <text x="530" y="96" className="dit-svg-sub">{isZh ? 'Batch = 1 · 全序列 N' : 'Batch = 1 · Full Sequence N'}</text>
          <text x="530" y="120" className="dit-svg-sub">{isZh ? '独立前向计算 v_uncond' : 'Computes v_uncond independently'}</text>
          <text x="530" y="150" className="dit-svg-badge-text">{isZh ? '每步末尾仅 1 次极小同步' : '1 tiny tensor sync / step'}</text>

          <path d="M 372 106 L 506 106" className="dit-svg-arrow-emerald" markerEnd="url(#dit-par-arr)" markerStart="url(#dit-par-arr)" />
          <rect x="394" y="80" width="90" height="22" rx="5" className="dit-svg-box" />
          <text x="439" y="95" textAnchor="middle" className="dit-svg-badge-text">AllGather 1×</text>
        </g>
      )}

      {mode === 'usp' && cfgRanks === 2 && (
        <g>
          {/* CFG Group 0 (Cond) */}
          <rect x="18" y="40" width="408" height="140" rx="12" className="dit-svg-box-active" />
          <text x="34" y="62" className="dit-svg-title">
            {isZh
              ? `CFG 组 0 (条件) — ${spPerGroup} 卡 (Ulysses ${ulyssesRanks}× · Ring ${ringRanks}×)`
              : `CFG Group 0 (Cond) — ${spPerGroup} GPUs (Ulysses ${ulyssesRanks}× · Ring ${ringRanks}×)`}
          </text>
          {Array.from({ length: Math.min(4, spPerGroup) }).map((_, idx) => {
            const shown = Math.min(4, spPerGroup);
            const w = Math.floor((376 - (shown - 1) * 8) / shown);
            const x = 34 + idx * (w + 8);
            return (
              <g key={`c-${idx}`}>
                <rect x={x} y="76" width={w} height="64" rx="7" className="dit-svg-box" />
                <text x={x + 8} y="96" className="dit-svg-badge-text">
                  {ringRanks > 1 ? `R0-G${idx}` : `GPU ${idx}`}
                </text>
                <text x={x + 8} y="114" className="dit-svg-sub">N/{spPerGroup} seq</text>
                <text x={x + 8} y="130" className="dit-svg-sub">↔ H/{ulyssesRanks}</text>
              </g>
            );
          })}
          <text x="34" y="164" className="dit-svg-sub">
            {ringRanks > 1
              ? (isZh ? `机内 Ulysses ${ulyssesRanks}× All-to-All + 跨环 Ring ${ringRanks}× P2P KV 掩盖` : `Intra-node Ulysses ${ulyssesRanks}× + Outer Ring ${ringRanks}× P2P KV overlap`)
              : (isZh ? `机内 Ulysses ${ulyssesRanks}× All-to-All（16 卡或关 CFG 可触发 Ring）` : `Intra-node Ulysses ${ulyssesRanks}× All-to-All (select 16 GPUs or CFG Off for Ring)`)}
          </text>

          <path d="M 428 110 L 452 110" className="dit-svg-arrow-emerald" markerEnd="url(#dit-par-arr)" markerStart="url(#dit-par-arr)" />

          {/* CFG Group 1 (Uncond) */}
          <rect x="454" y="40" width="408" height="140" rx="12" className="dit-svg-box-emerald" />
          <text x="470" y="62" className="dit-svg-title">
            {isZh
              ? `CFG 组 1 (无条件) — ${spPerGroup} 卡 (Ulysses ${ulyssesRanks}× · Ring ${ringRanks}×)`
              : `CFG Group 1 (Uncond) — ${spPerGroup} GPUs (Ulysses ${ulyssesRanks}× · Ring ${ringRanks}×)`}
          </text>
          {Array.from({ length: Math.min(4, spPerGroup) }).map((_, idx) => {
            const shown = Math.min(4, spPerGroup);
            const w = Math.floor((376 - (shown - 1) * 8) / shown);
            const x = 470 + idx * (w + 8);
            return (
              <g key={`u-${idx}`}>
                <rect x={x} y="76" width={w} height="64" rx="7" className="dit-svg-box" />
                <text x={x + 8} y="96" className="dit-svg-badge-text">
                  {ringRanks > 1 ? `R1-G${idx}` : `GPU ${idx + spPerGroup}`}
                </text>
                <text x={x + 8} y="114" className="dit-svg-sub">N/{spPerGroup} seq</text>
                <text x={x + 8} y="130" className="dit-svg-sub">↔ H/{ulyssesRanks}</text>
              </g>
            );
          })}
          <text x="470" y="164" className="dit-svg-sub">
            {isZh ? 'Block 内部跨 CFG 零通信 · 每步末尾仅 1 次潜空间同步' : 'Zero cross-CFG comm inside blocks · 1 latent sync / step'}
          </text>
        </g>
      )}

      {mode === 'usp' && cfgRanks === 1 && (
        <g>
          <rect x="18" y="40" width="844" height="140" rx="12" className="dit-svg-box-active" />
          <text x="34" y="62" className="dit-svg-title">
            {isZh
              ? `纯序列并行 (CFG 已关) — ${gpus} 卡全部投入 USP (Ulysses ${ulyssesRanks}× · Ring ${ringRanks}×)`
              : `Pure Sequence Parallel (CFG Off) — All ${gpus} GPUs in USP (Ulysses ${ulyssesRanks}× · Ring ${ringRanks}×)`}
          </text>
          {Array.from({ length: Math.min(8, gpus) }).map((_, idx) => {
            const shown = Math.min(8, gpus);
            const w = Math.floor((812 - (shown - 1) * 8) / shown);
            const x = 34 + idx * (w + 8);
            return (
              <g key={`sp-${idx}`}>
                <rect x={x} y="76" width={w} height="64" rx="7" className="dit-svg-box" />
                <text x={x + 6} y="96" className="dit-svg-badge-text">GPU {idx}</text>
                <text x={x + 6} y="114" className="dit-svg-sub">N/{gpus}</text>
                <text x={x + 6} y="130" className="dit-svg-sub">R{Math.floor(idx / ulyssesRanks)}</text>
              </g>
            );
          })}
          <text x="34" y="164" className="dit-svg-sub">
            {isZh
              ? `外层 Ring ${ringRanks} 环 P2P 传递 KV 分片 + 机内 Ulysses ${ulyssesRanks} 路 All-to-All 切分注意力头`
              : `Outer Ring ${ringRanks}× P2P KV exchange + Intra-node Ulysses ${ulyssesRanks}× All-to-All head sharding`}
          </text>
        </g>
      )}
    </svg>
  );
}
