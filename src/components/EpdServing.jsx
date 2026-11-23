import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import ChapterIcon from './ChapterIcon';
import { useLanguage } from '../lib/LanguageContext';
import { useExperimentState } from '../lib/ExperimentContext';
import { MathFormula } from './linear-attention/MathFormula';
import {
  EPD_MODES,
  EPD_OPS_IDS,
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
    opsId: 'cpu_decode_wall',
  });
  const config = useMemo(() => normalizeEpdConfig(rawConfig), [rawConfig]);
  const update = (patch) => setConfig((prev) => normalizeEpdConfig({ ...(prev || config), ...patch }));

  const [archPin, setArchPin] = useState(2);
  const [cacheStep, setCacheStep] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);

  const s2 = useMemo(() => deriveEpdModeModel(config.epdMode), [config.epdMode]);
  const pre = useMemo(() => derivePreprocModel(config.preprocMode), [config.preprocMode]);
  const mm = useMemo(() => deriveMmCacheTrace({ cacheMode: config.cacheMode, step: cacheStep }), [config.cacheMode, cacheStep]);
  const ratio = useMemo(
    () => deriveEpdRatioModel({ workload: config.workload, eNodes: config.eNodes, pNodes: config.pNodes }),
    [config.workload, config.eNodes, config.pNodes]
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
                <EpdArchSvg activePin={archPin} onSelectPin={setArchPin} />
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
                  <span>Shared GPU</span>
                  <div className="ep-lane-bar">
                    <div className="ep-seg enc" style={{ width: '28%' }}>ViT Burst</div>
                    <div className="ep-seg pre" style={{ width: '44%' }}>VLM + Text Prefill</div>
                    <div className="ep-seg dec" style={{ width: '28%' }}>Stalled Decode</div>
                  </div>
                </div>
              ) : config.epdMode === 'pd_coupled' ? (
                <>
                  <div className="ep-lane-row">
                    <span>E+P Pool</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg enc" style={{ width: '32%' }}>ViT on 70B GPU!</div>
                      <div className="ep-seg pre" style={{ width: '68%' }}>Delayed Text + VLM Prefill</div>
                    </div>
                  </div>
                  <div className="ep-lane-row">
                    <span>D Pool</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg dec" style={{ width: '100%' }}>Steady Decode (20 ms TPOT)</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="ep-lane-row">
                    <span>Encode Pool (E)</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg enc" style={{ width: '58%' }}>Stateless ViT → 16 MB Emb</div>
                      <div className="ep-seg idle" style={{ width: '42%' }}>Next Image</div>
                    </div>
                  </div>
                  <div className="ep-lane-row">
                    <span>Prefill Pool (P)</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg pre" style={{ width: '42%' }}>Text Fast-Path (115 ms)</div>
                      <div className="ep-seg pre" style={{ width: '58%' }}>VLM Prefill → RDMA KV</div>
                    </div>
                  </div>
                  <div className="ep-lane-row">
                    <span>Decode Pool (D)</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg dec" style={{ width: '100%' }}>Pure Streaming Decode (19 ms TPOT)</div>
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
              <div className="ep-lanes" style={{ marginTop: 4 }}>
                <div className="ep-lane-row">
                  <span>E → P Emb</span>
                  <div className="ep-lane-bar">
                    <div className="ep-seg enc" style={{ width: '18%' }}>16 MB</div>
                    <div className="ep-seg idle" style={{ width: '82%' }}>80× lighter than KV · Elastic E-pool</div>
                  </div>
                </div>
                <div className="ep-lane-row">
                  <span>P → D KV</span>
                  <div className="ep-lane-bar">
                    <div className="ep-seg pre" style={{ width: '100%' }}>1,280 MB (80-layer KV Cache over RDMA)</div>
                  </div>
                </div>
              </div>
              <p>{t(`modeNote_${config.epdMode}`)}</p>
            </div>
          </div>
        </section>

        {/* §3 CPU Decode Bottleneck */}
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
                      <div className="ep-seg cpu" style={{ width: '44%' }}>PIL Decode + Resize (48 ms)</div>
                      <div className="ep-seg idle" style={{ width: '56%' }} />
                    </div>
                  </div>
                  <div className="ep-lane-row">
                    <span>{t('laneGpu')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg idle" style={{ width: '44%' }}>GPU Starved (44%)</div>
                      <div className="ep-seg pre" style={{ width: '56%' }}>ViT + Prefill (62 ms)</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="ep-lane-row">
                    <span>{t('laneCpu')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg cpu" style={{ width: '24%' }}>nvJPEG 12ms</div>
                      <div className="ep-seg idle" style={{ width: '76%' }}>Batch N+1 prefetched in Pinned RAM</div>
                    </div>
                  </div>
                  <div className="ep-lane-row">
                    <span>{t('laneGpu')}</span>
                    <div className="ep-lane-bar">
                      <div className="ep-seg idle" style={{ width: '6%' }} />
                      <div className="ep-seg pre" style={{ width: '94%' }}>Continuous ViT + Prefill (62 ms · 94% busy)</div>
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
        </section>

        {/* §5 Dynamic E:P:D 3-Pool Ratio */}
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
        </section>

        {/* §6 Multimodal Serving Failure Modes */}
        <section className="ep-section" data-testid="epd-ops-section">
          <h2 data-section-anchor="epd-ops">{t('s6Title')}</h2>
          <p className="ep-lead">{t('s6Lead')}</p>

          <div className="ep-controls">
            <div className="ep-toggle" role="group" aria-label={t('s6Title')}>
              {EPD_OPS_IDS.map((id) => (
                <button key={id} type="button" data-testid={`epd-ops-${id}`} aria-pressed={config.opsId === id} onClick={() => update({ opsId: id })}>
                  {t(`ops_${id}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="ep-grid-even">
            <div className="ep-box">
              <span className="ep-ctrl-label">{t('opsRoot')}</span>
              <p>{t(`opsRoot_${config.opsId}`)}</p>
            </div>
            <div className="ep-box">
              <span className="ep-ctrl-label">{t('opsFix')}</span>
              <p>{t(`opsFix_${config.opsId}`)}</p>
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
