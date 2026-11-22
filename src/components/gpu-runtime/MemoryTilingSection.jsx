import React from 'react';
import { MEM_VIEWS } from './model';

export default function MemoryTilingSection({ config, mem, update, t }) {
  return (
    <section className="gr-section" data-testid="gpu-memory-section">
      <h2 data-section-anchor="gpucudagraph-memory">{t('memTitle')}</h2>
      <p className="gr-lead">{t('memLead')}</p>

      <div className="gr-controls">
        <div className="gr-toggle" role="group" aria-label={t('memTitle')}>
          {MEM_VIEWS.map((view) => (
            <button
              key={view}
              type="button"
              data-testid={`gpu-memview-${view}`}
              aria-pressed={config.memView === view}
              onClick={() => update({ memView: view })}
            >
              {t(view === 'coalescing' ? 'memTabCoalescing' : 'memTabTiling')}
            </button>
          ))}
        </div>

        {config.memView === 'coalescing' ? (
          <div className="gr-toggle" role="group" aria-label={t('memTabCoalescing')}>
            <button
              type="button"
              data-testid="gpu-stride-1"
              aria-pressed={config.stride === 1}
              onClick={() => update({ stride: 1 })}
            >
              {t('memStride1')}
            </button>
            <button
              type="button"
              data-testid="gpu-stride-32"
              aria-pressed={config.stride === 32}
              onClick={() => update({ stride: 32 })}
            >
              {t('memStride32')}
            </button>
          </div>
        ) : (
          <div className="gr-toggle" role="group" aria-label={t('memTabTiling')}>
            <button
              type="button"
              data-testid="gpu-tiled-false"
              aria-pressed={!config.tiled}
              onClick={() => update({ tiled: false })}
            >
              {t('memNaive')}
            </button>
            <button
              type="button"
              data-testid="gpu-tiled-true"
              aria-pressed={config.tiled}
              onClick={() => update({ tiled: true })}
            >
              {t('memTiled')}
            </button>
          </div>
        )}
      </div>

      <div className="gr-mem-grid">
        <div className="gr-mem-box">
          {config.memView === 'coalescing' ? (
            <>
              <div className="gr-kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                <div className={mem.isCoalesced ? 'good' : 'warn'}>
                  <small>{t('memTxCount')}</small>
                  <strong>{mem.transactions} × 128B</strong>
                </div>
                <div className={mem.isCoalesced ? 'good' : 'warn'}>
                  <small>{t('memBusEff')}</small>
                  <strong>{mem.busEfficiencyPct}%</strong>
                </div>
                <div>
                  <small>{t('memFetched')}</small>
                  <strong>{mem.fetchedBytes} B</strong>
                </div>
              </div>

              <div className="gr-coal-grid" aria-label="Warp 32-thread Global Memory Access">
                {Array.from({ length: 16 }, (_, idx) => (
                  <div
                    key={idx}
                    className={`gr-coal-cell ${mem.isCoalesced ? 'hit' : idx % 2 === 0 ? 'scatter' : 'waste'}`}
                  >
                    {mem.isCoalesced ? `T${idx * 2}` : idx % 2 === 0 ? `L${idx * 2}` : '···'}
                  </div>
                ))}
              </div>
              <p className="gr-lead">{t(mem.isCoalesced ? 'memCoalesceGood' : 'memCoalesceBad')}</p>
            </>
          ) : (
            <>
              <div className="gr-kpis" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <div className={mem.tiled ? 'good' : 'warn'}>
                  <small>{t('memHbmTraffic')}</small>
                  <strong>{mem.activeHbmMB} MB</strong>
                </div>
                <div className={mem.tiled ? 'good' : 'warn'}>
                  <small>{t('memReuse')}</small>
                  <strong>{mem.reuseFactor}×</strong>
                </div>
              </div>

              <div className="gr-code-title">{t('memFlowTitle')}</div>
              <div className="gr-flow-steps">
                <div className="gr-flow-card on">
                  <strong>1. HBM Tile</strong>
                  <small>Global A, B</small>
                </div>
                <div className={`gr-flow-card ${mem.tiled ? 'on' : 'bypass'}`}>
                  <strong>2. SMEM Tile</strong>
                  <small>{mem.tiled ? 'cp.async / TMA' : 'Bypassed'}</small>
                </div>
                <div className="gr-flow-card on">
                  <strong>3. Reg Frag</strong>
                  <small>Warp MMA Frag</small>
                </div>
                <div className="gr-flow-card on">
                  <strong>4. Tensor Core</strong>
                  <small>D = A·B + C</small>
                </div>
              </div>
              <p className="gr-lead">{t(mem.tiled ? 'memFlowNote_tiled' : 'memFlowNote_naive')}</p>
            </>
          )}
        </div>

        <div className="gr-mem-box">
          <div className="gr-code-title">{t('memTierTitle')}</div>
          <div className="gr-tier-list">
            {mem.tiers.map((tier) => (
              <div key={tier.id} className="gr-tier-row">
                <strong>{t(`tier_${tier.id}`)}</strong>
                <span>{tier.cap}</span>
                <span>{tier.bw}</span>
                <span>{tier.lat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
