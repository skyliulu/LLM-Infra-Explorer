import React from 'react';

const THREAD_SAMPLES = [
  { id: 'T0', idx: 0 },
  { id: 'T1', idx: 1 },
  { id: 'T2', idx: 2 },
  { id: 'T3', idx: 3 },
  { id: 'T4', idx: 4 },
  { id: 'T5', idx: 5 },
  { id: 'T6', idx: 6 },
  { id: '…T31', idx: 7 },
];

export default function MemoryDataflowSvg({ mem, step, t }) {
  // step: 1..4
  if (mem.memView === 'coalescing') {
    const coal = mem.isCoalesced;
    // Thread x centers across width 620
    const tx = (i) => 46 + i * 76;
    const clX = (i) => 22 + i * 74;

    return (
      <svg className="gr-mem-svg" viewBox="0 0 620 248" role="img" aria-label={t('memTabCoalescing')}>
        <defs>
          <marker id="gr-m-arr-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path className="gr-m-mk-ok" d="M 0 1 L 10 5 L 0 9 z" />
          </marker>
          <marker id="gr-m-arr-bad" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path className="gr-m-mk-bad" d="M 0 1 L 10 5 L 0 9 z" />
          </marker>
          <marker id="gr-m-arr-dim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path className="gr-m-mk-dim" d="M 0 1 L 10 5 L 0 9 z" />
          </marker>
        </defs>

        {/* Row 1: Warp 32 Threads */}
        <text className="gr-m-hdr" x="16" y="18">{t('memSvgWarpHdr')}</text>
        {THREAD_SAMPLES.map((th, i) => {
          const x = tx(i);
          const addr = coal ? `${th.idx === 7 ? '124' : th.idx * 4}B` : `${th.idx === 7 ? '3968' : th.idx * 128}B`;
          return (
            <g key={th.id} className={`gr-m-thr ${step >= 1 ? 'on' : ''}`}>
              <rect x={x - 28} y="24" width="56" height="32" rx="5" />
              <text className="gr-m-t" x={x} y="38" textAnchor="middle">{th.id}</text>
              <text className="gr-m-s" x={x} y="50" textAnchor="middle">{addr}</text>
            </g>
          );
        })}

        {/* Arrows: Threads -> Memory Controller / LSU */}
        {THREAD_SAMPLES.map((th, i) => {
          const x = tx(i);
          const targetX = coal ? 310 : x;
          const active = step >= 2;
          return (
            <line
              key={`a1-${th.id}`}
              className={`gr-m-wire ${active ? (coal ? 'ok' : 'bad') : ''}`}
              x1={x}
              y1="56"
              x2={targetX}
              y2="92"
              markerEnd={active ? (coal ? 'url(#gr-m-arr-ok)' : 'url(#gr-m-arr-bad)') : 'url(#gr-m-arr-dim)'}
            />
          );
        })}

        {/* Row 2: Memory Controller / LSU Coalescing Unit */}
        <g className={`gr-m-lsu ${step >= 2 ? (coal ? 'ok' : 'bad') : ''}`}>
          <rect x="20" y="94" width="580" height="36" rx="7" />
          <text className="gr-m-t" x="310" y="110" textAnchor="middle">
            {t(coal ? 'memSvgLsuCoal' : 'memSvgLsuSplit')}
          </text>
          <text className="gr-m-s" x="310" y="124" textAnchor="middle">
            {t(coal ? 'memSvgLsuCoalSub' : 'memSvgLsuSplitSub')}
          </text>
        </g>

        {/* Row 3: HBM 128B Cache Lines */}
        <text className="gr-m-hdr" x="16" y="156">{t('memSvgHbmHdr')}</text>
        {coal ? (
          <>
            {/* Coalesced: 1 single glowing 128B Cache Line CL0, rest idle */}
            <line
              className={`gr-m-wire thick ${step >= 3 ? 'ok' : ''}`}
              x1="310" y1="130" x2="170" y2="164"
              markerEnd={step >= 3 ? 'url(#gr-m-arr-ok)' : 'url(#gr-m-arr-dim)'}
            />
            <g className={`gr-m-cl-single ${step >= 3 ? 'ok' : ''}`}>
              <rect x="20" y="166" width="300" height="46" rx="7" />
              <text className="gr-m-t" x="170" y="185" textAnchor="middle">Cache Line CL0 (128 B · 32 × FP32)</text>
              <text className="gr-m-s" x="170" y="201" textAnchor="middle">
                {step >= 4 ? t('memSvgCl0Full') : t('memSvgCl0Wait')}
              </text>
            </g>
            {/* Unused neighbor cache lines */}
            <g className="gr-m-cl-idle">
              <rect x="334" y="166" width="128" height="46" rx="7" />
              <text className="gr-m-s" x="398" y="193" textAnchor="middle">CL1 (128 B · Idle)</text>
              <rect x="472" y="166" width="128" height="46" rx="7" />
              <text className="gr-m-s" x="536" y="193" textAnchor="middle">CL2 … CL31 (Idle)</text>
            </g>
          </>
        ) : (
          <>
            {/* Strided: 32 separate 128B Cache Lines, each only 4B useful (green sliver) + 124B wasted */}
            {THREAD_SAMPLES.map((th, i) => {
              const cx = clX(i);
              const hit = step >= 3;
              const isSerialActive = step === 3 && i <= 4;
              return (
                <g key={`cl-${th.id}`}>
                  <line
                    className={`gr-m-wire ${hit ? 'bad' : ''}`}
                    x1={tx(i)}
                    y1="130"
                    x2={cx + 33}
                    y2="164"
                    markerEnd={hit ? 'url(#gr-m-arr-bad)' : 'url(#gr-m-arr-dim)'}
                  />
                  <g className={`gr-m-cl-waste ${hit ? 'bad' : ''} ${isSerialActive ? 'pulse' : ''}`}>
                    <rect x={cx} y="166" width="66" height="46" rx="5" />
                    {/* Tiny 4B useful slice inside 128B line */}
                    <rect className="gr-m-slice-ok" x={cx + 3} y="170" width="9" height="38" rx="2" />
                    <text className="gr-m-cl-lbl" x={cx + 38} y="186" textAnchor="middle">
                      {i === 7 ? 'CL31' : `CL${i}`}
                    </text>
                    <text className="gr-m-cl-sub" x={cx + 38} y="201" textAnchor="middle">
                      4B / 128B
                    </text>
                  </g>
                </g>
              );
            })}
          </>
        )}

        {/* Bottom Bus Summary Bar */}
        <rect className={`gr-m-footer ${step >= 4 ? (coal ? 'ok' : 'bad') : ''}`} x="20" y="220" width="580" height="22" rx="5" />
        <text className="gr-m-footer-txt" x="310" y="234.5" textAnchor="middle">
          {coal ? t('memSvgFootCoal') : t('memSvgFootStrided')}
        </text>
      </svg>
    );
  }

  // View 2: Tensor Core Tiling Dataflow (HBM -> SMEM -> Register File -> Tensor Core)
  const tiled = mem.tiled;
  const stageActive = (s) => step === s;
  const stagePassed = (s) => step >= s;

  return (
    <svg className="gr-mem-svg" viewBox="0 0 620 248" role="img" aria-label={t('memTabTiling')}>
      <defs>
        <marker id="gr-t-arr-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path className="gr-m-mk-ok" d="M 0 1 L 10 5 L 0 9 z" />
        </marker>
        <marker id="gr-t-arr-bad" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path className="gr-m-mk-bad" d="M 0 1 L 10 5 L 0 9 z" />
        </marker>
        <marker id="gr-t-arr-dim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path className="gr-m-mk-dim" d="M 0 1 L 10 5 L 0 9 z" />
        </marker>
      </defs>

      <text className="gr-m-hdr" x="16" y="18">
        {tiled ? t('memSvgTileHdrOn') : t('memSvgTileHdrOff')}
      </text>

      {/* Stage 1: HBM */}
      <g className={`gr-t-box amber ${stageActive(1) ? 'cur' : stagePassed(1) ? 'lit' : ''}`}>
        <rect x="16" y="34" width="126" height="142" rx="8" />
        <text className="gr-m-t" x="79" y="56" textAnchor="middle">1. HBM Global</text>
        <text className="gr-m-s" x="79" y="72" textAnchor="middle">~400 cyc · 3.35 TB/s</text>
        <rect className="gr-t-mat" x="28" y="84" width="46" height="46" rx="4" />
        <text className="gr-m-s" x="51" y="111" textAnchor="middle">A [M,K]</text>
        <rect className="gr-t-mat" x="84" y="84" width="46" height="46" rx="4" />
        <text className="gr-m-s" x="107" y="111" textAnchor="middle">B [K,N]</text>
        <text className="gr-t-badge" x="79" y="156" textAnchor="middle">
          {tiled ? '32 MB Traffic' : '4096 MB Traffic!'}
        </text>
      </g>

      {/* Stage 2: SMEM Tile */}
      <g className={`gr-t-box emerald ${!tiled ? 'bypass' : stageActive(2) ? 'cur' : stagePassed(2) ? 'lit' : ''}`}>
        <rect x="172" y="34" width="132" height="142" rx="8" />
        <text className="gr-m-t" x="238" y="56" textAnchor="middle">2. SMEM / L1</text>
        <text className="gr-m-s" x="238" y="72" textAnchor="middle">~25 cyc · 33 TB/s</text>
        {tiled ? (
          <>
            <rect className="gr-t-tile" x="186" y="86" width="48" height="36" rx="4" />
            <text className="gr-m-s" x="210" y="108" textAnchor="middle">128×32</text>
            <rect className="gr-t-tile" x="242" y="86" width="48" height="36" rx="4" />
            <text className="gr-m-s" x="266" y="108" textAnchor="middle">32×128</text>
            <text className="gr-t-badge ok" x="238" y="144" textAnchor="middle">cp.async / TMA</text>
            <text className="gr-m-s" x="238" y="160" textAnchor="middle">128× Block Reuse</text>
          </>
        ) : (
          <>
            <line className="gr-t-cross" x1="194" y1="88" x2="282" y2="152" />
            <line className="gr-t-cross" x1="282" y1="88" x2="194" y2="152" />
            <text className="gr-t-badge bad" x="238" y="166" textAnchor="middle">Bypassed (1× Reuse)</text>
          </>
        )}
      </g>

      {/* Stage 3: Register File */}
      <g className={`gr-t-box blue ${stageActive(3) ? 'cur' : stagePassed(3) ? 'lit' : ''}`}>
        <rect x="334" y="34" width="124" height="142" rx="8" />
        <text className="gr-m-t" x="396" y="56" textAnchor="middle">3. Register File</text>
        <text className="gr-m-s" x="396" y="72" textAnchor="middle">~1 cyc · 80+ TB/s</text>
        <rect className="gr-t-frag" x="348" y="88" width="96" height="24" rx="4" />
        <text className="gr-m-s" x="396" y="104" textAnchor="middle">Frag A · Frag B</text>
        <rect className="gr-t-frag" x="348" y="120" width="96" height="24" rx="4" />
        <text className="gr-m-s" x="396" y="136" textAnchor="middle">Acc C (FP32)</text>
        <text className="gr-t-badge" x="396" y="164" textAnchor="middle">Warp MMA Frags</text>
      </g>

      {/* Stage 4: Tensor Core */}
      <g className={`gr-t-box indigo ${stageActive(4) ? 'cur' : stagePassed(4) ? 'lit' : ''}`}>
        <rect x="488" y="34" width="116" height="142" rx="8" />
        <text className="gr-m-t" x="546" y="56" textAnchor="middle">4. Tensor Core</text>
        <text className="gr-m-s" x="546" y="72" textAnchor="middle">Matrix Engine</text>
        <rect className="gr-t-tc" x="500" y="90" width="92" height="44" rx="5" />
        <text className="gr-m-t" x="546" y="110" textAnchor="middle">D = A·B + C</text>
        <text className="gr-m-s" x="546" y="125" textAnchor="middle">MMA / WGMMA</text>
        <text className={`gr-t-badge ${tiled ? 'ok' : 'bad'}`} x="546" y="158" textAnchor="middle">
          {tiled ? t('memSvgTcFed') : t('memSvgTcStarved')}
        </text>
      </g>

      {/* Directional Dataflow Arrows */}
      {tiled ? (
        <>
          <line className={`gr-m-wire thick ${step >= 2 ? 'ok' : ''}`} x1="142" y1="105" x2="170" y2="105" markerEnd={step >= 2 ? 'url(#gr-t-arr-ok)' : 'url(#gr-t-arr-dim)'} />
          <line className={`gr-m-wire thick ${step >= 3 ? 'ok' : ''}`} x1="304" y1="105" x2="332" y2="105" markerEnd={step >= 3 ? 'url(#gr-t-arr-ok)' : 'url(#gr-t-arr-dim)'} />
          <line className={`gr-m-wire thick ${step >= 4 ? 'ok' : ''}`} x1="458" y1="105" x2="486" y2="105" markerEnd={step >= 4 ? 'url(#gr-t-arr-ok)' : 'url(#gr-t-arr-dim)'} />
          {/* On-chip reuse loop above SMEM -> Reg */}
          <path
            className={`gr-m-wire ${step >= 3 ? 'ok' : ''}`}
            d="M 238 176 C 238 202, 396 202, 396 178"
            fill="none"
            markerEnd={step >= 3 ? 'url(#gr-t-arr-ok)' : 'url(#gr-t-arr-dim)'}
          />
          <text className="gr-t-loop-lbl ok" x="317" y="210" textAnchor="middle">
            {t('memSvgReuseLoop')}
          </text>
        </>
      ) : (
        <>
          {/* Naive detour bypassing SMEM straight from HBM -> Register File */}
          <path
            className={`gr-m-wire thick ${step >= 2 ? 'bad' : ''}`}
            d="M 79 176 C 79 208, 396 208, 396 178"
            fill="none"
            markerEnd={step >= 2 ? 'url(#gr-t-arr-bad)' : 'url(#gr-t-arr-dim)'}
          />
          <text className="gr-t-loop-lbl bad" x="238" y="210" textAnchor="middle">
            {t('memSvgBypassLoop')}
          </text>
          <line className={`gr-m-wire thick ${step >= 4 ? 'bad' : ''}`} x1="458" y1="105" x2="486" y2="105" markerEnd={step >= 4 ? 'url(#gr-t-arr-bad)' : 'url(#gr-t-arr-dim)'} />
        </>
      )}

      {/* Bottom Summary Footer */}
      <rect className={`gr-m-footer ${step >= 4 ? (tiled ? 'ok' : 'bad') : ''}`} x="16" y="220" width="588" height="22" rx="5" />
      <text className="gr-m-footer-txt" x="310" y="234.5" textAnchor="middle">
        {tiled ? t('memSvgFootTiled') : t('memSvgFootNaive')}
      </text>
    </svg>
  );
}
