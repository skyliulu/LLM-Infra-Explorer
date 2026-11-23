import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import ChapterIcon from './ChapterIcon';
import { useLanguage } from '../lib/LanguageContext';
import { useExperimentState } from '../lib/ExperimentContext';
import { MathFormula } from './linear-attention/MathFormula';
import {
  JUMP_MODES,
  MASK_ENGINES,
  OVERLAP_MODES,
  PITFALL_IDS,
  VOCAB_SIZES,
  deriveFsmStep,
  deriveJumpForwardModel,
  deriveMaskCostModel,
  deriveOverlapPipeline,
  normalizeStructuredConfig,
} from './structured-output/model';
import { i18n } from './structured-output/content';
import StructuredArchSvg from './structured-output/StructuredArchSvg';
import './structured-output/structured-output.css';

const MASK_TEX = String.raw`p(y_t \mid y_{<t}) = \operatorname{softmax}(\mathbf{z}_t + \mathbf{m}_t),\quad m_{t,v}=\begin{cases}0,& v\in\mathcal{V}_{\text{valid}}(s_t)\\ -\infty,& \text{otherwise}\end{cases}`;

export default function StructuredOutput() {
  const [lang] = useLanguage();
  const t = (key) => i18n[lang]?.[key] ?? i18n.en[key] ?? key;

  const [rawConfig, setConfig] = useExperimentState('StructuredOutput.config', {
    maskEngine: 'xgrammar',
    vocabSize: 128256,
    jumpMode: 'jump_forward',
    overlapMode: 'async_overlap',
    pitfallId: 'bpe_healing',
  });
  const config = useMemo(() => normalizeStructuredConfig(rawConfig), [rawConfig]);
  const update = (patch) => setConfig((prev) => normalizeStructuredConfig({ ...(prev || config), ...patch }));

  const [archPin, setArchPin] = useState(1);
  const [fsmStep, setFsmStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const maskCost = useMemo(
    () => deriveMaskCostModel({ maskEngine: config.maskEngine, vocabSize: config.vocabSize }),
    [config.maskEngine, config.vocabSize]
  );
  const fsm = useMemo(() => deriveFsmStep(fsmStep), [fsmStep]);
  const jump = useMemo(() => deriveJumpForwardModel(config.jumpMode), [config.jumpMode]);
  const overlap = useMemo(() => deriveOverlapPipeline(config.overlapMode), [config.overlapMode]);

  const done = fsm.phase === 'done';
  const reset = () => { setIsPlaying(false); setFsmStep(0); };
  const handleNextStep = () => { setIsPlaying(false); setFsmStep((v) => Math.min(fsm.maxStep, v + 1)); };
  const togglePlay = () => { if (done) setFsmStep(0); setIsPlaying((p) => !p); };

  useEffect(() => {
    if (!isPlaying || done) return undefined;
    const timer = setTimeout(() => setFsmStep((v) => Math.min(fsm.maxStep, v + 1)), 900);
    return () => clearTimeout(timer);
  }, [isPlaying, fsmStep, done, fsm.maxStep]);

  return (
    <div className="chapter-page so-page">
      <header className="chapter-header">
        <div>
          <h1><ChapterIcon chapter="structuredoutput" />{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>

      <div className="chapter-layout chapter-body">
        {/* §1 End-to-End Architecture */}
        <section className="so-section" data-testid="so-arch-section">
          <h2 data-section-anchor="so-arch">{t('archTitle')}</h2>
          <p className="so-lead">{t('archLead')}</p>

          <div className="so-grid-2">
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="so-svg-wrap">
                <StructuredArchSvg activePin={archPin} onSelectPin={setArchPin} />
              </div>
              <div className="so-box">
                <MathFormula>{MASK_TEX}</MathFormula>
              </div>
            </div>

            <div className="so-pin-list">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  data-testid={`so-pin-${num}`}
                  className={`so-pin-card ${archPin === num ? 'on' : ''}`}
                  onClick={() => setArchPin(num)}
                >
                  <div className="so-pin-head">
                    <span className="so-pin-num">{num}</span>
                    <strong>{t(`pin${num}Title`)}</strong>
                  </div>
                  <p>{t(`pin${num}Desc`)}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* §2 Vocab Wall & XGrammar Adaptive Bitmask */}
        <section className="so-section" data-testid="so-xgrammar-section">
          <h2 data-section-anchor="so-xgrammar">{t('s2Title')}</h2>
          <p className="so-lead">{t('s2Lead')}</p>

          <div className="so-controls">
            <div className="so-toggle" role="group" aria-label={t('s2Title')}>
              {MASK_ENGINES.map((eng) => (
                <button
                  key={eng}
                  type="button"
                  data-testid={`so-eng-${eng}`}
                  aria-pressed={config.maskEngine === eng}
                  onClick={() => update({ maskEngine: eng })}
                >
                  {t(`eng_${eng}`)}
                </button>
              ))}
            </div>

            <div className="so-ctrl-group">
              <span className="so-ctrl-label">{t('vocabLabel')}:</span>
              <div className="so-toggle" role="group" aria-label={t('vocabLabel')}>
                {VOCAB_SIZES.map((v) => (
                  <button key={v} type="button" data-testid={`so-vocab-${v}`} aria-pressed={config.vocabSize === v} onClick={() => update({ vocabSize: v })}>
                    {Math.round(v / 1024)}K
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="so-grid-2">
            <div className="so-box">
              <table className="so-table">
                <thead>
                  <tr>
                    <th>Engine</th>
                    <th>{t('mMaskMs')}</th>
                    <th>{t('mRuntimePct')}</th>
                    <th>{t('mOverhead')}</th>
                  </tr>
                </thead>
                <tbody>
                  {maskCost.entries.map((row) => (
                    <tr key={row.id} className={config.maskEngine === row.id ? 'on' : ''} onClick={() => update({ maskEngine: row.id })} style={{ cursor: 'pointer' }}>
                      <td>{t(`eng_${row.id}`)}</td>
                      <td>{row.maskMs} ms</td>
                      <td>{row.runtimeCheckPct}%</td>
                      <td>{row.overheadPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="so-box">
              <div className="so-kpis-2">
                <div className={`so-kpi ${maskCost.selected.maskMs < 0.2 ? 'good' : 'warn'}`}>
                  <small>{t('mMaskMs')}</small>
                  <strong>{maskCost.selected.maskMs} ms</strong>
                </div>
                <div className={`so-kpi ${maskCost.speedupVsNaive >= 10 ? 'good' : ''}`}>
                  <small>{t('mSpeedup')}</small>
                  <strong>{maskCost.speedupVsNaive}×</strong>
                </div>
              </div>
              <p>{t(`engNote_${config.maskEngine}`)}</p>
            </div>
          </div>
        </section>

        {/* §3 Live FSM Logits Masking */}
        <section className="so-section" data-testid="so-step-section">
          <h2 data-section-anchor="so-step">{t('s3Title')}</h2>
          <p className="so-lead">{t('s3Lead')}</p>

          <div className="so-controls">
            <span className="so-ctrl-label">{t('emittedLabel')}: <code>{fsm.emitted || '∅'}</code> → <b>{fsm.nextToken}</b></span>
            <div className="chapter-playback so-playback">
              <button type="button" onClick={reset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={16} /></button>
              <button type="button" onClick={togglePlay} aria-label={isPlaying && !done ? t('pause') : t('play')} title={isPlaying && !done ? t('pause') : t('play')}>
                {isPlaying && !done ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button type="button" onClick={handleNextStep} disabled={done} aria-label={t('next')} title={t('next')}><SkipForward size={16} /></button>
            </div>
          </div>

          <div className="so-stage-bar">
            <span>{t('curState')}: {fsm.state}</span>
            <span>{fsm.step + 1} / {fsm.maxStep + 1}</span>
          </div>

          <table className="so-table">
            <thead>
              <tr>
                <th>{t('colTok')}</th>
                <th>{t('colLogit')}</th>
                <th>{t('colRawP')}</th>
                <th>{t('colMask')}</th>
                <th>{t('colMaskedP')}</th>
              </tr>
            </thead>
            <tbody>
              {fsm.candidates.map((c) => (
                <tr key={c.tok} className={!c.valid ? 'blocked' : ''}>
                  <td><code>{c.tok}</code></td>
                  <td>{c.logit.toFixed(1)}</td>
                  <td>{c.rawProbPct}%</td>
                  <td><span className={`so-pill ${c.valid ? 'ok' : 'no'}`}>{t(c.valid ? 'validLbl' : 'blockedLbl')}</span></td>
                  <td><b>{c.maskedProbPct}%</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* §4 Jump-Forward Decoding */}
        <section className="so-section" data-testid="so-jump-section">
          <h2 data-section-anchor="so-jump">{t('s4Title')}</h2>
          <p className="so-lead">{t('s4Lead')}</p>

          <div className="so-controls">
            <div className="so-toggle" role="group" aria-label={t('s4Title')}>
              {JUMP_MODES.map((m) => (
                <button key={m} type="button" data-testid={`so-jump-${m}`} aria-pressed={config.jumpMode === m} onClick={() => update({ jumpMode: m })}>
                  {m === 'jump_forward' ? t('jump_forward') : t('jump_token_by_token')}
                </button>
              ))}
            </div>
          </div>

          <div className="so-grid-2">
            <div className="so-box">
              <div className="so-tok-strip">
                {jump.tokens.map((tk, idx) => (
                  <span key={idx} className={`so-tok ${tk.det ? 'det' : 'free'} ${tk.det && config.jumpMode === 'jump_forward' ? 'skip' : ''}`}>
                    {tk.text}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11.5 }}>
                <span>● {t('jumpBadgeDet')}</span>
                <span>● {t('jumpBadgeFree')}</span>
              </div>
              <p>{t(`jumpNote_${config.jumpMode}`)}</p>
            </div>

            <div className="so-box">
              <div className="so-kpis-3">
                <div className={`so-kpi ${config.jumpMode === 'jump_forward' ? 'good' : 'warn'}`}>
                  <small>{t('mGpuSteps')}</small>
                  <strong>{jump.activeSteps}</strong>
                </div>
                <div className="so-kpi good">
                  <small>{t('mJumpSpeedup')}</small>
                  <strong>{config.jumpMode === 'jump_forward' ? `${jump.speedup}×` : '1.0×'}</strong>
                </div>
                <div className="so-kpi">
                  <small>{t('mSavedSteps')}</small>
                  <strong>{config.jumpMode === 'jump_forward' ? `-${jump.savedStepsPct}%` : '0%'}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* §5 Async CPU Masking Overlap */}
        <section className="so-section" data-testid="so-overlap-section">
          <h2 data-section-anchor="so-overlap">{t('s5Title')}</h2>
          <p className="so-lead">{t('s5Lead')}</p>

          <div className="so-controls">
            <div className="so-toggle" role="group" aria-label={t('s5Title')}>
              {OVERLAP_MODES.map((m) => (
                <button key={m} type="button" data-testid={`so-ov-${m}`} aria-pressed={config.overlapMode === m} onClick={() => update({ overlapMode: m })}>
                  {t(`ov_${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="so-grid-2">
            <div className="so-lanes">
              {config.overlapMode === 'serial' ? (
                <>
                  <div className="so-lane-row">
                    <span>{t('laneGpu')}</span>
                    <div className="so-lane-bar">
                      <div className="so-seg gpu" style={{ width: '78%' }}>Layers L0..L79 Forward (15.0 ms)</div>
                      <div className="so-seg idle" style={{ width: '22%' }}>Wait CPU</div>
                    </div>
                  </div>
                  <div className="so-lane-row">
                    <span>{t('laneCpu')}</span>
                    <div className="so-lane-bar">
                      <div className="so-seg idle" style={{ width: '78%' }} />
                      <div className="so-seg cpu" style={{ width: '22%' }}>Mask 2.4ms</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="so-lane-row">
                    <span>{t('laneGpu')}</span>
                    <div className="so-lane-bar">
                      <div className="so-seg gpu" style={{ width: '96%' }}>Layers L0..L79 Forward + Fused Mask Sample (15.1 ms)</div>
                      <div className="so-seg idle" style={{ width: '4%' }} />
                    </div>
                  </div>
                  <div className="so-lane-row">
                    <span>{t('laneCpu')}</span>
                    <div className="so-lane-bar">
                      <div className="so-seg cpu" style={{ width: '24%' }}>Mask 2.4ms</div>
                      <div className="so-seg idle" style={{ width: '76%' }}>Hidden behind GPU · Ready in HBM</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="so-box">
              <div className="so-kpis-3">
                <div className="so-kpi">
                  <small>{t('mStepTime')}</small>
                  <strong>{overlap.stepMs} ms</strong>
                </div>
                <div className={`so-kpi ${overlap.exposedMs < 0.5 ? 'good' : 'warn'}`}>
                  <small>{t('mExposed')}</small>
                  <strong>{overlap.exposedMs} ms</strong>
                </div>
                <div className="so-kpi">
                  <small>{t('mOvPct')}</small>
                  <strong>{overlap.overheadPct}%</strong>
                </div>
              </div>
              <p>{t(`ovNote_${config.overlapMode}`)}</p>
            </div>
          </div>
        </section>

        {/* §6 Production Pitfalls */}
        <section className="so-section" data-testid="so-pitfalls-section">
          <h2 data-section-anchor="so-pitfalls">{t('s6Title')}</h2>
          <p className="so-lead">{t('s6Lead')}</p>

          <div className="so-controls">
            <div className="so-toggle" role="group" aria-label={t('s6Title')}>
              {PITFALL_IDS.map((id) => (
                <button key={id} type="button" data-testid={`so-pit-${id}`} aria-pressed={config.pitfallId === id} onClick={() => update({ pitfallId: id })}>
                  {t(`pit_${id}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="so-box" style={{ padding: '8px 12px' }}>
            <div className="so-tok-strip">
              {config.pitfallId === 'bpe_healing' && (
                <>
                  <span className="so-tok det">Broken Split: [&quot;:&quot;] + [&quot;ok&quot;] (OOD)</span>
                  <span className="so-tok free">Token Healing → [&quot;:&quot;ok&quot;] (Exact BPE Merge)</span>
                </>
              )}
              {config.pitfallId === 'recursive_cfg' && (
                <>
                  <span className="so-tok det">Regex FSM: O(2^depth) State Blowup</span>
                  <span className="so-tok free">PDA Stack: Push &#123; → Depth k → Pop &#125; (Bounded)</span>
                </>
              )}
              {config.pitfallId === 'cold_compile' && (
                <>
                  <span className="so-tok det">Cold Sync Compile: +380 ms TTFT Spike</span>
                  <span className="so-tok free">Schema Hash LRU Hit: 0.02 ms</span>
                </>
              )}
              {config.pitfallId === 'spec_coupling' && (
                <>
                  <span className="so-tok free">Draft Branch A: Valid ✓</span>
                  <span className="so-tok det">Draft Branch B: Masked (-∞) → Rollback Snapshot</span>
                </>
              )}
            </div>
          </div>

          <div className="so-grid-even">
            <div className="so-box">
              <span className="so-ctrl-label">{t('pitRoot')}</span>
              <p>{t(`pitRoot_${config.pitfallId}`)}</p>
            </div>
            <div className="so-box">
              <span className="so-ctrl-label">{t('pitFix')}</span>
              <p>{t(`pitFix_${config.pitfallId}`)}</p>
            </div>
          </div>
        </section>

        <details className="so-evidence">
          <summary>{t('evidence')}</summary>
          <p>{t('evidenceBody')}</p>
        </details>
      </div>
    </div>
  );
}
