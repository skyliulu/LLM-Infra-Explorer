import React from 'react';

export function DitArchSvg({ activeStage, onSelectStage, t }) {
  const is = (id) => activeStage === id;

  return (
    <svg
      viewBox="0 0 880 232"
      className="dit-svg-frame"
      role="img"
      aria-label={t('svg_arch_title')}
    >
      <defs>
        <marker id="dit-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="light-dark(#64748b, #94a3b8)" />
        </marker>
        <marker id="dit-arrow-acc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="light-dark(#4f46e5, #818cf8)" />
        </marker>
      </defs>

      <text x="18" y="24" className="dit-svg-sub">{t('svg_arch_title')}</text>

      {/* Stage 1: Text Encoder */}
      <g onClick={() => onSelectStage('textenc')} style={{ cursor: 'pointer' }}>
        <rect
          x="18" y="42" width="172" height="122" rx="10"
          className={is('textenc') ? 'dit-svg-box-active' : 'dit-svg-box'}
        />
        <text x="32" y="68" className="dit-svg-title">Text Encoder</text>
        <text x="32" y="88" className="dit-svg-sub">T5-XXL + CLIP-L</text>
        <rect x="30" y="100" width="146" height="24" rx="5" className="dit-svg-box-subtle" />
        <text x="38" y="116" className="dit-svg-sub">Prompt → Emb c</text>
        <text x="32" y="146" className="dit-svg-badge-text">~9.5 GB · 1× / req</text>
        <circle cx="176" cy="54" r="11" className={is('textenc') ? 'dit-svg-pin' : 'dit-svg-pin-idle'} />
        <text x="176" y="58" textAnchor="middle" className="dit-svg-pin-label">1</text>
      </g>

      {/* Arrow 1 -> 3 (conditioning) */}
      <path d="M 190 76 L 398 76" className="dit-svg-arrow" strokeDasharray="4 3" markerEnd="url(#dit-arrow)" />

      {/* Stage 2: 3D Patchify */}
      <g onClick={() => onSelectStage('patchify')} style={{ cursor: 'pointer' }}>
        <rect
          x="216" y="96" width="160" height="114" rx="10"
          className={is('patchify') ? 'dit-svg-box-active' : 'dit-svg-box'}
        />
        <text x="230" y="122" className="dit-svg-title">3D Patchify</text>
        <text x="230" y="142" className="dit-svg-sub">{t('svg_noise')}</text>
        <rect x="228" y="152" width="136" height="24" rx="5" className="dit-svg-box-subtle" />
        <text x="236" y="168" className="dit-svg-sub">(T′, H′, W′) → N tok</text>
        <text x="230" y="196" className="dit-svg-badge-text">4×16×16 Stride</text>
        <circle cx="362" cy="108" r="11" className={is('patchify') ? 'dit-svg-pin' : 'dit-svg-pin-idle'} />
        <text x="362" y="112" textAnchor="middle" className="dit-svg-pin-label">2</text>
      </g>

      {/* Arrow 2 -> 3 */}
      <path d="M 376 146 L 402 146" className="dit-svg-arrow-accent" markerEnd="url(#dit-arrow-acc)" />

      {/* Stage 3: N-Step DiT Denoising Loop */}
      <g onClick={() => onSelectStage('ditloop')} style={{ cursor: 'pointer' }}>
        <rect
          x="406" y="42" width="248" height="148" rx="12"
          className={is('ditloop') ? 'dit-svg-box-active' : 'dit-svg-box-amber'}
        />
        <text x="422" y="68" className="dit-svg-title">DiT Denoising Loop</text>
        <text x="422" y="88" className="dit-svg-sub">3D Full Attn + MM-DiT + AdaLN</text>
        <rect x="420" y="100" width="218" height="26" rx="6" className="dit-svg-box-subtle" />
        <text x="430" y="117" className="dit-svg-badge-text">{t('svg_loop_badge')}</text>
        <text x="422" y="148" className="dit-svg-sub">CFG + USP + TeaCache / FP8</text>
        <text x="422" y="172" className="dit-svg-badge-text">85–95% Latency · Compute-Bound</text>
        <circle cx="638" cy="54" r="11" className={is('ditloop') ? 'dit-svg-pin' : 'dit-svg-pin-idle'} />
        <text x="638" y="58" textAnchor="middle" className="dit-svg-pin-label">3</text>
      </g>

      {/* Feedback loop arrow under stage 3 */}
      <path d="M 596 190 C 596 216, 464 216, 464 194" className="dit-svg-arrow-accent" markerEnd="url(#dit-arrow-acc)" />
      <text x="530" y="222" textAnchor="middle" className="dit-svg-sub">z_t → z_(t-Δt)</text>

      {/* Arrow 3 -> 4 */}
      <path d="M 654 116 L 682 116" className="dit-svg-arrow-accent" markerEnd="url(#dit-arrow-acc)" />

      {/* Stage 4: 3D Tiled VAE Decoder */}
      <g onClick={() => onSelectStage('vaedec')} style={{ cursor: 'pointer' }}>
        <rect
          x="686" y="42" width="176" height="148" rx="10"
          className={is('vaedec') ? 'dit-svg-box-active' : 'dit-svg-box-warn'}
        />
        <text x="700" y="68" className="dit-svg-title">3D VAE Decoder</text>
        <text x="700" y="88" className="dit-svg-sub">Conv3D Upsample</text>
        <rect x="698" y="100" width="150" height="26" rx="5" className="dit-svg-box-subtle" />
        <text x="706" y="117" className="dit-svg-sub">Spatial-Temporal Tile</text>
        <text x="700" y="148" className="dit-svg-sub">{t('svg_pixels')}</text>
        <text x="700" y="172" className="dit-svg-badge-text">Peak Act &gt; 40 GB Risk</text>
        <circle cx="848" cy="54" r="11" className={is('vaedec') ? 'dit-svg-pin' : 'dit-svg-pin-idle'} />
        <text x="848" y="58" textAnchor="middle" className="dit-svg-pin-label">4</text>
      </g>
    </svg>
  );
}
