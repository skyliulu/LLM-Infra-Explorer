import React from 'react';

export function VlmParadigmSvg({ paradigm = 'early_fusion', lang = 'zh' }) {
  const isEarly = paradigm === 'early_fusion';
  const isZh = lang === 'zh';
  return (
    <svg
      className="vl-svg"
      viewBox="0 0 600 128"
      role="img"
      aria-label={isZh ? 'VLM 早期融合与交叉注意力范式对比' : 'Early-Fusion Decoder-Only VLM vs Cross-Attention VLM'}
    >
      <rect className="vl-svg-bg" x="4" y="4" width="592" height="120" rx="8" />
      <text className="vl-svg-hdr" x="14" y="21">
        {isEarly
          ? (isZh ? '早期融合 Decoder-Only (Qwen2.5-VL / InternVL)：视觉 Token 直接并入 LLM 共享 KV' : 'Decoder-Only Early Fusion (Qwen2.5-VL / InternVL): Visual Tokens Join Shared LLM KV')
          : (isZh ? '交叉注意力 Late Fusion (Llama-3.2-Vision)：视觉特征留在独立 Cross-Attn KV 中' : 'Cross-Attention Late Fusion (Llama-3.2-Vision): Visual Features Stay in Cross-Attn KV')}
      </text>

      {isEarly ? (
        <g>
          <g className="vl-svg-node indigo">
            <rect x="14" y="34" width="120" height="54" rx="6" />
            <text className="vl-svg-t" x="74" y="56" textAnchor="middle">{isZh ? 'ViT + 投影器' : 'ViT + Projector'}</text>
            <text className="vl-svg-s" x="74" y="72" textAnchor="middle">{isZh ? 'N_vis 视觉向量' : 'N_vis Embeddings'}</text>
          </g>
          <line className="vl-svg-edge hi" x1="134" y1="61" x2="162" y2="61" />
          <g className="vl-svg-node blue">
            <rect x="164" y="34" width="214" height="54" rx="6" />
            <text className="vl-svg-t" x="271" y="54" textAnchor="middle">{isZh ? 'LLM 交错输入序列' : 'Interleaved Sequence in LLM'}</text>
            <text className="vl-svg-s" x="271" y="72" textAnchor="middle">{isZh ? '[Sys] [Vis_0..k] [提问] → 贯通全部 L 层' : '[Sys] [Vis_0..k] [Text Q] → All L Layers'}</text>
          </g>
          <line className="vl-svg-edge hi" x1="378" y1="61" x2="404" y2="61" />
          <g className="vl-svg-node emerald">
            <rect x="406" y="34" width="180" height="54" rx="6" />
            <text className="vl-svg-t" x="496" y="54" textAnchor="middle">{isZh ? '共享分页 KV Cache' : 'Shared Paged KV Cache'}</text>
            <text className="vl-svg-s" x="496" y="72" textAnchor="middle">{isZh ? '密集 OCR 最强 · 占 O(N_vis)' : 'Top OCR · Grows O(N_vis)'}</text>
          </g>
          <text className="vl-svg-s" x="14" y="109">
            {isZh
              ? '优点：多图交错与密集 OCR 效果最好，无额外交叉注意力权重。代价：视觉 Token 占用全 80 层 LLM KV。'
              : 'Pros: Best dense OCR & multi-image interleaving, zero extra cross-attn weights. Cost: Visual tokens consume LLM KV across all layers.'}
          </text>
        </g>
      ) : (
        <g>
          <g className="vl-svg-node indigo">
            <rect x="14" y="34" width="136" height="54" rx="6" />
            <text className="vl-svg-t" x="82" y="54" textAnchor="middle">{isZh ? 'ViT 编码器' : 'ViT Encoder'}</text>
            <text className="vl-svg-s" x="82" y="72" textAnchor="middle">{isZh ? '独立 Cross-Attn KV' : 'Fixed Cross-Attn KV'}</text>
          </g>
          <line className="vl-svg-edge" x1="150" y1="61" x2="180" y2="61" />
          <g className="vl-svg-node amber">
            <rect x="182" y="34" width="206" height="54" rx="6" />
            <text className="vl-svg-t" x="285" y="54" textAnchor="middle">{isZh ? '门控交叉注意力层（每 4 层插 1 层）' : 'Gated Cross-Attn Layers (Every 4th)'}</text>
            <text className="vl-svg-s" x="285" y="72" textAnchor="middle">{isZh ? '文本 Q 仅在此访问视觉 K/V' : 'Text Q attends to Visual K/V only here'}</text>
          </g>
          <line className="vl-svg-edge" x1="388" y1="61" x2="414" y2="61" />
          <g className="vl-svg-node blue">
            <rect x="416" y="34" width="170" height="54" rx="6" />
            <text className="vl-svg-t" x="501" y="54" textAnchor="middle">{isZh ? '纯文本自注意力 KV' : 'Text-Only Self-Attn KV'}</text>
            <text className="vl-svg-s" x="501" y="72" textAnchor="middle">{isZh ? '零视觉序列膨胀' : '0 Visual Seq Growth!'}</text>
          </g>
          <text className="vl-svg-s" x="14" y="109">
            {isZh
              ? '优点：保持纯文本 LLM 权重不变且不拉长自注意力序列。代价：新增大量交叉注意力参数，多图/视频交错灵活性较弱。'
              : 'Pros: Preserves pure-text LLM weights & skips visual self-attn growth. Cost: Extra cross-attn params, harder multi-image/video interleaving.'}
          </text>
        </g>
      )}
    </svg>
  );
}

export function VlmTilingSvg({ tiling, res, tiles, cols = 1, merge4x, rawPatches, llmTokens, lang = 'zh' }) {
  const isZh = lang === 'zh';
  return (
    <svg
      className="vl-svg"
      viewBox="0 0 430 144"
      role="img"
      aria-label={isZh ? '动态图像切片与 Patch 打包示意图' : 'Dynamic Image Tiling & Patch Packing'}
    >
      <rect className="vl-svg-bg" x="4" y="4" width="422" height="136" rx="8" />

      {tiling === 'fixed_resize' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">
            {isZh ? '固定缩放：高分辨率画面被强行压扁为 336×336' : 'Fixed Resize: High-Res Aspect Squashed to 336×336'}
          </text>
          <rect x="16" y="34" width="128" height="72" rx="6" className="vl-svg-inner" />
          <text className="vl-svg-t" x="80" y="64" textAnchor="middle">{res.w}×{res.h}</text>
          <text className="vl-svg-s" x="80" y="80" textAnchor="middle">{isZh ? '密集图表 / 小字文档' : 'Dense OCR / Small Text'}</text>
          <line className="vl-svg-edge" x1="150" y1="70" x2="188" y2="70" />
          <text className="vl-svg-s" x="169" y="62" textAnchor="middle">{isZh ? '压扁' : 'Warp'}</text>
          <g className="vl-svg-node amber">
            <rect x="194" y="42" width="56" height="56" rx="5" />
            <text className="vl-svg-t" x="222" y="68" textAnchor="middle">336²</text>
            <text className="vl-svg-s" x="222" y="82" textAnchor="middle">576 p</text>
          </g>
          <line className="vl-svg-edge" x1="254" y1="70" x2="282" y2="70" />
          <g className="vl-svg-node indigo">
            <rect x="286" y="42" width="128" height="56" rx="6" />
            <text className="vl-svg-t" x="350" y="65" textAnchor="middle">{llmTokens} LLM Tokens</text>
            <text className="vl-svg-s" x="350" y="82" textAnchor="middle">
              {merge4x ? (isZh ? '2×2 合并 (4:1)' : '2×2 Merged (4:1)') : (isZh ? '未合并 (1:1)' : 'Unmerged (1:1)')}
            </text>
          </g>
          <text className="vl-svg-s" x="16" y="126">
            {isZh ? '计算最省且 KV 恒定，但大幅下采样会令表格数字与小字彻底模糊。' : 'Fast & constant KV, but fine text/charts vanish under aggressive downsampling.'}
          </text>
        </g>
      )}

      {tiling === 'anyres_tiles' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">
            {isZh ? `AnyRes：336² 网格切片 (${tiles - 1} 块) + 1 全局缩略图` : `AnyRes: 336² Crop Grid (${tiles - 1} Tiles) + 1 Global Thumbnail`}
          </text>
          <g className="vl-svg-node emerald">
            <rect x="16" y="34" width="68" height="68" rx="6" />
            <text className="vl-svg-t" x="50" y="64" textAnchor="middle">{isZh ? '全局图' : 'Global'}</text>
            <text className="vl-svg-s" x="50" y="79" textAnchor="middle">336×336</text>
          </g>
          <text className="vl-svg-hdr" x="96" y="72" textAnchor="middle">+</text>
          <rect x="108" y="34" width="166" height="78" rx="6" className="vl-svg-inner" />
          {Array.from({ length: Math.min(12, Math.max(1, tiles - 1)) }, (_, idx) => {
            const safeCols = Math.max(1, cols);
            const r = Math.floor(idx / safeCols);
            const c = idx % safeCols;
            const cw = Math.floor((154 - (safeCols - 1) * 4) / safeCols);
            const ch = 20;
            return (
              <g key={idx} className="vl-svg-node indigo">
                <rect x={114 + c * (cw + 4)} y={40 + r * (ch + 4)} width={cw} height={ch} rx="3" />
                <text className="vl-svg-s" x={114 + c * (cw + 4) + cw / 2} y={53 + r * (ch + 4)} textAnchor="middle">T{idx + 1}</text>
              </g>
            );
          })}
          <line className="vl-svg-edge hi" x1="278" y1="70" x2="298" y2="70" />
          <g className="vl-svg-node blue">
            <rect x="302" y="38" width="114" height="68" rx="6" />
            <text className="vl-svg-t" x="359" y="60" textAnchor="middle">{tiles} × 576 p</text>
            <text className="vl-svg-s" x="359" y="75" textAnchor="middle">{rawPatches.toLocaleString()} raw</text>
            <text className="vl-svg-t" x="359" y="92" textAnchor="middle">→ {llmTokens.toLocaleString()} tok</text>
          </g>
          <text className="vl-svg-s" x="16" y="128">
            {isZh ? '局部高清块保住 OCR 细节，但网格边缘会产生额外填充与跨块重复。' : 'Preserves crisp OCR across tiles, but duplicates border context + pads partial edges.'}
          </text>
        </g>
      )}

      {tiling === 'navit_native' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">
            {isZh ? 'NaViT 原生变长打包：真实 2D 网格 → 1D 变长序列' : 'NaViT Native Packing: Variable 2D Grid → 1D Packed Sequence'}
          </text>
          <rect x="16" y="34" width="132" height="74" rx="6" className="vl-svg-inner" />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4, 5].map((c) => {
              const isMergeGroup = r < 2 && c < 2;
              return (
                <g key={`${r}-${c}`} className={`vl-svg-node ${isMergeGroup && merge4x ? 'emerald' : 'indigo'}`}>
                  <rect x={22 + c * 20} y={40 + r * 16} width="17" height="13" rx="2" />
                </g>
              );
            })
          )}
          <text className="vl-svg-s" x="82" y="122" textAnchor="middle">
            {merge4x ? (isZh ? '2×2 邻块合并 (4→1)' : '2×2 Patches Merged (4→1)') : (isZh ? '原生 14×14 Patch' : 'Native 14×14 Patches')}
          </text>
          <line className="vl-svg-edge hi" x1="152" y1="71" x2="180" y2="71" />
          <g className="vl-svg-node blue">
            <rect x="184" y="38" width="230" height="66" rx="6" />
            <text className="vl-svg-t" x="299" y="58" textAnchor="middle">FlashAttention varlen (cu_seqlens)</text>
            <rect x="194" y="66" width="136" height="24" rx="4" className="vl-svg-inner" />
            <text className="vl-svg-s" x="262" y="81" textAnchor="middle">{isZh ? `图 1 (${llmTokens.toLocaleString()} tok)` : `Img 1 (${llmTokens.toLocaleString()} tok)`}</text>
            <rect x="336" y="66" width="68" height="24" rx="4" className="vl-svg-inner" />
            <text className="vl-svg-s" x="370" y="81" textAnchor="middle">{isZh ? '图 2 …' : 'Img 2 …'}</text>
          </g>
          <text className="vl-svg-s" x="299" y="122" textAnchor="middle">
            {isZh ? '零宽高比畸变 · 零切块填充浪费（上限 3.6M 像素）' : 'Zero resize distortion · Zero tile padding waste (3.6M px cap)'}
          </text>
        </g>
      )}
    </svg>
  );
}

export function VlmProjectorSvg({ projector, lang = 'zh' }) {
  const isZh = lang === 'zh';
  return (
    <svg
      className="vl-svg"
      viewBox="0 0 420 132"
      role="img"
      aria-label={isZh ? '多模态投影器张量压缩示意图' : 'Multimodal Projector Tensor Transformation'}
    >
      <rect className="vl-svg-bg" x="4" y="4" width="412" height="124" rx="8" />

      {projector === 'mlp_1x' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">{isZh ? 'MLP 直连 (1:1)：无空间 Token 压缩' : 'Direct MLP (1:1): No Spatial Reduction'}</text>
          <g className="vl-svg-node indigo">
            <rect x="16" y="36" width="112" height="60" rx="6" />
            <text className="vl-svg-t" x="72" y="60" textAnchor="middle">{isZh ? 'ViT 输出块' : 'ViT Patches'}</text>
            <text className="vl-svg-s" x="72" y="77" textAnchor="middle">[2304, D_vit]</text>
          </g>
          <line className="vl-svg-edge" x1="128" y1="66" x2="160" y2="66" />
          <g className="vl-svg-node blue">
            <rect x="162" y="44" width="90" height="44" rx="6" />
            <text className="vl-svg-t" x="207" y="63" textAnchor="middle">{isZh ? '两层 MLP' : '2-Layer MLP'}</text>
            <text className="vl-svg-s" x="207" y="78" textAnchor="middle">D_vit → d_LLM</text>
          </g>
          <line className="vl-svg-edge" x1="252" y1="66" x2="282" y2="66" />
          <g className="vl-svg-node amber">
            <rect x="284" y="36" width="118" height="60" rx="6" />
            <text className="vl-svg-t" x="343" y="60" textAnchor="middle">{isZh ? 'LLM 输入' : 'LLM Input'}</text>
            <text className="vl-svg-s" x="343" y="77" textAnchor="middle">[2304, d_LLM] · 112ms</text>
          </g>
          <text className="vl-svg-s" x="16" y="116">
            {isZh ? '零压缩保留全部 Patch，但 LLM 注意力计算量是 4:1 方案的 16 倍。' : 'Zero compression: retains all pixels, but 16× higher LLM Attention FLOPs than 4:1.'}
          </text>
        </g>
      )}

      {projector === 'pixel_shuffle_4x' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">{isZh ? '2×2 Pixel-Shuffle (4:1)：空间折入通道维' : '2×2 Pixel-Shuffle (4:1): Space-to-Channel Fold'}</text>
          <g className="vl-svg-node indigo">
            <rect x="16" y="36" width="94" height="60" rx="6" />
            <text className="vl-svg-t" x="63" y="56" textAnchor="middle">{isZh ? '2×2 邻域块' : '2×2 Block'}</text>
            <text className="vl-svg-s" x="63" y="72" textAnchor="middle">[p0 p1 / p2 p3]</text>
            <text className="vl-svg-s" x="63" y="86" textAnchor="middle">4 × D_vit</text>
          </g>
          <line className="vl-svg-edge hi" x1="110" y1="66" x2="136" y2="66" />
          <g className="vl-svg-node blue">
            <rect x="138" y="36" width="124" height="60" rx="6" />
            <text className="vl-svg-t" x="200" y="58" textAnchor="middle">{isZh ? '通道拼接投影' : 'Channel Concat'}</text>
            <text className="vl-svg-s" x="200" y="73" textAnchor="middle">[576, 4·D_vit] → MLP</text>
            <text className="vl-svg-s" x="200" y="87" textAnchor="middle">{isZh ? '保留 2D 空间局部性' : 'Preserves 2D Locality'}</text>
          </g>
          <line className="vl-svg-edge hi" x1="262" y1="66" x2="288" y2="66" />
          <g className="vl-svg-node emerald">
            <rect x="290" y="36" width="114" height="60" rx="6" />
            <text className="vl-svg-t" x="347" y="60" textAnchor="middle">{isZh ? 'LLM 输入' : 'LLM Input'}</text>
            <text className="vl-svg-s" x="347" y="77" textAnchor="middle">[576, d_LLM] · 31ms</text>
          </g>
          <text className="vl-svg-s" x="16" y="116">
            {isZh ? 'Token 与 KV 直降 4×、注意力算力降 16×，同时完整保留密集 OCR 清晰度。' : '4× fewer tokens & KV bytes, 16× lower Attention cost, crisp OCR preserved.'}
          </text>
        </g>
      )}

      {projector === 'qformer_64' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">{isZh ? 'Q-Former 重采样 (36:1)：固定 Query 交叉注意力' : 'Q-Former Resampler (36:1): Fixed Cross-Attention Bottleneck'}</text>
          <g className="vl-svg-node indigo">
            <rect x="16" y="36" width="102" height="60" rx="6" />
            <text className="vl-svg-t" x="67" y="60" textAnchor="middle">K, V: ViT</text>
            <text className="vl-svg-s" x="67" y="77" textAnchor="middle">[2304, D_vit]</text>
          </g>
          <line className="vl-svg-edge" x1="118" y1="66" x2="146" y2="66" />
          <g className="vl-svg-node amber">
            <rect x="148" y="36" width="122" height="60" rx="6" />
            <text className="vl-svg-t" x="209" y="58" textAnchor="middle">{isZh ? '交叉注意力压缩' : 'Cross-Attention'}</text>
            <text className="vl-svg-s" x="209" y="73" textAnchor="middle">{isZh ? 'Q = 64 固定查询' : 'Q = 64 Fixed Queries'}</text>
            <text className="vl-svg-s" x="209" y="87" textAnchor="middle">{isZh ? '存在信息瓶颈' : 'Information Bottleneck'}</text>
          </g>
          <line className="vl-svg-edge" x1="270" y1="66" x2="294" y2="66" />
          <g className="vl-svg-node emerald">
            <rect x="296" y="36" width="108" height="60" rx="6" />
            <text className="vl-svg-t" x="350" y="60" textAnchor="middle">{isZh ? '固定 64 tok' : 'Fixed 64 tok'}</text>
            <text className="vl-svg-s" x="350" y="77" textAnchor="middle">{isZh ? '8ms · 丢字风险' : '8ms · OCR Risk'}</text>
          </g>
          <text className="vl-svg-s" x="16" y="116">
            {isZh ? 'Prefill 与 KV 最省，但固定 64 个查询难以承载高密度表格与小字 OCR。' : 'Ultra-cheap Prefill/KV, but 64 queries struggle on dense tables & small OCR text.'}
          </text>
        </g>
      )}
    </svg>
  );
}
