import React from 'react';
import { BLOCK_SIZE_OPTIONS, REG_OPTIONS, SMEM_OPTIONS } from './model';

export default function SmOccupancySection({ config, sm, update, t }) {
  const alertClass = sm.registerSpill || sm.divergent || sm.stallCycles >= 2 ? 'warn' : '';
  const calloutBody = sm.registerSpill
    ? t('smSpillWarn')
    : sm.divergent
      ? t('smDivWarn')
      : t('smHealthy');

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

          <div>
            <div className="gr-code-title">{t('smTimelineTitle')}</div>
            <div className="gr-cycle-strip">
              {sm.cycles.map((c) => (
                <div key={c.cycle} className={`gr-cycle-cell ${c.state}`}>
                  <small>C{c.cycle}</small>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="gr-code-title">
              SIMT Warp Mask (32 Lanes: {config.divergent ? 'Pass A 16/32 → Pass B 16/32' : '32/32 Active'})
            </div>
            <div className="gr-simt-bar" aria-hidden="true">
              {Array.from({ length: 16 }, (_, idx) => (
                <div key={idx} className={`gr-lane-bit ${config.divergent && idx >= 8 ? 'masked' : ''}`} />
              ))}
            </div>
          </div>

          <p className="gr-lead">{t('smTimelineNote')}</p>
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
              <div className="on">int tid = blockIdx.x * blockDim.x + threadIdx.x;</div>
              <div>__shared__ half smem_tile[BM][BK];  // {sm.smemKB} KB/block</div>
              <div className={config.divergent ? 'on' : ''}>if (mask[tid]) fast_path(); else slow_path(); // SIMT</div>
              <div>__syncthreads();  // intra-block barrier only</div>
            </pre>
          </div>
        </aside>
      </div>
    </section>
  );
}
