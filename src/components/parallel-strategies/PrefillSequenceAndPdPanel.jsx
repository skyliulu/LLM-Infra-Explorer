import React, { useState } from 'react';
import { ArrowRight, Network, Server } from 'lucide-react';
import { MathFormula } from '../linear-attention/MathFormula';

const copy = {
  zh: {
    title: '长序列 Prefill 并行与非对称 P/D 重排',
    lead: '超长上下文 Prefill 需沿序列维切分激活，而生产级 P/D 分离常让 Prefill 与 Decode 采用完全不同的并行拓扑，经高速互联重排 KV。',
    tabSeq: '序列并行 · SP / Ulysses / ZigZag-Ring',
    tabPd: '非对称 P/D 分离与 KV 重排',
    spMode: 'Megatron SP',
    ulyssesMode: 'Ulysses All-to-All',
    ringMode: 'ZigZag-Ring',
    ringNaive: '顺序切分 (失衡)',
    ringZigzag: 'ZigZag 对称配对',
    spDesc: '在 TP 组内把 LayerNorm / Residual 激活沿序列维切为 1/TP，仅在进入线性层前 All-Gather、退出后 Reduce-Scatter，不增加额外通信字节。',
    ulyssesDesc: '通过一次 All-to-All 把 [S/P, H] 转为 [S, H/P]，零 Ring 延迟且支持任意 FlashAttention；但并行度受限于 KV 头数（GQA 下 CP > H_kv 须复制 KV 头）。',
    ringDesc: '每卡持有 S/P 序列分片沿环接力传递 KV；因果下三角（按半块面积精确积分）下，顺序切分会让末卡因果算量达首卡 7.0×（14 vs 2 因果块），ZigZag 按 (i, 2P-1-i) 配对令每卡均摊完全相等的 8 个因果块。',
    causalUnits: '因果计算块',
    skewBadgeBad: '负载极度失衡 (7.0×)',
    skewBadgeGood: '负载均衡 (1.0×)',
    pdRag: '长输入短输出 (RAG · 16K→256)',
    pdCot: '短输入长推理 (CoT · 4K→8K)',
    prefillPool: 'Prefill 池（低 TTFT）',
    decodePool: 'Decode 池（高吞吐）',
    reshardBridge: 'RDMA / NIXL 跨池 KV 重排',
    interconnectNote: '同口径单向带宽对比：机内 NVLink 4.0（450 GB/s/卡）约为机间 400G NDR IB（50 GB/s/卡）的 9×，故高频 TP/SP 留在机内，跨池 KV 重排与受限 Wide-EP 走机间网络。',
    ratioLabel: '推荐集群 P:D 卡数配比',
    reshardDetailRag: 'RAG 场景：Prefill 侧 3 节点（24 卡 · DP3 × TP4 × CP2）生成的长上下文 KV 分片，经 RDMA 按请求归属重排并汇聚到 Decode 侧 1 节点（8 卡 · DP-Attn + MLA）单份槽位。',
    reshardDetailCot: 'CoT 场景：Prefill 侧 1 节点（8 卡 · DP2 × TP4）完成短 Prompt 计算后，将 KV 经 RDMA 分发至 Decode 侧 3 节点（24 卡 · DP-Attn + Wide-EP）承载超长生成并发。',
  },
  en: {
    title: 'Long-Context Prefill & Asymmetric P/D Resharding',
    lead: 'Long-context prefill shards activations along sequence length, while production P/D disaggregation pairs distinct prefill and decode parallelisms via cross-pool KV resharding.',
    tabSeq: 'Sequence Parallel · SP / Ulysses / ZigZag-Ring',
    tabPd: 'Asymmetric P/D & KV Resharding',
    spMode: 'Megatron SP',
    ulyssesMode: 'Ulysses All-to-All',
    ringMode: 'ZigZag-Ring',
    ringNaive: 'Contiguous (skewed)',
    ringZigzag: 'ZigZag paired',
    spDesc: 'Shards LayerNorm/Residual activations by 1/TP along sequence inside a TP group, using All-Gather before linear layers and Reduce-Scatter after with zero extra communication volume.',
    ulyssesDesc: 'Transposes [S/P, H] into [S, H/P] via one All-to-All with zero ring hops and standard FlashAttention; parallelism is capped by KV head count (CP > H_kv forces KV head duplication).',
    ringDesc: 'Ranks hold S/P sequence chunks and pass KV around a ring; integrating exact causal lower-triangle area, contiguous splits give the last rank 7.0× more compute (14 vs 2 causal tiles), whereas ZigZag (i, 2P-1-i) pairing balances every rank at 8 tiles.',
    causalUnits: 'causal tiles',
    skewBadgeBad: 'Severe skew (7.0×)',
    skewBadgeGood: 'Balanced (1.0×)',
    pdRag: 'Long-in / Short-out (RAG · 16K→256)',
    pdCot: 'Short-in / Long-out (CoT · 4K→8K)',
    prefillPool: 'Prefill Pool (TTFT-opt)',
    decodePool: 'Decode Pool (TPOT/TPS-opt)',
    reshardBridge: 'RDMA / NIXL KV Resharding',
    interconnectNote: 'Same-direction unidirectional comparison: intra-node NVLink 4.0 (450 GB/s/GPU) is 9× faster than inter-node 400G NDR IB (50 GB/s/GPU), keeping frequent TP/SP intra-node and cross-pool KV resharding / bounded Wide-EP inter-node.',
    ratioLabel: 'Recommended P:D GPU ratio',
    reshardDetailRag: 'RAG workload: KV shards produced by 3 Prefill nodes (24 GPUs · DP3 × TP4 × CP2) are repacked across RDMA into request-owned DP-Attn + MLA single-copy slots on 1 Decode node (8 GPUs).',
    reshardDetailCot: 'CoT workload: 1 Prefill node (8 GPUs · DP2 × TP4) computes short prompts and dispatches KV via RDMA to 3 Decode nodes (24 GPUs · DP-Attn + Wide-EP) for long reasoning concurrency.',
  },
};

export default function PrefillSequenceAndPdPanel({ lang = 'zh' }) {
  const t = (key) => copy[lang]?.[key] ?? copy.en[key] ?? key;
  const [tab, setTab] = useState('seq');
  const [seqAlg, setSeqAlg] = useState('ring');
  const [zigzag, setZigzag] = useState(true);
  const [workload, setWorkload] = useState('rag');

  // Exact continuous causal lower-triangle area for 8 chunks (total = 32 tiles):
  // Chunk k has area (k + 0.5) tiles -> contiguous pairs sum to [2, 6, 10, 14] (7.0x skew), ZigZag pairs sum to [8, 8, 8, 8] (1.0x).
  const ringLanes = zigzag
    ? [
        { gpu: 0, chunks: ['C0', 'C7'], work: 8 },
        { gpu: 1, chunks: ['C1', 'C6'], work: 8 },
        { gpu: 2, chunks: ['C2', 'C5'], work: 8 },
        { gpu: 3, chunks: ['C3', 'C4'], work: 8 },
      ]
    : [
        { gpu: 0, chunks: ['C0', 'C1'], work: 2 },
        { gpu: 1, chunks: ['C2', 'C3'], work: 6 },
        { gpu: 2, chunks: ['C4', 'C5'], work: 10 },
        { gpu: 3, chunks: ['C6', 'C7'], work: 14 },
      ];

  const pdPreset = workload === 'rag'
    ? { ratio: '3P : 1D', pNodes: '24 GPUs · DP3 × TP4 × CP2', dNodes: '8 GPUs · DP-Attn + MLA', detailKey: 'reshardDetailRag' }
    : { ratio: '1P : 3D', pNodes: '8 GPUs · DP2 × TP4', dNodes: '24 GPUs · DP-Attn + Wide-EP', detailKey: 'reshardDetailCot' };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm space-y-4" data-testid="parallel-modern-panel">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-[240px] flex-1">
          <h2 data-section-anchor="parallelstrategies-4" className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
            <Network size={18} className="text-indigo-500" />
            {t('title')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-4xl">{t('lead')}</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1" role="group" aria-label={t('title')}>
          <button type="button" data-testid="parallel-tab-seq" aria-pressed={tab === 'seq'} onClick={() => setTab('seq')} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tab === 'seq' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            {t('tabSeq')}
          </button>
          <button type="button" data-testid="parallel-tab-pd" aria-pressed={tab === 'pd'} onClick={() => setTab('pd')} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tab === 'pd' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            {t('tabPd')}
          </button>
        </div>
      </div>

      {tab === 'seq' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 gap-1">
              {[
                ['sp', 'spMode'],
                ['ulysses', 'ulyssesMode'],
                ['ring', 'ringMode'],
              ].map(([id, key]) => (
                <button key={id} type="button" data-testid={`seq-alg-${id}`} aria-pressed={seqAlg === id} onClick={() => setSeqAlg(id)} className={`rounded px-2.5 py-1 text-xs font-bold transition ${seqAlg === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                  {t(key)}
                </button>
              ))}
            </div>
            {seqAlg === 'ring' && (
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${zigzag ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                  {t(zigzag ? 'skewBadgeGood' : 'skewBadgeBad')}
                </span>
                <div className="flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
                  <button type="button" data-testid="ring-naive" aria-pressed={!zigzag} onClick={() => setZigzag(false)} className={`rounded px-2 py-0.5 text-[10.5px] font-bold ${!zigzag ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>{t('ringNaive')}</button>
                  <button type="button" data-testid="ring-zigzag" aria-pressed={zigzag} onClick={() => setZigzag(true)} className={`rounded px-2 py-0.5 text-[10.5px] font-bold ${zigzag ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>{t('ringZigzag')}</button>
                </div>
              </div>
            )}
          </div>

          {seqAlg === 'ring' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {ringLanes.map((lane) => (
                <div key={lane.gpu} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>GPU {lane.gpu}</span>
                    <span className="font-mono text-[11px] text-indigo-700">{lane.chunks.join(' + ')}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${lane.work > 10 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(lane.work / 14) * 100}%` }} />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600">{lane.work} {t('causalUnits')}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((gpu) => (
                <div key={gpu} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                  <div className="text-xs font-bold text-slate-700">GPU {gpu}</div>
                  {seqAlg === 'sp' ? (
                    <>
                      <div className="rounded bg-indigo-100 px-2 py-1 text-[10.5px] font-semibold text-indigo-800">Norm/Resid: S/4</div>
                      <div className="rounded bg-amber-100 px-2 py-1 text-[10.5px] font-semibold text-amber-900">AG → TP Col/Row → RS</div>
                    </>
                  ) : (
                    <>
                      <div className="rounded bg-sky-100 px-2 py-1 text-[10.5px] font-semibold text-sky-900">In: [S/4, H_q]</div>
                      <div className="rounded bg-purple-100 px-2 py-1 text-[10.5px] font-semibold text-purple-900">A2A → [S, H_q/4]</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 border-t border-slate-100 pt-2">
            <p className="max-w-3xl leading-relaxed">{t(seqAlg === 'sp' ? 'spDesc' : seqAlg === 'ulysses' ? 'ulyssesDesc' : 'ringDesc')}</p>
            <MathFormula>{seqAlg === 'sp' ? String.raw`M_{\mathrm{act}}\propto \frac{S}{\mathrm{TP}}` : seqAlg === 'ulysses' ? String.raw`\mathrm{CP}\le H_{\mathrm{KV}}` : String.raw`\mathrm{Pair}(i,2P-1-i)`}</MathFormula>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 gap-1">
              <button type="button" data-testid="pd-rag" aria-pressed={workload === 'rag'} onClick={() => setWorkload('rag')} className={`rounded px-2.5 py-1 text-xs font-bold ${workload === 'rag' ? 'bg-cyan-600 text-white' : 'text-slate-600'}`}>{t('pdRag')}</button>
              <button type="button" data-testid="pd-cot" aria-pressed={workload === 'cot'} onClick={() => setWorkload('cot')} className={`rounded px-2.5 py-1 text-xs font-bold ${workload === 'cot' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}>{t('pdCot')}</button>
            </div>
            <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800">
              {t('ratioLabel')}: {pdPreset.ratio}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="rounded-xl border-2 border-cyan-200 bg-cyan-50/50 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-900"><Server size={14} /> {t('prefillPool')}</div>
              <div className="font-mono text-xs font-bold text-cyan-800">{pdPreset.pNodes}</div>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-center">
              <span className="text-[10.5px] font-bold text-amber-900 flex items-center gap-1">{t('reshardBridge')} <ArrowRight size={13} /></span>
              <span className="text-[10px] font-mono text-amber-700">IB / RoCE · 50 GB/s</span>
            </div>
            <div className="rounded-xl border-2 border-purple-200 bg-purple-50/50 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900"><Server size={14} /> {t('decodePool')}</div>
              <div className="font-mono text-xs font-bold text-purple-800">{pdPreset.dNodes}</div>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-2 leading-relaxed">
            <p>{t(pdPreset.detailKey)}</p>
            <p className="text-[11px] text-slate-500">{t('interconnectNote')}</p>
          </div>
        </div>
      )}
    </section>
  );
}
