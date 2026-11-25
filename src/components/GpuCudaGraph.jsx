import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import ChapterIcon from './ChapterIcon';
import { useLanguage } from '../lib/LanguageContext';
import { useExperimentState } from '../lib/ExperimentContext';
import { MathFormula } from './linear-attention/MathFormula';
import {
  FUSION_MODES,
  GPU_SPECS,
  LAUNCH_BATCHES,
  LAUNCH_MODES,
  LAYER_KERNELS,
  ROOF_BATCHES,
  deriveFusionModel,
  deriveLaunchComparison,
  deriveMemoryDataflow,
  deriveRooflineModel,
  deriveSmOccupancy,
  normalizeGpuRuntimeConfig,
} from './gpu-runtime/model';
import { i18n } from './gpu-runtime/content';
import GpuOverviewSection from './gpu-runtime/GpuOverviewSection';
import SmOccupancySection from './gpu-runtime/SmOccupancySection';
import MemoryTilingSection from './gpu-runtime/MemoryTilingSection';
import ArchEvolutionSection from './gpu-runtime/ArchEvolutionSection';
import './gpu-runtime/gpu-runtime.css';

const fmtKB = (bytes) => (bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(2)} MiB` : `${(bytes / 1024).toFixed(0)} KiB`);

export default function GpuCudaGraph() {
  const [lang] = useLanguage();
  const t = (key) => i18n[lang]?.[key] ?? i18n.en[key] ?? key;

  const [rawConfig, setConfig] = useExperimentState('GpuCudaGraph.config', {
    regsPerThread: 64,
    smemKB: 48,
    blockSize: 256,
    divergent: false,
    memView: 'coalescing',
    stride: 1,
    tiled: true,
    launchMode: 'eager',
    batchSize: 1,
    fusionMode: 'unfused',
    gpu: 'h100',
    dtype: 'bf16',
    archGen: 'hopper',
  });
  const config = useMemo(() => normalizeGpuRuntimeConfig(rawConfig), [rawConfig]);
  const update = (patch) => setConfig((prev) => normalizeGpuRuntimeConfig({ ...(prev || config), ...patch }));

  const [step, setStep] = useState(8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [roofBatch, setRoofBatch] = useState(64);

  const sm = useMemo(
    () => deriveSmOccupancy({
      regsPerThread: config.regsPerThread,
      smemKB: config.smemKB,
      blockSize: config.blockSize,
      divergent: config.divergent,
    }),
    [config.regsPerThread, config.smemKB, config.blockSize, config.divergent]
  );
  const mem = useMemo(
    () => deriveMemoryDataflow({ memView: config.memView, stride: config.stride, tiled: config.tiled }),
    [config.memView, config.stride, config.tiled]
  );
  const launch = useMemo(() => deriveLaunchComparison(config, step), [config, step]);
  const fusion = useMemo(
    () => deriveFusionModel({ fusionMode: config.fusionMode, batchSize: Math.max(8, config.batchSize) }),
    [config.fusionMode, config.batchSize]
  );
  const roof = useMemo(
    () => deriveRooflineModel({ gpu: config.gpu, dtype: config.dtype, batchSize: roofBatch }),
    [config.gpu, config.dtype, roofBatch]
  );

  const done = launch.phase === 'done';
  const reset = () => { setIsPlaying(false); setStep(0); };
  const handleNextStep = () => { setIsPlaying(false); setStep((v) => Math.min(launch.maxStep, v + 1)); };
  const togglePlay = () => { if (done) setStep(0); setIsPlaying((p) => !p); };

  useEffect(() => {
    if (!isPlaying || done) return undefined;
    const timer = setTimeout(() => setStep((v) => Math.min(launch.maxStep, v + 1)), 650);
    return () => clearTimeout(timer);
  }, [isPlaying, step, done, launch.maxStep]);

  const codeLines = config.launchMode === 'eager'
    ? [
        { line: 'for op in layer_ops:  # 8 separate Python/C++ calls', active: launch.step > 0 },
        { line: '  cudaLaunchKernel(op, stream)  # ~13 us host overhead each', active: launch.step > 0 && launch.step < 8 },
        { line: '  # GPU waits idle between microsecond kernels at B=1', active: config.batchSize === 1 && launch.step > 0 },
      ]
    : config.launchMode === 'full_graph'
      ? [
          { line: 'bucket = pad_to_static_bucket(batch_size)  # e.g. 5 -> 8', active: launch.step <= 1 },
          { line: 'cudaGraphLaunch(captured_layer[bucket], stream)  # 1 host call', active: launch.step >= 1 },
          { line: '# All 8 kernels replay back-to-back with 0 us gaps', active: launch.step >= 2 },
        ]
      : [
          { line: 'cudaGraphLaunch(piece_1_qkv_rope[bucket], stream)  # 3 ops', active: launch.step >= 1 && launch.step <= 3 },
          { line: 'paged_attention_eager(q, kv_cache, ragged_meta)   # dynamic', active: launch.step === 4 },
          { line: 'cudaGraphLaunch(piece_2_oproj_ffn[bucket], stream) # 4 ops', active: launch.step >= 5 },
        ];

  // Log-log Roofline SVG mapping: AI in [0.25 .. 8192], TFLOP/s in [1 .. 18000]
  const rBox = { left: 44, right: 362, top: 24, bottom: 132 };
  const xAi = (ai) => rBox.left + ((Math.log2(Math.max(0.25, ai)) - Math.log2(0.25)) / (Math.log2(8192) - Math.log2(0.25))) * (rBox.right - rBox.left);
  const yTf = (tf) => rBox.bottom - ((Math.log10(Math.max(1, tf)) - Math.log10(1)) / (Math.log10(18000) - Math.log10(1))) * (rBox.bottom - rBox.top);
  const ridgeX = xAi(roof.ridgeAi);
  const peakY = yTf(roof.peakTflops);
  const roofPath = `M${rBox.left},${yTf(0.25 * roof.hbmTBps).toFixed(1)} L${ridgeX.toFixed(1)},${peakY.toFixed(1)} L${rBox.right},${peakY.toFixed(1)}`;

  return (
    <div className="chapter-page gr-page">
      <header className="chapter-header">
        <div>
          <h1><ChapterIcon chapter="gpucudagraph" />{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>

      <div className="chapter-layout chapter-body">
        {/* §0 Whole-GPU Architecture Blueprint: Chip Die, Inside an SM & CUDA Mapping */}
        <GpuOverviewSection t={t} />

        {/* §1 SM Concurrency, Warp Latency Hiding & Occupancy */}
        <SmOccupancySection config={config} sm={sm} update={update} t={t} />

        {/* §2 Memory Hierarchy, Coalescing & Tensor Core Tiling */}
        <MemoryTilingSection config={config} mem={mem} update={update} t={t} />

        {/* §3 Launch Wall & CUDA Graph */}
        <section className="gr-section" data-testid="gpu-launch-section">
          <h2 data-section-anchor="gpucudagraph-launch">{t('s1Title')}</h2>
          <p className="gr-lead">{t('s1Lead')}</p>

          <div className="gr-controls">
            <div className="gr-toggle" role="group" aria-label={t('modeLabel')}>
              {LAUNCH_MODES.map((m) => (
                <button key={m} type="button" data-testid={`gpu-mode-${m}`} aria-pressed={config.launchMode === m} onClick={() => { update({ launchMode: m }); setStep(8); setIsPlaying(false); }}>
                  {t(`mode_${m}`)}
                </button>
              ))}
            </div>
            <div className="gr-toggle" role="group" aria-label={t('batchLabel')}>
              {LAUNCH_BATCHES.map((b) => (
                <button key={b} type="button" data-testid={`gpu-batch-${b}`} aria-pressed={config.batchSize === b} onClick={() => update({ batchSize: b })}>
                  B={b}
                </button>
              ))}
            </div>
            <div className="chapter-playback gr-playback">
              <button type="button" onClick={reset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={16} /></button>
              <button type="button" onClick={togglePlay} aria-label={isPlaying && !done ? t('pause') : t('play')} title={isPlaying && !done ? t('pause') : t('play')}>
                {isPlaying && !done ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button type="button" onClick={handleNextStep} disabled={done} aria-label={t('next')} title={t('next')}><SkipForward size={16} /></button>
            </div>
          </div>

          <div className="gr-grid-main">
            <div className="gr-timeline-box">
              <div className="gr-kpis">
                <div className={launch.active.idlePct > 35 ? 'warn' : 'good'}>
                  <small>{t('metricTotal')}</small>
                  <strong>{launch.active.totalUs} µs</strong>
                </div>
                <div className={launch.active.idlePct > 35 ? 'warn' : 'good'}>
                  <small>{t('metricIdle')}</small>
                  <strong>{launch.active.idlePct}%</strong>
                </div>
                <div className={launch.speedupVsEager > 1.2 ? 'good' : ''}>
                  <small>{t('metricSpeedup')}</small>
                  <strong>{launch.speedupVsEager}×</strong>
                </div>
                <div>
                  <small>{t('metricHostCalls')}</small>
                  <strong>{launch.active.hostCalls}</strong>
                </div>
              </div>

              {/* Causal Layer Capture Partition: makes WHY P1 / Eager Attn / P2 exist visible */}
              <div className="gr-part-wrap" data-testid="gpu-graph-partition">
                <div className="gr-part-hdr">
                  <span>{t('partTitle')}</span>
                  <small>{t(`partSub_${config.launchMode}`)}</small>
                </div>

                {config.launchMode === 'eager' && (
                  <div className="gr-part-eager">
                    {LAYER_KERNELS.map((k, idx) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => { setIsPlaying(false); setStep(idx + 1); }}
                        className={`gr-part-chip ${k.dynamic ? 'dyn' : ''} ${launch.step === idx + 1 ? 'on' : ''}`}
                      >
                        <small>L{idx + 1}</small>
                        <b>{k.shortLabel}</b>
                      </button>
                    ))}
                  </div>
                )}

                {config.launchMode === 'full_graph' && (
                  <div className="gr-part-box graph">
                    <div className="gr-part-box-head">
                      <strong>Graph Replay (1 Host Call)</strong>
                      <span>{t('partFullTag')}</span>
                    </div>
                    <div className="gr-part-row">
                      {LAYER_KERNELS.map((k, idx) => (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => { setIsPlaying(false); setStep(idx + 1); }}
                          className={`gr-part-chip ${k.dynamic ? 'dyn-warn' : ''} ${launch.step === idx + 1 ? 'on' : ''}`}
                        >
                          <b>{k.shortLabel}</b>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {config.launchMode === 'piecewise_graph' && (
                  <div className="gr-part-pw">
                    <div className="gr-part-box graph">
                      <div className="gr-part-box-head">
                        <strong>P1 · Graph Replay #1</strong>
                        <span>{t('partStaticTag')}</span>
                      </div>
                      <div className="gr-part-row">
                        {LAYER_KERNELS.slice(0, 3).map((k, idx) => (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => { setIsPlaying(false); setStep(idx + 1); }}
                            className={`gr-part-chip ${launch.step === idx + 1 ? 'on' : ''}`}
                          >
                            <b>{k.shortLabel}</b>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="gr-part-box eager-cut">
                      <div className="gr-part-box-head">
                        <strong>Attn · Eager</strong>
                        <span>{t('partDynamicTag')}</span>
                      </div>
                      <div className="gr-part-row">
                        <button
                          type="button"
                          onClick={() => { setIsPlaying(false); setStep(4); }}
                          className={`gr-part-chip dyn ${launch.step === 4 ? 'on' : ''}`}
                        >
                          <b>PagedAttn</b>
                        </button>
                      </div>
                    </div>

                    <div className="gr-part-box graph">
                      <div className="gr-part-box-head">
                        <strong>P2 · Graph Replay #2</strong>
                        <span>{t('partStaticTag')}</span>
                      </div>
                      <div className="gr-part-row">
                        {LAYER_KERNELS.slice(4).map((k, idx) => (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => { setIsPlaying(false); setStep(idx + 5); }}
                            className={`gr-part-chip ${launch.step === idx + 5 ? 'on' : ''}`}
                          >
                            <b>{k.shortLabel}</b>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="gr-tracks">
                <div className="gr-track-row">
                  <span className="gr-track-label">{t('cpuTrack')}</span>
                  <div className="gr-lane">
                    {launch.active.cpuOps.map((op) => {
                      const visible = launch.step === 0 ? false : op.stepIndex <= launch.step;
                      return (
                        <div
                          key={op.id}
                          className={`gr-op ${op.kind} ${!visible ? 'pending' : ''}`}
                          style={{ left: `${(op.start / launch.horizonUs) * 100}%`, width: `${Math.max(3, ((op.end - op.start) / launch.horizonUs) * 100)}%` }}
                          title={`${op.label} (${(op.end - op.start).toFixed(1)} µs)`}
                        >
                          {op.shortLabel || op.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="gr-track-row">
                  <span className="gr-track-label">{t('gpuTrack')}</span>
                  <div className="gr-lane gpu">
                    {launch.active.gpuOps.map((op) => {
                      const isActive = launch.step === op.stepIndex;
                      const isPending = launch.step < op.stepIndex;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => { setIsPlaying(false); setStep(op.stepIndex); }}
                          className={`gr-op ${op.kind} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}
                          style={{ left: `${(op.start / launch.horizonUs) * 100}%`, width: `${Math.max(3, ((op.end - op.start) / launch.horizonUs) * 100)}%` }}
                          title={`${op.label} (${(op.end - op.start).toFixed(1)} µs)`}
                        >
                          {op.shortLabel || op.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="gr-compare-bars">
                <small>{t('compareBars')}</small>
                {LAUNCH_MODES.map((m) => {
                  const r = launch.runs[m];
                  return (
                    <button key={m} type="button" onClick={() => update({ launchMode: m })} className={`gr-cbar-row ${config.launchMode === m ? 'on' : ''} ${r.idlePct > 35 ? 'warn' : ''}`}>
                      <span>{t(`mode_${m}`)}</span>
                      <div className="gr-cbar-track"><i style={{ width: `${(r.totalUs / launch.horizonUs) * 100}%` }} /></div>
                      <b>{r.totalUs} µs</b>
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="gr-side">
              <div className={`gr-callout ${config.launchMode === 'eager' && config.batchSize === 1 ? 'warn' : ''}`}>
                <h3>{t('constraintTitle')}</h3>
                <p>{t(`constraint_${config.launchMode}`)}</p>
              </div>
              <div>
                <div className="gr-code-title">{t('codeTitle')}</div>
                <pre className="gr-code">
                  {codeLines.map((item, idx) => (
                    <div key={idx} className={item.active ? 'on' : ''}>{item.line}</div>
                  ))}
                </pre>
              </div>
            </aside>
          </div>
        </section>

        {/* §4 Operator Fusion */}
        <section className="gr-section" data-testid="gpu-fusion-section">
          <h2 data-section-anchor="gpucudagraph-fusion">{t('s2Title')}</h2>
          <p className="gr-lead">{t('s2Lead')}</p>

          <div className="gr-controls">
            <div className="gr-toggle" role="group" aria-label={t('s2Title')}>
              {FUSION_MODES.map((m) => (
                <button key={m} type="button" data-testid={`gpu-fusion-${m}`} aria-pressed={config.fusionMode === m} onClick={() => update({ fusionMode: m })}>
                  {t(m === 'fused' ? 'fusionFused' : 'fusionUnfused')}
                </button>
              ))}
            </div>
            <MathFormula>{String.raw`\text{SwiGLU}(g,u)=\operatorname{SiLU}(g)\odot u,\qquad \text{AddNorm}(x,y)=\operatorname{RMSNorm}(x+y)`}</MathFormula>
          </div>

          <div className="gr-fusion-grid">
            <div className="gr-fusion-stages">
              {fusion.stages.map((st) => (
                <div key={st.id} className={`gr-stage-card ${st.sramOnly ? 'fused' : ''}`}>
                  <div className="gr-stage-head">
                    <strong>{st.label}</strong>
                    <span>{t(st.sramOnly ? 'sramBadge' : 'hbmBadge')}</span>
                  </div>
                  <div className="gr-stage-io">
                    <span>{t('hbmReads')}: <b>{fmtKB(st.reads)}</b></span>
                    <span>{t('hbmWrites')}: <b>{fmtKB(st.writes)}</b></span>
                  </div>
                </div>
              ))}
            </div>

            <aside className="gr-fusion-side">
              <div className="gr-fusion-kpis">
                <div><small>{t('metricTraffic')}</small><strong>{fmtKB(fusion.activeBytes)}</strong></div>
                <div><small>{t('metricKernels')}</small><strong>{fusion.kernelCount}</strong></div>
                <div><small>{t('metricSaved')}</small><strong>{config.fusionMode === 'fused' ? `-${fusion.savedPct}%` : '0%'}</strong></div>
              </div>
              <p className="gr-lead" style={{ fontSize: 12 }}>{t('fusionNote')}</p>
            </aside>
          </div>
        </section>

        {/* §5 Multi-Gen Hardware Roofline Model (First-Principles Theoretical Ceiling) */}
        <section className="gr-section" data-testid="gpu-roofline-section">
          <h2 data-section-anchor="gpucudagraph-roofline">{t('s3Title')}</h2>
          <p className="gr-lead">{t('s3Lead')}</p>

          <div className="gr-controls">
            <div className="gr-toggle" role="group" aria-label={t('gpuLabel')}>
              {Object.values(GPU_SPECS).map((spec) => (
                <button key={spec.id} type="button" data-testid={`gpu-arch-${spec.id}`} aria-pressed={config.gpu === spec.id} onClick={() => update({ gpu: spec.id })}>
                  {spec.name}
                </button>
              ))}
            </div>
            <div className="gr-toggle" role="group" aria-label={t('dtypeLabel')}>
              {['bf16', 'fp8', 'fp4'].map((dt) => (
                <button key={dt} type="button" data-testid={`gpu-dtype-${dt}`} aria-pressed={config.dtype === dt} onClick={() => update({ dtype: dt })}>
                  {dt.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="gr-ctrl-group">
              <span className="gr-ctrl-label">{t('roofBatchLabel')}:</span>
              <div className="gr-toggle" role="group" aria-label={t('roofBatchLabel')}>
                {ROOF_BATCHES.map((b) => (
                  <button key={b} type="button" data-testid={`gpu-roof-b-${b}`} aria-pressed={roofBatch === b} onClick={() => setRoofBatch(b)}>
                    B={b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {roof.fallback && (
            <div className="gr-fallback-note">
              {t('fallbackNote')} {roof.dtype.toUpperCase()} ({roof.spec.name})
            </div>
          )}

          <div className="gr-roof-formulas">
            <span className="gr-ridge-formula">
              <MathFormula>{String.raw`I^*=\frac{${roof.peakTflops}\ \mathrm{TF/s}}{${roof.hbmTBps}\ \mathrm{TB/s}}=${roof.ridgeAi}\ \mathrm{FLOP/B}`}</MathFormula>
            </span>
            <span className="gr-roof-eq">
              <MathFormula>{String.raw`I(M,K,N)=\frac{2MKN}{(MK+KN+MN)\,b_e}\quad(K=N=4096)`}</MathFormula>
            </span>
            {roof.criticalBatch && (
              <span className="gr-roof-crit">
                {t('roofCritPrefix')} <b>B* ≈ {roof.criticalBatch}</b>
              </span>
            )}
          </div>

          <div className="gr-roof-grid">
            <div className="gr-roof-chart">
              <svg viewBox="0 0 380 176" role="img" aria-label={t('s3Title')}>
                {/* Memory-bound vs Compute-bound subtle regions */}
                <rect className="gr-roof-zone-mem" x={rBox.left} y={rBox.top} width={Math.max(0, ridgeX - rBox.left)} height={rBox.bottom - rBox.top} />
                <rect className="gr-roof-zone-cmp" x={ridgeX} y={rBox.top} width={Math.max(0, rBox.right - ridgeX)} height={rBox.bottom - rBox.top} />
                <text className="gr-roof-zone-lbl mem" x={rBox.left + 6} y={rBox.top + 12}>{t('boundMemory')}</text>
                <text className="gr-roof-zone-lbl cmp" x={rBox.right - 6} y={rBox.bottom - 7} textAnchor="end">{t('boundCompute')}</text>

                {[10, 100, 1000, 9000].map((tf) => (
                  <g key={tf}>
                    <line className="gr-roof-gridline" x1={rBox.left} x2={rBox.right} y1={yTf(tf)} y2={yTf(tf)} />
                    <text className="gr-roof-axis" x={38} y={yTf(tf) + 3} textAnchor="end">{tf}</text>
                  </g>
                ))}
                {[1, 16, 256, 4096].map((ai) => (
                  <text className="gr-roof-axis" key={ai} x={xAi(ai)} y={148} textAnchor="middle">{ai}</text>
                ))}
                <text className="gr-roof-axis" x={(rBox.left + rBox.right) / 2} y={165} textAnchor="middle">{t('axisX')}</text>
                <line className="gr-roof-ridge" x1={ridgeX} x2={ridgeX} y1={rBox.top} y2={rBox.bottom} />
                <text className="gr-roof-ridge-lbl" x={Math.min(312, Math.max(82, ridgeX))} y={15} textAnchor="middle">{t('ridgeLabel')}: {roof.ridgeAi}</text>
                <path className="gr-roof-line" d={roofPath} />
                {roof.kernels.map((k, idx) => {
                  const cx = xAi(k.ai);
                  const cy = yTf(k.achievedTflops);
                  const dy = idx === 1 ? 13 : idx === 2 ? (k.bound === 'compute' ? 14 : -9) : idx === 3 ? 14 : -8;
                  return (
                    <g key={k.id}>
                      <circle cx={cx} cy={cy} r={k.kind === 'active' ? 5.2 : 3.8} fill={k.bound === 'compute' ? '#10b981' : '#f43f5e'} stroke="#0f172a" strokeWidth="1.2" />
                      <text className="gr-roof-dot-lbl" x={Math.min(348, Math.max(52, cx))} y={Math.min(126, Math.max(32, cy + dy))} textAnchor="middle">
                        {k.short}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="gr-roof-right">
              <table className="gr-roof-table">
                <thead>
                  <tr>
                    <th>{t('kernelTableOp')}</th>
                    <th>{t('kernelTableAi')}</th>
                    <th>{t('kernelTableAchieved')}</th>
                    <th>{t('kernelTableBound')}</th>
                  </tr>
                </thead>
                <tbody>
                  {roof.kernels.map((k) => (
                    <tr key={k.id} className={k.kind === 'active' ? 'active' : ''}>
                      <td>{k.label}</td>
                      <td>{k.ai}</td>
                      <td>{k.achievedTflops} TF/s ({k.utilPct}%)</td>
                      <td><span className={`gr-pill ${k.bound === 'compute' ? 'cmp' : 'mem'}`}>{t(k.bound === 'compute' ? 'boundCompute' : 'boundMemory')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="gr-roof-scope">{t('roofScopeNote')}</p>
            </div>
          </div>
        </section>

        {/* §6 NVIDIA GPU Architecture Evolution: Volta -> Rubin */}
        <ArchEvolutionSection config={config} update={update} t={t} />

        <details className="gr-evidence">
          <summary>{t('evidence')}</summary>
          <p>{t('evidenceBody')}</p>
        </details>
      </div>
    </div>
  );
}
