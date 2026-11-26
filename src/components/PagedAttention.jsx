import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import ChapterIcon from './ChapterIcon';
import { useLanguage } from '../lib/LanguageContext';
import { useExperimentState } from '../lib/ExperimentContext';
import { MathFormula } from './linear-attention/MathFormula';
import {
  ALLOC_MODES,
  BLOCK_SIZES,
  PCIE_LINKS,
  PREEMPT_MODES,
  SIZING_MODELS,
  VATTN_MODES,
  VICTIM_LENGTHS,
  deriveBlockTranslation,
  deriveCowStep,
  deriveFragmentationModel,
  derivePreemptionModel,
  deriveSizingModel,
  normalizePagedConfig,
} from './paged-kv/model';
import { i18n } from './paged-kv/content';
import PagedArchSvg from './paged-kv/PagedArchSvg';
import VAttnCompareSvg from './paged-kv/VAttnCompareSvg';
import PrefixHashSvg from './paged-kv/PrefixHashSvg';
import './paged-kv/paged-kv.css';

const ADDR_TEX = String.raw`i = \left\lfloor \frac{j}{S} \right\rfloor,\quad o = j \bmod S,\quad p = B_r[i],\quad k_j^{(l)} = K_{\text{phys}}^{(l)}[p, o]`;
const KV_SIZE_GQA_TEX = String.raw`M_{\text{KV/GPU}} = \frac{2 \cdot L \cdot H_{\text{kv}} \cdot d_h \cdot T \cdot b}{\text{TP}}`;
const KV_SIZE_MLA_TEX = String.raw`M_{\text{KV/GPU}}^{\text{MLA}} = L \cdot (d_c + d_R) \cdot T \cdot b \quad (d_c=512,\ d_R=64)`;

export default function PagedAttention() {
  const [lang] = useLanguage();
  const t = (key) => i18n[lang]?.[key] ?? i18n.en[key] ?? key;

  const [rawConfig, setConfig] = useExperimentState('PagedAttention.config', {
    allocMode: 'paged',
    blockSize: 16,
    tokenIdx: 37,
    preemptMode: 'recompute',
    victimLen: 1024,
    pcieId: 'pcie4',
    vattnMode: 'pagedattention',
    modelId: 'llama70b',
    kvDtype: 'bf16',
    ctxLen: 8192,
    concurrency: 16,
    keyChange: 'same',
  });
  const config = useMemo(() => normalizePagedConfig(rawConfig), [rawConfig]);
  const update = (patch) => setConfig((prev) => normalizePagedConfig({ ...(prev || config), ...patch }));

  const [cowStep, setCowStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [apcEdited, setApcEdited] = useState(false);

  const frag = useMemo(
    () => deriveFragmentationModel({ allocMode: config.allocMode, blockSize: config.blockSize }),
    [config.allocMode, config.blockSize]
  );
  const addr = useMemo(
    () => deriveBlockTranslation({ blockSize: config.blockSize, tokenIdx: config.tokenIdx }),
    [config.blockSize, config.tokenIdx]
  );
  const cow = useMemo(() => deriveCowStep(cowStep), [cowStep]);
  const pre = useMemo(
    () => derivePreemptionModel({ preemptMode: config.preemptMode, victimLen: config.victimLen, pcieId: config.pcieId }),
    [config.preemptMode, config.victimLen, config.pcieId]
  );
  const sizing = useMemo(
    () => deriveSizingModel({
      modelId: config.modelId,
      kvDtype: config.kvDtype,
      ctxLen: config.ctxLen,
      concurrency: config.concurrency,
      keyChange: config.keyChange,
    }),
    [config.modelId, config.kvDtype, config.ctxLen, config.concurrency, config.keyChange]
  );

  const done = cow.phase === 'done';
  const reset = () => { setIsPlaying(false); setCowStep(0); };
  const handleNextStep = () => { setIsPlaying(false); setCowStep((v) => Math.min(cow.maxStep, v + 1)); };
  const togglePlay = () => { if (done) setCowStep(0); setIsPlaying((p) => !p); };

  useEffect(() => {
    if (!isPlaying || done) return undefined;
    const timer = setTimeout(() => setCowStep((v) => Math.min(cow.maxStep, v + 1)), 900);
    return () => clearTimeout(timer);
  }, [isPlaying, cowStep, done, cow.maxStep]);

  const maxPreMs = Math.max(pre.swapMs, pre.recomputeMs, 1);

  return (
    <div className="chapter-page pk-page">
      <header className="chapter-header">
        <div>
          <h1><ChapterIcon chapter="pagedkv" />{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>

      <div className="chapter-layout chapter-body">
        {/* §1 Fragmentation vs Block Table */}
        <section className="pk-section" data-testid="paged-frag-section">
          <h2 data-section-anchor="paged-frag">{t('s1Title')}</h2>
          <p className="pk-lead">{t('s1Lead')}</p>

          <div className="pk-controls">
            <div className="pk-toggle" role="group" aria-label={t('s1Title')}>
              {ALLOC_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`paged-alloc-${m}`}
                  aria-pressed={config.allocMode === m}
                  onClick={() => update({ allocMode: m })}
                >
                  {t(`alloc_${m}`)}
                </button>
              ))}
            </div>

            <div className="pk-ctrl-group">
              <span className="pk-ctrl-label">{t('blockSizeLabel')}:</span>
              <div className="pk-toggle" role="group" aria-label={t('blockSizeLabel')}>
                {BLOCK_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-testid={`paged-s-${s}`}
                    aria-pressed={config.blockSize === s}
                    onClick={() => update({ blockSize: s })}
                  >
                    S={s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pk-grid-2">
            <div className="pk-svg-wrap">
              <PagedArchSvg allocMode={config.allocMode} blockSize={config.blockSize} lang={lang} />
            </div>

            <div className="pk-box">
              <div className="pk-kpis-2">
                <div className={`pk-kpi ${frag.utilPct >= 75 ? 'good' : 'warn'}`}>
                  <small>{t('mUtil')}</small>
                  <strong>{frag.utilPct}%</strong>
                </div>
                <div className={`pk-kpi ${frag.internalWastePct <= 25 ? 'good' : 'warn'}`}>
                  <small>{t('mIntWaste')}</small>
                  <strong>{frag.internalWastePct}%</strong>
                </div>
                <div className={`pk-kpi ${frag.externalWastePct === 0 ? 'good' : 'warn'}`}>
                  <small>{t('mExtWaste')}</small>
                  <strong>{frag.externalWastePct}%</strong>
                </div>
                <div className="pk-kpi good">
                  <small>{t('mBatchGain')}</small>
                  <strong>{config.allocMode === 'paged' ? `${frag.maxBatchScale}×` : '1.0×'}</strong>
                </div>
              </div>
              <p>{t(`fragNote_${config.allocMode}`)}</p>
            </div>
          </div>
        </section>

        {/* §2 Block Table Virtual->Physical Addressing */}
        <section className="pk-section" data-testid="paged-address-section">
          <h2 data-section-anchor="paged-address">{t('s2Title')}</h2>
          <p className="pk-lead">{t('s2Lead')}</p>

          <div className="pk-slider">
            <span className="pk-ctrl-label">{t('tokLabel')}: <b>j = {addr.tokenIdx}</b></span>
            <input
              type="range"
              min={0}
              max={63}
              step={1}
              value={addr.tokenIdx}
              onChange={(e) => update({ tokenIdx: Number(e.target.value) })}
              aria-label={t('tokLabel')}
            />
            <span className="pk-ctrl-label">S = {addr.blockSize}</span>
          </div>

          <div className="pk-grid-2">
            <div className="pk-box">
              <MathFormula>{ADDR_TEX}</MathFormula>
              <div className="pk-kpis-3">
                <div className="pk-kpi">
                  <small>{t('addrLogical')}</small>
                  <strong>i = {addr.logicalBlock}</strong>
                </div>
                <div className="pk-kpi">
                  <small>{t('addrOffset')}</small>
                  <strong>o = {addr.offset}</strong>
                </div>
                <div className="pk-kpi good">
                  <small>{t('addrPhys')}</small>
                  <strong>P{addr.physicalBlock} [{addr.offset}]</strong>
                </div>
              </div>
              <div className="pk-btable" aria-label="Block Table Entries">
                {addr.tableEntries.map((ent) => (
                  <div key={ent.logical} className={`pk-bt-cell ${ent.active ? 'active' : ''}`}>
                    B[{ent.logical}] → P{ent.physical}
                  </div>
                ))}
              </div>
            </div>

            <div className="pk-box">
              <span className="pk-ctrl-label">{t('addrTradeoffTitle')}</span>
              <p>{t(addr.blockSize <= 4 ? 'addrSmallS' : addr.blockSize >= 64 ? 'addrLargeS' : 'addrMidS')}</p>
              <span className="pk-ctrl-label">{t('kernelTitle')}</span>
              <pre className="pk-code">
                <code>{`// Warp-level PagedAttention Decode Kernel (S=${addr.blockSize}, token j=${addr.tokenIdx})
int logical_blk = ${addr.tokenIdx} / ${addr.blockSize};              // i = ${addr.logicalBlock}
int offset      = ${addr.tokenIdx} % ${addr.blockSize};              // o = ${addr.offset}
int phys_blk    = block_tables[req_id][logical_blk]; // -> P${addr.physicalBlock}
// Coalesced vectorized 128B load from non-contiguous NHD HBM page:
float4 k_vec = K_cache[phys_blk][offset][kv_head][lane_vec];
float  score = warp_dot(q_reg, k_vec) * inv_sqrt_dh; // Online Softmax`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* §3 Reference Counting & Copy-on-Write */}
        <section className="pk-section" data-testid="paged-cow-section">
          <h2 data-section-anchor="paged-cow">{t('s3Title')}</h2>
          <p className="pk-lead">{t('s3Lead')}</p>

          <div className="pk-controls">
            <span className="pk-ctrl-label">Cand A: [{cow.candA.join(', ') || 'Done'}] · Cand B: [{cow.candB.join(', ') || 'Freed'}]</span>
            <div className="chapter-playback pk-playback">
              <button type="button" onClick={reset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={16} /></button>
              <button type="button" onClick={togglePlay} aria-label={isPlaying && !done ? t('pause') : t('play')} title={isPlaying && !done ? t('pause') : t('play')}>
                {isPlaying && !done ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button type="button" onClick={handleNextStep} disabled={done} aria-label={t('next')} title={t('next')}><SkipForward size={16} /></button>
            </div>
          </div>

          <div className="pk-stage-bar">
            <span>{t(cow.stage)}</span>
            <span>{cow.step} / {cow.maxStep}</span>
          </div>

          <div className="pk-cow-blocks">
            {cow.blocks.map((blk) => (
              <div key={blk.id} className={`pk-pblk ${blk.state}`}>
                <div className="pk-pblk-head">
                  <strong>{blk.id}</strong>
                  <span className="pk-pblk-ref">ref={blk.ref}</span>
                </div>
                <small>{blk.label}</small>
              </div>
            ))}
          </div>

          <div className="pk-kpis-4">
            <div className="pk-kpi">
              <small>{t('cowUsed')}</small>
              <strong>{cow.usedBlocks} blocks</strong>
            </div>
            <div className="pk-kpi">
              <small>{t('cowNaive')}</small>
              <strong>{cow.naiveBlocks} blocks</strong>
            </div>
            <div className="pk-kpi good">
              <small>{t('cowSaved')}</small>
              <strong>-{cow.savedPct}%</strong>
            </div>
            <div className="pk-kpi">
              <small>{t('cowCopies')}</small>
              <strong>{cow.cowCopies}</strong>
            </div>
          </div>

          <div className="pk-box">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span className="pk-ctrl-label">{t('apcTitle')}</span>
              <div className="pk-toggle" role="group" aria-label={t('apcTitle')}>
                <button type="button" aria-pressed={!apcEdited} onClick={() => setApcEdited(false)}>{t('apcClean')}</button>
                <button type="button" aria-pressed={apcEdited} onClick={() => setApcEdited(true)}>{t('apcEdit')}</button>
              </div>
            </div>
            <div className="pk-svg-wrap">
              <PrefixHashSvg blockSize={config.blockSize} editedBlock1={apcEdited} lang={lang} />
            </div>
          </div>
        </section>

        {/* §4 Preemption: Swap vs Recompute */}
        <section className="pk-section" data-testid="paged-preempt-section">
          <h2 data-section-anchor="paged-preempt">{t('s4Title')}</h2>
          <p className="pk-lead">{t('s4Lead')}</p>

          <div className="pk-controls">
            <div className="pk-toggle" role="group" aria-label={t('s4Title')}>
              {PREEMPT_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`paged-pre-${m}`}
                  aria-pressed={config.preemptMode === m}
                  onClick={() => update({ preemptMode: m })}
                >
                  {t(`pre_${m}`)}
                </button>
              ))}
            </div>

            <div className="pk-ctrl-group">
              <span className="pk-ctrl-label">{t('victimLabel')}:</span>
              <div className="pk-toggle" role="group" aria-label={t('victimLabel')}>
                {VICTIM_LENGTHS.map((len) => (
                  <button key={len} type="button" data-testid={`paged-vlen-${len}`} aria-pressed={config.victimLen === len} onClick={() => update({ victimLen: len })}>
                    {len >= 1024 ? `${len / 1024}K` : len}
                  </button>
                ))}
              </div>
            </div>

            <div className="pk-ctrl-group">
              <span className="pk-ctrl-label">{t('pcieLabel')}:</span>
              <div className="pk-toggle" role="group" aria-label={t('pcieLabel')}>
                {PCIE_LINKS.map((lnk) => (
                  <button key={lnk.id} type="button" aria-pressed={config.pcieId === lnk.id} onClick={() => update({ pcieId: lnk.id })}>
                    {lnk.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pk-grid-2">
            <div className="pk-bar-list">
              <div className={`pk-bar-row ${pre.winner === 'swap' ? 'win' : ''}`} style={config.preemptMode === 'swap' ? { outline: '2px solid #6366f1', outlineOffset: 3, borderRadius: 6 } : undefined}>
                <span>{t('pre_swap')}{config.preemptMode === 'swap' ? ' ★' : ''}</span>
                <div className="pk-bar-track"><i style={{ width: `${Math.max(5, (pre.swapMs / maxPreMs) * 100)}%` }} /></div>
                <b>{pre.swapMs} ms</b>
              </div>
              <div className={`pk-bar-row ${pre.winner === 'recompute' ? 'win' : ''}`} style={config.preemptMode === 'recompute' ? { outline: '2px solid #6366f1', outlineOffset: 3, borderRadius: 6 } : undefined}>
                <span>{t('pre_recompute')}{config.preemptMode === 'recompute' ? ' ★' : ''}</span>
                <div className="pk-bar-track"><i style={{ width: `${Math.max(5, (pre.recomputeMs / maxPreMs) * 100)}%` }} /></div>
                <b>{pre.recomputeMs} ms</b>
              </div>
              <p className="pk-lead" style={{ fontSize: 12 }}>
                {t('mPreBreakdown')}: <b>{pre.linearMs} ms</b> / <b>{pre.attnMs} ms</b>. {t('preNote')}
              </p>
            </div>

            <div className="pk-box">
              <div className="pk-kpis-2">
                <div className="pk-kpi">
                  <small>{t('mKvVol')}</small>
                  <strong>{pre.kvMB} MB</strong>
                </div>
                <div className={`pk-kpi ${config.preemptMode === pre.winner ? 'good' : 'warn'}`}>
                  <small>{t('mPreSelected')}</small>
                  <strong>{pre.activeMs} ms</strong>
                </div>
                <div className="pk-kpi good">
                  <small>{t('mPreWinner')}</small>
                  <strong>{pre.winner === 'swap' ? 'PCIe Swap' : 'Recompute'}</strong>
                </div>
                <div className="pk-kpi">
                  <small>{t('mSwapTime')} / {t('mRecompTime')}</small>
                  <strong>{pre.swapMs} / {pre.recomputeMs} ms</strong>
                </div>
              </div>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                {config.preemptMode === pre.winner
                  ? `✓ ${t('preActiveMatch')}`
                  : `⚠ ${t(`pre_${config.preemptMode}`)} ${t('preActiveSlower')} +${Math.abs(pre.deltaMs)} ms`}
              </p>
            </div>
          </div>
        </section>

        {/* §5 PagedAttention vs vAttention */}
        <section className="pk-section" data-testid="paged-vattn-section">
          <h2 data-section-anchor="paged-vattn">{t('s5Title')}</h2>
          <p className="pk-lead">{t('s5Lead')}</p>

          <div className="pk-controls">
            <div className="pk-toggle" role="group" aria-label={t('s5Title')}>
              {VATTN_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`paged-va-${m}`}
                  aria-pressed={config.vattnMode === m}
                  onClick={() => update({ vattnMode: m })}
                >
                  {t(`va_${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="pk-grid-2">
            <div className="pk-svg-wrap">
              <VAttnCompareSvg mode={config.vattnMode} blockSize={config.blockSize} lang={lang} />
            </div>

            <div className="pk-box">
              <div>
                <span className="pk-ctrl-label">{t('vaProsLabel')}</span>
                <p style={{ marginTop: 4 }}>{t(`vaPros_${config.vattnMode}`)}</p>
              </div>
              <div>
                <span className="pk-ctrl-label">{t('vaConsLabel')}</span>
                <p style={{ marginTop: 4 }}>{t(`vaCons_${config.vattnMode}`)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* §6 KV Memory Sizing & Prefix Cache Key Safety */}
        <section className="pk-section" data-testid="paged-sizing-section">
          <h2 data-section-anchor="paged-sizing">{t('s6Title')}</h2>
          <p className="pk-lead">{t('s6Lead')}</p>

          <div className="pk-controls">
            <div className="pk-ctrl-group">
              <span className="pk-ctrl-label">{t('modelLabel')}:</span>
              <div className="pk-toggle" role="group" aria-label={t('modelLabel')}>
                {Object.values(SIZING_MODELS).map((m) => (
                  <button key={m.id} type="button" data-testid={`paged-model-${m.id}`} aria-pressed={config.modelId === m.id} onClick={() => update({ modelId: m.id })}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pk-toggle" role="group" aria-label="KV Precision">
              {['bf16', 'fp8'].map((dt) => (
                <button key={dt} type="button" aria-pressed={config.kvDtype === dt} onClick={() => update({ kvDtype: dt })}>
                  {dt.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="pk-ctrl-group">
              <span className="pk-ctrl-label">{t('ctxLabel')}:</span>
              <div className="pk-toggle" role="group" aria-label={t('ctxLabel')}>
                {[2048, 8192, 32768].map((len) => (
                  <button key={len} type="button" aria-pressed={config.ctxLen === len} onClick={() => update({ ctxLen: len })}>
                    {len / 1024}K
                  </button>
                ))}
              </div>
            </div>

            <div className="pk-ctrl-group">
              <span className="pk-ctrl-label">{t('concLabel')}:</span>
              <div className="pk-toggle" role="group" aria-label={t('concLabel')}>
                {[4, 16, 64].map((b) => (
                  <button key={b} type="button" aria-pressed={config.concurrency === b} onClick={() => update({ concurrency: b })}>
                    B={b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pk-grid-even">
            <div className="pk-box">
              <MathFormula>{sizing.spec.isMla ? KV_SIZE_MLA_TEX : KV_SIZE_GQA_TEX}</MathFormula>
              <p style={{ fontSize: 11.5, margin: '4px 0 8px' }}>
                <b>{t('mDeployLabel')}:</b> {lang === 'zh' ? sizing.spec.deployLabel : sizing.spec.deployLabelEn}
              </p>
              <div className="pk-kpis-2">
                <div className="pk-kpi">
                  <small>{t('mPerTok')} ({t('mFullTokLabel')} {sizing.fullKbPerTok} KB)</small>
                  <strong>{sizing.kbPerTok} KB/tok</strong>
                </div>
                <div className="pk-kpi">
                  <small>{t('mPerReq')}</small>
                  <strong>{sizing.kvPerReqGB} GB</strong>
                </div>
                <div className={`pk-kpi ${sizing.oomRisk ? 'warn' : 'good'}`}>
                  <small>{t('mTotalKv')} (avail {sizing.availForKvGB} GB)</small>
                  <strong>{sizing.totalKvGB} GB</strong>
                </div>
                <div className="pk-kpi">
                  <small>{t('mSafeBatch')}</small>
                  <strong>≤ {sizing.maxSafeBatch} reqs</strong>
                </div>
              </div>
            </div>

            <div className="pk-box">
              <span className="pk-ctrl-label">{t('keyTitle')}</span>
              <div className="pk-toggle" role="group" aria-label={t('keyTitle')}>
                {['same', 'tokenizer', 'template', 'lora', 'tenant'].map((k) => (
                  <button key={k} type="button" data-testid={`paged-key-${k}`} aria-pressed={config.keyChange === k} onClick={() => update({ keyChange: k })}>
                    {t(`key_${k}`)}
                  </button>
                ))}
              </div>
              <div className={`pk-key-pill ${sizing.cacheReusable ? 'pass' : 'fail'}`}>
                {t(sizing.cacheReusable ? 'keyPass' : 'keyFail')}
              </div>
              <p>{t(`keyReason_${config.keyChange}`)}</p>
            </div>
          </div>

          <div className="pk-box">
            <span className="pk-ctrl-label">{t('mgrTitle')}</span>
            <table className="pk-table">
              <thead>
                <tr>
                  <th>{t('colMgr')}</th>
                  <th>{t('colGran')}</th>
                  <th>{t('colLayout')}</th>
                  <th>{t('colShare')}</th>
                  <th>{t('colKernel')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="on">
                  <td><b>vLLM PagedAttention (APC)</b></td>
                  <td>{t('mgrRow1Gran')}</td>
                  <td><code>[num_blk, 2, S, H_kv, d_h]</code> (NHD)</td>
                  <td>{t('mgrRow1Share')}</td>
                  <td>{t('mgrRow1Kernel')}</td>
                </tr>
                <tr>
                  <td><b>SGLang RadixAttention</b></td>
                  <td>{t('mgrRow2Gran')}</td>
                  <td><code>[num_pages, H_kv, d_h]</code></td>
                  <td>{t('mgrRow2Share')}</td>
                  <td>{t('mgrRow2Kernel')}</td>
                </tr>
                <tr>
                  <td><b>FlashMLA (DeepSeek-V3)</b></td>
                  <td>{t('mgrRow3Gran')}</td>
                  <td><code>[num_blk, 64, 576]</code></td>
                  <td>{t('mgrRow3Share')}</td>
                  <td>{t('mgrRow3Kernel')}</td>
                </tr>
                <tr>
                  <td><b>vAttention (CUDA VMM)</b></td>
                  <td>{t('mgrRow4Gran')}</td>
                  <td>{t('mgrRow4Layout')}</td>
                  <td>{t('mgrRow4Share')}</td>
                  <td>{t('mgrRow4Kernel')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <details className="pk-evidence">
          <summary>{t('evidence')}</summary>
          <p>{t('evidenceBody')}</p>
        </details>
      </div>
    </div>
  );
}
