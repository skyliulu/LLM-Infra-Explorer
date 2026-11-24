import React from 'react';

const SM_TILES = Array.from({ length: 18 }, (_, i) => ({
  idx: i,
  row: Math.floor(i / 6),
  col: i % 6,
  isZoomed: i === 5,
  label: i === 17 ? '…SM 131' : i === 5 ? 'SM 5' : `SM ${i}`,
}));

export default function GpuOverviewSvg({ overview, onSelectNode, t }) {
  const { node, highlightedIds, activeFlow } = overview;
  const isLit = (id) => highlightedIds.includes(id);
  const isFocus = (id) => node.id === id;

  const nodeCls = (id, tone) =>
    `gr-ov-node ${tone} ${isLit(id) ? 'lit' : ''} ${isFocus(id) ? 'focus' : ''}`;

  const interactiveProps = (id) => ({
    onClick: () => onSelectNode(id),
    role: 'button',
    tabIndex: 0,
    'data-testid': `gpu-ov-node-${id}`,
    'aria-label': t(`ovNodeTitle_${id}`),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectNode(id);
      }
    },
  });

  return (
    <svg
      className="gr-ov-svg"
      viewBox="0 0 860 396"
      role="img"
      aria-label={t('ovTitle')}
    >
      <defs>
        <marker id="gr-ov-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path className="gr-ov-marker" d="M 0 1 L 10 5 L 0 9 z" />
        </marker>
        <marker id="gr-ov-arr-hot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path className="gr-ov-marker-hot" d="M 0 1 L 10 5 L 0 9 z" />
        </marker>
      </defs>

      {/* === LEFT: WHOLE GPU SYSTEM & CHIP DIE === */}
      <g className={nodeCls('host_cpu', 'amber')} {...interactiveProps('host_cpu')}>
        <rect x="18" y="12" width="388" height="42" rx="7" />
        <text className="gr-ov-t" x="212" y="29" textAnchor="middle">{t('ovSvgHostTitle')}</text>
        <text className="gr-ov-s" x="212" y="44" textAnchor="middle">{t('ovSvgHostSub')}</text>
      </g>

      <line
        className={`gr-ov-flow ${activeFlow === 'dispatch' ? 'hot' : ''}`}
        x1="212" y1="54" x2="212" y2="75"
        markerEnd={activeFlow === 'dispatch' ? 'url(#gr-ov-arr-hot)' : 'url(#gr-ov-arr)'}
      />
      <text className="gr-ov-bus" x="222" y="69">{t('ovSvgBus')}</text>

      {/* GPU Die Frame */}
      <rect className="gr-ov-die" x="10" y="79" width="404" height="307" rx="10" />
      <text className="gr-ov-hdr" x="22" y="98">{t('ovSvgDieHdr')}</text>

      {/* GigaThread Engine */}
      <g className={nodeCls('gigathread', 'blue')} {...interactiveProps('gigathread')}>
        <rect x="22" y="106" width="380" height="34" rx="6" />
        <text className="gr-ov-t" x="212" y="121" textAnchor="middle">{t('ovSvgGigaTitle')}</text>
        <text className="gr-ov-s" x="212" y="134" textAnchor="middle">{t('ovSvgGigaSub')}</text>
      </g>

      <line
        className={`gr-ov-flow ${activeFlow === 'dispatch' ? 'hot' : ''}`}
        x1="212" y1="140" x2="212" y2="152"
        markerEnd={activeFlow === 'dispatch' ? 'url(#gr-ov-arr-hot)' : 'url(#gr-ov-arr)'}
      />

      {/* SM Array */}
      <g className={nodeCls('sm_array', 'indigo')} {...interactiveProps('sm_array')}>
        <rect x="22" y="154" width="380" height="112" rx="7" />
        <text className="gr-ov-t" x="32" y="171">{t('ovSvgSmArrayTitle')}</text>
        {SM_TILES.map((tile) => {
          const tx = 32 + tile.col * 60.5;
          const ty = 180 + tile.row * 26;
          return (
            <g key={tile.idx}>
              <rect
                className={tile.isZoomed ? 'gr-ov-sm-zoomed' : 'gr-ov-sm-tile'}
                x={tx}
                y={ty}
                width="55"
                height="21"
                rx="4"
              />
              <text
                className={tile.isZoomed ? 'gr-ov-sm-lbl zoomed' : 'gr-ov-sm-lbl'}
                x={tx + 27.5}
                y={ty + 13.5}
                textAnchor="middle"
              >
                {tile.label}
              </text>
            </g>
          );
        })}
      </g>

      {/* Shared L2 Cache */}
      <g className={nodeCls('l2_cache', 'emerald')} {...interactiveProps('l2_cache')}>
        <rect x="22" y="276" width="380" height="38" rx="6" />
        <text className="gr-ov-t" x="212" y="292" textAnchor="middle">{t('ovSvgL2Title')}</text>
        <text className="gr-ov-s" x="212" y="306" textAnchor="middle">{t('ovSvgL2Sub')}</text>
      </g>

      {/* HBM Global Memory */}
      <g className={nodeCls('hbm', 'amber')} {...interactiveProps('hbm')}>
        <rect x="22" y="330" width="244" height="46" rx="7" />
        <text className="gr-ov-t" x="144" y="350" textAnchor="middle">{t('ovSvgHbmTitle')}</text>
        <text className="gr-ov-s" x="144" y="365" textAnchor="middle">{t('ovSvgHbmSub')}</text>
      </g>

      {/* NVLink Fabric */}
      <g className={nodeCls('nvlink', 'blue')} {...interactiveProps('nvlink')}>
        <rect x="274" y="330" width="128" height="46" rx="7" />
        <text className="gr-ov-t" x="338" y="350" textAnchor="middle">{t('ovSvgNvlTitle')}</text>
        <text className="gr-ov-s" x="338" y="365" textAnchor="middle">{t('ovSvgNvlSub')}</text>
      </g>

      {/* === ZOOM PROJECTION FROM SM 5 TO RIGHT PANEL === */}
      <polygon className="gr-ov-zoom-fill" points="389.5,180 446,12 446,386 389.5,201" />
      <line className="gr-ov-zoom-line" x1="389.5" y1="180" x2="446" y2="12" />
      <line className="gr-ov-zoom-line" x1="389.5" y1="201" x2="446" y2="386" />

      {/* === RIGHT: ZOOMED INSIDE 1 SM === */}
      <rect className="gr-ov-sm-frame" x="446" y="12" width="404" height="374" rx="10" />
      <text className="gr-ov-hdr" x="460" y="33">{t('ovSvgZoomHdr')}</text>
      <text className="gr-ov-subhdr" x="460" y="48">{t('ovSvgZoomSub')}</text>

      {/* Warp Schedulers */}
      <g className={nodeCls('warp_sched', 'blue')} {...interactiveProps('warp_sched')}>
        <rect x="460" y="62" width="184" height="74" rx="7" />
        <text className="gr-ov-t" x="552" y="84" textAnchor="middle">{t('ovSvgWarpTitle')}</text>
        <text className="gr-ov-s" x="552" y="102" textAnchor="middle">{t('ovSvgWarpSub1')}</text>
        <text className="gr-ov-tag" x="552" y="122" textAnchor="middle">{t('ovSvgWarpTag')}</text>
      </g>

      {/* Register File */}
      <g className={nodeCls('reg_file', 'emerald')} {...interactiveProps('reg_file')}>
        <rect x="654" y="62" width="182" height="74" rx="7" />
        <text className="gr-ov-t" x="745" y="84" textAnchor="middle">{t('ovSvgRegTitle')}</text>
        <text className="gr-ov-s" x="745" y="102" textAnchor="middle">{t('ovSvgRegSub1')}</text>
        <text className="gr-ov-tag" x="745" y="122" textAnchor="middle">{t('ovSvgRegTag')}</text>
      </g>

      {/* CUDA Cores */}
      <g className={nodeCls('cuda_core', 'blue')} {...interactiveProps('cuda_core')}>
        <rect x="460" y="156" width="162" height="104" rx="7" />
        <text className="gr-ov-t" x="541" y="182" textAnchor="middle">{t('ovSvgCudaTitle')}</text>
        <text className="gr-ov-s" x="541" y="202" textAnchor="middle">{t('ovSvgCudaSub1')}</text>
        <text className="gr-ov-s" x="541" y="220" textAnchor="middle">{t('ovSvgCudaSub2')}</text>
        <text className="gr-ov-tag" x="541" y="244" textAnchor="middle">{t('ovSvgCudaTag')}</text>
      </g>

      {/* Tensor Cores */}
      <g className={nodeCls('tensor_core', 'indigo')} {...interactiveProps('tensor_core')}>
        <rect x="632" y="156" width="204" height="104" rx="7" />
        <text className="gr-ov-t" x="734" y="182" textAnchor="middle">{t('ovSvgTcTitle')}</text>
        <text className="gr-ov-s" x="734" y="202" textAnchor="middle">{t('ovSvgTcSub1')}</text>
        <text className="gr-ov-s" x="734" y="220" textAnchor="middle">{t('ovSvgTcSub2')}</text>
        <text className="gr-ov-tag" x="734" y="244" textAnchor="middle">{t('ovSvgTcTag')}</text>
      </g>

      {/* Shared Memory / L1 + TMA */}
      <g className={nodeCls('smem_l1', 'emerald')} {...interactiveProps('smem_l1')}>
        <rect x="460" y="280" width="376" height="92" rx="7" />
        <text className="gr-ov-t" x="648" y="306" textAnchor="middle">{t('ovSvgSmemTitle')}</text>
        <text className="gr-ov-s" x="648" y="328" textAnchor="middle">{t('ovSvgSmemSub1')}</text>
        <text className="gr-ov-tag" x="648" y="352" textAnchor="middle">{t('ovSvgSmemTag')}</text>
      </g>

      {/* === DATAFLOW ARROWS === */}
      {/* Load: HBM -> L2 -> SMEM */}
      <line
        className={`gr-ov-flow ${activeFlow === 'load' ? 'hot' : ''}`}
        x1="120" y1="330" x2="120" y2="316"
        markerEnd={activeFlow === 'load' ? 'url(#gr-ov-arr-hot)' : 'url(#gr-ov-arr)'}
      />
      <path
        className={`gr-ov-flow ${activeFlow === 'load' ? 'hot' : ''}`}
        d="M 402 292 C 426 292, 428 320, 458 320"
        fill="none"
        markerEnd={activeFlow === 'load' ? 'url(#gr-ov-arr-hot)' : 'url(#gr-ov-arr)'}
      />

      {/* Compute: SMEM -> Tensor Core & Reg/Warp -> Tensor Core */}
      <line
        className={`gr-ov-flow ${activeFlow === 'compute' ? 'hot' : ''}`}
        x1="734" y1="280" x2="734" y2="262"
        markerEnd={activeFlow === 'compute' ? 'url(#gr-ov-arr-hot)' : 'url(#gr-ov-arr)'}
      />
      <line
        className={`gr-ov-flow ${activeFlow === 'compute' ? 'hot' : ''}`}
        x1="745" y1="136" x2="745" y2="154"
        markerEnd={activeFlow === 'compute' ? 'url(#gr-ov-arr-hot)' : 'url(#gr-ov-arr)'}
      />
      <line
        className={`gr-ov-flow ${activeFlow === 'compute' ? 'hot' : ''}`}
        x1="606" y1="136" x2="646" y2="154"
        markerEnd={activeFlow === 'compute' ? 'url(#gr-ov-arr-hot)' : 'url(#gr-ov-arr)'}
      />

      {/* Store: SM -> L2 -> HBM */}
      <path
        className={`gr-ov-flow ${activeFlow === 'store' ? 'hot' : ''}`}
        d="M 458 304 C 430 304, 426 304, 404 304"
        fill="none"
        markerEnd={activeFlow === 'store' ? 'url(#gr-ov-arr-hot)' : 'url(#gr-ov-arr)'}
      />
      <line
        className={`gr-ov-flow ${activeFlow === 'store' ? 'hot' : ''}`}
        x1="176" y1="314" x2="176" y2="328"
        markerEnd={activeFlow === 'store' ? 'url(#gr-ov-arr-hot)' : 'url(#gr-ov-arr)'}
      />
    </svg>
  );
}
