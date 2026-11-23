import React from 'react';

export function DitParadigmSvg({ paradigm = 'mmdit' }) {
  const isMm = paradigm === 'mmdit';
  return (
    <svg viewBox="0 0 880 156" className="dit-svg-frame" role="img" aria-label="Cross-Attention DiT vs Dual-Stream MM-DiT Architecture">
      <text x="18" y="22" className="dit-svg-sub">
        {isMm
          ? 'Dual-Stream MM-DiT (FLUX.1 / SD3.5): Separate Text & Visual Weights → Concatenated Joint Self-Attention'
          : 'Cross-Attention DiT (Wan2.1 / PixArt / CogVideoX): Visual 3D Self-Attention + Text Cross-Attention + AdaLN-Zero'}
      </text>

      {isMm ? (
        <g>
          {/* Visual Stream */}
          <rect x="18" y="34" width="196" height="44" rx="8" className="dit-svg-box-active" />
          <text x="32" y="54" className="dit-svg-title">Visual Stream (x_t)</text>
          <text x="32" y="70" className="dit-svg-sub">AdaLN-Zero → Q_v, K_v, V_v</text>

          {/* Text Stream */}
          <rect x="18" y="88" width="196" height="44" rx="8" className="dit-svg-box-emerald" />
          <text x="32" y="108" className="dit-svg-title">Text Stream (T5 Emb c)</text>
          <text x="32" y="124" className="dit-svg-sub">Separate Proj → Q_c, K_c, V_c</text>

          <path d="M 214 56 L 266 76" className="dit-svg-arrow-accent" />
          <path d="M 214 110 L 266 90" className="dit-svg-arrow-emerald" />

          {/* Joint Attention */}
          <rect x="268" y="42" width="234" height="82" rx="10" className="dit-svg-box-amber" />
          <text x="284" y="68" className="dit-svg-title">Joint Bidirectional Attention</text>
          <text x="284" y="88" className="dit-svg-sub">Attn([Q_v; Q_c], [K_v; K_c], [V_v; V_c])</text>
          <text x="284" y="108" className="dit-svg-badge-text">Mutual Text↔Image Feature Refinement</text>

          <path d="M 502 74 L 552 56" className="dit-svg-arrow-accent" />
          <path d="M 502 92 L 552 110" className="dit-svg-arrow-emerald" />

          {/* Split Out FFNs */}
          <rect x="554" y="34" width="308" height="44" rx="8" className="dit-svg-box-active" />
          <text x="568" y="54" className="dit-svg-title">Visual FFN + Gated Residual (α_v)</text>
          <text x="568" y="70" className="dit-svg-sub">Dedicated visual weights → crisp typography</text>

          <rect x="554" y="88" width="308" height="44" rx="8" className="dit-svg-box-emerald" />
          <text x="568" y="108" className="dit-svg-title">Text FFN + Gated Residual (α_c)</text>
          <text x="568" y="124" className="dit-svg-sub">Updates prompt representation every block</text>
        </g>
      ) : (
        <g>
          <rect x="18" y="44" width="212" height="74" rx="8" className="dit-svg-box-active" />
          <text x="32" y="68" className="dit-svg-title">1. 3D Full Self-Attention</text>
          <text x="32" y="88" className="dit-svg-sub">Visual tokens N × N (75K+)</text>
          <text x="32" y="106" className="dit-svg-badge-text">AdaLN-Zero (shift, scale, gate)</text>

          <path d="M 230 81 L 270 81" className="dit-svg-arrow-accent" />

          <rect x="272" y="44" width="234" height="74" rx="8" className="dit-svg-box-emerald" />
          <text x="286" y="68" className="dit-svg-title">2. Text Cross-Attention</text>
          <text x="286" y="88" className="dit-svg-sub">Q = Visual, K/V = Frozen T5 (512)</text>
          <text x="286" y="106" className="dit-svg-badge-text">Light O(N · 512) · Zero Text FFN</text>

          <path d="M 506 81 L 546 81" className="dit-svg-arrow-accent" />

          <rect x="548" y="44" width="314" height="74" rx="8" className="dit-svg-box-amber" />
          <text x="562" y="68" className="dit-svg-title">3. Modulated SwiGLU / GELU FFN</text>
          <text x="562" y="88" className="dit-svg-sub">Single stream weights → leaner VRAM for 14B Video</text>
          <text x="562" y="106" className="dit-svg-badge-text">T5 KV cached once across all 50 denoising steps!</text>
        </g>
      )}
    </svg>
  );
}
