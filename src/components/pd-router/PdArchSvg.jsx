import React from 'react';

function Pin({ num, x, y, active, onSelect }) {
  return (
    <g
      className={`pd-arch-pin ${active ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(num); }}
      role="button"
      tabIndex={0}
      aria-label={`Inspect tier ${num}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(num); } }}
    >
      <circle cx={x} cy={y} r={10} />
      <text x={x} y={y + 3.5} textAnchor="middle">{num}</text>
    </g>
  );
}

export default function PdArchSvg({ activePin, onSelectPin, t }) {
  const hi = (n) => (activePin === n ? 'hl' : '');

  return (
    <svg className="pd-svg" viewBox="0 0 600 228" role="img" aria-label={t('svgArchAria')}>
      <rect className="pd-svg-bg" x="6" y="6" width="588" height="216" rx="9" />
      <text className="pd-svg-hdr" x="18" y="24">{t('svgArchHdr')}</text>

      {/* ① Gateway & Cache-Aware Router */}
      <g className={`pd-svg-node blue ${hi(1)}`} onClick={() => onSelectPin(1)}>
        <rect x="18" y="38" width="118" height="122" rx="7" />
        <text className="pd-svg-t" x="77" y="62" textAnchor="middle">{t('svgGwTitle1')}</text>
        <text className="pd-svg-t" x="77" y="76" textAnchor="middle">{t('svgGwTitle2')}</text>
        <text className="pd-svg-s" x="77" y="96" textAnchor="middle">{t('svgGwSub1')}</text>
        <text className="pd-svg-s" x="77" y="110" textAnchor="middle">{t('svgGwSub2')}</text>
        <text className="pd-svg-s" x="77" y="126" textAnchor="middle">{t('svgGwSub3')}</text>
        <text className="pd-svg-s" x="77" y="144" textAnchor="middle">{t('svgGwSub4')}</text>
      </g>

      <line className="pd-svg-edge" x1="136" y1="98" x2="156" y2="98" />

      {/* ② Prefill Pool */}
      <g className={`pd-svg-node indigo ${hi(2)}`} onClick={() => onSelectPin(2)}>
        <rect x="156" y="38" width="128" height="122" rx="7" />
        <text className="pd-svg-t" x="220" y="60" textAnchor="middle">{t('svgPTitle')}</text>
        <text className="pd-svg-s" x="220" y="75" textAnchor="middle">{t('svgPSub')}</text>
        <rect className="pd-svg-inner" x="166" y="84" width="108" height="28" rx="5" />
        <text className="pd-svg-s" x="220" y="102" textAnchor="middle">{t('svgPBox1')}</text>
        <rect className="pd-svg-inner" x="166" y="118" width="108" height="32" rx="5" />
        <text className="pd-svg-s" x="220" y="132" textAnchor="middle">{t('svgPBox2a')}</text>
        <text className="pd-svg-s" x="220" y="144" textAnchor="middle">{t('svgPBox2b')}</text>
      </g>

      <line className="pd-svg-edge hi" x1="284" y1="98" x2="304" y2="98" />

      {/* ③ KV Transfer Fabric */}
      <g className={`pd-svg-node amber ${hi(3)}`} onClick={() => onSelectPin(3)}>
        <rect x="304" y="38" width="126" height="122" rx="7" />
        <text className="pd-svg-t" x="367" y="60" textAnchor="middle">{t('svgKvTitle')}</text>
        <text className="pd-svg-s" x="367" y="75" textAnchor="middle">{t('svgKvSub')}</text>
        <rect className="pd-svg-inner" x="314" y="84" width="106" height="30" rx="5" />
        <text className="pd-svg-s" x="367" y="98" textAnchor="middle">{t('svgKvBox1a')}</text>
        <text className="pd-svg-s" x="367" y="109" textAnchor="middle">{t('svgKvBox1b')}</text>
        <rect className="pd-svg-inner" x="314" y="120" width="106" height="30" rx="5" />
        <text className="pd-svg-s" x="367" y="134" textAnchor="middle">{t('svgKvBox2a')}</text>
        <text className="pd-svg-s" x="367" y="145" textAnchor="middle">{t('svgKvBox2b')}</text>
      </g>

      <line className="pd-svg-edge hi" x1="430" y1="98" x2="450" y2="98" />

      {/* ④ Decode Pool */}
      <g className={`pd-svg-node emerald ${hi(4)}`} onClick={() => onSelectPin(4)}>
        <rect x="450" y="38" width="132" height="122" rx="7" />
        <text className="pd-svg-t" x="516" y="60" textAnchor="middle">{t('svgDTitle')}</text>
        <text className="pd-svg-s" x="516" y="75" textAnchor="middle">{t('svgDSub')}</text>
        <rect className="pd-svg-inner" x="460" y="84" width="112" height="28" rx="5" />
        <text className="pd-svg-s" x="516" y="102" textAnchor="middle">{t('svgDBox1')}</text>
        <rect className="pd-svg-inner" x="460" y="118" width="112" height="32" rx="5" />
        <text className="pd-svg-s" x="516" y="132" textAnchor="middle">{t('svgDBox2a')}</text>
        <text className="pd-svg-s" x="516" y="144" textAnchor="middle">{t('svgDBox2b')}</text>
      </g>

      {/* Bottom: Shared Control Plane */}
      <rect className="pd-svg-inner" x="18" y="172" width="564" height="38" rx="6" />
      <text className="pd-svg-t" x="300" y="188" textAnchor="middle">{t('svgCtrlTitle')}</text>
      <text className="pd-svg-s" x="300" y="202" textAnchor="middle">{t('svgCtrlSub')}</text>

      <Pin num={1} x={18} y={38} active={activePin === 1} onSelect={onSelectPin} />
      <Pin num={2} x={156} y={38} active={activePin === 2} onSelect={onSelectPin} />
      <Pin num={3} x={304} y={38} active={activePin === 3} onSelect={onSelectPin} />
      <Pin num={4} x={450} y={38} active={activePin === 4} onSelect={onSelectPin} />
    </svg>
  );
}
