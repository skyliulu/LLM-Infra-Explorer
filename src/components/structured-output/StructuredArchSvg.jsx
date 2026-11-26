import React from 'react';

function Pin({ num, x, y, active, onSelect }) {
  return (
    <g
      className={`so-arch-pin ${active ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(num); }}
      role="button"
      tabIndex={0}
      aria-label={`Inspect stage ${num}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(num); } }}
    >
      <circle cx={x} cy={y} r={10} />
      <text x={x} y={y + 3.5} textAnchor="middle">{num}</text>
    </g>
  );
}

export default function StructuredArchSvg({ activePin, onSelectPin, t }) {
  const hi = (n) => (activePin === n ? 'hl' : '');

  return (
    <svg className="so-svg" viewBox="0 0 600 206" role="img" aria-label={t('svgArchAria')}>
      <rect className="so-svg-bg" x="6" y="6" width="588" height="194" rx="9" />
      <text className="so-svg-hdr" x="18" y="24">{t('svgArchHdr')}</text>

      {/* ① Offline Compiler */}
      <g className={`so-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
        <rect x="18" y="38" width="126" height="106" rx="7" />
        <text className="so-svg-t" x="81" y="60" textAnchor="middle">{t('svgP1Title')}</text>
        <text className="so-svg-s" x="81" y="76" textAnchor="middle">{t('svgP1Sub1')}</text>
        <text className="so-svg-s" x="81" y="94" textAnchor="middle">{t('svgP1Sub2')}</text>
        <text className="so-svg-s" x="81" y="108" textAnchor="middle">{t('svgP1Sub3')}</text>
        <text className="so-svg-s" x="81" y="126" textAnchor="middle">{t('svgP1Sub4')}</text>
      </g>

      <line className="so-svg-edge" x1="144" y1="90" x2="164" y2="90" />

      {/* ② Runtime PDA Stack */}
      <g className={`so-svg-node indigo ${hi(2)}`} onClick={() => onSelectPin(2)}>
        <rect x="164" y="38" width="128" height="106" rx="7" />
        <text className="so-svg-t" x="228" y="60" textAnchor="middle">{t('svgP2Title')}</text>
        <text className="so-svg-s" x="228" y="76" textAnchor="middle">{t('svgP2Sub1')}</text>
        <text className="so-svg-s" x="228" y="94" textAnchor="middle">{t('svgP2Sub2')}</text>
        <text className="so-svg-s" x="228" y="108" textAnchor="middle">{t('svgP2Sub3')}</text>
        <text className="so-svg-s" x="228" y="126" textAnchor="middle">{t('svgP2Sub4')}</text>
      </g>

      <line className="so-svg-edge hi" x1="292" y1="90" x2="312" y2="90" />

      {/* ③ GPU Logits Bitmask Kernel */}
      <g className={`so-svg-node amber ${hi(3)}`} onClick={() => onSelectPin(3)}>
        <rect x="312" y="38" width="130" height="106" rx="7" />
        <text className="so-svg-t" x="377" y="60" textAnchor="middle">{t('svgP3Title')}</text>
        <text className="so-svg-s" x="377" y="76" textAnchor="middle">{t('svgP3Sub1')}</text>
        <text className="so-svg-s" x="377" y="94" textAnchor="middle">{t('svgP3Sub2')}</text>
        <text className="so-svg-s" x="377" y="108" textAnchor="middle">{t('svgP3Sub3')}</text>
        <text className="so-svg-s" x="377" y="126" textAnchor="middle">{t('svgP3Sub4')}</text>
      </g>

      <line className="so-svg-edge hi" x1="442" y1="90" x2="462" y2="90" />

      {/* ④ Sampler + Jump-Forward */}
      <g className={`so-svg-node emerald ${hi(4)}`} onClick={() => onSelectPin(4)}>
        <rect x="462" y="38" width="120" height="106" rx="7" />
        <text className="so-svg-t" x="522" y="60" textAnchor="middle">{t('svgP4Title')}</text>
        <text className="so-svg-s" x="522" y="76" textAnchor="middle">{t('svgP4Sub1')}</text>
        <text className="so-svg-s" x="522" y="94" textAnchor="middle">{t('svgP4Sub2')}</text>
        <text className="so-svg-s" x="522" y="108" textAnchor="middle">{t('svgP4Sub3')}</text>
        <text className="so-svg-s" x="522" y="126" textAnchor="middle">{t('svgP4Sub4')}</text>
      </g>

      {/* Feedback loop */}
      <rect className="so-svg-inner" x="18" y="156" width="564" height="32" rx="6" />
      <text className="so-svg-s" x="300" y="176" textAnchor="middle">
        {t('svgFeedback')}
      </text>

      <Pin num={1} x={18} y={38} active={activePin === 1} onSelect={onSelectPin} />
      <Pin num={2} x={164} y={38} active={activePin === 2} onSelect={onSelectPin} />
      <Pin num={3} x={312} y={38} active={activePin === 3} onSelect={onSelectPin} />
      <Pin num={4} x={462} y={38} active={activePin === 4} onSelect={onSelectPin} />
    </svg>
  );
}
