import React from 'react';

export function DitParallelSvg({ model, t }) {
  const { mode, gpus, cfgRanks, ulyssesRanks, ringRanks } = model;

  const caption =
    mode === 'single'
      ? t('svg_par_single')
      : mode === 'cfg'
        ? t('svg_par_cfg')
        : t('svg_par_usp');

  return (
    <svg viewBox="0 0 880 198" className="dit-svg-frame" role="img" aria-label={caption}>
      <defs>
        <marker id="dit-par-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="light-dark(#059669, #34d399)" />
        </marker>
      </defs>

      <text x="18" y="24" className="dit-svg-sub">{caption}</text>

      {mode === 'single' && (
        <g>
          <rect x="220" y="42" width="440" height="132" rx="12" className="dit-svg-box-amber" />
          <text x="242" y="70" className="dit-svg-title">GPU 0 (Full Sequence N · Batch = 2)</text>
          <rect x="242" y="84" width="186" height="44" rx="6" className="dit-svg-box-active" />
          <text x="256" y="104" className="dit-svg-badge-text">Conditional (c)</text>
          <text x="256" y="120" className="dit-svg-sub">Full N tokens</text>
          <rect x="448" y="84" width="190" height="44" rx="6" className="dit-svg-box-subtle" />
          <text x="462" y="104" className="dit-svg-title">Unconditional (∅)</text>
          <text x="462" y="120" className="dit-svg-sub">Full N tokens</text>
          <text x="242" y="156" className="dit-svg-sub">Zero inter-GPU comm · Serial compute bottleneck</text>
        </g>
      )}

      {mode === 'cfg' && (
        <g>
          <rect x="40" y="44" width="330" height="126" rx="12" className="dit-svg-box-active" />
          <text x="60" y="72" className="dit-svg-title">GPU 0 — Conditional Branch (c)</text>
          <text x="60" y="96" className="dit-svg-sub">Batch = 1 · Full Sequence N</text>
          <text x="60" y="120" className="dit-svg-sub">Computes v_cond independently</text>
          <text x="60" y="150" className="dit-svg-badge-text">No intra-layer AllReduce!</text>

          <rect x="510" y="44" width="330" height="126" rx="12" className="dit-svg-box-emerald" />
          <text x="530" y="72" className="dit-svg-title">GPU 1 — Unconditional Branch (∅)</text>
          <text x="530" y="96" className="dit-svg-sub">Batch = 1 · Full Sequence N</text>
          <text x="530" y="120" className="dit-svg-sub">Computes v_uncond independently</text>
          <text x="530" y="150" className="dit-svg-badge-text">1 tiny tensor sync / step</text>

          <path d="M 372 106 L 506 106" className="dit-svg-arrow-emerald" markerEnd="url(#dit-par-arr)" markerStart="url(#dit-par-arr)" />
          <rect x="394" y="80" width="90" height="22" rx="5" className="dit-svg-box" />
          <text x="439" y="95" textAnchor="middle" className="dit-svg-badge-text">AllGather 1×</text>
        </g>
      )}

      {mode === 'usp' && (
        <g>
          {/* CFG Group 0 (Cond) */}
          <rect x="18" y="40" width="408" height="140" rx="12" className="dit-svg-box-active" />
          <text x="34" y="62" className="dit-svg-title">
            CFG Group 0 (Cond) — {gpus / cfgRanks} GPUs (Ulysses {ulyssesRanks}× · Ring {ringRanks}×)
          </text>
          {Array.from({ length: Math.min(4, Math.max(1, gpus / cfgRanks)) }).map((_, idx) => {
            const count = Math.min(4, Math.max(1, gpus / cfgRanks));
            const w = Math.floor((376 - (count - 1) * 8) / count);
            const x = 34 + idx * (w + 8);
            return (
              <g key={`c-${idx}`}>
                <rect x={x} y="76" width={w} height="64" rx="7" className="dit-svg-box" />
                <text x={x + 8} y="96" className="dit-svg-badge-text">GPU {idx}</text>
                <text x={x + 8} y="114" className="dit-svg-sub">N/{count} seq</text>
                <text x={x + 8} y="130" className="dit-svg-sub">↔ H/{count}</text>
              </g>
            );
          })}
          <text x="34" y="164" className="dit-svg-sub">Intra-node Ulysses All-to-All (NVLink) + Outer Ring KV P2P</text>

          {/* Sync badge between CFG groups */}
          <path d="M 428 110 L 452 110" className="dit-svg-arrow-emerald" markerEnd="url(#dit-par-arr)" markerStart="url(#dit-par-arr)" />

          {/* CFG Group 1 (Uncond) */}
          <rect x="454" y="40" width="408" height="140" rx="12" className="dit-svg-box-emerald" />
          <text x="470" y="62" className="dit-svg-title">
            CFG Group 1 (Uncond) — {gpus / cfgRanks} GPUs (Ulysses {ulyssesRanks}× · Ring {ringRanks}×)
          </text>
          {Array.from({ length: Math.min(4, Math.max(1, gpus / cfgRanks)) }).map((_, idx) => {
            const count = Math.min(4, Math.max(1, gpus / cfgRanks));
            const w = Math.floor((376 - (count - 1) * 8) / count);
            const x = 470 + idx * (w + 8);
            return (
              <g key={`u-${idx}`}>
                <rect x={x} y="76" width={w} height="64" rx="7" className="dit-svg-box" />
                <text x={x + 8} y="96" className="dit-svg-badge-text">GPU {idx + count}</text>
                <text x={x + 8} y="114" className="dit-svg-sub">N/{count} seq</text>
                <text x={x + 8} y="130" className="dit-svg-sub">↔ H/{count}</text>
              </g>
            );
          })}
          <text x="470" y="164" className="dit-svg-sub">Zero cross-CFG comm inside blocks · 1 latent sync / step</text>
        </g>
      )}
    </svg>
  );
}
