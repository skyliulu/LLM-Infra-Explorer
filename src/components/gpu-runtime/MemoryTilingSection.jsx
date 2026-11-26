import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { MEM_VIEWS } from './model';
import MemoryDataflowSvg from './MemoryDataflowSvg';

export default function MemoryTilingSection({ config, mem, update, t }) {
  const maxStep = 4;
  const [step, setStep] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);

  const isDone = step >= maxStep;

  useEffect(() => {
    if (!isPlaying || isDone) return undefined;
    const timer = setTimeout(() => {
      setStep((s) => {
        if (s >= maxStep) {
          setIsPlaying(false);
          return maxStep;
        }
        return s + 1;
      });
    }, 750);
    return () => clearTimeout(timer);
  }, [isPlaying, step, isDone]);

  const handleReset = () => { setIsPlaying(false); setStep(1); };
  const handleStep = () => { setIsPlaying(false); setStep((s) => Math.min(maxStep, s + 1)); };
  const handleTogglePlay = () => {
    if (isDone) setStep(1);
    setIsPlaying((p) => !p);
  };

  // Highlight active tier(s) in the 5-Tier Memory Pyramid synced to current animation step
  const activeTierIds = (() => {
    if (config.memView === 'coalescing') {
      if (step === 1) return ['reg'];
      if (step === 2) return ['smem', 'l2'];
      return ['l2', 'hbm'];
    }
    if (!mem.tiled) {
      if (step <= 2) return ['hbm'];
      return ['hbm', 'reg'];
    }
    if (step === 1) return ['hbm'];
    if (step === 2) return ['hbm', 'smem'];
    if (step === 3) return ['smem', 'reg'];
    return ['reg'];
  })();

  const stepNarrKey = config.memView === 'coalescing'
    ? (mem.isCoalesced ? `memNarrCoal_${step}` : `memNarrStride_${step}`)
    : (mem.tiled ? `memNarrTiled_${step}` : `memNarrNaive_${step}`);
  const isWarnState = config.memView === 'coalescing' ? !mem.isCoalesced : !mem.tiled;

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
              onClick={() => { update({ memView: view }); setStep(4); setIsPlaying(false); }}
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
              onClick={() => { update({ stride: 1 }); setStep(4); setIsPlaying(false); }}
            >
              {t('memStride1')}
            </button>
            <button
              type="button"
              data-testid="gpu-stride-32"
              aria-pressed={config.stride === 32}
              onClick={() => { update({ stride: 32 }); setStep(4); setIsPlaying(false); }}
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
              onClick={() => { update({ tiled: false }); setStep(4); setIsPlaying(false); }}
            >
              {t('memNaive')}
            </button>
            <button
              type="button"
              data-testid="gpu-tiled-true"
              aria-pressed={config.tiled}
              onClick={() => { update({ tiled: true }); setStep(4); setIsPlaying(false); }}
            >
              {t('memTiled')}
            </button>
          </div>
        )}

        <div className="chapter-playback gr-playback">
          <button type="button" data-testid="gpu-mem-reset" onClick={handleReset} aria-label={t('reset')} title={t('reset')}>
            <RotateCcw size={15} />
          </button>
          <button type="button" data-testid="gpu-mem-play" onClick={handleTogglePlay} aria-label={isPlaying && !isDone ? t('pause') : t('play')} title={isPlaying && !isDone ? t('pause') : t('play')}>
            {isPlaying && !isDone ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button type="button" data-testid="gpu-mem-step" onClick={handleStep} disabled={isDone} aria-label={t('next')} title={t('next')}>
            <SkipForward size={15} />
          </button>
        </div>
      </div>

      <div className="gr-mem-grid">
        <div className="gr-mem-box">
          {config.memView === 'coalescing' ? (
            <div className="gr-kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <div className={mem.isCoalesced ? 'good' : 'warn'}>
                <small>{t('memTxCount')}</small>
                <strong>{mem.transactions} × 32B</strong>
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
          ) : (
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
          )}

          {/* Dynamic 4-Step Coalescing / Tiling Dataflow SVG */}
          <div className="gr-svg-wrap gr-mem-canvas">
            <MemoryDataflowSvg mem={mem} step={step} t={t} />
          </div>

          <div className={`gr-ws-narr ${isWarnState && step >= 3 ? 'stall' : ''}`} data-testid="gpu-mem-narr">
            <strong>Step {step}/{maxStep}</strong>
            <span>{t(stepNarrKey)}</span>
          </div>
        </div>

        <div className="gr-mem-box">
          <div className="gr-code-title">{t('memTierTitle')}</div>
          <div className="gr-tier-list">
            {mem.tiers.map((tier) => {
              const isAct = activeTierIds.includes(tier.id);
              return (
                <div key={tier.id} className={`gr-tier-row ${isAct ? (isWarnState && tier.id === 'hbm' ? 'warn-act' : 'act') : ''}`}>
                  <strong>{t(`tier_${tier.id}`)}</strong>
                  <span>{tier.cap}</span>
                  <span>{tier.bw}</span>
                  <span>{tier.lat}</span>
                </div>
              );
            })}
          </div>
          <p className="gr-lead" style={{ fontSize: 11.5 }}>
            {config.memView === 'coalescing'
              ? t(mem.isCoalesced ? 'memCoalesceGood' : 'memCoalesceBad')
              : t(mem.tiled ? 'memFlowNote_tiled' : 'memFlowNote_naive')}
          </p>
        </div>
      </div>
    </section>
  );
}
