import React from 'react';

export default function PagedArchSvg({ allocMode = 'paged' }) {
  const isPaged = allocMode === 'paged';

  return (
    <svg className="pk-svg" viewBox="0 0 560 194" role="img" aria-label="Contiguous vs PagedAttention KV Allocation">
      <rect className="pk-svg-bg" x="6" y="6" width="548" height="182" rx="8" />
      <text className="pk-svg-hdr" x="18" y="24">
        {isPaged
          ? 'PagedAttention: Logical Sequence → Block Table → Non-Contiguous Physical HBM Blocks'
          : 'Contiguous Pre-Allocation: Fixed max_seq_len Reservations Create Massive Internal & External Waste'}
      </text>

      {isPaged ? (
        <>
          {/* Logical Blocks */}
          <rect className="pk-svg-shell" x="18" y="36" width="142" height="138" rx="7" />
          <text className="pk-svg-s" x="28" y="52">Logical Blocks (Req A)</text>
          {[0, 1, 2].map((b) => (
            <g key={b} className="pk-svg-node indigo">
              <rect x="28" y={60 + b * 36} width="122" height="28" rx="5" />
              <text className="pk-svg-t" x="89" y={78 + b * 36} textAnchor="middle">
                Log Block {b} {b === 2 ? '(5/16)' : '(16/16)'}
              </text>
            </g>
          ))}

          {/* Block Table */}
          <rect className="pk-svg-shell" x="188" y="36" width="126" height="138" rx="7" />
          <text className="pk-svg-s" x="198" y="52">Block Table B_A[i]</text>
          {[
            { l: 0, p: 7 },
            { l: 1, p: 1 },
            { l: 2, p: 11 },
          ].map((row, idx) => (
            <g key={row.l}>
              <line className="pk-svg-edge" x1="150" y1={74 + idx * 36} x2="198" y2={74 + idx * 36} />
              <g className="pk-svg-node blue">
                <rect x="198" y={60 + idx * 36} width="106" height="28" rx="5" />
                <text className="pk-svg-t" x="251" y={78 + idx * 36} textAnchor="middle">[{row.l}] → Phys {row.p}</text>
              </g>
            </g>
          ))}

          {/* Physical HBM Pool */}
          <rect className="pk-svg-shell" x="342" y="36" width="200" height="138" rx="7" />
          <text className="pk-svg-s" x="352" y="52">Physical HBM KV Pool (0% Ext Frag)</text>
          {[
            { id: 1, cls: 'indigo', lbl: 'P1: A[1]' },
            { id: 2, cls: 'emerald', lbl: 'P2: B[0]' },
            { id: 4, cls: 'amber', lbl: 'P4: C[0]' },
            { id: 7, cls: 'indigo', lbl: 'P7: A[0]' },
            { id: 8, cls: 'emerald', lbl: 'P8: B[1]' },
            { id: 11, cls: 'indigo', lbl: 'P11: A[2]' },
          ].map((blk, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const x = 352 + col * 92;
            const y = 60 + row * 36;
            return (
              <g key={blk.id} className={`pk-svg-node ${blk.cls}`}>
                <rect x={x} y={y} width="84" height="28" rx="5" />
                <text className="pk-svg-s" x={x + 42} y={y + 17} textAnchor="middle">{blk.lbl}</text>
              </g>
            );
          })}

          <line className="pk-svg-edge hi" x1="304" y1="74" x2="444" y2="110" />
          <line className="pk-svg-edge hi" x1="304" y1="110" x2="352" y2="74" />
          <line className="pk-svg-edge hi" x1="304" y1="146" x2="444" y2="146" />
        </>
      ) : (
        <>
          {/* Contiguous HBM strips */}
          {[
            { name: 'Req A (37/128)', y: 42, usedW: 118, resW: 290 },
            { name: 'External Gap (32)', y: 84, usedW: 0, resW: 110, ext: true },
            { name: 'Req B (22/128)', y: 126, usedW: 72, resW: 336 },
          ].map((r) => (
            <g key={r.name}>
              <text className="pk-svg-s" x="22" y={r.y + 19}>{r.name}</text>
              {r.ext ? (
                <g className="pk-svg-node warn">
                  <rect x="134" y={r.y} width="406" height="28" rx="5" />
                  <text className="pk-svg-s" x="337" y={r.y + 18} textAnchor="middle">External Fragmentation Hole (Too small for Req D max_seq=128)</text>
                </g>
              ) : (
                <>
                  <g className="pk-svg-node indigo">
                    <rect x="134" y={r.y} width={r.usedW} height="28" rx="5" />
                    <text className="pk-svg-s" x={134 + r.usedW / 2} y={r.y + 18} textAnchor="middle">Used KV</text>
                  </g>
                  <g className="pk-svg-node warn">
                    <rect x={134 + r.usedW + 4} y={r.y} width={406 - r.usedW - 4} height="28" rx="5" />
                    <text className="pk-svg-s" x={134 + r.usedW + (406 - r.usedW) / 2} y={r.y + 18} textAnchor="middle">
                      Reserved / Internal Waste (Locked Unused HBM)
                    </text>
                  </g>
                </>
              )}
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
