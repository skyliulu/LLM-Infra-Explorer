import React from 'react';

const COL_X = (idx) => 112 + idx * 55;
const COL_W = 50;
const ROW_Y = (rowIdx) => 34 + rowIdx * 32;
const ROW_H = 24;

export default function WarpSchedulerSvg({ sm, currentCycle, onSelectCycle, t }) {
  const activeIdx = Math.max(0, Math.min(sm.cycles.length - 1, currentCycle - 1));
  const activeCycle = sm.cycles[activeIdx];
  const activeColX = COL_X(activeIdx);
  const activeWarpIdx = activeCycle.warp ? Number(activeCycle.warp.slice(1)) : -1;
  const firstUnallocIdx = sm.residentSlots < 5 ? sm.residentSlots : -1;

  return (
    <svg
      className="gr-ws-svg"
      viewBox="0 0 670 286"
      role="img"
      aria-label={t('smTimelineTitle')}
    >
      <defs>
        <marker id="gr-ws-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path className="gr-ws-marker" d="M 0 1 L 10 5 L 0 9 z" />
        </marker>
      </defs>

      {/* Active Cycle Vertical Spotlight */}
      <rect
        className={`gr-ws-spotlight ${activeCycle.state === 'stall' ? 'stall' : ''}`}
        x={activeColX - 2}
        y={6}
        width={COL_W + 4}
        height={258}
        rx={6}
      />

      {/* Cycle Header Row */}
      <text className="gr-ws-hdr" x="14" y="21">{t('smWsPool')}</text>
      {sm.cycles.map((c, idx) => {
        const isCur = idx === activeIdx;
        return (
          <g
            key={c.cycle}
            className={`gr-ws-colhdr ${isCur ? 'on' : ''}`}
            onClick={() => onSelectCycle(c.cycle)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectCycle(c.cycle); } }}
          >
            <rect x={COL_X(idx)} y={8} width={COL_W} height={18} rx={4} />
            <text x={COL_X(idx) + COL_W / 2} y={20.5} textAnchor="middle">C{c.cycle}</text>
          </g>
        );
      })}

      {/* 5 Warp Swimlanes (W0..W4) */}
      {[0, 1, 2, 3, 4].map((wIdx) => {
        const y = ROW_Y(wIdx);
        const allocated = wIdx < sm.residentSlots;
        const curWState = activeCycle.warpStates[wIdx];
        const isIssuingNow = wIdx === activeWarpIdx;

        return (
          <g key={wIdx}>
            {/* Left Warp Slot Label */}
            <rect
              className={`gr-ws-wlabel ${!allocated ? 'unalloc' : isIssuingNow ? 'active' : curWState.state}`}
              x={12}
              y={y}
              width={90}
              height={ROW_H}
              rx={5}
            />
            <text
              className={`gr-ws-wtxt ${!allocated ? 'unalloc' : ''}`}
              x={22}
              y={y + 15.5}
            >
              W{wIdx}
            </text>
            <text
              className={`gr-ws-wstat ${!allocated ? 'unalloc' : curWState.state}`}
              x={94}
              y={y + 15.5}
              textAnchor="end"
            >
              {!allocated ? t('smWsUnallocShort') : curWState.label}
            </text>

            {/* Cells across C1..C10 */}
            {!allocated ? (
              <g>
                <rect
                  className="gr-ws-unalloc-band"
                  x={COL_X(0)}
                  y={y}
                  width={10 * 55 - 5}
                  height={ROW_H}
                  rx={4}
                />
                {wIdx === firstUnallocIdx && (
                  <text
                    className="gr-ws-unalloc-note"
                    x={COL_X(0) + (10 * 55 - 5) / 2}
                    y={y + 15.5}
                    textAnchor="middle"
                  >
                    {t('smWsBlockedBand')}
                  </text>
                )}
              </g>
            ) : (
              sm.cycles.map((c, cIdx) => {
                const ws = c.warpStates[wIdx];
                const isFuture = cIdx > activeIdx;
                const isCur = cIdx === activeIdx;
                return (
                  <g
                    key={c.cycle}
                    className={`gr-ws-cell ${ws.state} ${isFuture ? 'future' : ''} ${isCur ? 'cur' : ''}`}
                    onClick={() => onSelectCycle(c.cycle)}
                  >
                    <rect x={COL_X(cIdx)} y={y} width={COL_W} height={ROW_H} rx={4} />
                    <text x={COL_X(cIdx) + COL_W / 2} y={y + 15.5} textAnchor="middle">
                      {ws.label}
                    </text>
                  </g>
                );
              })
            )}
          </g>
        );
      })}

      {/* Scheduler Dispatch Bridge Line */}
      <line className="gr-ws-divider" x1={12} y1={202} x2={658} y2={202} />
      <text className="gr-ws-bridge-lbl" x={14} y={215}>
        {t('smWsSchedBridge')}
      </text>

      {/* Dynamic Dispatch Arrow from Selected Warp -> Exec Unit on currentCycle */}
      {activeWarpIdx >= 0 ? (
        <g>
          <line
            className="gr-ws-dispatch-stem"
            x1={activeColX + COL_W / 2}
            y1={ROW_Y(activeWarpIdx) + ROW_H}
            x2={activeColX + COL_W / 2}
            y2={202}
          />
          <line
            className="gr-ws-dispatch-arrow"
            x1={activeColX + COL_W / 2}
            y1={202}
            x2={activeColX + COL_W / 2}
            y2={222}
            markerEnd="url(#gr-ws-arr)"
          />
        </g>
      ) : (
        <text
          className="gr-ws-stall-mark"
          x={activeColX + COL_W / 2}
          y={216}
          textAnchor="middle"
        >
          0 RDY!
        </text>
      )}

      {/* Bottom Execution Unit Pipeline Track */}
      <rect className="gr-ws-exec-hdr" x={12} y={224} width={90} height={32} rx={5} />
      <text className="gr-ws-exec-title" x={57} y={238} textAnchor="middle">{t('smWsExecUnit')}</text>
      <text className="gr-ws-exec-sub" x={57} y={250} textAnchor="middle">ALU / Tensor</text>

      {sm.cycles.map((c, cIdx) => {
        const isFuture = cIdx > activeIdx;
        const isCur = cIdx === activeIdx;
        return (
          <g
            key={c.cycle}
            className={`gr-ws-pipe ${c.state} ${isFuture ? 'future' : ''} ${isCur ? 'cur' : ''}`}
            onClick={() => onSelectCycle(c.cycle)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectCycle(c.cycle); } }}
          >
            <rect x={COL_X(cIdx)} y={224} width={COL_W} height={32} rx={5} />
            <text className="gr-ws-pipe-w" x={COL_X(cIdx) + COL_W / 2} y={238} textAnchor="middle">
              {c.warp || '—'}
            </text>
            <text className="gr-ws-pipe-op" x={COL_X(cIdx) + COL_W / 2} y={250} textAnchor="middle">
              {c.op}
            </text>
          </g>
        );
      })}

      {/* Compact Legend */}
      <g className="gr-ws-legend" transform="translate(14, 276)">
        <rect className="lg-ldg" x="0" y="-8" width="10" height="10" rx="2" />
        <text x="14" y="0">{t('smLgLdg')}</text>
        <rect className="lg-wait" x="112" y="-8" width="10" height="10" rx="2" />
        <text x="126" y="0">{t('smLgWait')}</text>
        <rect className="lg-rdy" x="234" y="-8" width="10" height="10" rx="2" />
        <text x="248" y="0">{t('smLgRdy')}</text>
        <rect className="lg-exec" x="356" y="-8" width="10" height="10" rx="2" />
        <text x="370" y="0">{t('smLgExec')}</text>
        <rect className="lg-stall" x="480" y="-8" width="10" height="10" rx="2" />
        <text x="494" y="0">{t('smLgStall')}</text>
      </g>
    </svg>
  );
}
