import React, { useMemo, useState } from 'react';
import { RotateCcw, Layers, Cpu, Network, FastForward, HardDrive, Wrench } from 'lucide-react';
import ChapterIcon from './ChapterIcon';
import { useLanguage } from '../lib/LanguageContext';
import { useExperimentState } from '../lib/ExperimentContext';
import { MathFormula } from './linear-attention/MathFormula';
import {
  ARCH_STAGE_IDS,
  TASK_PRESETS,
  PATCH_SIZES,
  PARALLEL_MODES,
  CACHE_STRATEGIES,
  VAE_RES_PRESETS,
  QUANT_PRESETS,
  deriveDitTokenModel,
  deriveDitParallelModel,
  deriveDitCacheModel,
  deriveDitVaeModel,
  deriveDitQuantModel,
} from './diffusion-dit/model';
import { i18n } from './diffusion-dit/content';
import { DitArchSvg } from './diffusion-dit/DitArchSvg';
import { DitParallelSvg } from './diffusion-dit/DitParallelSvg';
import './workbench.css';
import './diffusion-dit/diffusion-dit.css';

const FLOW_TEX = String.raw`\mathbf{x}_{t-\Delta t} = \mathbf{x}_t - \Delta t \cdot \hat{v}_\theta(\mathbf{x}_t, t, c), \qquad \hat{v}_\theta = v_\theta(\mathbf{x}_t, t, \varnothing) + s_{\text{cfg}}\big(v_\theta(\mathbf{x}_t, t, c) - v_\theta(\mathbf{x}_t, t, \varnothing)\big)`;
const SEQ_TEX = String.raw`N = \left(\left\lfloor\frac{T-1}{f_t}\right\rfloor + 1\right) \cdot \frac{H}{f_s \cdot p} \cdot \frac{W}{f_s \cdot p}, \qquad \text{FLOPs}_{\text{attn}} \propto 4 L N^2 D`;
const TEACACHE_TEX = String.raw`\sum_{k=t_0}^{t} \frac{\|h_k^{\text{mod}} - h_{k-1}^{\text{mod}}\|_1}{\|h_{k-1}^{\text{mod}}\|_1} < \delta \;\Longrightarrow\; \text{Reuse } \Delta\mathbf{x}_{t_0}`;

const DEFAULT_CONFIG = {
  presetId: 'vid720p',
  patchSize: 2,
  steps: 50,
  cfgEnabled: true,
  parallelMode: 'usp',
  gpuCount: 8,
  interconnect: 'nvlink',
  cacheStrategy: 'teacache',
  cacheThreshold: 0.15,
  vaeResId: 'v1080p',
  vaeTiling: 'spatiotemporal',
  gpuVramGB: 80,
  quantId: 'fp8',
};

export default function DiffusionDit() {
  const [lang] = useLanguage();
  const dict = i18n[lang] || i18n.zh;
  const t = (key, vars) => {
    let str = dict[key] ?? i18n.en[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };

  const [config, setConfig] = useExperimentState('DiffusionDit.config', DEFAULT_CONFIG);
  const [activeStage, setActiveStage] = useState('ditloop');
  const [selectedCacheStep, setSelectedCacheStep] = useState(8);

  const updateCfg = (patch) => setConfig((prev) => ({ ...prev, ...patch }));
  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setActiveStage('ditloop');
    setSelectedCacheStep(8);
  };

  const tokenModel = useMemo(
    () => deriveDitTokenModel(config.presetId, config.patchSize, config.steps, config.cfgEnabled),
    [config.presetId, config.patchSize, config.steps, config.cfgEnabled]
  );

  const parallelModel = useMemo(
    () => deriveDitParallelModel(
      config.parallelMode,
      config.gpuCount,
      config.interconnect,
      Math.max(4096, tokenModel.seqLen),
      tokenModel.estSingleGpuSec / Math.max(1, tokenModel.steps)
    ),
    [config.parallelMode, config.gpuCount, config.interconnect, tokenModel.seqLen, tokenModel.estSingleGpuSec, tokenModel.steps]
  );

  const cacheModel = useMemo(
    () => deriveDitCacheModel(config.cacheStrategy, config.cacheThreshold),
    [config.cacheStrategy, config.cacheThreshold]
  );

  const vaeModel = useMemo(
    () => deriveDitVaeModel(config.vaeResId, config.vaeTiling, config.gpuVramGB),
    [config.vaeResId, config.vaeTiling, config.gpuVramGB]
  );

  const quantModel = useMemo(() => deriveDitQuantModel(config.quantId), [config.quantId]);

  const activeCacheItem = cacheModel.timeline[Math.max(0, Math.min(19, selectedCacheStep - 1))];

  return (
    <div className="chapter-page">
      <div className="chapter-layout">
        <header className="chapter-header">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <ChapterIcon chapter="diffusiondit" />
                {t('title')}
              </h1>
              <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-3xl">{t('subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('reset')}
            </button>
          </div>
        </header>

        <main className="chapter-body space-y-6">
          {/* §1 End-to-End Architecture */}
          <section className="dit-section" data-section-anchor="dit-arch">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
              <h2 className="dit-section-title m-0">{t('s1_title')}</h2>
            </div>
            <p className="dit-section-lead">{t('s1_lead')}</p>

            <DitArchSvg activeStage={activeStage} onSelectStage={setActiveStage} t={t} />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{t('s1_hint')}</span>
              <div className="dit-pill-row">
                {ARCH_STAGE_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveStage(id)}
                    className={`dit-pill ${activeStage === id ? 'dit-pill-active' : ''}`}
                  >
                    {t(`stage_${id}_badge`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 dit-callout dit-callout-info">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="font-bold text-sm">{t(`stage_${activeStage}_title`)}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/70 border border-indigo-200">
                  {t(`stage_${activeStage}_metric`)}
                </span>
              </div>
              <p className="m-0">{t(`stage_${activeStage}_desc`)}</p>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-semibold text-slate-600 mb-1.5">{t('s1_formula_label')}</div>
              <div className="overflow-x-auto py-1">
                <MathFormula block>{FLOW_TEX}</MathFormula>
              </div>
              <div className="text-xs text-slate-600 mt-1">{t('s1_formula_note')}</div>
            </div>
          </section>

          {/* §2 3D Spatio-Temporal Patchify & Quadratic Attention Wall */}
          <section className="dit-section" data-section-anchor="dit-tokens">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-indigo-600 shrink-0" />
              <h2 className="dit-section-title m-0">{t('s2_title')}</h2>
            </div>
            <p className="dit-section-lead">{t('s2_lead')}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1.5">{t('s2_preset_label')}</div>
                <div className="dit-pill-row">
                  {Object.keys(TASK_PRESETS).map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => updateCfg({ presetId: pid, steps: TASK_PRESETS[pid].defaultSteps })}
                      className={`dit-pill ${config.presetId === pid ? 'dit-pill-active' : ''}`}
                    >
                      {t(`preset_${pid}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-start">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1.5">{t('s2_patch_label')}</div>
                  <div className="dit-pill-row">
                    {PATCH_SIZES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => updateCfg({ patchSize: p })}
                        className={`dit-pill ${config.patchSize === p ? 'dit-pill-active' : ''}`}
                      >
                        1×{p}×{p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1.5">{t('s2_cfg_label')}</div>
                  <div className="dit-pill-row">
                    <button
                      type="button"
                      onClick={() => updateCfg({ cfgEnabled: true })}
                      className={`dit-pill ${config.cfgEnabled ? 'dit-pill-active' : ''}`}
                    >
                      {t('s2_cfg_on')}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCfg({ cfgEnabled: false })}
                      className={`dit-pill ${!config.cfgEnabled ? 'dit-pill-active' : ''}`}
                    >
                      {t('s2_cfg_off')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-3 overflow-x-auto p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <MathFormula block>{SEQ_TEX}</MathFormula>
            </div>

            <div className="dit-metric-grid mb-4">
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s2_metric_latent')}</div>
                <div className="dit-metric-val">{tokenModel.patchT} × {tokenModel.patchH} × {tokenModel.patchW}</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s2_metric_seq')}</div>
                <div className="dit-metric-val text-indigo-700">{tokenModel.seqLen.toLocaleString()}</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s2_metric_tflops')}</div>
                <div className="dit-metric-val">{tokenModel.totalTflops.toLocaleString()} TFLOPs</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s2_metric_latency')}</div>
                <div className="dit-metric-val text-rose-600">{tokenModel.estSingleGpuSec} s</div>
              </div>
            </div>

            {/* Compute breakdown bar: Attention vs FFN */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 mb-3">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-rose-700">{t('s2_bar_attn')}: {tokenModel.attnSharePct}%</span>
                <span className="text-indigo-700">{t('s2_bar_ffn')}: {tokenModel.ffnSharePct}%</span>
              </div>
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-200">
                <div
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{ width: `${tokenModel.attnSharePct}%` }}
                />
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${tokenModel.ffnSharePct}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2 mb-0">
                {tokenModel.regime === 'compute_bound' ? t('s2_regime_compute') : t('s2_regime_mixed')}
              </p>
            </div>

            <div className="dit-callout">{t('s2_vs_llm')}</div>
          </section>

          {/* §3 Multi-GPU Parallelism: CFG + USP */}
          <section className="dit-section" data-section-anchor="dit-parallel">
            <div className="flex items-center gap-2 mb-1">
              <Network className="w-4 h-4 text-indigo-600 shrink-0" />
              <h2 className="dit-section-title m-0">{t('s3_title')}</h2>
            </div>
            <p className="dit-section-lead">{t('s3_lead')}</p>

            <div className="flex flex-wrap gap-4 items-end mb-4">
              <div>
                <div className="dit-pill-row">
                  {PARALLEL_MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateCfg({ parallelMode: m })}
                      className={`dit-pill ${config.parallelMode === m ? 'dit-pill-active' : ''}`}
                    >
                      {t(`s3_mode_${m}`)}
                    </button>
                  ))}
                </div>
              </div>

              {config.parallelMode === 'usp' && (
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">{t('s3_gpus_label')}</div>
                  <div className="dit-pill-row">
                    {[2, 4, 8].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateCfg({ gpuCount: n })}
                        className={`dit-pill ${config.gpuCount === n ? 'dit-pill-active' : ''}`}
                      >
                        {n} GPUs
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {config.parallelMode !== 'single' && (
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">{t('s3_link_label')}</div>
                  <div className="dit-pill-row">
                    {['nvlink', 'pcie'].map((lk) => (
                      <button
                        key={lk}
                        type="button"
                        onClick={() => updateCfg({ interconnect: lk })}
                        className={`dit-pill ${config.interconnect === lk ? 'dit-pill-active' : ''}`}
                      >
                        {t(`link_${lk}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DitParallelSvg model={parallelModel} t={t} />

            <div className="dit-metric-grid mt-4 mb-3">
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s3_metric_step')}</div>
                <div className="dit-metric-val">{parallelModel.stepSec} s</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s3_metric_total')}</div>
                <div className="dit-metric-val text-indigo-700">{parallelModel.total50StepsSec} s</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s3_metric_speedup')}</div>
                <div className="dit-metric-val text-emerald-700">{parallelModel.speedup}× ({parallelModel.efficiencyPct}%)</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s3_metric_comm')}</div>
                <div className="dit-metric-val">{parallelModel.commSharePct}%</div>
              </div>
            </div>

            <div className="dit-callout dit-callout-info">{t(`s3_topology_note_${parallelModel.mode}`)}</div>
          </section>

          {/* §4 Step Compression & TeaCache */}
          <section className="dit-section" data-section-anchor="dit-cache">
            <div className="flex items-center gap-2 mb-1">
              <FastForward className="w-4 h-4 text-indigo-600 shrink-0" />
              <h2 className="dit-section-title m-0">{t('s4_title')}</h2>
            </div>
            <p className="dit-section-lead">{t('s4_lead')}</p>

            <div className="flex flex-wrap gap-4 items-end mb-4">
              <div className="dit-pill-row">
                {CACHE_STRATEGIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateCfg({ cacheStrategy: s })}
                    className={`dit-pill ${config.cacheStrategy === s ? 'dit-pill-active' : ''}`}
                  >
                    {t(`s4_strat_${s}`)}
                  </button>
                ))}
              </div>

              {config.cacheStrategy === 'teacache' && (
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">{t('s4_thresh_label')}</div>
                  <div className="dit-pill-row">
                    {[0.08, 0.15, 0.25].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateCfg({ cacheThreshold: d })}
                        className={`dit-pill ${config.cacheThreshold === d ? 'dit-pill-active' : ''}`}
                      >
                        δ = {d.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-3 overflow-x-auto p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <MathFormula block>{TEACACHE_TEX}</MathFormula>
            </div>

            <div className="dit-step-grid mb-3">
              {cacheModel.timeline.map((item) => {
                const cls =
                  item.status === 'compute'
                    ? 'dit-step-compute'
                    : item.status === 'reuse'
                      ? 'dit-step-reuse'
                      : 'dit-step-skipped';
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setSelectedCacheStep(item.step)}
                    className={`dit-step-cell ${cls} ${selectedCacheStep === item.step ? 'dit-step-selected' : ''}`}
                  >
                    <div className="text-[10px] font-bold">t{item.step}</div>
                    <div className="text-[10px] mt-0.5 font-semibold">
                      {item.status === 'compute' ? 'FULL' : item.status === 'reuse' ? 'CACHE' : 'SKIP'}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-600 mb-3 flex flex-wrap items-center gap-3">
              <span>{t('s4_click_hint')}</span>
              <span className="font-semibold text-slate-900">
                {t('s4_step_detail', {
                  step: activeCacheItem.step,
                  delta: activeCacheItem.delta.toFixed(2),
                  accum: activeCacheItem.accum.toFixed(2),
                })}
              </span>
            </div>

            <div className="dit-metric-grid">
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s4_metric_full')}</div>
                <div className="dit-metric-val">{cacheModel.fullSteps} / 20</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s4_metric_reuse')}</div>
                <div className="dit-metric-val text-emerald-700">{cacheModel.reusedSteps}</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s4_metric_speedup')}</div>
                <div className="dit-metric-val text-indigo-700">{cacheModel.speedup}×</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s4_metric_risk')}</div>
                <div className="dit-metric-val text-sm">{t(`risk_${cacheModel.qualityRisk}`)}</div>
              </div>
            </div>
          </section>

          {/* §5 3D Tiled VAE Memory Peak */}
          <section className="dit-section" data-section-anchor="dit-vae">
            <div className="flex items-center gap-2 mb-1">
              <HardDrive className="w-4 h-4 text-indigo-600 shrink-0" />
              <h2 className="dit-section-title m-0">{t('s5_title')}</h2>
            </div>
            <p className="dit-section-lead">{t('s5_lead')}</p>

            <div className="flex flex-wrap gap-4 items-end mb-4">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">{t('s5_res_label')}</div>
                <div className="dit-pill-row">
                  {Object.keys(VAE_RES_PRESETS).map((rid) => (
                    <button
                      key={rid}
                      type="button"
                      onClick={() => updateCfg({ vaeResId: rid })}
                      className={`dit-pill ${config.vaeResId === rid ? 'dit-pill-active' : ''}`}
                    >
                      {rid === 'v720p' ? '720p 5s' : rid === 'v1080p' ? '1080p 5s' : '4K 5s'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">{t('s5_tiling_label')}</div>
                <div className="dit-pill-row">
                  {[
                    { id: 'full', k: 'tiling_full' },
                    { id: 'spatial', k: 'tiling_spatial' },
                    { id: 'spatiotemporal', k: 'tiling_st' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateCfg({ vaeTiling: item.id })}
                      className={`dit-pill ${config.vaeTiling === item.id ? 'dit-pill-active' : ''}`}
                    >
                      {t(item.k)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">{t('s5_vram_label')}</div>
                <div className="dit-pill-row">
                  {[48, 80].map((gb) => (
                    <button
                      key={gb}
                      type="button"
                      onClick={() => updateCfg({ gpuVramGB: gb })}
                      className={`dit-pill ${config.gpuVramGB === gb ? 'dit-pill-active' : ''}`}
                    >
                      {gb} GB
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="dit-metric-grid mb-3">
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s5_metric_weights')}</div>
                <div className="dit-metric-val">{vaeModel.residentWeightsGB} GB</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s5_metric_act')}</div>
                <div className={`dit-metric-val ${vaeModel.oomRisk ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {vaeModel.vaePeakActGB} GB
                </div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s5_metric_total')}</div>
                <div className={`dit-metric-val ${vaeModel.oomRisk ? 'text-rose-600' : 'text-slate-900'}`}>
                  {vaeModel.totalPeakGB} / {vaeModel.gpuVramGB} GB
                </div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s5_metric_cut')}</div>
                <div className="dit-metric-val text-indigo-700">{vaeModel.memReductionX}×</div>
              </div>
            </div>

            {/* VRAM Stacked Ceiling Bar + Tile Overlap Strip */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 mb-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                <span>VRAM Peak: {vaeModel.totalPeakGB} GB vs {vaeModel.gpuVramGB} GB GPU Limit</span>
                <span>{vaeModel.tilesCount} tile(s) · Overlap Blending {vaeModel.overlapOverheadPct}%</span>
              </div>
              <div className="w-full h-6 rounded-md overflow-hidden flex bg-slate-200 border border-slate-300 text-[11px] font-bold text-white">
                <div
                  className="bg-slate-600 flex items-center justify-center px-2 whitespace-nowrap"
                  style={{ width: `${Math.min(100, (vaeModel.residentWeightsGB / Math.max(vaeModel.gpuVramGB, vaeModel.totalPeakGB)) * 100)}%` }}
                >
                  Weights {vaeModel.residentWeightsGB} GB
                </div>
                <div
                  className={`${vaeModel.oomRisk ? 'bg-rose-600' : 'bg-emerald-600'} flex items-center justify-center px-2.5 whitespace-nowrap min-w-fit transition-all duration-300`}
                  style={{ width: `${Math.min(100, (vaeModel.vaePeakActGB / Math.max(vaeModel.gpuVramGB, vaeModel.totalPeakGB)) * 100)}%` }}
                >
                  VAE Act {vaeModel.vaePeakActGB} GB {vaeModel.oomRisk ? '(OOM!)' : ''}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: vaeModel.tilesCount }, (_, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[10.5px] font-semibold border border-indigo-300 bg-indigo-50 text-indigo-800"
                  >
                    Tile {idx + 1} {vaeModel.tilingMode !== 'full' ? '+ Overlap' : '(Full Frame)'}
                  </span>
                ))}
              </div>
            </div>

            <div className={`dit-callout mb-3 ${vaeModel.oomRisk ? 'dit-callout-warn' : 'dit-callout-ok'}`}>
              {vaeModel.oomRisk
                ? t('s5_status_oom', { vram: vaeModel.gpuVramGB })
                : t('s5_status_safe', { vram: vaeModel.gpuVramGB })}
            </div>

            <div className="dit-callout">{t('s5_seam_note')}</div>
          </section>

          {/* §6 Quantization & Production Troubleshooting */}
          <section className="dit-section" data-section-anchor="dit-ops">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="w-4 h-4 text-indigo-600 shrink-0" />
              <h2 className="dit-section-title m-0">{t('s6_title')}</h2>
            </div>
            <p className="dit-section-lead">{t('s6_lead')}</p>

            <div className="dit-pill-row mb-3">
              {Object.keys(QUANT_PRESETS).map((qid) => (
                <button
                  key={qid}
                  type="button"
                  onClick={() => updateCfg({ quantId: qid })}
                  className={`dit-pill ${config.quantId === qid ? 'dit-pill-active' : ''}`}
                >
                  {t(`quant_${qid}`)}
                </button>
              ))}
            </div>

            <div className="dit-metric-grid mb-4">
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s6_q_weight')}</div>
                <div className="dit-metric-val">{quantModel.weightGB} GB</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s6_q_speed')}</div>
                <div className="dit-metric-val text-emerald-700">{quantModel.stepSpeedup}×</div>
              </div>
              <div className="dit-metric-card">
                <div className="dit-metric-label">{t('s6_q_protect')}</div>
                <div className="dit-metric-val text-sm">{quantModel.adalnPrecision}</div>
              </div>
            </div>

            {/* Visual Sensitive-Layer Precision Pipeline */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 mb-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1.5 rounded-md border border-amber-400 bg-amber-50 text-amber-900">
                  Block 0–1 · BF16 Protected
                </span>
                <span className="text-slate-400">→</span>
                <span className="px-2.5 py-1.5 rounded-md border border-indigo-400 bg-indigo-50 text-indigo-900">
                  Block 2–37 · {config.quantId === 'bf16' ? 'BF16 Dense' : config.quantId === 'fp8' ? 'FP8 E4M3 Block-Scaled' : 'NVFP4 W4A4 + Rank-32 LoRA'}
                </span>
                <span className="text-slate-400">+</span>
                <span className="px-2.5 py-1.5 rounded-md border border-emerald-400 bg-emerald-50 text-emerald-900">
                  AdaLN-Zero &amp; Norm · BF16
                </span>
                <span className="text-slate-400">→</span>
                <span className="px-2.5 py-1.5 rounded-md border border-amber-400 bg-amber-50 text-amber-900">
                  Block 38–39 · BF16 Protected
                </span>
              </div>
            </div>

            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2.5">
              {t('s6_ops_title')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((idx) => (
                <div key={idx} className="dit-op-card">
                  <div className="text-sm font-bold text-slate-900 mb-1">{t(`op${idx}_title`)}</div>
                  <p className="text-xs text-slate-600 mb-1.5">{t(`op${idx}_cause`)}</p>
                  <p className="text-xs font-medium text-indigo-700 m-0">{t(`op${idx}_fix`)}</p>
                </div>
              ))}
            </div>
          </section>

          <details className="dit-section text-xs text-slate-600">
            <summary className="cursor-pointer font-bold text-slate-800">{t('evidence')}</summary>
            <p className="mt-2 mb-0 leading-relaxed">{t('evidenceBody')}</p>
          </details>
        </main>
      </div>
    </div>
  );
}
