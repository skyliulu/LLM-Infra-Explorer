import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import ChapterIcon from './ChapterIcon';
import { useLanguage } from '../lib/LanguageContext';
import { useExperimentState } from '../lib/ExperimentContext';
import { MathFormula } from './linear-attention/MathFormula';
import {
  EPD_MODES,
  EPD_TOTAL_GPUS,
  EPD_WORKLOADS,
  MM_CACHE_MODES,
  PREPROC_MODES,
  deriveEpdModeModel,
  deriveEpdRatioModel,
  deriveMmCacheTrace,
  derivePreprocModel,
  normalizeEpdConfig,
} from './epd-serving/model';
import { i18n } from './epd-serving/content';
import EpdArchSvg from './epd-serving/EpdArchSvg';
import PreprocPipeSvg from './epd-serving/PreprocPipeSvg';
import './epd-serving/epd-serving.css';

const EPD_GOODPUT_TEX = String.raw`Q_{\text{EPD}}(E,P,D) = \min\!\big(C_E(E),\ C_P(P),\ C_D(D)\big),\qquad E + P + D = N`;

export default function EpdServing() {
  const [lang] = useLanguage();
  const t = (key) => i18n[lang]?.[key] ?? i18n.en[key] ?? key;

  const [rawConfig, setConfig] = useExperimentState('EpdServing.config', {
    epdMode: 'epd_split',
    preprocMode: 'async_nvjpeg',
    cacheMode: 'emb_cache',
    workload: 'mixed_vlm',
    eNodes: 3,
    pNodes: 6,
  });
  const config = useMemo(() => normalizeEpdConfig(rawConfig), [rawConfig]);
  const update = (patch) => setConfig((prev) => normalizeEpdConfig({ ...(prev || config), ...patch }));

  const [archPin, setArchPin] = useState(2);
  const [cacheStep, setCacheStep] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simHitPct, setSimHitPct] = useState(60);
  const [heteroTco, setHeteroTco] = useState(true);

  const s2 = useMemo(() => deriveEpdModeModel(config.epdMode), [config.epdMode]);
  const pre = useMemo(() => derivePreprocModel(config.preprocMode), [config.preprocMode]);
  const mm = useMemo(() => deriveMmCacheTrace({ cacheMode: config.cacheMode, step: cacheStep }), [config.cacheMode, cacheStep]);
  const ratio = useMemo(
    () => deriveEpdRatioModel({ workload: config.workload, eNodes: config.eNodes, pNodes: config.pNodes, heteroTco }),
    [config.workload, config.eNodes, config.pNodes, heteroTco]
  );

  const done = mm.phase === 'done';
  const reset = () => { setIsPlaying(false); setCacheStep(0); };
  const handleNextStep = () => { setIsPlaying(false); setCacheStep((v) => Math.min(mm.maxStep, v + 1)); };
  const togglePlay = () => { if (done) setCacheStep(0); setIsPlaying((p) => !p); };

  useEffect(() => {
    if (!isPlaying || done) return undefined;
    const timer = setTimeout(() => setCacheStep((v) => Math.min(mm.maxStep, v + 1)), 850);
    return () => clearTimeout(timer);
  }, [isPlaying, cacheStep, done, mm.maxStep]);

  // Unified Embedding Cache economics: 42 ms miss, 2 ms hit => speedup === effective E-pool capacity
  const avgVitMs = Number((42 * (1 - simHitPct / 100) + 2 * (simHitPct / 100)).toFixed(1));
  const effCacheCapacity = Number((42 / avgVitMs).toFixed(2));
  const epBarPct = Math.round((s2.epPayloadMB / s2.pdPayloadMB) * 100); // exact 5% for 16 / 320 MiB

  return (
    <div className="chapter-page ep-page">
      <header className="chapter-header">
        <div>
          <h1><ChapterIcon chapter="epdserving" />{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>

      <div className="chapter-layout chapter-body">
        {/* §1 EPD Architecture */}
        <section className="ep-section" data-testid="epd-arch-section">
          <h2 data-section-anchor="epd-arch">{t('archTitle')}</h2>
          <p className="ep-lead">{t('archLead')}</p>

          <div className="ep-grid-2">
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="ep-svg-wrap">
                <EpdArchSvg activePin={archPin} onSelectPin={setArchPin} lang={lang} />
              </div>
              <div className="ep-box">
                <p>{t('epRatioNote')}</p>
              </div>
            </div>

            <div className="ep-pin-list">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  data-testid={`epd-pin-${num}`}
                  className={`ep-pin-card ${archPin === num ? 'on' : ''}`}
                  onClick={() => setArchPin(num)}
                >
                  <div className="ep-pin-head">
                    <span className="ep-pin-num">{num}</span>
                    <strong>{t(`pin${num}Title`)}</strong>
                  </div>
                  <p>{t(`pin${num}Desc`)}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* §2 Unified vs PD vs EPD */}
        <section className="ep-section" data-testid="epd-interference-section">
          <h2 data-section-anchor="epd-interference">{t('s2Title')}</h2>
          <p className="ep-lead">{t('s2Lead')}</p>

          <div className="ep-controls">
            <div className="ep-toggle" role="group" aria-label={t('s2Title')}>
              {EPD_MODES.map((m) => (
                <button key={m} type="button" data-testid={`epd-mode-${m}`} aria-pressed={config.epdMode === m} onClick={() => update({ epdMode: m })}>
                  {t(`mode_${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="ep-grid-2">
            <div className="ep-lanes">
              {config.epdMode === 'unified' ? (
                <div className="ep-lane-row">
                  <span>{t('laneShared')}</span>
                  <div className="ep-lane-bar">
                    <div className="ep-seg enc" style={{ width: '28%' }}>{t('segVitBurst')}</div>
                    <div className="ep-seg pre" style={{ width: '44%' }}>{t('segVlmTextPre')}</div>
                    <div className="ep-seg dec" style={{ width: '28%' }}>{t('segStalledDec')}</div>
                  </div>
                </div>
              ) : config.epdMode === 'pd_coupled' ? (
                <>
                  <div className="ep-lane-row">
                    <span>{t('laneEpPool')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg enc" style={{ width: '32%' }}>{t('segVitOn70b')}</div>
                      <div className="ep-seg pre" style={{ width: '68%' }}>{t('segDelayedPre')}</div>
                    </div>
                  </div>
                  <div className="ep-lane-row">
                    <span>{t('laneDPool')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg dec" style={{ width: '100%' }}>{t('segSteadyDec')}</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="ep-lane-row">
                    <span>{t('laneEPool')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg enc" style={{ width: '58%' }}>{t('segStatelessVit')}</div>
                      <div className="ep-seg idle" style={{ width: '42%' }}>{t('segNextImg')}</div>
                    </div>
                  </div>
                  <div className="ep-lane-row">
                    <span>{t('lanePPool')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg pre" style={{ width: '42%' }}>{t('segTextFast')}</div>
                      <div className="ep-seg pre" style={{ width: '58%' }}>{t('segVlmPreRdma')}</div>
                    </div>
                  </div>
                  <div className="ep-lane-row">
                    <span>{t('laneDPool')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg dec" style={{ width: '100%' }}>{t('segPureDec')}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="ep-box">
              <div className="ep-kpis-2">
                <div className={`ep-kpi ${s2.ttftTextMs <= 150 ? 'good' : 'warn'}`}>
                  <small>{t('mTextTtft')}</small>
                  <strong>{s2.ttftTextMs} ms</strong>
                </div>
                <div className={`ep-kpi ${s2.ttftVlmMs <= 300 ? 'good' : 'warn'}`}>
                  <small>{t('mVlmTtft')}</small>
                  <strong>{s2.ttftVlmMs} ms</strong>
                </div>
                <div className={`ep-kpi ${s2.p99TpotMs <= 30 ? 'good' : 'warn'}`}>
                  <small>{t('mTpot')}</small>
                  <strong>{s2.p99TpotMs} ms</strong>
                </div>
                <div className={`ep-kpi ${s2.llmGpuWastePct <= 10 ? 'good' : 'warn'}`}>
                  <small>{t('mWaste')}</small>
                  <strong>{s2.llmGpuWastePct}%</strong>
                </div>
              </div>
              {/* Exact proportional payload bars: 16 MiB (5%) vs 320 MiB (100%) */}
              <div className="ep-lanes" style={{ marginTop: 4 }}>
                <div className="ep-lane-row">
                  <span>E → P Emb</span>
                  <div className="ep-lane-bar">
                    <div className="ep-seg enc" style={{ width: `${epBarPct}%`, minWidth: 16 }} title="16 MiB" />
                    <div className="ep-seg idle" style={{ width: `${100 - epBarPct}%` }}>{t('barEpLighter')}</div>
                  </div>
                </div>
                <div className="ep-lane-row">
                  <span>P → D KV</span>
                  <div className="ep-lane-bar">
                    <div className="ep-seg pre" style={{ width: '100%' }}>{t('barPdKv')}</div>
                  </div>
                </div>
              </div>
              <p>{t(`modeNote_${config.epdMode}`)}</p>
            </div>
          </div>
        </section>

        {/* §3 Media Decode Bottleneck */}
        <section className="ep-section" data-testid="epd-preproc-section">
          <h2 data-section-anchor="epd-preprocess">{t('s3Title')}</h2>
          <p className="ep-lead">{t('s3Lead')}</p>

          <div className="ep-controls">
            <div className="ep-toggle" role="group" aria-label={t('s3Title')}>
              {PREPROC_MODES.map((m) => (
                <button key={m} type="button" data-testid={`epd-pre-${m}`} aria-pressed={config.preprocMode === m} onClick={() => update({ preprocMode: m })}>
                  {t(`pre_${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="ep-grid-2">
            <div className="ep-lanes">
              {config.preprocMode === 'sync_loop' ? (
                <>
                  <div className="ep-lane-row">
                    <span>{t('laneCpu')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg cpu" style={{ width: '44%' }}>{t('segSyncPil')}</div>
                      <div className="ep-seg idle" style={{ width: '56%' }} />
                    </div>
                  </div>
                  <div className="ep-lane-row">
                    <span>{t('laneGpu')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg idle" style={{ width: '44%' }}>{t('segGpuStarve')}</div>
                      <div className="ep-seg pre" style={{ width: '56%' }}>{t('segVitPre62')}</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="ep-lane-row">
                    <span>{t('laneCpu')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg cpu" style={{ width: '24%' }}>{t('segNvjpeg12')}</div>
                      <div className="ep-seg idle" style={{ width: '76%' }}>{t('segPrefetchRam')}</div>
                    </div>
                  </div>
                  <div className="ep-lane-row">
                    <span>{t('laneGpu')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg idle" style={{ width: '6%' }} />
                      <div className="ep-seg pre" style={{ width: '94%' }}>{t('segContGpu')}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="ep-box">
              <div className="ep-kpis-3">
                <div className="ep-kpi">
                  <small>{t('mPreTotal')}</small>
                  <strong>{pre.totalMs} ms</strong>
                </div>
                <div className={`ep-kpi ${pre.gpuIdlePct < 15 ? 'good' : 'warn'}`}>
                  <small>{t('mGpuIdle')}</small>
                  <strong>{pre.gpuIdlePct}%</strong>
                </div>
                <div className="ep-kpi good">
                  <small>{t('mPreSpeed')}</small>
                  <strong>{config.preprocMode === 'async_nvjpeg' ? `${pre.speedup}×` : '1.0×'}</strong>
                </div>
              </div>
              <p>{t(`preNote_${config.preprocMode}`)}</p>
            </div>
          </div>

          <div className="ep-svg-wrap">
            <PreprocPipeSvg preprocMode={config.preprocMode} lang={lang} />
          </div>

          <div className="ep-box">
            <span className="ep-ctrl-label">{t('preCodeTitle')}</span>
            <pre className="ep-code">
              <code>{`// Async Media Pool + Bounded E->P Backpressure Queue (vLLM / SGLang EPD Pattern)
async def encode_worker(req):
    img_hash = sha256(req.raw_bytes)
    if (emb := emb_cache.get(img_hash)) is None:
        pixels = await media_pool.decode_gpu_nvjpeg(req.raw_bytes)      // GPU NVDEC off main loop
        emb    = vit_encode_varlen(pixels, max_patch_budget=16384)      // ~16 MiB BF16
        emb_cache.put_lru(img_hash, emb)
    await ep_channel.send_with_credit(req.id, emb)                      // blocks if P-pool full`}</code>
            </pre>
          </div>
        </section>

        {/* §4 Multimodal Embedding Cache */}
        <section className="ep-section" data-testid="epd-cache-section">
          <h2 data-section-anchor="epd-cache">{t('s4Title')}</h2>
          <p className="ep-lead">{t('s4Lead')}</p>

          <div className="ep-controls">
            <div className="ep-toggle" role="group" aria-label={t('s4Title')}>
              {MM_CACHE_MODES.map((m) => (
                <button key={m} type="button" data-testid={`epd-cache-${m}`} aria-pressed={config.cacheMode === m} onClick={() => { update({ cacheMode: m }); setCacheStep(4); setIsPlaying(false); }}>
                  {t(`cache_${m}`)}
                </button>
              ))}
            </div>
            <div className="chapter-playback ep-playback">
              <button type="button" onClick={reset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={16} /></button>
              <button type="button" onClick={togglePlay} aria-label={isPlaying && !done ? t('pause') : t('play')} title={isPlaying && !done ? t('pause') : t('play')}>
                {isPlaying && !done ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button type="button" onClick={handleNextStep} disabled={done} aria-label={t('next')} title={t('next')}><SkipForward size={16} /></button>
            </div>
          </div>

          <div className="ep-trace-grid">
            {mm.items.map((it) => (
              <div key={it.id} className={`ep-trace-card ${it.hit ? 'hit' : 'miss'}`}>
                <strong>{it.id} · {it.img} ({it.hit ? 'EMB HIT' : 'ViT RUN'})</strong>
                <small>{t(it.noteKey)}</small>
                <small><b>{it.vitMs} ms</b></small>
              </div>
            ))}
          </div>

          <div className="ep-kpis-4">
            <div className="ep-kpi good">
              <small>{t('mHitRate')}</small>
              <strong>{mm.hitRatePct}%</strong>
            </div>
            <div className="ep-kpi">
              <small>{t('mVitRuns')}</small>
              <strong>{mm.vitRuns} / {mm.step}</strong>
            </div>
            <div className="ep-kpi">
              <small>{t('mTotalVit')}</small>
              <strong>{mm.totalVitMs} ms</strong>
            </div>
            <div className="ep-kpi good">
              <small>{t('mSavedVit')}</small>
              <strong>-{mm.savedMs} ms</strong>
            </div>
          </div>

          <div className="ep-box">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span className="ep-ctrl-label">{t('cacheEcoTitle')}</span>
              <div className="ep-ctrl-group">
                <span className="ep-ctrl-label">{t('hitRateLbl')}:</span>
                <div className="ep-toggle" role="group" aria-label={t('hitRateLbl')}>
                  {[0, 30, 60, 85].map((pct) => (
                    <button key={pct} type="button" aria-pressed={simHitPct === pct} onClick={() => setSimHitPct(pct)}>
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="ep-kpis-3">
              <div className="ep-kpi">
                <small>{t('cacheAvgEncode')}</small>
                <strong>{avgVitMs} ms</strong>
              </div>
              <div className="ep-kpi good">
                <small>{t('cacheEffCap')}</small>
                <strong>{effCacheCapacity}×</strong>
              </div>
              <div className="ep-kpi">
                <small>{t('cacheRam10k')}</small>
                <strong>{t('cacheRamVal')}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* §5 Dynamic E:P:D 3-Pool Ratio & Honest Heterogeneous TCO */}
        <section className="ep-section" data-testid="epd-ratio-section">
          <h2 data-section-anchor="epd-ratio">{t('s5Title')}</h2>
          <p className="ep-lead">{t('s5Lead')}</p>

          <div className="ep-controls">
            <div className="ep-toggle" role="group" aria-label={t('s5Title')}>
              {Object.values(EPD_WORKLOADS).map((w) => (
                <button key={w.id} type="button" data-testid={`epd-wk-${w.id}`} aria-pressed={config.workload === w.id} onClick={() => update({ workload: w.id, eNodes: w.optE, pNodes: w.optP })}>
                  {t(`wk_${w.id}`)}
                </button>
              ))}
            </div>
            <MathFormula>{EPD_GOODPUT_TEX}</MathFormula>
          </div>

          <div className="ep-slider-row">
            <span className="ep-ctrl-label">{t('lblE')}: <b>{ratio.eNodes}</b></span>
            <input type="range" min={1} max={8} value={ratio.eNodes} onChange={(e) => update({ eNodes: Number(e.target.value) })} aria-label={t('lblE')} />
            <span className="ep-ctrl-label">{t('lblP')}: <b>{ratio.pNodes}</b></span>
            <input type="range" min={2} max={EPD_TOTAL_GPUS - ratio.eNodes - 2} value={ratio.pNodes} onChange={(e) => update({ pNodes: Number(e.target.value) })} aria-label={t('lblP')} />
            <span className="ep-ctrl-label">{t('lblD')}: <b>{ratio.dNodes}</b></span>
          </div>

          <div className="ep-gpu-bar" aria-label="16-GPU E:P:D Allocation">
            {Array.from({ length: EPD_TOTAL_GPUS }, (_, idx) => {
              const cls = idx < ratio.eNodes ? 'e' : idx < ratio.eNodes + ratio.pNodes ? 'p' : 'd';
              return <div key={idx} className={`ep-gpu-slot ${cls}`}>{cls.toUpperCase()}</div>;
            })}
          </div>

          <div className="ep-kpis-4">
            <div className="ep-kpi"><small>{t('mECap')}</small><strong>{ratio.eCap} req/s</strong></div>
            <div className="ep-kpi"><small>{t('mPCap')}</small><strong>{ratio.pCap} req/s</strong></div>
            <div className="ep-kpi"><small>{t('mDCap')}</small><strong>{ratio.dCap} req/s</strong></div>
            <div className="ep-kpi good"><small>{t('mGoodput')}</small><strong>{ratio.goodput} req/s</strong></div>
          </div>

          <div className={`ep-bn-pill ${ratio.bottleneck}`}>{t(`bn_${ratio.bottleneck}`)}</div>

          <div className="ep-box">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span className="ep-ctrl-label">{t('tcoTitle')}</span>
              <div className="ep-toggle" role="group" aria-label={t('tcoTitle')}>
                <button type="button" aria-pressed={!heteroTco} onClick={() => setHeteroTco(false)}>{t('tcoHomo')}</button>
                <button type="button" aria-pressed={heteroTco} onClick={() => setHeteroTco(true)}>{t('tcoHetero')}</button>
              </div>
            </div>
            <div className="ep-kpis-3">
              <div className="ep-kpi">
                <small>{t('tcoClusterHr')}</small>
                <strong>${ratio.hourlyCost.toFixed(1)}/hr</strong>
              </div>
              <div className="ep-kpi">
                <small>{t('tcoCost100k')}</small>
                <strong>${ratio.costPer100k.toFixed(2)}</strong>
              </div>
              <div className={`ep-kpi ${ratio.tcoDeltaPct > 0 ? 'good' : ratio.tcoDeltaPct < 0 ? 'warn' : ''}`}>
                <small>{t('tcoDeltaLbl')}</small>
                <strong>{ratio.tcoDeltaPct > 0 ? `-${ratio.tcoDeltaPct}%` : ratio.tcoDeltaPct < 0 ? `+${Math.abs(ratio.tcoDeltaPct)}%` : '0%'}</strong>
              </div>
            </div>
          </div>
        </section>

        <details className="ep-evidence">
          <summary>{t('evidence')}</summary>
          <p>{t('evidenceBody')}</p>
        </details>
      </div>
    </div>
  );
}
