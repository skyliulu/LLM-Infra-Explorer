import React, { useState } from 'react';
import { MathFormula } from '../linear-attention/MathFormula';

const copy = {
  zh: {
    coneTitle: '20 层 SWA 感受野锥体 · 精确 vs 有界重放',
    modeExact: '精确重放 (20×128)',
    modeBounded: '有界重放 (128)',
    coneExactNote: '20 层解码器每层依赖下层 128 个局部窗口位置，严格还原尾部隐藏状态需要倒推最多 2560 Token。',
    coneBoundedNote: 'CED 仅对最后 128 个 Token 做有界重放并配合全局 CSA2 压缩记录，把恢复算力压低 20×。',
    chunkTitle: '多块 Chunked Prefill 与 2:1 奇偶边界',
    chunkMid: '非末块 (Chunk 1/3)',
    chunkLast: '末块 (Chunk 3/3)',
    chunkOdd: '奇数命中 / MTP 回滚',
    encHalf: 'Encoder L1–L20',
    decHalf: 'Decoder L21–L40',
    decSkipped: '整段跳过 · 0 行执行',
    decTail: '仅尾 128 tok 进入',
    decRollback: '仅丢弃未满对暂存 · 全局已发布记录不变',
    midNote: '长提示词分块时，非末块跑完 Encoder 生成全局压缩 KV 后直接跳过 Decoder，只把奇数尾部暂存传给下一块。',
    lastNote: '仅最后一个 Chunk 的尾部 128 Token 进入 Decoder L21–L40 建立局部窗口并采样首个输出词。',
    oddNote: '2:1 压缩要求偶数对就绪才发布；若前缀落在奇数位或 MTP 草稿中段被拒，只回退半对暂存，绝不污染共享全局池。',
    pairPublished: '已发布 2:1 记录',
    pairPending: '未满对暂存',
    pairRolled: '已回滚草稿',
  },
  en: {
    coneTitle: '20-Layer SWA Receptive Cone · Exact vs Bounded Replay',
    modeExact: 'Exact (20×128)',
    modeBounded: 'Bounded (128)',
    coneExactNote: 'Each of the 20 decoder layers attends to 128 local window positions below it, so exact reconstruction spans up to 2,560 tokens.',
    coneBoundedNote: 'CED replays only the last 128 tokens alongside global CSA2 records, cutting recovery compute by 20×.',
    chunkTitle: 'Multi-Chunk Prefill & 2:1 Odd/Even Parity',
    chunkMid: 'Mid Chunk (1/3)',
    chunkLast: 'Final Chunk (3/3)',
    chunkOdd: 'Odd Hit / MTP Rollback',
    encHalf: 'Encoder L1–L20',
    decHalf: 'Decoder L21–L40',
    decSkipped: 'Skipped entirely · 0 rows',
    decTail: 'Last 128 tokens only',
    decRollback: 'Drop half-pair buffer · global records intact',
    midNote: 'Non-final prompt chunks finish Encoder global KV and skip Decoder L21–L40 completely, carrying only any unpaired odd tail token forward.',
    lastNote: 'Only the final chunk feeds its last 128 tokens through Decoder L21–L40 to populate local windows and emit the first token.',
    oddNote: '2:1 compression publishes only complete even pairs; odd prefix hits or rejected MTP drafts discard only the half-pair scratch slot without touching shared global records.',
    pairPublished: 'Published 2:1 record',
    pairPending: 'Unpaired buffer',
    pairRolled: 'Rolled back draft',
  },
};

export default function ReplayAndChunkPanel({ tokens = 4096, lang = 'zh' }) {
  const t = (key) => copy[lang]?.[key] ?? copy.en[key] ?? key;
  const [replayMode, setReplayMode] = useState('bounded');
  const [chunkMode, setChunkMode] = useState('mid');

  const exactSpan = Math.min(tokens, 2560);
  const boundedSpan = Math.min(tokens, 128);
  const ratio = Math.max(1, Math.round(exactSpan / Math.max(1, boundedSpan)));

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
            {replayMode === 'exact' ? `Exact: ${exactSpan} tok (${ratio}×)` : `Bounded: ${boundedSpan} tok (1× vs ${exactSpan})`}
          </text>
          <line x1="44" y1="88" x2="294" y2="88" stroke="#94a3b8" strokeWidth="1" />
        </svg>

        <div className="cs-deep-foot">
          <MathFormula>{String.raw`R_{\mathrm{exact}}=\min(T,\,20\times128)=${exactSpan},\quad R_{\mathrm{bounded}}=${boundedSpan}`}</MathFormula>
          <p>{t(replayMode === 'exact' ? 'coneExactNote' : 'coneBoundedNote')}</p>
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
            <span>{chunkMode === 'odd' ? 'Prefix + Draft' : '100% Chunk → 2:1 CSA2'}</span>
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
