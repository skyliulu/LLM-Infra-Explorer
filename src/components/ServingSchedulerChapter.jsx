import React, { useMemo, useState } from 'react';
import ChapterIcon from './ChapterIcon';
import { useLanguage } from '../lib/LanguageContext';
import { useExperimentState } from '../lib/ExperimentContext';
import { MathFormula } from './linear-attention/MathFormula';
import ServingScheduler from './llm-inference/ServingScheduler';
import {
  CHUNK_BUDGETS,
  PROMPT_LENS,
  QUEUE_POLICIES,
  deriveChunkBudgetModel,
  derivePolicyModel,
  deriveWatermarkModel,
  normalizeSchedulerConfig,
} from './serving-scheduler/model';
import { i18n } from './serving-scheduler/content';
import SchedulerArchSvg from './serving-scheduler/SchedulerArchSvg';
import ChunkBudgetSvg from './serving-scheduler/ChunkBudgetSvg';
import './serving-scheduler/serving-scheduler.css';

const BUDGET_TEX = String.raw`B_{\text{iter}} = \underbrace{\sum_{r \in \mathcal{R}_{\text{dec}}} 1}_{\text{Decode Tokens}} + \underbrace{\sum_{q \in \mathcal{R}_{\text{pre}}} c_q}_{\text{Prefill Chunks}} \le B_{\max}`;

export default function ServingSchedulerChapter() {
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

  const [rawConfig, setConfig] = useExperimentState('ServingScheduler.config', {
    batchMode: 'continuous',
    tokenBudget: 1024,
    promptLen: 8192,
    activeDecodes: 32,
    policy: 'lpm',
    kvUtilPct: 82,
    maxNumSeqs: 128,
  });
  const config = useMemo(() => normalizeSchedulerConfig(rawConfig), [rawConfig]);
  const update = (patch) => setConfig((prev) => normalizeSchedulerConfig({ ...(prev || config), ...patch }));

  const [archPin, setArchPin] = useState(2);

  const chunk = useMemo(
    () => deriveChunkBudgetModel({
      tokenBudget: config.tokenBudget,
      promptLen: config.promptLen,
      activeDecodes: config.activeDecodes,
    }),
    [config.tokenBudget, config.promptLen, config.activeDecodes]
  );

  const pol = useMemo(() => derivePolicyModel(config.policy), [config.policy]);
  const wm = useMemo(
    () => deriveWatermarkModel({ kvUtilPct: config.kvUtilPct, maxNumSeqs: config.maxNumSeqs }),
    [config.kvUtilPct, config.maxNumSeqs]
  );

  return (
    <div className="chapter-page sc2-page">
      <header className="chapter-header">
        <div>
          <h1><ChapterIcon chapter="scheduler" />{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>

      <div className="chapter-layout chapter-body">
        {/* §1 Online Scheduler End-to-End Architecture */}
        <section className="sc2-section" data-testid="sched-arch-section">
          <h2 data-section-anchor="sched-arch">{t('s1Title')}</h2>
          <p className="sc2-lead">{t('s1Lead')}</p>

          <div className="sc2-grid-2">
            <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
              <div className="sc2-svg-wrap">
                <SchedulerArchSvg activePin={archPin} onSelectPin={setArchPin} lang={lang} />
              </div>
              <div className="sc2-box">
                <MathFormula block>{BUDGET_TEX}</MathFormula>
              </div>
            </div>

            <div className="sc2-pin-list">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  data-testid={`sched-pin-${num}`}
                  className={`sc2-pin-card ${archPin === num ? 'on' : ''}`}
                  onClick={() => setArchPin(num)}
                >
                  <div className="sc2-pin-head">
                    <span className="sc2-pin-num">{num}</span>
                    <strong>{t(`pin${num}Title`)}</strong>
                  </div>
                  <p>{t(`pin${num}Desc`)}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* §2 Static Batching vs Continuous Batching (Extracted from LLM Inference) */}
        <ServingScheduler
          lang={lang}
          mode={config.batchMode}
          setMode={(nextMode) => update({ batchMode: nextMode })}
          anchorId="sched-batch"
        />

        {/* §3 Chunked Prefill Token Budget */}
        <section className="sc2-section" data-testid="sched-chunk-section">
          <h2 data-section-anchor="sched-chunk">{t('s3Title')}</h2>
          <p className="sc2-lead">{t('s3Lead')}</p>

          <div className="sc2-controls">
            <div className="sc2-ctrl-group">
              <span className="sc2-ctrl-label">{t('budgetLbl')}:</span>
              <div className="sc2-toggle" role="group" aria-label={t('budgetLbl')}>
                {CHUNK_BUDGETS.map((b) => (
                  <button key={b} type="button" data-testid={`sched-budget-${b}`} aria-pressed={config.tokenBudget === b} onClick={() => update({ tokenBudget: b })}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="sc2-ctrl-group">
              <span className="sc2-ctrl-label">{t('promptLbl')}:</span>
              <div className="sc2-toggle" role="group" aria-label={t('promptLbl')}>
                {PROMPT_LENS.map((l) => (
                  <button key={l} type="button" aria-pressed={config.promptLen === l} onClick={() => update({ promptLen: l })}>
                    {l / 1024}K
                  </button>
                ))}
              </div>
            </div>

            <div className="sc2-ctrl-group">
              <span className="sc2-ctrl-label">{t('decodesLbl')}:</span>
              <div className="sc2-toggle" role="group" aria-label={t('decodesLbl')}>
                {[8, 32, 64].map((d) => (
                  <button key={d} type="button" aria-pressed={config.activeDecodes === d} onClick={() => update({ activeDecodes: d })}>
                    {d} reqs
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="sc2-svg-wrap">
            <ChunkBudgetSvg model={chunk} lang={lang} />
          </div>

          <div className="sc2-kpis-4">
            <div className="sc2-kpi">
              <small>{t('mChunks')}</small>
              <strong>{chunk.chunks}</strong>
            </div>
            <div className="sc2-kpi warn">
              <small>{t('mUnchunked')}</small>
              <strong>{chunk.unchunkedStallMs} ms</strong>
            </div>
            <div className={`sc2-kpi ${chunk.tpotSloPass ? 'good' : 'warn'}`}>
              <small>{t('mChunkedTpot')}</small>
              <strong>{chunk.chunkedTpotMs} ms</strong>
            </div>
            <div className="sc2-kpi good">
              <small>{t('mTcUtil')}</small>
              <strong>{chunk.tcUtilPct}%</strong>
            </div>
          </div>

          <div>
            <span className={`sc2-pill ${chunk.tpotSloPass ? 'ok' : 'warn'}`}>
              {t(chunk.tpotSloPass ? 'sloPass' : 'sloFail')}
            </span>
          </div>
        </section>

        {/* §4 Queue Policies & Anti-Starvation */}
        <section className="sc2-section" data-testid="sched-policy-section">
          <h2 data-section-anchor="sched-policy">{t('s4Title')}</h2>
          <p className="sc2-lead">{t('s4Lead')}</p>

          <div className="sc2-controls">
            <div className="sc2-toggle" role="group" aria-label={t('s4Title')}>
              {QUEUE_POLICIES.map((p) => (
                <button key={p} type="button" data-testid={`sched-pol-${p}`} aria-pressed={config.policy === p} onClick={() => update({ policy: p })}>
                  {t(`pol_${p}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="sc2-grid-2">
            <div className="sc2-box">
              <table className="sc2-table">
                <thead>
                  <tr>
                    <th>{t('colRank')}</th>
                    <th>{t('colReq')}</th>
                    <th>{t('colPrefix')}</th>
                    <th>{t('colHit')}</th>
                    <th>{t('colTtft')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pol.ordered.map((r) => (
                    <tr key={r.id} className={r.hit ? 'on' : ''}>
                      <td>#{r.rank} ({r.id})</td>
                      <td>{r.label}</td>
                      <td><code>{r.prefix}</code></td>
                      <td><span className={`sc2-pill ${r.hit ? 'ok' : 'amber'}`}>{r.hit ? `HIT (${(r.hitTokens / 1024).toFixed(0)}K, -${r.savedPct}%)` : 'COLD'}</span></td>
                      <td><b>{r.ttftMs} ms</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sc2-box">
              <div className="sc2-grid-even">
                <div className={`sc2-kpi ${pol.shortAvgTtftMs < 80 ? 'good' : 'warn'}`}>
                  <small>{t('mShortTtft')}</small>
                  <strong>{pol.shortAvgTtftMs} ms</strong>
                </div>
                <div className="sc2-kpi">
                  <small>{t('mP99Ttft')}</small>
                  <strong>{pol.p99TtftMs} ms</strong>
                </div>
                <div className={`sc2-kpi ${pol.prefixHitPct >= 65 ? 'good' : ''}`}>
                  <small>{t('mPrefixHit')}</small>
                  <strong>{pol.prefixHitPct}%</strong>
                </div>
                <div className={`sc2-kpi ${pol.starvationRisk === 'high' ? 'warn' : 'good'}`}>
                  <small>{t('mStarve')}</small>
                  <strong style={{ fontSize: 12 }}>{t(`starve_${pol.starvationRisk}`)}</strong>
                </div>
              </div>
              <p>{t(`polNote_${config.policy}`)}</p>
            </div>
          </div>
        </section>

        {/* §5 Scheduler Runtime Loop & KV Watermark Preemption */}
        <section className="sc2-section" data-testid="sched-runtime-section">
          <h2 data-section-anchor="sched-runtime">{t('s5Title')}</h2>
          <p className="sc2-lead">{t('s5Lead')}</p>

          <div className="sc2-slider-row">
            <span className="sc2-ctrl-label">{t('kvUtilLbl')}: <b>{wm.kvUtilPct}%</b></span>
            <input
              type="range"
              min={50}
              max={99}
              step={1}
              value={wm.kvUtilPct}
              onChange={(e) => update({ kvUtilPct: Number(e.target.value) })}
              aria-label={t('kvUtilLbl')}
            />
            <span className="sc2-ctrl-label">{t('maxSeqLbl')}:</span>
            <div className="sc2-toggle" role="group" aria-label={t('maxSeqLbl')}>
              {[32, 128, 256].map((n) => (
                <button key={n} type="button" aria-pressed={config.maxNumSeqs === n} onClick={() => update({ maxNumSeqs: n })}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="sc2-wm-track" aria-label="KV Pool Watermark">
            <div className={`sc2-wm-fill ${wm.state}`} style={{ width: `${wm.kvUtilPct}%` }}>
              KV {wm.kvUtilPct}% ({wm.admittedSeqs}/{wm.maxNumSeqs} seqs)
            </div>
          </div>

          <div>
            <span className={`sc2-pill ${wm.state === 'admitting' ? 'ok' : wm.state === 'paused' ? 'amber' : 'warn'}`}>
              {t(`wmState_${wm.state}`, { n: wm.preemptedCount })}
            </span>
          </div>

          <div className="sc2-box">
            <span className="sc2-ctrl-label">{t('codeTitle')}</span>
            <pre className="sc2-code">
              <code>{`# vLLM V1 / SGLang Unified Iteration-Level Scheduler Step (15-30ms cadence)
def schedule_step(waiting, running, kv_pool, token_budget=${config.tokenBudget}, max_seqs=${config.maxNumSeqs}):
    batch, used_tokens = [], 0
    # 1. Always prioritize active Running Decode tokens first (lowest TPOT jitter)
    for req in running:
        while not kv_pool.can_append_block(req):
            victim = running.pop_lifo()                   # KV >= 95% -> preempt newest seq
            kv_pool.free_or_swap(victim); waiting.push_front(victim)
        batch.append((req, 1)); used_tokens += 1
    # 2. Drain Waiting queue (ordered by ${config.policy.toUpperCase()}) within remaining Token Budget
    if kv_pool.util_pct() < 90 and len(running) < max_seqs:
        for req in waiting.ordered_by("${config.policy}"):
            chunk = min(req.remaining_prefill, token_budget - used_tokens)
            if chunk <= 0 or not kv_pool.can_allocate(chunk): break
            batch.append((req, chunk)); used_tokens += chunk
    return pack_ragged_batch_and_launch_gpu(batch)        # single varlen FlashAttention pass`}</code>
            </pre>
          </div>
        </section>

        {/* §6 Core Scheduler Parameter Reference */}
        <section className="sc2-section" data-testid="sched-ops-section">
          <h2 data-section-anchor="sched-ops">{t('s6Title')}</h2>
          <p className="sc2-lead">{t('s6Lead')}</p>

          <div className="sc2-box">
            <span className="sc2-ctrl-label">{t('knobTitle')}</span>
            <table className="sc2-table">
              <thead>
                <tr>
                  <th>{t('colKnob')}</th>
                  <th>{t('colRole')}</th>
                  <th>{t('colSmall')}</th>
                  <th>{t('colLarge')}</th>
                  <th>{t('colSweet')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="on">
                  <td><code>max_num_batched_tokens</code></td>
                  <td>{t('k1Role')}</td>
                  <td>{t('k1Small')}</td>
                  <td>{t('k1Large')}</td>
                  <td>{t('k1Sweet')}</td>
                </tr>
                <tr>
                  <td><code>max_num_seqs</code></td>
                  <td>{t('k2Role')}</td>
                  <td>{t('k2Small')}</td>
                  <td>{t('k2Large')}</td>
                  <td>{t('k2Sweet')}</td>
                </tr>
                <tr>
                  <td><code>enable_chunked_prefill</code></td>
                  <td>{t('k3Role')}</td>
                  <td>{t('k3Small')}</td>
                  <td>{t('k3Large')}</td>
                  <td>{t('k3Sweet')}</td>
                </tr>
                <tr>
                  <td><code>scheduling_policy</code></td>
                  <td>{t('k4Role')}</td>
                  <td>{t('k4Small')}</td>
                  <td>{t('k4Large')}</td>
                  <td>{t('k4Sweet')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <details className="sc2-evidence">
          <summary>{t('evidence')}</summary>
          <p>{t('evidenceBody')}</p>
        </details>
      </div>
    </div>
  );
}
