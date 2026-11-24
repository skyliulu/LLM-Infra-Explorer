import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { BLOCK_SIZE_OPTIONS, REG_OPTIONS, SMEM_OPTIONS } from './model';
import WarpSchedulerSvg from './WarpSchedulerSvg';

export default function SmOccupancySection({ config, sm, update, t }) {
  const maxCycle = sm.cycles.length;
  const [currentCycle, setCurrentCycle] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);

  const clampedCycle = Math.max(1, Math.min(maxCycle, currentCycle));
  const activeCycle = sm.cycles[clampedCycle - 1];
  const isDone = clampedCycle >= maxCycle;

  useEffect(() => {
    if (!isPlaying || isDone) return undefined;
    const timer = setTimeout(() => {
      setCurrentCycle((c) => {
        if (c >= maxCycle) {
          setIsPlaying(false);
          return maxCycle;
        }
        return c + 1;
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [isPlaying, clampedCycle, isDone, maxCycle]);

  useEffect(() => {
    if (isPlaying && isDone) setIsPlaying(false);
  }, [isPlaying, isDone]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentCycle(1);
  };
  const handleTogglePlay = () => {
    if (isDone) setCurrentCycle(1);
    setIsPlaying((p) => !p);
  };
  const handleStep = () => {
    setIsPlaying(false);
    setCurrentCycle((c) => Math.min(maxCycle, c + 1));
  };
  const handleSelectCycle = (c) => {
    setIsPlaying(false);
    setCurrentCycle(c);
  };

  const alertClass = sm.registerSpill || sm.divergent || sm.stallCycles >= 2 ? 'warn' : '';
  const calloutBody = sm.registerSpill
    ? t('smSpillWarn')
    : sm.divergent
      ? t('smDivWarn')
      : t('smHealthy');

  const cycleNarration = (() => {
    if (activeCycle.state === 'stall') {
      return `${t('smNarrStallPrefix')} (${activeCycle.waitingWarps.join(', ')}) ${t('smNarrStallSuffix')}`;
    }
    if (activeCycle.state === 'issue') {
      return `${activeCycle.warp} ${t('smNarrIssuePrefix')} ${sm.hbmWaitCycles} ${t('smNarrCycles')}`;
    }
    if (activeCycle.pass === 'passA') {
      return `${activeCycle.warp} ${t('smNarrPassA')}`;
    }
    if (activeCycle.pass === 'passB') {
      return `${activeCycle.warp} ${t('smNarrPassB')}`;
    }
    if (activeCycle.switchedFrom) {
      return `${activeCycle.switchedFrom} ${t('smNarrHideMid')} ${activeCycle.warp} ${t('smNarrHideEnd')}`;
    }
    return `${activeCycle.warp} ${t('smNarrCompute')}`;
  })();

  const simtMaskMode = activeCycle.pass; // 'full' | 'passA' | 'passB' | 'idle'
  const simtStatusLabel = simtMaskMode === 'idle'
    ? t('smSimtIdle')
    : simtMaskMode === 'passA'
      ? 'Pass A · Lanes 0–15 Active / 16–31 Masked'
      : simtMaskMode === 'passB'
        ? 'Pass B · Lanes 0–15 Masked / 16–31 Active'
        : '32/32 Lanes Active';

  return (
    <section className="gr-section" data-testid="gpu-sm-section">
      <h2 data-section-anchor="gpucudagraph-sm">{t('smTitle')}</h2>
      <p className="gr-lead">{t('smLead')}</p>

      <div className="gr-controls">
        <div className="gr-ctrl-group">
          <span className="gr-ctrl-label">{t('smRegs')}:</span>
          <div className="gr-toggle" role="group" aria-label={t('smRegs')}>
            {REG_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                data-testid={`gpu-reg-${r}`}
                aria-pressed={config.regsPerThread === r}
                onClick={() => update({ regsPerThread: r })}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="gr-ctrl-group">
          <span className="gr-ctrl-label">{t('smSmem')}:</span>
          <div className="gr-toggle" role="group" aria-label={t('smSmem')}>
            {SMEM_OPTIONS.map((kb) => (
              <button
                key={kb}
                type="button"
                data-testid={`gpu-smem-${kb}`}
                aria-pressed={config.smemKB === kb}
                onClick={() => update({ smemKB: kb })}
              >
                {kb} KB
              </button>
            ))}
          </div>
        </div>

        <div className="gr-ctrl-group">
          <span className="gr-ctrl-label">{t('smBlock')}:</span>
          <div className="gr-toggle" role="group" aria-label={t('smBlock')}>
            {BLOCK_SIZE_OPTIONS.map((bs) => (
              <button
                key={bs}
                type="button"
                data-testid={`gpu-block-${bs}`}
                aria-pressed={config.blockSize === bs}
                onClick={() => update({ blockSize: bs })}
              >
                {bs}
              </button>
            ))}
          </div>
        </div>

        <div className="gr-ctrl-group">
          <span className="gr-ctrl-label">{t('smBranch')}:</span>
          <div className="gr-toggle" role="group" aria-label={t('smBranch')}>
            <button
              type="button"
              data-testid="gpu-branch-uniform"
              aria-pressed={!config.divergent}
              onClick={() => update({ divergent: false })}
            >
              {t('smUniform')}
            </button>
            <button
              type="button"
              data-testid="gpu-branch-divergent"
              aria-pressed={config.divergent}
              onClick={() => update({ divergent: true })}
            >
              {t('smDivergent')}
            </button>
          </div>
        </div>
      </div>

      <div className="gr-grid-main">
        <div className="gr-timeline-box">
          <div className="gr-hier-strip" aria-label={t('smHierarchy')}>
            <div className="gr-hier-card">
              <small>Grid → Block (CTA)</small>
              <strong>{sm.activeBlocks} Blocks / SM</strong>
              <span>{sm.blockSize} thr · {sm.warpsPerBlock} warps</span>
            </div>
            <div className="gr-hier-card">
              <small>{t('smActiveWarps')}</small>
              <strong>{sm.activeWarps} / {sm.maxWarpsPerSm}</strong>
              <span>{sm.warpsPerScheduler} / Scheduler</span>
            </div>
            <div className="gr-hier-card">
              <small>{t('smOccupancy')}</small>
              <strong>{sm.occupancyPct}%</strong>
              <span>H100 SM (4 Sched)</span>
            </div>
            <div className="gr-hier-card">
              <small>{t('smEffThroughput')}</small>
              <strong>{sm.effectiveThroughputPct}%</strong>
              <span>SIMT {sm.simtEfficiencyPct}%</span>
            </div>
          </div>

          {/* Dynamic Multi-Warp Scheduler Pipeline Toolbar */}
          <div className="gr-ws-toolbar">
            <div className="gr-ws-title-group">
              <span className="gr-code-title" style={{ marginBottom: 0 }}>{t('smTimelineTitle')}</span>
              <span className="gr-ws-cycle-pill" data-testid="gpu-ws-cycle-pill">
                Cycle {clampedCycle} / {maxCycle}
              </span>
            </div>
            <div className="chapter-playback gr-playback">
              <button type="button" data-testid="gpu-ws-reset" onClick={handleReset} aria-label={t('reset')} title={t('reset')}>
                <RotateCcw size={15} />
              </button>
              <button type="button" data-testid="gpu-ws-play" onClick={handleTogglePlay} aria-label={isPlaying && !isDone ? t('pause') : t('play')} title={isPlaying && !isDone ? t('pause') : t('play')}>
                {isPlaying && !isDone ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button type="button" data-testid="gpu-ws-step" onClick={handleStep} disabled={isDone} aria-label={t('next')} title={t('next')}>
                <SkipForward size={15} />
              </button>
            </div>
          </div>

          {/* Animated Multi-Warp Swimlane + Execution Unit Pipeline SVG */}
          <div className="gr-svg-wrap gr-ws-canvas">
            <WarpSchedulerSvg
              sm={sm}
              currentCycle={clampedCycle}
              onSelectCycle={handleSelectCycle}
              t={t}
            />
          </div>

          {/* Live Cycle State Narration */}
          <div className={`gr-ws-narr ${activeCycle.state === 'stall' ? 'stall' : ''}`} data-testid="gpu-ws-narr">
            <strong>C{clampedCycle}</strong>
            <span>{cycleNarration}</span>
          </div>

          {/* Synchronized 32-Lane SIMT Execution Mask */}
          <div>
            <div className="gr-code-title">
              SIMT Warp Mask (32 Lanes · {simtStatusLabel})
            </div>
            <div className="gr-simt-bar" aria-hidden="true">
              {Array.from({ length: 16 }, (_, idx) => {
                const isMasked = simtMaskMode === 'idle'
                  || (simtMaskMode === 'passA' && idx >= 8)
                  || (simtMaskMode === 'passB' && idx < 8);
                return (
                  <div
                    key={idx}
                    className={`gr-lane-bit ${isMasked ? 'masked' : ''} ${simtMaskMode === 'idle' ? 'stall' : ''}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <aside className="gr-side">
          <div className={`gr-callout ${alertClass}`}>
            <h3>{t('smLimiterTitle')}</h3>
            <div className="gr-lim-list" style={{ marginBottom: 8 }}>
              <div className={`gr-lim-row ${sm.limiter === 'registers' ? 'active' : ''}`}>
                <span>{t('smLimReg')} (64K / {sm.blockSize * sm.regsPerThread})</span>
                <span>
                  {sm.blocksByReg} blk {sm.limiter === 'registers' && <b className="gr-lim-badge">{t('smLimiterBadge')}</b>}
                </span>
              </div>
              <div className={`gr-lim-row ${sm.limiter === 'smem' ? 'active' : ''}`}>
                <span>{t('smLimSmem')} (228 KB / {sm.smemKB} KB)</span>
                <span>
                  {sm.blocksBySmem} blk {sm.limiter === 'smem' && <b className="gr-lim-badge">{t('smLimiterBadge')}</b>}
                </span>
              </div>
              <div className={`gr-lim-row ${sm.limiter === 'warp_cap' ? 'active' : ''}`}>
                <span>{t('smLimWarp')} (64 / {sm.warpsPerBlock})</span>
                <span>
                  {sm.blocksByWarpCap} blk {sm.limiter === 'warp_cap' && <b className="gr-lim-badge">{t('smLimiterBadge')}</b>}
                </span>
              </div>
            </div>
            <p>{calloutBody}</p>
          </div>

          <div>
            <div className="gr-code-title">{t('smCodeTitle')}</div>
            <pre className="gr-code">
              <div className={activeCycle.state === 'issue' ? 'on' : ''}>int tid = blockIdx.x * blockDim.x + threadIdx.x; // LDG</div>
              <div>__shared__ half smem_tile[BM][BK];  // {sm.smemKB} KB/block</div>
              <div className={activeCycle.pass === 'passA' || activeCycle.pass === 'passB' ? 'on' : ''}>if (mask[tid]) fast_path(); else slow_path(); // SIMT</div>
              <div className={activeCycle.state === 'hide' || activeCycle.state === 'compute' ? 'on' : ''}>acc = fma(reg_a, reg_b, acc); // 0-cycle warp issue</div>
            </pre>
          </div>
        </aside>
      </div>
    </section>
  );
}
