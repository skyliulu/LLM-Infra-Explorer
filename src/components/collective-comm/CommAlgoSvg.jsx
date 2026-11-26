import React from 'react';

export default function CommAlgoSvg({ algo = 'ring', t }) {
  if (algo === 'tree') {
    return (
      <svg className="cc-svg" viewBox="0 0 420 192" role="img" aria-label={t('svgAlgoTreeAria')}>
        <rect className="cc-svg-bg" x="6" y="6" width="408" height="180" rx="8" />
        <text className="cc-svg-hdr" x="18" y="23">{t('svgAlgoTreeHdr')}</text>

        {/* Left sub-tree: Tree A (Root = GPU 0, solid edges) */}
        <text className="cc-svg-s" x="110" y="38" textAnchor="middle">{t('svgAlgoTreeA')}</text>
        <line className="cc-svg-edge" x1="98" y1="68" x2="62" y2="90" />
        <line className="cc-svg-edge" x1="122" y1="68" x2="158" y2="90" />
        <line className="cc-svg-edge" x1="56" y1="114" x2="40" y2="134" />
        <line className="cc-svg-edge" x1="68" y1="114" x2="86" y2="134" />
        <line className="cc-svg-edge" x1="158" y1="114" x2="158" y2="134" />

        <g className="cc-svg-node indigo">
          <rect x="82" y="44" width="56" height="24" rx="5" />
          <text className="cc-svg-s" x="110" y="59" textAnchor="middle">GPU 0</text>
        </g>
        <g className="cc-svg-node blue">
          <rect x="34" y="90" width="56" height="24" rx="5" />
          <text className="cc-svg-s" x="62" y="105" textAnchor="middle">GPU 1</text>
        </g>
        <g className="cc-svg-node blue">
          <rect x="130" y="90" width="56" height="24" rx="5" />
          <text className="cc-svg-s" x="158" y="105" textAnchor="middle">GPU 2</text>
        </g>
        {[
          { x: 18, label: 'GPU 3' },
          { x: 68, label: 'GPU 4' },
          { x: 130, label: 'GPU 5..' },
        ].map((leaf) => (
          <g key={`a-${leaf.label}`} className="cc-svg-node">
            <rect x={leaf.x} y="134" width="44" height="22" rx="4" />
            <text className="cc-svg-s" x={leaf.x + 22} y="148" textAnchor="middle">{leaf.label}</text>
          </g>
        ))}

        {/* Divider */}
        <line x1="210" y1="34" x2="210" y2="162" stroke="currentColor" strokeOpacity="0.16" strokeDasharray="3 3" />

        {/* Right sub-tree: Tree B (Root = GPU 3, dashed complementary edges) */}
        <text className="cc-svg-s" x="310" y="38" textAnchor="middle">{t('svgAlgoTreeB')}</text>
        <line className="cc-svg-edge hi" strokeDasharray="4 2" x1="298" y1="68" x2="262" y2="90" />
        <line className="cc-svg-edge hi" strokeDasharray="4 2" x1="322" y1="68" x2="358" y2="90" />
        <line className="cc-svg-edge hi" strokeDasharray="4 2" x1="256" y1="114" x2="240" y2="134" />
        <line className="cc-svg-edge hi" strokeDasharray="4 2" x1="268" y1="114" x2="286" y2="134" />
        <line className="cc-svg-edge hi" strokeDasharray="4 2" x1="358" y1="114" x2="358" y2="134" />

        <g className="cc-svg-node emerald">
          <rect x="282" y="44" width="56" height="24" rx="5" />
          <text className="cc-svg-s" x="310" y="59" textAnchor="middle">GPU 3</text>
        </g>
        <g className="cc-svg-node emerald">
          <rect x="234" y="90" width="56" height="24" rx="5" />
          <text className="cc-svg-s" x="262" y="105" textAnchor="middle">GPU 4</text>
        </g>
        <g className="cc-svg-node emerald">
          <rect x="330" y="90" width="56" height="24" rx="5" />
          <text className="cc-svg-s" x="358" y="105" textAnchor="middle">GPU 5</text>
        </g>
        {[
          { x: 218, label: 'GPU 0' },
          { x: 268, label: 'GPU 1' },
          { x: 330, label: 'GPU 2..' },
        ].map((leaf) => (
          <g key={`b-${leaf.label}`} className="cc-svg-node">
            <rect x={leaf.x} y="134" width="44" height="22" rx="4" />
            <text className="cc-svg-s" x={leaf.x + 22} y="148" textAnchor="middle">{leaf.label}</text>
          </g>
        ))}

        <text className="cc-svg-s" x="210" y="176" textAnchor="middle">{t('svgAlgoTreeFoot')}</text>
      </svg>
    );
  }

  if (algo === 'nvls') {
    return (
      <svg className="cc-svg" viewBox="0 0 420 182" role="img" aria-label={t('svgAlgoNvlsAria')}>
        <rect className="cc-svg-bg" x="6" y="6" width="408" height="170" rx="8" />
        <text className="cc-svg-hdr" x="18" y="24">{t('svgAlgoNvlsHdr')}</text>

        {/* Switch SHARP core */}
        <g className="cc-svg-node emerald">
          <rect x="70" y="36" width="280" height="44" rx="8" />
          <text className="cc-svg-t" x="210" y="55" textAnchor="middle">{t('svgAlgoNvlsCore')}</text>
          <text className="cc-svg-s" x="210" y="70" textAnchor="middle">{t('svgAlgoNvlsSub')}</text>
        </g>

        {/* GPUs */}
        {[0, 1, 2, 3].map((g) => {
          const x = 24 + g * 98;
          return (
            <g key={g}>
              <line className="cc-svg-edge hi" x1={x + 40} y1="126" x2={122 + g * 58} y2="80" />
              <g className="cc-svg-node indigo">
                <rect x={x} y="126" width="80" height="36" rx="6" />
                <text className="cc-svg-t" x={x + 40} y="142" textAnchor="middle">GPU {g}</text>
                <text className="cc-svg-s" x={x + 40} y="155" textAnchor="middle">{t('svgAlgoNvlsSm')}</text>
              </g>
            </g>
          );
        })}
      </svg>
    );
  }

  // Ring default
  return (
    <svg className="cc-svg" viewBox="0 0 420 182" role="img" aria-label={t('svgAlgoRingAria')}>
      <rect className="cc-svg-bg" x="6" y="6" width="408" height="170" rx="8" />
      <text className="cc-svg-hdr" x="18" y="24">{t('svgAlgoRingHdr')}</text>

      {/* Ring loop */}
      <rect className="cc-svg-ring" x="78" y="54" width="264" height="84" rx="18" />

      {[
        { id: 'GPU 0', x: 34, y: 40 },
        { id: 'GPU 1', x: 298, y: 40 },
        { id: 'GPU 2', x: 298, y: 120 },
        { id: 'GPU 3', x: 34, y: 120 },
      ].map((n) => (
        <g key={n.id} className="cc-svg-node indigo">
          <rect x={n.x} y={n.y} width="88" height="34" rx="6" />
          <text className="cc-svg-t" x={n.x + 44} y={n.y + 21} textAnchor="middle">{n.id}</text>
        </g>
      ))}

      <text className="cc-svg-s" x="210" y="92" textAnchor="middle">{t('svgAlgoRingP1')}</text>
      <text className="cc-svg-s" x="210" y="108" textAnchor="middle">{t('svgAlgoRingP2')}</text>
    </svg>
  );
}
