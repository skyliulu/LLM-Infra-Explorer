import React from 'react';

const PHYS_IDS = [7, 1, 11, 4, 14, 2, 9, 13, 0, 6];

export default function PagedArchSvg({ allocMode = 'paged', blockSize = 16, lang = 'zh' }) {
  const isPaged = allocMode === 'paged';
  const isZh = lang === 'zh';

  // Req A = 37 tokens -> dynamically sliced by blockSize S
  const reqATokens = 37;
  const blocksA = Math.ceil(reqATokens / blockSize);
  const visibleBlocksA = Math.min(3, blocksA);
  const tailFillA = reqATokens % blockSize === 0 ? blockSize : reqATokens % blockSize;

  const reqAList = Array.from({ length: visibleBlocksA }, (_, i) => {
    const isLastShown = i === visibleBlocksA - 1;
    const isActualLast = i === blocksA - 1;
    const fill = isActualLast ? `${tailFillA}/${blockSize}` : `${blockSize}/${blockSize}`;
    return {
      logical: i,
      phys: PHYS_IDS[i],
      lbl: isLastShown && blocksA > 3
        ? (isZh ? `块 ${i}..${blocksA - 1} (共${blocksA}块)` : `Blk ${i}..${blocksA - 1} (${blocksA} blks)`)
        : (isZh ? `逻辑块 ${i} (${fill})` : `Log Blk ${i} (${fill})`),
    };
  });

  // Contiguous bar scaling: full row width = 406px represents max_seq_len = 128 slots
  const barScale = (slots) => Math.max(18, Math.round((slots / 128) * 406));

  return (
    <svg
      className="pk-svg"
      viewBox="0 0 560 202"
      role="img"
      aria-label={isZh ? '连续预分配与 PagedAttention 分页块表对比' : 'Contiguous vs PagedAttention KV Allocation'}
    >
      <rect className="pk-svg-bg" x="6" y="6" width="548" height="190" rx="8" />
      <text className="pk-svg-hdr" x="18" y="24">
        {isPaged
          ? (isZh
            ? `PagedAttention (S=${blockSize}): 逻辑序列 → Block Table → 非连续物理 HBM 块`
            : `PagedAttention (S=${blockSize}): Logical Sequence → Block Table → Non-Contiguous HBM Blocks`)
          : (isZh
            ? '连续预分配 (max_seq=128): 3 条请求 + 外部空洞造成大量内部与外部碎片'
            : 'Contiguous Pre-Allocation (max_seq=128): 3 Requests + External Gap Cause Severe Waste')}
      </text>

      {isPaged ? (
        <>
          <rect className="pk-svg-shell" x="18" y="36" width="146" height="146" rx="7" />
          <text className="pk-svg-s" x="28" y="52">
            {isZh ? `逻辑块 (Req A · 37 tok)` : `Logical Blocks (Req A · 37)`}
          </text>
          {reqAList.map((row, idx) => (
            <g key={row.logical} className="pk-svg-node indigo">
              <rect x="26" y={62 + idx * 38} width="130" height="28" rx="5" />
              <text className="pk-svg-t" x="91" y={80 + idx * 38} textAnchor="middle">
                {row.lbl}
              </text>
            </g>
          ))}

          <rect className="pk-svg-shell" x="190" y="36" width="124" height="146" rx="7" />
          <text className="pk-svg-s" x="200" y="52">
            {isZh ? '块表 B_A[i]' : 'Block Table B_A[i]'}
          </text>
          {reqAList.map((row, idx) => (
            <g key={row.logical}>
              <line className="pk-svg-edge" x1="156" y1={76 + idx * 38} x2="200" y2={76 + idx * 38} />
              <g className="pk-svg-node blue">
                <rect x="200" y={62 + idx * 38} width="104" height="28" rx="5" />
                <text className="pk-svg-t" x="252" y={80 + idx * 38} textAnchor="middle">
                  [{row.logical}] → P{row.phys}
                </text>
              </g>
            </g>
          ))}

          <rect className="pk-svg-shell" x="342" y="36" width="200" height="146" rx="7" />
          <text className="pk-svg-s" x="352" y="52">
            {isZh ? '物理 HBM 块池 (0% 外部碎片)' : 'Physical HBM Pool (0% Ext Frag)'}
          </text>
          {[
            { id: 7, cls: 'indigo', lbl: 'P7: A[0]' },
            { id: 2, cls: 'emerald', lbl: 'P2: B[0]' },
            { id: 1, cls: 'indigo', lbl: blocksA >= 2 ? 'P1: A[1]' : 'P1: C[1]' },
            { id: 4, cls: 'amber', lbl: 'P4: C[0]' },
            { id: 11, cls: blocksA >= 3 ? 'indigo' : 'amber', lbl: blocksA >= 3 ? 'P11: A[2]' : 'P11: C[2]' },
            { id: 8, cls: 'emerald', lbl: 'P8: B[1]' },
          ].map((blk, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const x = 352 + col * 92;
            const y = 62 + row * 38;
            return (
              <g key={blk.id} className={`pk-svg-node ${blk.cls}`}>
                <rect x={x} y={y} width="84" height="28" rx="5" />
                <text className="pk-svg-s" x={x + 42} y={y + 18} textAnchor="middle">
                  {blk.lbl}
                </text>
              </g>
            );
          })}

          {reqAList.map((row, idx) => (
            <path
              key={row.logical}
              className="pk-svg-edge hi"
              fill="none"
              d={`M 304 ${76 + idx * 38} C 324 ${76 + idx * 38}, 332 ${76 + idx * 38}, 352 ${76 + idx * 38}`}
            />
          ))}
        </>
      ) : (
        <>
          {/* Exact proportional contiguous strips: 3 requests (37, 22, 51 / 128) + proportional 32-slot external gap */}
          {[
            { name: 'Req A (37/128)', y: 38, used: 37, ext: false },
            { name: isZh ? '外部空洞 (32)' : 'Ext Gap (32)', y: 76, used: 32, ext: true },
            { name: 'Req B (22/128)', y: 114, used: 22, ext: false },
            { name: 'Req C (51/128)', y: 152, used: 51, ext: false },
          ].map((r) => {
            const w = barScale(r.used);
            return (
              <g key={r.name}>
                <text className="pk-svg-s" x="20" y={r.y + 19}>{r.name}</text>
                {r.ext ? (
                  <>
                    <g className="pk-svg-node warn">
                      <rect x="134" y={r.y} width={w} height="28" rx="5" />
                      <text className="pk-svg-s" x={134 + w / 2} y={r.y + 18} textAnchor="middle">
                        {isZh ? '32 槽空洞' : '32-slot hole'}
                      </text>
                    </g>
                    <text className="pk-svg-s" x={134 + w + 10} y={r.y + 18}>
                      {isZh ? '← 小于 128 无法容纳新请求（外部碎片）' : '← Too small for max_seq=128 (external frag)'}
                    </text>
                  </>
                ) : (
                  <>
                    <g className="pk-svg-node indigo">
                      <rect x="134" y={r.y} width={w} height="28" rx="5" />
                      <text className="pk-svg-s" x={134 + w / 2} y={r.y + 18} textAnchor="middle">
                        {isZh ? '已用' : 'Used'}
                      </text>
                    </g>
                    <g className="pk-svg-node warn">
                      <rect x={134 + w + 4} y={r.y} width={406 - w - 4} height="28" rx="5" />
                      <text className="pk-svg-s" x={134 + w + (406 - w) / 2} y={r.y + 18} textAnchor="middle">
                        {isZh ? `预留浪费 (${128 - r.used} 槽未用)` : `Reserved Waste (${128 - r.used} unused)`}
                      </text>
                    </g>
                  </>
                )}
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
}
