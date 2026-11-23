import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import ChapterIcon from './ChapterIcon';
import { useLanguage } from '../lib/LanguageContext';
import { useExperimentState } from '../lib/ExperimentContext';
import { MathFormula } from './linear-attention/MathFormula';
import {
  ALGO_MODES,
  ALGO_MSG_SIZES,
  ALGO_WORLD_SIZES,
  COLLECTIVE_OPS,
  COMM_DIAG_IDS,
  MSG_SIZES_MB,
  OVERLAP_MODES,
  RDMA_MODES,
  deriveAlgoComparison,
  deriveCollectiveStep,
  deriveInterconnectLatency,
  deriveOverlapModel,
  deriveRdmaModel,
  normalizeCollectiveConfig,
} from './collective-comm/model';
import { i18n } from './collective-comm/content';
import CommAlgoSvg from './collective-comm/CommAlgoSvg';
import RdmaPathSvg from './collective-comm/RdmaPathSvg';
import './collective-comm/collective.css';

const ALPHA_BETA_TEX = String.raw`T_{\text{comm}} = \alpha \cdot N_{\text{hops}} + \frac{V_{\text{algo}}(P, M)}{BW}`;
const RING_VOL_TEX = String.raw`V_{\text{AR}} = 2\frac{P-1}{P}M,\quad V_{\text{RS}} = V_{\text{AG}} = \frac{P-1}{P}M`;

export default function CollectiveComm() {
  const [lang] = useLanguage();
  const t = (key) => i18n[lang]?.[key] ?? i18n.en[key] ?? key;

  const [rawConfig, setConfig] = useExperimentState('CollectiveComm.config', {
    op: 'allreduce',
    routingSkew: 'uniform',
    algo: 'ring',
    algoP: 8,
    algoMsgMB: 8,
    interconnect: 'nvlink4',
    msgMB: 16,
    rdmaMode: 'gpudirect_rdma',
    overlapMode: 'ibgda_overlap',
    diagId: 'tp_small_batch',
  });
  const config = useMemo(() => normalizeCollectiveConfig(rawConfig), [rawConfig]);
  const update = (patch) => setConfig((prev) => normalizeCollectiveConfig({ ...(prev || config), ...patch }));

  const defaultMax = config.op === 'allreduce' ? 6 : config.op === 'alltoall' ? 2 : 3;
  const [step, setStep] = useState(defaultMax);
  const [isPlaying, setIsPlaying] = useState(false);

  const prim = useMemo(
    () => deriveCollectiveStep({ op: config.op, routingSkew: config.routingSkew, step }),
    [config.op, config.routingSkew, step]
  );
  const algoModel = useMemo(
    () => deriveAlgoComparison({ algo: config.algo, algoP: config.algoP, algoMsgMB: config.algoMsgMB }),
    [config.algo, config.algoP, config.algoMsgMB]
  );
  const linkModel = useMemo(
    () => deriveInterconnectLatency({ op: config.op, interconnect: config.interconnect, msgMB: config.msgMB }),
    [config.op, config.interconnect, config.msgMB]
  );
  const rdma = useMemo(() => deriveRdmaModel(config.rdmaMode), [config.rdmaMode]);
  const overlap = useMemo(() => deriveOverlapModel(config.overlapMode), [config.overlapMode]);

  const done = prim.phase === 'done';
  const reset = () => { setIsPlaying(false); setStep(0); };
  const handleNextStep = () => { setIsPlaying(false); setStep((v) => Math.min(prim.maxStep, v + 1)); };
  const togglePlay = () => { if (done) setStep(0); setIsPlaying((p) => !p); };

  useEffect(() => {
    if (!isPlaying || done) return undefined;
    const timer = setTimeout(() => setStep((v) => Math.min(prim.maxStep, v + 1)), 750);
    return () => clearTimeout(timer);
  }, [isPlaying, step, done, prim.maxStep]);

  const selectOp = (op) => {
    const nextMax = op === 'allreduce' ? 6 : op === 'alltoall' ? 2 : 3;
    update({ op });
    setStep(nextMax);
    setIsPlaying(false);
  };

  return (
    <div className="chapter-page cc-page">
      <header className="chapter-header">
        <div>
          <h1><ChapterIcon chapter="commcollective" />{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>

      <div className="chapter-layout chapter-body">
        {/* §1 Collective Primitives */}
        <section className="cc-section" data-testid="comm-primitives-section">
          <h2 data-section-anchor="comm-primitives">{t('s1Title')}</h2>
          <p className="cc-lead">{t('s1Lead')}</p>

          <div className="cc-controls">
            <div className="cc-toggle" role="group" aria-label={t('s1Title')}>
              {COLLECTIVE_OPS.map((op) => (
                <button
                  key={op}
                  type="button"
                  data-testid={`comm-op-${op}`}
                  aria-pressed={config.op === op}
                  onClick={() => selectOp(op)}
                >
                  {t(`op_${op}`)}
                </button>
              ))}
            </div>

            {config.op === 'alltoall' && (
              <div className="cc-toggle" role="group" aria-label={t('metricSkew')}>
                <button
                  type="button"
                  data-testid="comm-skew-uniform"
                  aria-pressed={config.routingSkew === 'uniform'}
                  onClick={() => update({ routingSkew: 'uniform' })}
                >
                  {t('skewUniform')}
                </button>
                <button
                  type="button"
                  data-testid="comm-skew-hot"
                  aria-pressed={config.routingSkew === 'hot'}
                  onClick={() => update({ routingSkew: 'hot' })}
                >
                  {t('skewHot')}
                </button>
              </div>
            )}

            <div className="chapter-playback cc-playback">
              <button type="button" onClick={reset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={16} /></button>
              <button type="button" onClick={togglePlay} aria-label={isPlaying && !done ? t('pause') : t('play')} title={isPlaying && !done ? t('pause') : t('play')}>
                {isPlaying && !done ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button type="button" onClick={handleNextStep} disabled={done} aria-label={t('next')} title={t('next')}><SkipForward size={16} /></button>
            </div>
          </div>

          <div className="cc-stage-bar">
            <span>{t(`stage_${prim.stageName}`)}</span>
            <span>{t('hopProgress')}: {prim.step} / {prim.maxStep}</span>
          </div>

          <div className="cc-gpu-grid">
            {prim.gpus.map((gpu) => (
              <div key={gpu.id} className={`cc-gpu-card ${gpu.isHot ? 'hot' : ''}`} data-testid={`comm-gpu-${gpu.id}`}>
                <div className="cc-gpu-head">
                  <strong>GPU {gpu.id}</strong>
                  <span>{config.op === 'alltoall' ? `${t('recvTokens')}: ${gpu.recvTotal}` : `Rank ${gpu.id}`}</span>
                </div>
                <div className="cc-shards">
                  {gpu.shards.map((sh) => (
                    <div key={sh.idx} className={`cc-shard ${sh.state}`}>
                      {sh.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="cc-prim-foot">
            <div>
              <p>{t(`primNote_${config.op}`)}</p>
              <div className="cc-math-wrap">
                <MathFormula>{RING_VOL_TEX}</MathFormula>
              </div>
            </div>
            <div className="cc-kpis">
              <div>
                <small>{t('metricVolume')}</small>
                <strong>{prim.volumeFactor.toFixed(2)}× M</strong>
              </div>
              <div>
                <small>{t('metricSteps')}</small>
                <strong>{prim.maxStep}</strong>
              </div>
              <div>
                <small>{t('metricSkew')}</small>
                <strong>{prim.imbalance.toFixed(2)}×</strong>
              </div>
            </div>
          </div>
        </section>

        {/* §2 NCCL Algorithm Topologies: Ring vs Tree vs NVLS SHARP */}
        <section className="cc-section" data-testid="comm-algos-section">
          <h2 data-section-anchor="comm-algos">{t('algoTitle')}</h2>
          <p className="cc-lead">{t('algoLead')}</p>

          <div className="cc-controls">
            <div className="cc-toggle" role="group" aria-label={t('algoTitle')}>
              {ALGO_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`comm-algo-${m}`}
                  aria-pressed={config.algo === m}
                  onClick={() => update({ algo: m })}
                >
                  {t(`algo_${m}`)}
                </button>
              ))}
            </div>

            <div className="cc-ctrl-group">
              <span className="cc-ctrl-label">{t('algoPLabel')}:</span>
              <div className="cc-toggle" role="group" aria-label={t('algoPLabel')}>
                {ALGO_WORLD_SIZES.map((p) => (
                  <button key={p} type="button" data-testid={`comm-p-${p}`} aria-pressed={config.algoP === p} onClick={() => update({ algoP: p })}>
                    P={p}
                  </button>
                ))}
              </div>
            </div>

            <div className="cc-ctrl-group">
              <span className="cc-ctrl-label">{t('algoMsgLabel')}:</span>
              <div className="cc-toggle" role="group" aria-label={t('algoMsgLabel')}>
                {ALGO_MSG_SIZES.map((mb) => (
                  <button key={mb} type="button" data-testid={`comm-amsg-${mb}`} aria-pressed={config.algoMsgMB === mb} onClick={() => update({ algoMsgMB: mb })}>
                    {mb} MB
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="cc-algo-grid">
            <div className="cc-svg-wrap">
              <CommAlgoSvg algo={config.algo} />
            </div>

            <div className="cc-alpha-box">
              <table className="cc-table">
                <thead>
                  <tr>
                    <th>{t('algoColName')}</th>
                    <th>{t('algoColHops')}</th>
                    <th>{t('algoColVol')}</th>
                    <th>{t('algoColSm')}</th>
                    <th>{t('algoColTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {algoModel.entries.map((row) => (
                    <tr key={row.id} className={config.algo === row.id ? 'on' : ''} onClick={() => update({ algo: row.id })} style={{ cursor: 'pointer' }}>
                      <td>
                        {t(`algo_${row.id}`)}
                        {algoModel.winner.id === row.id && <span className="cc-win-badge">{t('algoWinner')}</span>}
                      </td>
                      <td>{row.hops}</td>
                      <td>{row.factor}×M</td>
                      <td>{row.smLoad}</td>
                      <td>{row.totalUs} µs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>{t(`algoNote_${config.algo}`)}</p>
            </div>
          </div>
        </section>

        {/* §3 Interconnect Alpha-Beta Cliff */}
        <section className="cc-section" data-testid="comm-interconnect-section">
          <h2 data-section-anchor="comm-interconnect">{t('s2Title')}</h2>
          <p className="cc-lead">{t('s2Lead')}</p>

          <div className="cc-controls">
            <span className="cc-ctrl-label">{t('msgLabel')}:</span>
            <div className="cc-toggle" role="group" aria-label={t('msgLabel')}>
              {MSG_SIZES_MB.map((mb) => (
                <button
                  key={mb}
                  type="button"
                  data-testid={`comm-msg-${mb}`}
                  aria-pressed={config.msgMB === mb}
                  onClick={() => update({ msgMB: mb })}
                >
                  {mb} MB
                </button>
              ))}
            </div>
          </div>

          <div className="cc-link-grid">
            <div className="cc-link-bars">
              {linkModel.allLinks.map((lnk) => {
                const totalPct = Math.max(4, (lnk.totalUs / Math.max(1, linkModel.maxTotalUs)) * 100);
                const latShare = (lnk.latencyUs / Math.max(0.01, lnk.totalUs)) * totalPct;
                const bwShare = Math.max(0, totalPct - latShare);
                return (
                  <button
                    key={lnk.id}
                    type="button"
                    data-testid={`comm-link-${lnk.id}`}
                    className={`cc-link-row ${config.interconnect === lnk.id ? 'on' : ''}`}
                    onClick={() => update({ interconnect: lnk.id })}
                  >
                    <div className="cc-link-name">
                      <strong>{t(`link_${lnk.id}`)}</strong>
                      <small>{lnk.scope === 'intra' ? t('scopeIntra') : t('scopeInter')} · α={lnk.alphaUs} µs</small>
                    </div>
                    <div className="cc-link-track" aria-hidden="true">
                      <i className="lat" style={{ width: `${latShare.toFixed(1)}%` }} />
                      <i className="bw" style={{ width: `${bwShare.toFixed(1)}%` }} />
                    </div>
                    <b>{lnk.totalUs.toFixed(1)} µs</b>
                  </button>
                );
              })}
            </div>

            <div className="cc-alpha-box">
              <MathFormula>{ALPHA_BETA_TEX}</MathFormula>
              <div className="cc-alpha-legend">
                <span><i className="lat" />{t('termLatency')}: <b>{linkModel.selected.latencyUs} µs</b></span>
                <span><i className="bw" />{t('termBandwidth')}: <b>{linkModel.selected.bwUs} µs</b></span>
              </div>
              <div className="cc-kpis">
                <div>
                  <small>{t('algoBytes')}</small>
                  <strong>{linkModel.selected.algoBytesMB} MB</strong>
                </div>
                <div>
                  <small>{t('totalTime')}</small>
                  <strong>{linkModel.selected.totalUs} µs</strong>
                </div>
                <div>
                  <small>{t('linkLabel')}</small>
                  <strong>{linkModel.selected.bwGBps} GB/s</strong>
                </div>
              </div>
              <div className={`cc-dom-pill ${linkModel.selected.dominant === 'latency' ? 'lat' : 'bw'}`}>
                {t('dominantLabel')}: {t(linkModel.selected.dominant === 'latency' ? 'dom_latency' : 'dom_bandwidth')}
              </div>
            </div>
          </div>
        </section>

        {/* §4 Cross-Node GPUDirect RDMA, RoCEv2 ECN/PFC & Rail-Optimized */}
        <section className="cc-section" data-testid="comm-rdma-section">
          <h2 data-section-anchor="comm-rdma">{t('rdmaTitle')}</h2>
          <p className="cc-lead">{t('rdmaLead')}</p>

          <div className="cc-controls">
            <div className="cc-toggle" role="group" aria-label={t('rdmaTitle')}>
              {RDMA_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`comm-rdma-${m}`}
                  aria-pressed={config.rdmaMode === m}
                  onClick={() => update({ rdmaMode: m })}
                >
                  {t(`rdma_${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="cc-rdma-grid">
            <div className="cc-svg-wrap">
              <RdmaPathSvg rdmaMode={config.rdmaMode} />
            </div>

            <div className="cc-alpha-box">
              <div className="cc-kpis-2">
                <div className={`cc-kpi ${rdma.cpuCopies === 0 ? 'good' : 'warn'}`}>
                  <small>{t('rdmaCopies')}</small>
                  <strong>{rdma.cpuCopies}</strong>
                </div>
                <div className={`cc-kpi ${rdma.healthy ? 'good' : 'warn'}`}>
                  <small>{t('rdmaP99')}</small>
                  <strong>{rdma.p99Us} µs</strong>
                </div>
                <div className={`cc-kpi ${rdma.effBwGBps >= 40 ? 'good' : 'warn'}`}>
                  <small>{t('rdmaBw')}</small>
                  <strong>{rdma.effBwGBps} GB/s</strong>
                </div>
                <div className={`cc-kpi ${rdma.zeroCopy ? 'good' : 'warn'}`}>
                  <small>{t('rdmaZeroCopy')}</small>
                  <strong>{t(rdma.zeroCopy ? 'rdmaYes' : 'rdmaNo')}</strong>
                </div>
              </div>
              <p>{t(`rdmaNote_${config.rdmaMode}`)}</p>
            </div>
          </div>
        </section>

        {/* §5 IBGDA & Micro-Batch Overlap */}
        <section className="cc-section" data-testid="comm-overlap-section">
          <h2 data-section-anchor="comm-overlap">{t('s3Title')}</h2>
          <p className="cc-lead">{t('s3Lead')}</p>

          <div className="cc-controls">
            <div className="cc-toggle" role="group" aria-label={t('s3Title')}>
              {OVERLAP_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`comm-ov-${m}`}
                  aria-pressed={config.overlapMode === m}
                  onClick={() => update({ overlapMode: m })}
                >
                  {m === 'proxy_serial' ? t('ovProxy') : t('ovIbgda')}
                </button>
              ))}
            </div>
          </div>

          <div className="cc-ov-grid">
            <div className="cc-ov-lanes">
              {config.overlapMode === 'proxy_serial' ? (
                <>
                  <div className="cc-ov-track">
                    <span>{t('laneCompute')}</span>
                    <div className="cc-ov-bar">
                      <div className="cc-ov-seg cmp" style={{ width: '48%' }}>Attn + Router (60 µs)</div>
                      <div className="cc-ov-seg idle" style={{ width: '52%' }}>GPU Stall (64 µs)</div>
                    </div>
                  </div>
                  <div className="cc-ov-track">
                    <span>{t('laneProxy')}</span>
                    <div className="cc-ov-bar">
                      <div className="cc-ov-seg idle" style={{ width: '48%' }} />
                      <div className="cc-ov-seg proxy" style={{ width: '10%' }}>Ring (10µs)</div>
                      <div className="cc-ov-seg idle" style={{ width: '35%' }} />
                      <div className="cc-ov-seg proxy" style={{ width: '7%' }}>Wake (8µs)</div>
                    </div>
                  </div>
                  <div className="cc-ov-track">
                    <span>{t('laneComm')}</span>
                    <div className="cc-ov-bar">
                      <div className="cc-ov-seg idle" style={{ width: '58%' }} />
                      <div className="cc-ov-seg comm" style={{ width: '35%' }}>All-to-All RDMA (46 µs)</div>
                      <div className="cc-ov-seg idle" style={{ width: '7%' }} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="cc-ov-track">
                    <span>{t('laneCompute')}</span>
                    <div className="cc-ov-bar">
                      <div className="cc-ov-seg cmp" style={{ width: '42%' }}>MB0 Attn (30 µs)</div>
                      <div className="cc-ov-seg cmp" style={{ width: '42%' }}>MB1 Attn / MoE (30 µs)</div>
                      <div className="cc-ov-seg idle" style={{ width: '16%' }}>8 µs</div>
                    </div>
                  </div>
                  <div className="cc-ov-track">
                    <span>{t('laneProxy')}</span>
                    <div className="cc-ov-bar">
                      <div className="cc-ov-seg idle" style={{ width: '100%' }}>IBGDA · 0 CPU Hops (GPU Warp Direct Doorbell)</div>
                    </div>
                  </div>
                  <div className="cc-ov-track">
                    <span>{t('laneComm')}</span>
                    <div className="cc-ov-bar">
                      <div className="cc-ov-seg idle" style={{ width: '36%' }} />
                      <div className="cc-ov-seg comm" style={{ width: '64%' }}>MB0 + MB1 Pipelined RDMA (46 µs overlapped)</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="cc-alpha-box">
              <div className="cc-kpis">
                <div>
                  <small>{t('ovTotal')}</small>
                  <strong>{overlap.active.totalUs} µs</strong>
                </div>
                <div>
                  <small>{t('ovExposed')}</small>
                  <strong>{overlap.active.exposedCommPct}%</strong>
                </div>
                <div>
                  <small>{t('ovSpeedup')}</small>
                  <strong>{overlap.speedup}×</strong>
                </div>
              </div>
              <p>{t(`ovDesc_${config.overlapMode}`)}</p>
            </div>
          </div>
        </section>

        {/* §6 Production Communication Troubleshooting & Placement Matrix */}
        <section className="cc-section" data-testid="comm-troubleshoot-section">
          <h2 data-section-anchor="comm-troubleshoot">{t('diagTitle')}</h2>
          <p className="cc-lead">{t('diagLead')}</p>

          <div className="cc-controls">
            <div className="cc-toggle" role="group" aria-label={t('diagTitle')}>
              {COMM_DIAG_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`comm-diag-${id}`}
                  aria-pressed={config.diagId === id}
                  onClick={() => update({ diagId: id })}
                >
                  {t(`diag_${id}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="cc-diag-grid">
            <div className="cc-diag-card">
              <small>Root Cause</small>
              <p>{t(`diagRoot_${config.diagId}`)}</p>
            </div>
            <div className="cc-diag-card">
              <small>NCCL / Topology Fix</small>
              <p>{t(`diagFix_${config.diagId}`)}</p>
            </div>
          </div>

          <div>
            <div className="cc-ctrl-label" style={{ marginBottom: 6 }}>{t('placeTitle')}</div>
            <table className="cc-table">
              <thead>
                <tr>
                  <th>{t('placeColDim')}</th>
                  <th>{t('placeColPrim')}</th>
                  <th>{t('placeColTopo')}</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((row) => (
                  <tr key={row}>
                    <td><strong>{t(`placeRow${row}Dim`)}</strong></td>
                    <td>{t(`placeRow${row}Prim`)}</td>
                    <td>{t(`placeRow${row}Topo`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <details className="cc-evidence">
          <summary>{t('evidence')}</summary>
          <p>{t('evidenceBody')}</p>
        </details>
      </div>
    </div>
  );
}
