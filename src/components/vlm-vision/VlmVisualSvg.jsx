import React from 'react';

export function VlmTilingSvg({ tiling, res, tiles, merge4x, rawPatches, llmTokens }) {
  return (
    <svg className="vl-svg" viewBox="0 0 430 144" role="img" aria-label="Dynamic Image Tiling & Patch Packing">
      <rect className="vl-svg-bg" x="4" y="4" width="422" height="136" rx="8" />

      {tiling === 'fixed_resize' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">Fixed Resize: High-Res Aspect Squashed to 336×336</text>
          {/* Original 16:9 box */}
          <rect x="16" y="34" width="128" height="72" rx="6" className="vl-svg-inner" />
          <text className="vl-svg-t" x="80" y="64" textAnchor="middle">{res.w}×{res.h}</text>
          <text className="vl-svg-s" x="80" y="80" textAnchor="middle">Dense OCR / Small Text</text>
          <line className="vl-svg-edge" x1="150" y1="70" x2="188" y2="70" />
          <text className="vl-svg-s" x="169" y="62" textAnchor="middle">Warp</text>
          {/* Squashed 336x336 square */}
          <g className="vl-svg-node amber">
            <rect x="194" y="42" width="56" height="56" rx="5" />
            <text className="vl-svg-t" x="222" y="68" textAnchor="middle">336²</text>
            <text className="vl-svg-s" x="222" y="82" textAnchor="middle">576 p</text>
          </g>
          <line className="vl-svg-edge" x1="254" y1="70" x2="282" y2="70" />
          <g className="vl-svg-node indigo">
            <rect x="286" y="42" width="128" height="56" rx="6" />
            <text className="vl-svg-t" x="350" y="65" textAnchor="middle">{llmTokens} LLM Tokens</text>
            <text className="vl-svg-s" x="350" y="82" textAnchor="middle">{merge4x ? '2×2 Merged (4:1)' : 'Unmerged (1:1)'}</text>
          </g>
          <text className="vl-svg-s" x="16" y="126">Fast & constant KV, but fine text/charts vanish under aggressive downsampling.</text>
        </g>
      )}

      {tiling === 'anyres_tiles' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">AnyRes: Crop Grid ({tiles - 1} Tiles) + 1 Global Thumbnail</text>
          {/* Global Thumbnail */}
          <g className="vl-svg-node emerald">
            <rect x="16" y="34" width="68" height="68" rx="6" />
            <text className="vl-svg-t" x="50" y="64" textAnchor="middle">Global</text>
            <text className="vl-svg-s" x="50" y="79" textAnchor="middle">336×336</text>
          </g>
          <text className="vl-svg-hdr" x="96" y="72" textAnchor="middle">+</text>
          {/* Crop Grid */}
          <rect x="108" y="34" width="166" height="78" rx="6" className="vl-svg-inner" />
          {Array.from({ length: Math.min(12, Math.max(1, tiles - 1)) }, (_, idx) => {
            const cols = Math.min(4, Math.max(1, Math.ceil(res.w / 448)));
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            const cw = Math.floor((154 - (cols - 1) * 4) / cols);
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
          <text className="vl-svg-s" x="16" y="128">Preserves crisp OCR across tiles, but duplicates border context + pads partial edges.</text>
        </g>
      )}

      {tiling === 'navit_native' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">NaViT Native Packing: Variable 2D Grid → 1D Packed Sequence</text>
          {/* Native 2D grid with 2x2 merge highlight */}
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
            {merge4x ? '2×2 Patches Merged (4→1)' : 'Native 14×14 Patches'}
          </text>
          <line className="vl-svg-edge hi" x1="152" y1="71" x2="180" y2="71" />
          {/* 1D cu_seqlens packed buffer */}
          <g className="vl-svg-node blue">
            <rect x="184" y="38" width="230" height="66" rx="6" />
            <text className="vl-svg-t" x="299" y="58" textAnchor="middle">FlashAttention varlen (cu_seqlens)</text>
            <rect x="194" y="66" width="136" height="24" rx="4" className="vl-svg-inner" />
            <text className="vl-svg-s" x="262" y="81" textAnchor="middle">Img 1 ({llmTokens.toLocaleString()} tok)</text>
            <rect x="336" y="66" width="68" height="24" rx="4" className="vl-svg-inner" />
            <text className="vl-svg-s" x="370" y="81" textAnchor="middle">Img 2 …</text>
          </g>
          <text className="vl-svg-s" x="299" y="122" textAnchor="middle">Zero resize distortion · Zero tile padding waste</text>
        </g>
      )}
    </svg>
  );
}

export function VlmProjectorSvg({ projector }) {
  return (
    <svg className="vl-svg" viewBox="0 0 420 132" role="img" aria-label="Multimodal Projector Tensor Transformation">
      <rect className="vl-svg-bg" x="4" y="4" width="412" height="124" rx="8" />

      {projector === 'mlp_1x' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">Direct MLP (1:1): No Spatial Reduction</text>
          <g className="vl-svg-node indigo">
            <rect x="16" y="36" width="112" height="60" rx="6" />
            <text className="vl-svg-t" x="72" y="60" textAnchor="middle">ViT Patches</text>
            <text className="vl-svg-s" x="72" y="77" textAnchor="middle">[2304, D_vit]</text>
          </g>
          <line className="vl-svg-edge" x1="128" y1="66" x2="160" y2="66" />
          <g className="vl-svg-node blue">
            <rect x="162" y="44" width="90" height="44" rx="6" />
            <text className="vl-svg-t" x="207" y="63" textAnchor="middle">2-Layer MLP</text>
            <text className="vl-svg-s" x="207" y="78" textAnchor="middle">D_vit → d_LLM</text>
          </g>
          <line className="vl-svg-edge" x1="252" y1="66" x2="282" y2="66" />
          <g className="vl-svg-node amber">
            <rect x="284" y="36" width="118" height="60" rx="6" />
            <text className="vl-svg-t" x="343" y="60" textAnchor="middle">LLM Input</text>
            <text className="vl-svg-s" x="343" y="77" textAnchor="middle">[2304, d_LLM] · 112ms</text>
          </g>
          <text className="vl-svg-s" x="16" y="116">Zero compression: retains all pixels, but 16× higher LLM Attention FLOPs than 4:1.</text>
        </g>
      )}

      {projector === 'pixel_shuffle_4x' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">2×2 Pixel-Shuffle (4:1): Space-to-Channel Fold</text>
          <g className="vl-svg-node indigo">
            <rect x="16" y="36" width="94" height="60" rx="6" />
            <text className="vl-svg-t" x="63" y="56" textAnchor="middle">2×2 Block</text>
            <text className="vl-svg-s" x="63" y="72" textAnchor="middle">[p0 p1 / p2 p3]</text>
            <text className="vl-svg-s" x="63" y="86" textAnchor="middle">4 × D_vit</text>
          </g>
          <line className="vl-svg-edge hi" x1="110" y1="66" x2="136" y2="66" />
          <g className="vl-svg-node blue">
            <rect x="138" y="36" width="124" height="60" rx="6" />
            <text className="vl-svg-t" x="200" y="58" textAnchor="middle">Channel Concat</text>
            <text className="vl-svg-s" x="200" y="73" textAnchor="middle">[576, 4·D_vit] → MLP</text>
            <text className="vl-svg-s" x="200" y="87" textAnchor="middle">Preserves 2D Locality</text>
          </g>
          <line className="vl-svg-edge hi" x1="262" y1="66" x2="288" y2="66" />
          <g className="vl-svg-node emerald">
            <rect x="290" y="36" width="114" height="60" rx="6" />
            <text className="vl-svg-t" x="347" y="60" textAnchor="middle">LLM Input</text>
            <text className="vl-svg-s" x="347" y="77" textAnchor="middle">[576, d_LLM] · 31ms</text>
          </g>
          <text className="vl-svg-s" x="16" y="116">4× fewer tokens & KV bytes, 16× lower Attention cost, crisp OCR preserved.</text>
        </g>
      )}

      {projector === 'qformer_64' && (
        <g>
          <text className="vl-svg-hdr" x="14" y="21">Q-Former Resampler (36:1): Fixed Cross-Attention Bottleneck</text>
          <g className="vl-svg-node indigo">
            <rect x="16" y="36" width="102" height="60" rx="6" />
            <text className="vl-svg-t" x="67" y="60" textAnchor="middle">K, V: ViT</text>
            <text className="vl-svg-s" x="67" y="77" textAnchor="middle">[2304, D_vit]</text>
          </g>
          <line className="vl-svg-edge" x1="118" y1="66" x2="146" y2="66" />
          <g className="vl-svg-node amber">
            <rect x="148" y="36" width="122" height="60" rx="6" />
            <text className="vl-svg-t" x="209" y="58" textAnchor="middle">Cross-Attention</text>
            <text className="vl-svg-s" x="209" y="73" textAnchor="middle">Q = 64 Fixed Queries</text>
            <text className="vl-svg-s" x="209" y="87" textAnchor="middle">Information Bottleneck</text>
          </g>
          <line className="vl-svg-edge" x1="270" y1="66" x2="294" y2="66" />
          <g className="vl-svg-node emerald">
            <rect x="296" y="36" width="108" height="60" rx="6" />
            <text className="vl-svg-t" x="350" y="60" textAnchor="middle">Fixed 64 tok</text>
            <text className="vl-svg-s" x="350" y="77" textAnchor="middle">8ms · OCR Risk</text>
          </g>
          <text className="vl-svg-s" x="16" y="116">Ultra-cheap Prefill/KV, but 64 queries struggle on dense tables & small OCR text.</text>
        </g>
      )}
    </svg>
  );
}
