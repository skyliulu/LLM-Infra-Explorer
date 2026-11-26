import React from 'react';

export function DitParadigmSvg({ paradigm = 'mmdit', lang = 'zh' }) {
  const isMm = paradigm === 'mmdit';
  const isZh = lang === 'zh';
  return (
    <svg
      viewBox="0 0 880 156"
      className="dit-svg-frame"
      role="img"
      aria-label={isZh ? '双流 MM-DiT 与交叉注意力 DiT 范式对比' : 'Cross-Attention DiT vs Dual-Stream MM-DiT Architecture'}
    >
      <text x="18" y="22" className="dit-svg-sub">
        {isMm
          ? (isZh ? '双流 MM-DiT (FLUX.1 / SD3.5)：文本与视觉独立权重 → 拼接联合自注意力' : 'Dual-Stream MM-DiT (FLUX.1 / SD3.5): Separate Text & Visual Weights → Concatenated Joint Self-Attention')
          : (isZh ? '单流交叉注意力 DiT (Wan2.1 / CogVideoX)：视觉 3D 自注意力 + 文本 Cross-Attn + AdaLN-Zero' : 'Cross-Attention DiT (Wan2.1 / PixArt / CogVideoX): Visual 3D Self-Attention + Text Cross-Attention + AdaLN-Zero')}
      </text>

      {isMm ? (
        <g>
          <rect x="18" y="34" width="196" height="44" rx="8" className="dit-svg-box-active" />
          <text x="32" y="54" className="dit-svg-title">{isZh ? '视觉流 (x_t)' : 'Visual Stream (x_t)'}</text>
          <text x="32" y="70" className="dit-svg-sub">AdaLN-Zero → Q_v, K_v, V_v</text>

          <rect x="18" y="88" width="196" height="44" rx="8" className="dit-svg-box-emerald" />
          <text x="32" y="108" className="dit-svg-title">{isZh ? '文本流 (T5 Emb c)' : 'Text Stream (T5 Emb c)'}</text>
          <text x="32" y="124" className="dit-svg-sub">{isZh ? '独立投影 → Q_c, K_c, V_c' : 'Separate Proj → Q_c, K_c, V_c'}</text>

          <path d="M 214 56 L 266 76" className="dit-svg-arrow-accent" />
          <path d="M 214 110 L 266 90" className="dit-svg-arrow-emerald" />

          <rect x="268" y="42" width="234" height="82" rx="10" className="dit-svg-box-amber" />
          <text x="284" y="68" className="dit-svg-title">{isZh ? '联合双向自注意力' : 'Joint Bidirectional Attention'}</text>
          <text x="284" y="88" className="dit-svg-sub">Attn([Q_v; Q_c], [K_v; K_c], [V_v; V_c])</text>
          <text x="284" y="108" className="dit-svg-badge-text">{isZh ? '图文特征双向互精炼' : 'Mutual Text↔Image Refinement'}</text>

          <path d="M 502 74 L 552 56" className="dit-svg-arrow-accent" />
          <path d="M 502 92 L 552 110" className="dit-svg-arrow-emerald" />

          <rect x="554" y="34" width="308" height="44" rx="8" className="dit-svg-box-active" />
          <text x="568" y="54" className="dit-svg-title">{isZh ? '视觉 FFN + 门控残差 (α_v)' : 'Visual FFN + Gated Residual (α_v)'}</text>
          <text x="568" y="70" className="dit-svg-sub">{isZh ? '专属视觉权重 → 画面文字与构图更清晰' : 'Dedicated visual weights → crisp typography'}</text>

          <rect x="554" y="88" width="308" height="44" rx="8" className="dit-svg-box-emerald" />
          <text x="568" y="108" className="dit-svg-title">{isZh ? '文本 FFN + 门控残差 (α_c)' : 'Text FFN + Gated Residual (α_c)'}</text>
          <text x="568" y="124" className="dit-svg-sub">{isZh ? '每层同步演化提示词表征' : 'Updates prompt representation every block'}</text>
        </g>
      ) : (
        <g>
          <rect x="18" y="44" width="212" height="74" rx="8" className="dit-svg-box-active" />
          <text x="32" y="68" className="dit-svg-title">{isZh ? '1. 3D 全局自注意力' : '1. 3D Full Self-Attention'}</text>
          <text x="32" y="88" className="dit-svg-sub">{isZh ? '视觉 Token N × N (75K+)' : 'Visual tokens N × N (75K+)'}</text>
          <text x="32" y="106" className="dit-svg-badge-text">AdaLN-Zero (shift, scale, gate)</text>

          <path d="M 230 81 L 270 81" className="dit-svg-arrow-accent" />

          <rect x="272" y="44" width="234" height="74" rx="8" className="dit-svg-box-emerald" />
          <text x="286" y="68" className="dit-svg-title">{isZh ? '2. 文本交叉注意力' : '2. Text Cross-Attention'}</text>
          <text x="286" y="88" className="dit-svg-sub">{isZh ? 'Q=视觉, K/V=冻结 T5 (512)' : 'Q = Visual, K/V = Frozen T5 (512)'}</text>
          <text x="286" y="106" className="dit-svg-badge-text">{isZh ? '轻量 O(N·512) · 无需文本 FFN' : 'Light O(N·512) · Zero Text FFN'}</text>

          <path d="M 506 81 L 546 81" className="dit-svg-arrow-accent" />

          <rect x="548" y="44" width="314" height="74" rx="8" className="dit-svg-box-amber" />
          <text x="562" y="68" className="dit-svg-title">{isZh ? '3. 调制 SwiGLU / GELU FFN' : '3. Modulated SwiGLU / GELU FFN'}</text>
          <text x="562" y="88" className="dit-svg-sub">{isZh ? '单流权重更紧凑，适合 14B 视频大模型' : 'Single stream weights → leaner VRAM for 14B Video'}</text>
          <text x="562" y="106" className="dit-svg-badge-text">{isZh ? 'T5 条件投影只需算 1 次并跨全部去噪步复用' : 'T5 K/V projected once across all denoising steps!'}</text>
        </g>
      )}
    </svg>
  );
}
