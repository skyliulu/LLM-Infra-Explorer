import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import ChapterIcon from './ChapterIcon';
import { useLanguage } from '../lib/LanguageContext';
import { useExperimentState } from '../lib/ExperimentContext';
import { MathFormula } from './linear-attention/MathFormula';
import {
  CHUNK_SIZES,
  HIT_OPTIONS,
  ISL_OPTIONS,
  KV_LAYOUT_MODES,
  KV_PIPE_MODES,
  OSL_OPTIONS,
  PD_LINKS,
  PD_MODES,
  RATIO_PRESETS,
  ROUTER_POLICIES,
  TOTAL_GPUS,
  deriveInterferenceModel,
  deriveKvTransferModel,
  derivePdRatioModel,
  deriveRouterTrace,
  normalizePdConfig,
} from './pd-router/model';
import { i18n } from './pd-router/content';
import PdArchSvg from './pd-router/PdArchSvg';
import KvTransferSvg from './pd-router/KvTransferSvg';
import './pd-router/pd-router.css';

const TTFT_TEX = String.raw`\begin{aligned}
T_{\text{TTFT}} &\approx T_{\text{queue}} + T_{\text{prefill}} + T_{\text{transfer,exposed}} + T_{\text{handoff}} \\
s_r &= (P_r,\ D_r,\ G_r,\ \text{phase}_r,\ \text{kv\_blocks}_r)
\end{aligned}`;
const CHUNK_TEX = String.raw`T_{\text{chunk}}(c) = T_{\text{launch}} + T_{\text{attn}}(c) + T_{\text{mlp}}(c) \le \beta \cdot S_{\text{TPOT}}`;
const GOODPUT_TEX = String.raw`Q_{\text{SLO}}(P) = \min\!\big(P\cdot r_P(\text{ISL}_{\text{eff}}),\ (N-P)\cdot r_D(\text{ISL},\text{OSL}),\ C_{\text{KV}}\big),\quad \text{ISL}_{\text{eff}}=\text{ISL}(1-h)`;

export default function PdDisaggregation() {
  const [lang] = useLanguage();
  const t = (key) => i18n[lang]?.[key] ?? i18n.en[key] ?? key;

  const [rawConfig, setConfig] = useExperimentState('PdRouter.config', {
    pdMode: 'disaggregated',
    link: 'rdma',
    chunkSize: 2048,
    kvPipe: 'layerwise_pipelined',
    kvLayout: 'asymmetric',
    routerPolicy: 'cache_aware',
    isl: 4096,
    osl: 512,
    cacheHitPct: 40,
    pNodes: 8,
  });
  const config = useMemo(() => normalizePdConfig(rawConfig), [rawConfig]);
  const update = (patch) => setConfig((prev) => normalizePdConfig({ ...(prev || config), ...patch }));

  const [archPin, setArchPin] = useState(1);
  const [step, setStep] = useState(6);
  const [isPlaying, setIsPlaying] = useState(false);

  const s1 = useMemo(
    () => deriveInterferenceModel({ pdMode: config.pdMode, link: config.link, chunkSize: config.chunkSize }),
    [config.pdMode, config.link, config.chunkSize]
  );
  const kv = useMemo(
    () => deriveKvTransferModel({ kvPipe: config.kvPipe, kvLayout: config.kvLayout }),
    [config.kvPipe, config.kvLayout]
  );
  const router = useMemo(
    () => deriveRouterTrace({ routerPolicy: config.routerPolicy, step }),
    [config.routerPolicy, step]
  );
  const ratio = useMemo(
    () => derivePdRatioModel({ isl: config.isl, osl: config.osl, cacheHitPct: config.cacheHitPct, pNodes: config.pNodes }),
    [config.isl, config.osl, config.cacheHitPct, config.pNodes]
  );

  const done = router.phase === 'done';
  const reset = () => { setIsPlaying(false); setStep(0); };
  const handleNextStep = () => { setIsPlaying(false); setStep((v) => Math.min(router.maxStep, v + 1)); };
  const togglePlay = () => { if (done) setStep(0); setIsPlaying((p) => !p); };

  useEffect(() => {
    if (!isPlaying || done) return undefined;
    const timer = setTimeout(() => setStep((v) => Math.min(router.maxStep, v + 1)), 750);
    return () => clearTimeout(timer);
  }, [isPlaying, step, done, router.maxStep]);

  const sloNoteKey = config.pdMode === 'disaggregated'
    ? `sloNote_disaggregated_${config.link}`
    : `sloNote_${config.pdMode}`;

  const renderSegLabel = (seg) => {
    const base = t(seg.labelKey);
    return seg.idx != null ? `${base}${seg.idx}` : base;
  };

  // §5 SVG Goodput curve geometry
  const box = { left: 42, right: 342, top: 18, bottom: 128 };
  const xP = (pVal) => box.left + ((pVal - 2) / (TOTAL_GPUS - 4)) * (box.right - box.left);
  const yQ = (qVal) => box.bottom - (qVal / (ratio.maxGoodput * 1.15)) * (box.bottom - box.top);
  const curvePath = ratio.curve
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${xP(pt.pNodes).toFixed(1)},${yQ(pt.goodput).toFixed(1)}`)
    .join(' ');

  return (
    <div className="chapter-page pd-page">
      <header className="chapter-header">
        <div>
          <h1><ChapterIcon chapter="pdrouter" />{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>

      <div className="chapter-layout chapter-body">
        {/* §1 End-to-End Architecture & Request State Machine */}
        <section className="pd-section" data-testid="pd-arch-section">
          <h2 data-section-anchor="pd-arch">{t('archTitle')}</h2>
          <p className="pd-lead">{t('archLead')}</p>

          <div className="pd-arch-grid">
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="pd-svg-wrap">
                <PdArchSvg activePin={archPin} onSelectPin={setArchPin} t={t} />
              </div>
              <div className="pd-math-strip">
                <small>{t('archStateTitle')}</small>
                <MathFormula block>{TTFT_TEX}</MathFormula>
                <small style={{ opacity: 0.85 }}>{t('archVarLegend')}</small>
              </div>
            </div>

            <div className="pd-pin-list">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  data-testid={`pd-arch-pin-${num}`}
                  className={`pd-pin-card ${archPin === num ? 'on' : ''}`}
                  onClick={() => setArchPin(num)}
                >
                  <div className="pd-pin-head">
                    <span className="pd-pin-num">{num}</span>
                    <strong>{t(`archPin${num}Title`)}</strong>
                  </div>
                  <p>{t(`archPin${num}Desc`)}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* §2 Prefill-Decode Interference, Chunked Prefill Budget & Transfer Boundary */}
        <section className="pd-section" data-testid="pd-interference-section">
          <h2 data-section-anchor="pd-interference">{t('s1Title')}</h2>
          <p className="pd-lead">{t('s1Lead')}</p>

          <div className="pd-controls">
            <div className="pd-toggle" role="group" aria-label={t('s1Title')}>
              {PD_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`pd-mode-${m}`}
                  aria-pressed={config.pdMode === m}
                  onClick={() => update({ pdMode: m })}
                >
                  {t(`mode_${m}`)}
                </button>
              ))}
            </div>

            {config.pdMode === 'chunked' && (
              <div className="pd-ctrl-group">
                <span className="pd-ctrl-label">{t('chunkLabel')}:</span>
                <div className="pd-toggle" role="group" aria-label={t('chunkLabel')}>
                  {CHUNK_SIZES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      data-testid={`pd-chunk-${c}`}
                      aria-pressed={config.chunkSize === c}
                      onClick={() => update({ chunkSize: c })}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {config.pdMode === 'disaggregated' && (
              <div className="pd-toggle" role="group" aria-label={t('laneKv')}>
                {PD_LINKS.map((lnk) => (
                  <button
                    key={lnk}
                    type="button"
                    data-testid={`pd-link-${lnk}`}
                    aria-pressed={config.link === lnk}
                    onClick={() => update({ link: lnk })}
                  >
                    {t(`link_${lnk}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pd-s1-grid">
            <div className="pd-lanes">
              <div className="pd-lane-row">
                <span>{config.pdMode === 'disaggregated' ? t('laneP') : t('laneShared')}</span>
                <div className="pd-lane-bar">
                  {s1.pLane.map((seg) => (
                    <div key={seg.id} className={`pd-seg ${seg.kind}`} style={{ width: `${seg.pct}%` }}>
                      {renderSegLabel(seg)}
                    </div>
                  ))}
                </div>
              </div>

              {s1.kvLane && (
                <div className="pd-lane-row">
                  <span>{t('laneKv')}</span>
                  <div className="pd-lane-bar">
                    {s1.kvLane.map((seg) => (
                      <div key={seg.id} className={`pd-seg ${seg.kind}`} style={{ width: `${seg.pct}%` }}>
                        {renderSegLabel(seg)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {s1.dLane && (
                <div className="pd-lane-row">
                  <span>{t('laneD')}</span>
                  <div className="pd-lane-bar">
                    {s1.dLane.map((seg) => (
                      <div key={seg.id} className={`pd-seg ${seg.kind}`} style={{ width: `${seg.pct}%` }}>
                        {renderSegLabel(seg)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {config.pdMode === 'chunked' && (
                <div style={{ paddingTop: 4 }}>
                  <MathFormula>{CHUNK_TEX}</MathFormula>
                </div>
              )}
            </div>

            <div className="pd-side-box">
              <div className="pd-kpis-2">
                <div className={`pd-kpi ${s1.ttftPass ? 'pass' : 'fail'}`}>
                  <small>{t('mTtft')} (≤{s1.ttftSloMs}ms)</small>
                  <strong>{s1.ttftMs} ms</strong>
                </div>
                <div className={`pd-kpi ${s1.tpotPass ? 'pass' : 'fail'}`}>
                  <small>{t('mTpot')} (≤{s1.tpotSloMs}ms)</small>
                  <strong>{s1.p99TpotMs} ms</strong>
                </div>
                <div className="pd-kpi">
                  <small>{t('mTransfer')}</small>
                  <strong>{s1.transferMs} ms</strong>
                </div>
                <div className={`pd-kpi ${s1.sloPass ? 'pass' : 'fail'}`}>
                  <small>{t('mVerdict')}</small>
                  <strong>{t(s1.sloPass ? 'pass' : 'fail')}</strong>
                </div>
              </div>
              <p>{t(sloNoteKey)}</p>
            </div>
          </div>
        </section>

        {/* §3 KV Transfer Pipeline & Asymmetric P->D Resharding */}
        <section className="pd-section" data-testid="pd-kvtransfer-section">
          <h2 data-section-anchor="pd-kvtransfer">{t('kvTitle')}</h2>
          <p className="pd-lead">{t('kvLead')}</p>

          <div className="pd-controls">
            <div className="pd-toggle" role="group" aria-label={t('kvTitle')}>
              {KV_PIPE_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`pd-kvpipe-${m}`}
                  aria-pressed={config.kvPipe === m}
                  onClick={() => update({ kvPipe: m })}
                >
                  {t(`kvPipe_${m}`)}
                </button>
              ))}
            </div>

            <div className="pd-toggle" role="group" aria-label={t('kvFanIn')}>
              {KV_LAYOUT_MODES.map((l) => (
                <button
                  key={l}
                  type="button"
                  data-testid={`pd-kvlayout-${l}`}
                  aria-pressed={config.kvLayout === l}
                  onClick={() => update({ kvLayout: l })}
                >
                  {t(`kvLayout_${l}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="pd-kv-grid">
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="pd-lanes">
                <div className="pd-lane-row">
                  <span>{t('laneP')}</span>
                  <div className="pd-lane-bar">
                    <div className="pd-seg prefill" style={{ width: `${kv.computePct}%` }}>
                      {t('kvLaneCompute')}
                    </div>
                    <div className="pd-seg idle" style={{ width: `${100 - kv.computePct}%` }} />
                  </div>
                </div>
                <div className="pd-lane-row">
                  <span>{t('laneKv')}</span>
                  <div className="pd-lane-bar">
                    {kv.isPipelined ? (
                      <>
                        <div className="pd-seg idle" style={{ width: `${kv.pipeLeadPct}%` }} />
                        <div className="pd-seg rdma" style={{ width: `${kv.pipeBarPct}%` }}>
                          {`${t('kvLanePipePrefix')}${kv.exposedTransferMs}${t('kvLanePipeSuffix')}`}
                        </div>
                        <div className="pd-seg idle" style={{ width: `${Math.max(0, 100 - kv.pipeLeadPct - kv.pipeBarPct)}%` }} />
                      </>
                    ) : (
                      <>
                        <div className="pd-seg idle" style={{ width: `${kv.computePct}%` }}>{t('kvLaneWaitAll')}</div>
                        <div className="pd-seg stall" style={{ width: `${kv.bulkTxPct}%` }} title={`${t('kvLaneBulkPrefix')}${kv.exposedTransferMs}${t('kvLaneBulkSuffix')}`}>
                          {`${kv.exposedTransferMs}ms`}
                        </div>
                        <div className="pd-seg idle" style={{ width: `${Math.max(0, 100 - kv.computePct - kv.bulkTxPct)}%` }} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="pd-svg-wrap">
                <KvTransferSvg isAsym={kv.isAsym} t={t} />
              </div>
            </div>

            <div className="pd-side-box">
              <div className="pd-kpis-2">
                <div className="pd-kpi">
                  <small>{t('kvVol')}</small>
                  <strong>{kv.kvSizeGB} GB</strong>
                </div>
                <div className={`pd-kpi ${kv.isPipelined ? 'pass' : 'fail'}`}>
                  <small>{t('kvExposed')}</small>
                  <strong>{kv.exposedTransferMs} ms</strong>
                </div>
                <div className={`pd-kpi ${kv.overlapPct >= 75 ? 'pass' : ''}`}>
                  <small>{t('kvOverlap')}</small>
                  <strong>{kv.overlapPct}%</strong>
                </div>
                <div className="pd-kpi">
                  <small>{t('kvFanIn')}</small>
                  <strong>{t(kv.fanInKey)}</strong>
                </div>
              </div>
              <p>{t(`kvNote_${config.kvPipe}`)}</p>
            </div>
          </div>
        </section>

        {/* §4 Cluster Cache-Aware Router Trilemma */}
        <section className="pd-section" data-testid="pd-router-section">
          <h2 data-section-anchor="pd-router">{t('s2Title')}</h2>
          <p className="pd-lead">{t('s2Lead')}</p>

          <div className="pd-controls">
            <div className="pd-toggle" role="group" aria-label={t('s2Title')}>
              {ROUTER_POLICIES.map((pol) => (
                <button
                  key={pol}
                  type="button"
                  data-testid={`pd-pol-${pol}`}
                  aria-pressed={config.routerPolicy === pol}
                  onClick={() => { update({ routerPolicy: pol }); setStep(6); setIsPlaying(false); }}
                >
                  {t(`pol_${pol}`)}
                </button>
              ))}
            </div>

            <div className="chapter-playback pd-playback">
              <button type="button" onClick={reset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={16} /></button>
              <button type="button" onClick={togglePlay} aria-label={isPlaying && !done ? t('pause') : t('play')} title={isPlaying && !done ? t('pause') : t('play')}>
                {isPlaying && !done ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button type="button" onClick={handleNextStep} disabled={done} aria-label={t('next')} title={t('next')}><SkipForward size={16} /></button>
            </div>
          </div>

          <div className="pd-trace-bar">
            <span>
              {router.lastEvent
                ? `${t('stepTrace')}: ${router.lastEvent.reqId} [${router.lastEvent.prefix}] → ${router.lastEvent.workerId} · ${t(`reason_${router.lastEvent.reason}`)}`
                : t('stepIdle')}
            </span>
            <span>{router.step} / {router.maxStep}</span>
          </div>

          <div className="pd-workers">
            {router.workers.map((w) => (
              <div key={w.id} className={`pd-worker ${w.overloaded ? 'overload' : ''}`} data-testid={`pd-worker-${w.id}`}>
                <div className="pd-w-head">
                  <strong>{w.id}</strong>
                  <span className={`pd-w-badge ${w.warm.length > 0 ? 'warm' : ''}`}>
                    {w.warm.length > 0 ? w.warm.join('+') : t('wCold')}
                  </span>
                </div>
                <div className="pd-w-meter">
                  <span>{t('wQueue')}: <b>{w.load}</b> · {t('wKv')}: <b>{w.kvPct}%</b></span>
                  <div className="pd-w-track"><i style={{ width: `${Math.min(100, w.load * 20)}%` }} /></div>
                </div>
                <div className="pd-chips">
                  {w.assigned.map((req) => (
                    <span key={req.id} className={`pd-chip ${req.overloaded ? 'over' : req.hit ? 'hit' : 'miss'}`}>
                      {req.id}:{req.prefix} {req.hit ? 'HIT' : 'MISS'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pd-r-foot">
            <p>{t(`routerNote_${config.routerPolicy}`)}</p>
            <div className="pd-kpis-3">
              <div className="pd-kpi">
                <small>{t('mHitRate')}</small>
                <strong>{router.hitRatePct}%</strong>
              </div>
              <div className={`pd-kpi ${router.maxQueue >= 4 ? 'fail' : 'pass'}`}>
                <small>{t('mMaxQ')}</small>
                <strong>{router.maxQueue}</strong>
              </div>
              <div className={`pd-kpi ${router.p99TtftMs > 500 ? 'fail' : 'pass'}`}>
                <small>{t('mP99Ttft')}</small>
                <strong>{router.p99TtftMs} ms</strong>
              </div>
            </div>
          </div>
        </section>

        {/* §5 Dynamic P:D Ratio & SLO Goodput */}
        <section className="pd-section" data-testid="pd-ratio-section">
          <h2 data-section-anchor="pd-ratio">{t('s3Title')}</h2>
          <p className="pd-lead">{t('s3Lead')}</p>

          <div className="pd-controls">
            <div className="pd-toggle" role="group" aria-label={t('s3Title')}>
              <button type="button" data-testid="pd-preset-rag" aria-pressed={config.isl === 8192 && config.osl === 256} onClick={() => update(RATIO_PRESETS.rag)}>
                {t('presetRag')}
              </button>
              <button type="button" data-testid="pd-preset-chat" aria-pressed={config.isl === 2048 && config.osl === 512} onClick={() => update(RATIO_PRESETS.chat)}>
                {t('presetChat')}
              </button>
              <button type="button" data-testid="pd-preset-cot" aria-pressed={config.isl === 1024 && config.osl === 4096} onClick={() => update(RATIO_PRESETS.cot)}>
                {t('presetCot')}
              </button>
            </div>

            <div className="pd-ctrl-group">
              <span className="pd-ctrl-label">{t('lblIsl')}:</span>
              <div className="pd-toggle" role="group" aria-label={t('lblIsl')}>
                {ISL_OPTIONS.map((v) => (
                  <button key={v} type="button" aria-pressed={config.isl === v} onClick={() => update({ isl: v })}>
                    {v >= 1024 ? `${v / 1024}K` : v}
                  </button>
                ))}
              </div>
            </div>

            <div className="pd-ctrl-group">
              <span className="pd-ctrl-label">{t('lblOsl')}:</span>
              <div className="pd-toggle" role="group" aria-label={t('lblOsl')}>
                {OSL_OPTIONS.map((v) => (
                  <button key={v} type="button" aria-pressed={config.osl === v} onClick={() => update({ osl: v })}>
                    {v >= 1024 ? `${v / 1024}K` : v}
                  </button>
                ))}
              </div>
            </div>

            <div className="pd-ctrl-group">
              <span className="pd-ctrl-label">{t('lblHit')}:</span>
              <div className="pd-toggle" role="group" aria-label={t('lblHit')}>
                {HIT_OPTIONS.map((h) => (
                  <button key={h} type="button" aria-pressed={config.cacheHitPct === h} onClick={() => update({ cacheHitPct: h })}>
                    {h}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pd-slider-row">
            <span className="pd-ctrl-label">{t('lblPNodes')}: <b>{config.pNodes}</b></span>
            <input
              type="range"
              min={2}
              max={TOTAL_GPUS - 2}
              step={1}
              value={config.pNodes}
              onChange={(e) => update({ pNodes: Number(e.target.value) })}
              aria-label={t('lblPNodes')}
            />
            <span className="pd-ctrl-label">{t('lblDNodes')}: <b>{TOTAL_GPUS - config.pNodes}</b></span>
          </div>

          <div className="pd-ratio-bar" aria-label="16-GPU P:D Allocation">
            {Array.from({ length: TOTAL_GPUS }, (_, idx) => (
              <div key={idx} className={`pd-gpu-slot ${idx < config.pNodes ? 'p' : 'd'}`}>
                {idx < config.pNodes ? 'P' : 'D'}
              </div>
            ))}
          </div>

          <div className="pd-ratio-grid">
            <div className="pd-chart-box">
              <svg viewBox="0 0 360 156" role="img" aria-label={t('s3Title')}>
                {[0.25, 0.5, 0.75, 1].map((frac) => {
                  const val = ratio.maxGoodput * frac;
                  const y = yQ(val);
                  return (
                    <g key={frac}>
                      <line className="pd-svg-grid" x1={box.left} x2={box.right} y1={y} y2={y} />
                      <text className="pd-svg-axis" x={36} y={y + 3} textAnchor="end">{val.toFixed(0)}</text>
                    </g>
                  );
                })}
                {[2, 5, 8, 11, 14].map((pTick) => (
                  <text className="pd-svg-axis" key={pTick} x={xP(pTick)} y={142} textAnchor="middle">P={pTick}</text>
                ))}
                <text className="pd-svg-axis" x={(box.left + box.right) / 2} y={154} textAnchor="middle">{t('axisP')}</text>
                <line className="pd-svg-opt" x1={xP(ratio.optimal.pNodes)} x2={xP(ratio.optimal.pNodes)} y1={box.top} y2={box.bottom} />
                <text
                  className="pd-svg-axis"
                  x={xP(ratio.optimal.pNodes) > 250 ? xP(ratio.optimal.pNodes) - 6 : xP(ratio.optimal.pNodes) + 6}
                  y={box.top + 8}
                  textAnchor={xP(ratio.optimal.pNodes) > 250 ? 'end' : 'start'}
                >
                  {t('optMark')} P*={ratio.optimal.pNodes} ({ratio.optimal.goodput})
                </text>
                <path className="pd-svg-curve" d={curvePath} />
                <circle
                  cx={xP(ratio.optimal.pNodes)}
                  cy={yQ(ratio.optimal.goodput)}
                  r={4.5}
                  fill="#10b981"
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />
                <circle
                  cx={xP(ratio.current.pNodes)}
                  cy={yQ(ratio.current.goodput)}
                  r={5.5}
                  fill="#4f46e5"
                  stroke="#0f172a"
                  strokeWidth="1.4"
                />
              </svg>
            </div>

            <div className="pd-side-box">
              <MathFormula>{GOODPUT_TEX}</MathFormula>
              <div className="pd-kpis-2">
                <div className="pd-kpi">
                  <small>{t('mPCap')}</small>
                  <strong>{ratio.current.pCap} req/s</strong>
                </div>
                <div className="pd-kpi">
                  <small>{t('mDCap')}</small>
                  <strong>{ratio.current.dCap} req/s</strong>
                </div>
                <div className={`pd-kpi ${ratio.efficiencyPct >= 90 ? 'pass' : ''}`}>
                  <small>{t('mGoodput')} ({ratio.efficiencyPct}%)</small>
                  <strong>{ratio.current.goodput} req/s</strong>
                </div>
                <div className="pd-kpi">
                  <small>{t('mOptimal')}</small>
                  <strong>{ratio.optimal.pNodes}:{ratio.optimal.dNodes}</strong>
                </div>
              </div>
              <div className={`pd-bn-pill ${ratio.current.bottleneck}`}>
                {t(`bn_${ratio.current.bottleneck}`)}
              </div>
            </div>
          </div>
        </section>

        <details className="pd-evidence">
          <summary>{t('evidence')}</summary>
          <p>{t('evidenceBody')}</p>
        </details>
      </div>
    </div>
  );
}
