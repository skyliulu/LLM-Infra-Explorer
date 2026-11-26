import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import ChapterIcon from './ChapterIcon';
import { useLanguage } from '../lib/LanguageContext';
import { useExperimentState } from '../lib/ExperimentContext';
import { MathFormula } from './linear-attention/MathFormula';
import {
  PROJECTOR_MODES,
  RES_PRESETS,
  ROPE_MODES,
  TILING_SCHEMES,
  VIDEO_DURATIONS,
  VIDEO_FPS_OPTS,
  VIDEO_POOL_MODES,
  deriveProjectorModel,
  deriveTilingModel,
  deriveVideoKvModel,
  normalizeVlmConfig,
} from './vlm-vision/model';
import { i18n } from './vlm-vision/content';
import VlmArchSvg from './vlm-vision/VlmArchSvg';
import { VlmParadigmSvg, VlmTilingSvg, VlmProjectorSvg } from './vlm-vision/VlmVisualSvg';
import './vlm-vision/vlm-vision.css';

const VIS_TOK_TEX = String.raw`N_{\text{vis}} = \frac{(H / P)\cdot(W / P)}{r^2},\qquad \text{FLOPs}_{\text{attn}} \propto N_{\text{vis}}^2`;

export default function VlmVision() {
  const [lang] = useLanguage();
  const t = (key) => i18n[lang]?.[key] ?? i18n.en[key] ?? key;

  const [rawConfig, setConfig] = useExperimentState('VlmVision.config', {
    resId: 'r1080',
    tiling: 'navit_native',
    merge4x: true,
    projector: 'pixel_shuffle_4x',
    ropeMode: 'mrope_3d',
    durationSec: 60,
    fps: 1,
    poolMode: 'spatial_4x',
  });
  const config = useMemo(() => normalizeVlmConfig(rawConfig), [rawConfig]);
  const update = (patch) => setConfig((prev) => normalizeVlmConfig({ ...(prev || config), ...patch }));

  const [archPin, setArchPin] = useState(1);
  const [archPlaying, setArchPlaying] = useState(false);
  const [paradigm, setParadigm] = useState('early_fusion');
  const [vitWindowed, setVitWindowed] = useState(true);

  useEffect(() => {
    if (!archPlaying) return undefined;
    if (archPin >= 4) {
      setArchPlaying(false);
      return undefined;
    }
    const timer = setTimeout(() => setArchPin((p) => Math.min(4, p + 1)), 900);
    return () => clearTimeout(timer);
  }, [archPlaying, archPin]);

  const til = useMemo(
    () => deriveTilingModel({ resId: config.resId, tiling: config.tiling, merge4x: config.merge4x }),
    [config.resId, config.tiling, config.merge4x]
  );
  const proj = useMemo(() => deriveProjectorModel(config.projector), [config.projector]);
  const vid = useMemo(
    () => deriveVideoKvModel({ durationSec: config.durationSec, fps: config.fps, poolMode: config.poolMode }),
    [config.durationSec, config.fps, config.poolMode]
  );

  // 2x4 patch grid illustrating 1D vs 3D M-RoPE coordinates with proper st_idx = 6 offset (after [BOS]=0, Sys=1..4, <|vision_start|>=5)
  const stIdx = 6;
  const ropeCells = Array.from({ length: 8 }, (_, idx) => {
    const r = Math.floor(idx / 4);
    const c = idx % 4;
    const isPair = c === 1;
    return {
      idx,
      label: config.ropeMode === 'mrope_3d' ? `(t=${stIdx}, h=${stIdx + r}, w=${stIdx + c})` : `pos=${stIdx + idx}`,
      cls: isPair ? (config.ropeMode === 'mrope_3d' ? 'hi' : 'far') : '',
    };
  });

  const vitBarPct = vitWindowed ? Math.max(12, Math.round((til.vitWindowMs / Math.max(1, til.vitFullMs)) * 100)) : 100;
  const weightPct = (vid.perGpuWeightGB / vid.gpuCapGB) * 100;
  const reservePct = (vid.perGpuReserveGB / vid.gpuCapGB) * 100;
  const kvRawPct = (vid.perGpuKvGB / vid.gpuCapGB) * 100;
  const kvDisplayPct = Math.min(100 - weightPct - reservePct, Math.max(6, kvRawPct));

  return (
    <div className="chapter-page vl-page">
      <header className="chapter-header">
        <div>
          <h1><ChapterIcon chapter="vlmvision" />{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>

      <div className="chapter-layout chapter-body">
        {/* §1 VLM Architecture (Playable 4-Stage Pipeline) */}
        <section className="vl-section" data-testid="vlm-arch-section">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <h2 data-section-anchor="vlm-arch">{t('archTitle')}</h2>
              <p className="vl-lead">{t('archLead')}</p>
            </div>
            <div className="chapter-playback vl-toggle" role="group" aria-label={t('play')}>
              <button type="button" aria-label={t('reset')} onClick={() => { setArchPlaying(false); setArchPin(1); }}>
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                aria-label={t(archPlaying ? 'pause' : 'play')}
                aria-pressed={archPlaying}
                onClick={() => {
                  if (archPin >= 4) setArchPin(1);
                  setArchPlaying((p) => !p);
                }}
              >
                {archPlaying ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button
                type="button"
                aria-label={t('next')}
                disabled={archPin >= 4}
                onClick={() => { setArchPlaying(false); setArchPin((p) => Math.min(4, p + 1)); }}
              >
                <SkipForward size={15} />
              </button>
            </div>
          </div>

          <div className="vl-grid-2">
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="vl-svg-wrap">
                <VlmArchSvg activePin={archPin} onSelectPin={(p) => { setArchPlaying(false); setArchPin(p); }} lang={lang} />
              </div>
              <div className="vl-box">
                <MathFormula>{VIS_TOK_TEX}</MathFormula>
              </div>
            </div>

            <div className="vl-pin-list">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  data-testid={`vlm-pin-${num}`}
                  className={`vl-pin-card ${archPin === num ? 'on' : ''}`}
                  onClick={() => { setArchPlaying(false); setArchPin(num); }}
                >
                  <div className="vl-pin-head">
                    <span className="vl-pin-num">{num}</span>
                    <strong>{t(`pin${num}Title`)}</strong>
                  </div>
                  <p>{t(`pin${num}Desc`)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="vl-box">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span className="vl-ctrl-label">{t('paradigmTitle')}</span>
              <div className="vl-toggle" role="group" aria-label={t('paradigmTitle')}>
                <button type="button" aria-pressed={paradigm === 'early_fusion'} onClick={() => setParadigm('early_fusion')}>{t('paradigmEarly')}</button>
                <button type="button" aria-pressed={paradigm === 'cross_attn'} onClick={() => setParadigm('cross_attn')}>{t('paradigmCross')}</button>
              </div>
            </div>
            <div className="vl-svg-wrap">
              <VlmParadigmSvg paradigm={paradigm} lang={lang} />
            </div>
          </div>
        </section>

        {/* §2 Dynamic Tiling & Token Explosion */}
        <section className="vl-section" data-testid="vlm-tiling-section">
          <h2 data-section-anchor="vlm-tiling">{t('s2Title')}</h2>
          <p className="vl-lead">{t('s2Lead')}</p>

          <div className="vl-controls">
            <div className="vl-ctrl-group">
              <span className="vl-ctrl-label">{t('resLabel')}:</span>
              <div className="vl-toggle" role="group" aria-label={t('resLabel')}>
                {RES_PRESETS.map((r) => (
                  <button key={r.id} type="button" data-testid={`vlm-res-${r.id}`} aria-pressed={config.resId === r.id} onClick={() => update({ resId: r.id })}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="vl-ctrl-group">
              <span className="vl-ctrl-label">{t('schemeLabel')}:</span>
              <div className="vl-toggle" role="group" aria-label={t('schemeLabel')}>
                {TILING_SCHEMES.map((s) => (
                  <button key={s} type="button" data-testid={`vlm-tiling-${s}`} aria-pressed={config.tiling === s} onClick={() => update({ tiling: s })}>
                    {t(`tiling_${s}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="vl-toggle" role="group" aria-label="Spatial Merge">
              <button type="button" data-testid="vlm-merge-on" aria-pressed={config.merge4x} onClick={() => update({ merge4x: true })}>{t('mergeOn')}</button>
              <button type="button" data-testid="vlm-merge-off" aria-pressed={!config.merge4x} onClick={() => update({ merge4x: false })}>{t('mergeOff')}</button>
            </div>
          </div>

          <div className="vl-grid-2">
            <div className="vl-box">
              <div className="vl-kpis-2">
                <div className="vl-kpi">
                  <small>{t('mRawPatch')}</small>
                  <strong>{til.rawPatches.toLocaleString()}</strong>
                </div>
                <div className={`vl-kpi ${til.llmTokens > 2500 ? 'warn' : 'good'}`}>
                  <small>{t('mLlmTok')}</small>
                  <strong>{til.llmTokens.toLocaleString()} tok</strong>
                </div>
                <div className={`vl-kpi ${til.attnCostRatio > 100 ? 'warn' : ''}`}>
                  <small>{t('mAttnScale')}</small>
                  <strong>{til.attnCostRatio}×</strong>
                </div>
                <div className="vl-kpi">
                  <small>{t('mKvFoot')}</small>
                  <strong>{til.kvMB} MB</strong>
                </div>
              </div>
              <span className={`vl-pill ${til.ocrPreserved ? 'ok' : 'warn'}`}>
                {t(til.ocrPreserved ? 'ocrOk' : 'ocrBad')}
              </span>
            </div>

            <div className="vl-box">
              <div className="vl-svg-wrap">
                <VlmTilingSvg
                  tiling={config.tiling}
                  res={til.res}
                  tiles={til.tiles}
                  cols={til.cols}
                  merge4x={config.merge4x}
                  rawPatches={til.rawPatches}
                  llmTokens={til.llmTokens}
                  lang={lang}
                />
              </div>
              <p>{t(`tilingNote_${config.tiling}`)}</p>
            </div>
          </div>

          <div className="vl-box">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span className="vl-ctrl-label">{t('vitAttnTitle')}</span>
              <div className="vl-toggle" role="group" aria-label={t('vitAttnTitle')}>
                <button type="button" aria-pressed={vitWindowed} onClick={() => setVitWindowed(true)}>
                  {t('vitWin')} ({til.vitSpeedup}×)
                </button>
                <button type="button" aria-pressed={!vitWindowed} onClick={() => setVitWindowed(false)}>
                  {t('vitFull')}
                </button>
              </div>
            </div>
            <div className="vl-vram-track" aria-label="ViT Attention Cost">
              <div
                className={`vl-vram-kv ${vitWindowed ? '' : 'warn'}`}
                style={{ width: `${vitBarPct}%` }}
              >
                {vitWindowed
                  ? `${t('vitWinLabel')}: ~${til.vitWindowMs} ms`
                  : `${t('vitFullLabel')}: ~${til.vitFullMs} ms`}
              </div>
            </div>
          </div>
        </section>

        {/* §3 Projector Compression */}
        <section className="vl-section" data-testid="vlm-projector-section">
          <h2 data-section-anchor="vlm-projector">{t('s3Title')}</h2>
          <p className="vl-lead">{t('s3Lead')}</p>

          <div className="vl-controls">
            <div className="vl-toggle" role="group" aria-label={t('s3Title')}>
              {PROJECTOR_MODES.map((m) => (
                <button key={m} type="button" data-testid={`vlm-proj-${m}`} aria-pressed={config.projector === m} onClick={() => update({ projector: m })}>
                  {t(`proj_${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="vl-grid-2">
            <div className="vl-box">
              <table className="vl-table">
                <thead>
                  <tr>
                    <th>{t('colProj')}</th>
                    <th>{t('colRatio')}</th>
                    <th>{t('colOutTok')}</th>
                    <th>{t('colPrefill')}</th>
                    <th>{t('colOcr')}</th>
                  </tr>
                </thead>
                <tbody>
                  {proj.rows.map((r) => (
                    <tr key={r.id} className={config.projector === r.id ? 'on' : ''} onClick={() => update({ projector: r.id })} style={{ cursor: 'pointer' }}>
                      <td>{t(`proj_${r.id}`)}</td>
                      <td>{r.ratio}</td>
                      <td>{r.outTokens}</td>
                      <td>{r.prefillMs} ms</td>
                      <td><span className={`vl-pill ${r.ocr === 'high' ? 'ok' : 'warn'}`}>{t(r.ocr === 'high' ? 'ocrHigh' : 'ocrLow')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="vl-box">
              <div className="vl-svg-wrap">
                <VlmProjectorSvg projector={config.projector} lang={lang} />
              </div>
              <p>{t(`projNote_${config.projector}`)}</p>
            </div>
          </div>
        </section>

        {/* §4 1D-RoPE vs 3D M-RoPE */}
        <section className="vl-section" data-testid="vlm-mrope-section">
          <h2 data-section-anchor="vlm-mrope">{t('s4Title')}</h2>
          <p className="vl-lead">{t('s4Lead')}</p>

          <div className="vl-controls">
            <div className="vl-toggle" role="group" aria-label={t('s4Title')}>
              {ROPE_MODES.map((m) => (
                <button key={m} type="button" data-testid={`vlm-rope-${m}`} aria-pressed={config.ropeMode === m} onClick={() => update({ ropeMode: m })}>
                  {t(m)}
                </button>
              ))}
            </div>
          </div>

          <div className="vl-grid-2">
            <div className="vl-box">
              <div className="vl-rope-grid" aria-label="2x4 Visual Patch Coordinates">
                {ropeCells.map((cell) => (
                  <div key={cell.idx} className={`vl-rope-cell ${cell.cls}`}>
                    {cell.label}
                  </div>
                ))}
              </div>
              <span className={`vl-pill ${config.ropeMode === 'mrope_3d' ? 'ok' : 'warn'}`}>
                {t(config.ropeMode === 'mrope_3d' ? 'ropeDist3d' : 'ropeDist1d')}
              </span>
            </div>
            <div className="vl-box">
              <span className="vl-ctrl-label">{t('ropeDimLabel')}</span>
              {config.ropeMode === 'mrope_3d' ? (
                <div className="vl-rope-bar">
                  <div className="vl-rope-seg t" style={{ width: '25%' }}>{t('ropeTimeSeg')}</div>
                  <div className="vl-rope-seg h" style={{ width: '37.5%' }}>{t('ropeHeightSeg')}</div>
                  <div className="vl-rope-seg w" style={{ width: '37.5%' }}>{t('ropeWidthSeg')}</div>
                </div>
              ) : (
                <div className="vl-rope-bar">
                  <div className="vl-rope-seg d1" style={{ width: '100%' }}>{t('rope1dSeg')}</div>
                </div>
              )}
              <p>{t(`ropeNote_${config.ropeMode}`)}</p>
            </div>
          </div>

          <div className="vl-box">
            <span className="vl-ctrl-label">{t('seqTitle')}</span>
            <div className="vl-seq-strip">
              <span className="vl-seq-tok ctl">[BOS] (0,0,0)</span>
              <span className="vl-seq-tok txt">Sys (1..4, 1..4, 1..4)</span>
              <span className="vl-seq-tok ctl">&lt;|vision_start|&gt; (5,5,5)</span>
              <span className="vl-seq-tok vis">V_00 (6, 6, 6)</span>
              <span className="vl-seq-tok vis">V_01 (6, 6, 7)</span>
              <span className="vl-seq-tok vis">V_10 (6, 7, 6)</span>
              <span className="vl-seq-tok vis">… V_13 (6, 7, 9)</span>
              <span className="vl-seq-tok ctl">&lt;|vision_end|&gt; (10,10,10)</span>
              <span className="vl-seq-tok txt">User Q (11,11,11…)</span>
            </div>
          </div>
        </section>

        {/* §5 Video KV Cache (Explicit TP=4 35GB/GPU weights + honest OOM overflow) */}
        <section className="vl-section" data-testid="vlm-video-section">
          <h2 data-section-anchor="vlm-video-kv">{t('s5Title')}</h2>
          <p className="vl-lead">{t('s5Lead')}</p>

          <div className="vl-controls">
            <div className="vl-ctrl-group">
              <span className="vl-ctrl-label">{t('durLabel')}:</span>
              <div className="vl-toggle" role="group" aria-label={t('durLabel')}>
                {VIDEO_DURATIONS.map((d) => (
                  <button key={d} type="button" aria-pressed={config.durationSec === d} onClick={() => update({ durationSec: d })}>{d}s</button>
                ))}
              </div>
            </div>

            <div className="vl-ctrl-group">
              <span className="vl-ctrl-label">{t('fpsLabel')}:</span>
              <div className="vl-toggle" role="group" aria-label={t('fpsLabel')}>
                {VIDEO_FPS_OPTS.map((f) => (
                  <button key={f} type="button" aria-pressed={config.fps === f} onClick={() => update({ fps: f })}>{f} FPS</button>
                ))}
              </div>
            </div>

            <div className="vl-ctrl-group">
              <span className="vl-ctrl-label">{t('poolLabel')}:</span>
              <div className="vl-toggle" role="group" aria-label={t('poolLabel')}>
                {VIDEO_POOL_MODES.map((p) => (
                  <button key={p} type="button" data-testid={`vlm-pool-${p}`} aria-pressed={config.poolMode === p} onClick={() => update({ poolMode: p })}>
                    {t(`pool_${p}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="vl-box">
            <div className="vl-frame-strip">
              {Array.from({ length: Math.min(10, vid.frames) }, (_, i) => (
                <span key={i} className="vl-frame-chip">F{i + 1} · {vid.tokensPerFrame}t</span>
              ))}
              {vid.frames > 10 && <span className="vl-ctrl-label">+ {vid.frames - 10} frames</span>}
            </div>
            <div className="vl-vram-track" aria-label="80 GB Per-GPU VRAM Budget (TP=4)">
              <div className="vl-vram-wt" style={{ width: `${weightPct}%` }}>{t('vramWeightLabel')}</div>
              <div className="vl-vram-wt" style={{ width: `${reservePct}%`, opacity: 0.72 }}>{t('vramReserveLabel')}</div>
              <div
                className={`vl-vram-kv ${vid.oomWarn ? 'warn' : ''}`}
                style={{ width: `${kvDisplayPct}%` }}
              >
                {t('vramKvLabel')}: {vid.perGpuKvGB} GB {vid.gpuOverflow ? `(${t('vramOomBadge')})` : ''}
              </div>
            </div>
          </div>

          <div className="vl-kpis-4">
            <div className="vl-kpi">
              <small>{t('mFrames')}</small>
              <strong>{vid.frames}</strong>
            </div>
            <div className={`vl-kpi ${vid.oomWarn ? 'warn' : 'good'}`}>
              <small>{t('mVisTok')}</small>
              <strong>{vid.totalVisTokens.toLocaleString()}</strong>
            </div>
            <div className="vl-kpi">
              <small>{t('mVitMs')}</small>
              <strong>{vid.vitMs} ms</strong>
            </div>
            <div className={`vl-kpi ${vid.oomWarn ? 'warn' : 'good'}`}>
              <small>{t('mVideoKv')} (TP=4: {vid.perGpuKvGB} GB/GPU)</small>
              <strong>{vid.kvGB} GB</strong>
            </div>
          </div>
          <div>
            <span className={`vl-pill ${vid.oomWarn ? 'warn' : 'ok'}`}>
              {vid.gpuOverflow ? `${t('vramOomBadge')} (${vid.perGpuTotalGB} / 80 GB)` : t(vid.oomWarn ? 'videoOom' : 'videoOk')}
            </span>
          </div>

          <div className="vl-box">
            <span className="vl-ctrl-label">{t('vlmCodeTitle')}</span>
            <pre className="vl-code">
              <code>{`// vLLM / SGLang Multimodal Prefill Execution Path (NaViT + 2×2 Merge + M-RoPE)
patches, grid_thw, cu_seqlens = pack_native_images_and_video(media_batch); // zero padding!
vis_hidden = vit.forward_varlen(patches, cu_seqlens, window_layers=28);    // 8×8 window + 4 full
vis_embeds = projector_2x2_merge(vis_hidden);                              // [N_raw/4, d_LLM]
// Replace <|image_pad|> placeholder slots with visual vectors before LLM Prefill:
inputs_embeds = embed_tokens(input_ids);
inputs_embeds[input_ids == IMAGE_PAD_ID] = vis_embeds;                     // scatter in-place
pos_ids_3d = build_mrope_positions(input_ids, grid_thw, st_idx=6);         // [3, seq_len] (t,h,w)
logits = llm_backbone.prefill(inputs_embeds, pos_ids_3d, paged_kv_cache);`}</code>
            </pre>
          </div>
        </section>

        <details className="vl-evidence">
          <summary>{t('evidence')}</summary>
          <p>{t('evidenceBody')}</p>
        </details>
      </div>
    </div>
  );
}
