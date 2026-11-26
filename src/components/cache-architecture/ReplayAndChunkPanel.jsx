import React, { useState } from 'react';
import { MathFormula } from '../linear-attention/MathFormula';

const copy = {
  zh: {
    coneTitle: '20 层局部滑动窗口 (SWA) 感受野锥体 · 精确 vs 有界重放',
    modeExact: '精确重放 (锥体面积)',
    modeBounded: '有界重放 (128 宽)',
    coneExactNote: '20 层解码器每层依赖下层 128 个局部窗口位置：L21 底边跨度达 {exactSpan} Token，20 层累加总重算量为 {exactWork} 层·Token。',
    coneBoundedNote: 'CED 仅对最后 {boundedSpan} 个 Token 做有界重放（总计 {boundedWork} 层·Token）并配合全局 CSA2 压缩记录，将 20 层总重算算力压低 {computeRatio}×（底边跨度缩小 {spanRatio}×）。',
    svgExact: '精确锥体：底边 {exactSpan} tok · 20 层合计 {exactWork} ({computeRatio}×)',
    svgBounded: '有界条带：{boundedSpan} tok · 20 层合计 {boundedWork} (1×)',
    chunkTitle: '多块 Chunked Prefill 与 2:1 奇偶边界',
    chunkMid: '非末块 (Chunk 1/3)',
    chunkLast: '末块 (Chunk 3/3)',
    chunkOdd: '奇数命中 / MTP 回滚',
    encHalf: 'Encoder L1–L20',
    decHalf: 'Decoder L21–L40',
    encChunk: '整块运行 → 生成 2:1 CSA2 全局缓存',
    encOdd: '前缀 + MTP 草稿校验',
    decSkipped: '仅 L21 做全局 KV/Index 投影；跳过局部解码体',
    decTail: 'L21 全局投影 + 仅尾 128 tok 走局部解码',
    decRollback: '仅丢弃未满对暂存 · 全局已发布记录不变',
    midNote: '长提示词分块时，非末块跑完 Encoder 生成全局压缩 KV，并在 L21 完成该块的全局 KV 与 Index-K 投影，但跳过 L21–L40 局部 SWA 与后续解码主干，仅将未满对奇数尾暂存传给下一块。',
    lastNote: '最后一个 Chunk 除完成全局投影外，还将尾部 128 Token 送入 Decoder L21–L40 建立局部窗口并采样首个输出词。',
    oddNote: '2:1 压缩要求偶数对就绪才发布；若前缀落在奇数位或 MTP 草稿中段被拒，只回退半对暂存，绝不污染共享全局池。',
    pairPublished: '已发布 2:1 记录',
    pairPending: '未满对暂存',
    pairRolled: '已回滚草稿',
  },
  en: {
    coneTitle: '20-Layer Sliding-Window (SWA) Receptive Cone · Exact vs Bounded Replay',
    modeExact: 'Exact (cone area)',
    modeBounded: 'Bounded (128 width)',
    coneExactNote: 'Each of the 20 decoder layers attends to 128 local window positions below it: base span reaches {exactSpan} tokens, totaling {exactWork} layer-tokens across 20 layers.',
    coneBoundedNote: 'CED replays only the last {boundedSpan} tokens ({boundedWork} layer-tokens total) alongside global CSA2 records, cutting 20-layer recovery compute by {computeRatio}× ({spanRatio}× narrower base span).',
    svgExact: 'Exact cone: {exactSpan} base · {exactWork} layer-tok ({computeRatio}×)',
    svgBounded: 'Bounded strip: {boundedSpan} tok · {boundedWork} layer-tok (1×)',
    chunkTitle: 'Multi-Chunk Prefill & 2:1 Odd/Even Parity',
    chunkMid: 'Mid Chunk (1/3)',
    chunkLast: 'Final Chunk (3/3)',
    chunkOdd: 'Odd Hit / MTP Rollback',
    encHalf: 'Encoder L1–L20',
    decHalf: 'Decoder L21–L40',
    encChunk: '100% Chunk → 2:1 CSA2 global cache',
    encOdd: 'Prefix + MTP draft verify',
    decSkipped: 'L21 projects global KV/Index; skips local decoder body',
    decTail: 'L21 global proj + last 128 tok local decode',
    decRollback: 'Drop half-pair buffer · global records intact',
    midNote: 'Non-final prompt chunks finish Encoder global KV and still run L21 global KV + Index-K projection for the chunk, while skipping the L21–L40 local SWA decoder body and carrying any unpaired odd tail forward.',
    lastNote: 'The final chunk runs global projection and feeds its last 128 tokens through Decoder L21–L40 to populate local SWA windows and emit the first token.',
    oddNote: '2:1 compression publishes only complete even pairs; odd prefix hits or rejected MTP drafts discard only the half-pair scratch slot without touching shared global records.',
    pairPublished: 'Published 2:1 record',
    pairPending: 'Unpaired buffer',
    pairRolled: 'Rolled back draft',
  },
};

export default function ReplayAndChunkPanel({ tokens = 4096, lang = 'zh' }) {
  const t = (key, vars = {}) => {
    let s = copy[lang]?.[key] ?? copy.en[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => { s = s.split(`{${k}}`).join(v); });
    return s;
  };
  const [replayMode, setReplayMode] = useState('bounded');
  const [chunkMode, setChunkMode] = useState('mid');

  const exactSpan = Math.min(tokens, 2560);
  const boundedSpan = Math.min(tokens, 128);
  let exactWork = 0;
  for (let l = 1; l <= 20; l += 1) exactWork += Math.min(tokens, l * 128);
  const boundedWork = 20 * boundedSpan;
  const computeRatio = Number((exactWork / Math.max(1, boundedWork)).toFixed(1));
  const spanRatio = Number((exactSpan / Math.max(1, boundedSpan)).toFixed(1));
  const vars = {
    exactSpan: exactSpan.toLocaleString('en-US'),
    boundedSpan: boundedSpan.toLocaleString('en-US'),
    exactWork: exactWork.toLocaleString('en-US'),
    boundedWork: boundedWork.toLocaleString('en-US'),
    computeRatio,
    spanRatio,
  };

  return (
    <div className="cs-deep-grid" data-testid="ced-replay-chunk-panel">
      {/* Left: 20-layer SWA receptive cone */}
      <div className="cs-deep-card">
        <div className="cs-deep-head">
          <h3>{t('coneTitle')}</h3>
          <div className="cs-mini-toggle" role="group" aria-label={t('coneTitle')}>
            <button type="button" data-testid="ced-cone-exact" aria-pressed={replayMode === 'exact'} onClick={() => setReplayMode('exact')}>{t('modeExact')}</button>
            <button type="button" data-testid="ced-cone-bounded" aria-pressed={replayMode === 'bounded'} onClick={() => setReplayMode('bounded')}>{t('modeBounded')}</button>
          </div>
        </div>

        <svg viewBox="0 0 320 108" className="cs-cone-svg" role="img" aria-label={t('coneTitle')}>
          {/* 20-layer receptive cone: top L40 (width 128), bottom L21 (width 2560) */}
          <polygon
            points="272,14 294,14 294,86 44,86"
            className={`cs-cone-exact ${replayMode === 'exact' ? 'on' : ''}`}
          />
          {/* Bounded 128-token replay strip */}
          <rect
            x="272"
            y="14"
            width="22"
            height="72"
            rx="2"
            className={`cs-cone-bounded ${replayMode === 'bounded' ? 'on' : ''}`}
          />
          <text x="10" y="22" className="cs-cone-lbl">L40</text>
          <text x="10" y="84" className="cs-cone-lbl">L21</text>
          <text x="160" y="99" textAnchor="middle" className="cs-cone-lbl">
            {t(replayMode === 'exact' ? 'svgExact' : 'svgBounded', vars)}
          </text>
          <line x1="44" y1="88" x2="294" y2="88" stroke="#94a3b8" strokeWidth="1" />
        </svg>

        <div className="cs-deep-foot">
          <MathFormula>{String.raw`\sum_{l=1}^{20}\min(T,128l)=${exactWork}\;\text{vs}\;20\times${boundedSpan}=${boundedWork}\;(${computeRatio}\times)`}</MathFormula>
          <p>{t(replayMode === 'exact' ? 'coneExactNote' : 'coneBoundedNote', vars)}</p>
        </div>
      </div>

      {/* Right: Multi-chunk Prefill & 2:1 parity boundary */}
      <div className="cs-deep-card">
        <div className="cs-deep-head">
          <h3>{t('chunkTitle')}</h3>
          <div className="cs-mini-toggle" role="group" aria-label={t('chunkTitle')}>
            {[['mid', 'chunkMid'], ['last', 'chunkLast'], ['odd', 'chunkOdd']].map(([id, key]) => (
              <button key={id} type="button" data-testid={`ced-chunk-${id}`} aria-pressed={chunkMode === id} onClick={() => setChunkMode(id)}>{t(key)}</button>
            ))}
          </div>
        </div>

        <div className="cs-chunk-bars">
          <div className="cs-chunk-stage active">
            <strong>{t('encHalf')}</strong>
            <span>{t(chunkMode === 'odd' ? 'encOdd' : 'encChunk')}</span>
          </div>
          <div className={`cs-chunk-stage ${chunkMode === 'mid' ? 'skipped' : chunkMode === 'odd' ? 'warn' : 'active'}`}>
            <strong>{t('decHalf')}</strong>
            <span>{t(chunkMode === 'mid' ? 'decSkipped' : chunkMode === 'last' ? 'decTail' : 'decRollback')}</span>
          </div>
        </div>

        <div className="cs-parity-strip">
          <span className="pub">[T1, T2] → C1 · {t('pairPublished')}</span>
          <span className="pub">[T3, T4] → C2 · {t('pairPublished')}</span>
          {chunkMode === 'mid' && <span className="pend">[T5, _] · {t('pairPending')}</span>}
          {chunkMode === 'last' && <span className="pub">[T5, T6] → C3 · {t('pairPublished')}</span>}
          {chunkMode === 'odd' && <span className="roll">[T5, d1✗] · {t('pairRolled')}</span>}
        </div>

        <p className="cs-deep-note">{t(chunkMode === 'mid' ? 'midNote' : chunkMode === 'last' ? 'lastNote' : 'oddNote')}</p>
      </div>
    </div>
  );
}
