import React from 'react';

export default function VAttnCompareSvg({ mode = 'pagedattention', blockSize = 16, lang = 'zh' }) {
  const isVattn = mode === 'vattention';
  const isZh = lang === 'zh';

  return (
    <svg
      className="pk-svg"
      viewBox="0 0 540 166"
      role="img"
      aria-label={isZh ? 'PagedAttention 与 vAttention 显存架构对比' : 'PagedAttention vs vAttention Memory Architecture'}
    >
      <rect className="pk-svg-bg" x="6" y="6" width="528" height="154" rx="8" />
      <text className="pk-svg-hdr" x="18" y="24">
        {isVattn
          ? (isZh ? 'vAttention：虚拟地址连续 + CUDA VMM 按需物理页映射' : 'vAttention: Contiguous Virtual Address Space + CUDA VMM On-Demand Mapping')
          : (isZh ? 'PagedAttention：Attention Kernel 内显式 Block Table 间接寻址' : 'PagedAttention: Software Block Table Indirection Inside Paged Kernel')}
      </text>

      {isVattn ? (
        <>
          <g className="pk-svg-node emerald">
            <rect x="20" y="38" width="152" height="50" rx="6" />
            <text className="pk-svg-t" x="96" y="59" textAnchor="middle">{isZh ? '标准 FlashAttn' : 'Unmodified FlashAttn'}</text>
            <text className="pk-svg-s" x="96" y="75" textAnchor="middle">{isZh ? '看到连续 KV 张量' : 'Sees Contiguous KV'}</text>
          </g>
          <line className="pk-svg-edge hi" x1="172" y1="63" x2="198" y2="63" />
          <g className="pk-svg-node blue">
            <rect x="198" y="38" width="144" height="50" rx="6" />
            <text className="pk-svg-t" x="270" y="59" textAnchor="middle">{isZh ? 'CUDA VMM 驱动层' : 'CUDA VMM Layer'}</text>
            <text className="pk-svg-s" x="270" y="75" textAnchor="middle">cuMemMap (64KB–2MB)</text>
          </g>
          <line className="pk-svg-edge hi" x1="342" y1="63" x2="368" y2="63" />
          <g className="pk-svg-node indigo">
            <rect x="368" y="38" width="152" height="50" rx="6" />
            <text className="pk-svg-t" x="444" y="59" textAnchor="middle">{isZh ? '物理 HBM 页' : 'Physical HBM Pages'}</text>
            <text className="pk-svg-s" x="444" y="75" textAnchor="middle">{isZh ? '随序列增长按需映射' : 'Lazy Mapped on Growth'}</text>
          </g>
          <rect className="pk-svg-shell" x="20" y="102" width="500" height="44" rx="6" />
          <text className="pk-svg-t" x="270" y="121" textAnchor="middle">
            {isZh ? '连续虚拟地址区间: [0x7F00_0000 .. 0x7F00_FFFF] (Contiguous VA)' : 'Virtual Address Range: [0x7F00_0000 .. 0x7F00_FFFF] (Contiguous VA)'}
          </text>
          <text className="pk-svg-s" x="270" y="136" textAnchor="middle">
            {isZh ? 'GPU 硬件 MMU 透明完成 VA→PA 转换，但页粒度比 16-tok 块更粗' : 'GPU MMU translates VA → PA transparently; coarser granularity than 16-tok blocks'}
          </text>
        </>
      ) : (
        <>
          <g className="pk-svg-node indigo">
            <rect x="20" y="38" width="152" height="50" rx="6" />
            <text className="pk-svg-t" x="96" y="59" textAnchor="middle">{isZh ? 'PagedAttn 核函数' : 'PagedAttention Kernel'}</text>
            <text className="pk-svg-s" x="96" y="75" textAnchor="middle">{isZh ? '查块表 B_r[i] 间接取址' : 'Reads Block Table B_r[i]'}</text>
          </g>
          <line className="pk-svg-edge" x1="172" y1="63" x2="198" y2="63" />
          <g className="pk-svg-node amber">
            <rect x="198" y="38" width="144" height="50" rx="6" />
            <text className="pk-svg-t" x="270" y="59" textAnchor="middle">{isZh ? '块表索引映射' : 'Block Table Lookup'}</text>
            <text className="pk-svg-s" x="270" y="75" textAnchor="middle">{isZh ? `S=${blockSize} Token 细粒度块` : `${blockSize}-Token Fine Blocks`}</text>
          </g>
          <line className="pk-svg-edge" x1="342" y1="63" x2="368" y2="63" />
          <g className="pk-svg-node emerald">
            <rect x="368" y="38" width="152" height="50" rx="6" />
            <text className="pk-svg-t" x="444" y="59" textAnchor="middle">{isZh ? '非连续 HBM 块池' : 'Scattered HBM Pool'}</text>
            <text className="pk-svg-s" x="444" y="75" textAnchor="middle">{isZh ? '原生支持 CoW 与前缀共享' : 'Native CoW & Radix Share'}</text>
          </g>
          <rect className="pk-svg-shell" x="20" y="102" width="500" height="44" rx="6" />
          <text className="pk-svg-t" x="270" y="121" textAnchor="middle">
            {`KV Pool (NHD): [num_blocks, 2, S=${blockSize}, H_kv, d_h]`}
          </text>
          <text className="pk-svg-s" x="270" y="136" textAnchor="middle">
            {isZh ? '不依赖驱动 VMM 页大小且支持块级零拷贝共享，代价是 Kernel 需适配间接寻址' : 'Zero driver VMM dependency & fine-grained sharing, at the cost of kernel indirection'}
          </text>
        </>
      )}
    </svg>
  );
}
