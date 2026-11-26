import React from 'react';

export function XGrammarSplitSvg({ maskEngine, vocabSize, t }) {
  const words = Math.ceil(vocabSize / 32);
  const bitmaskKB = Math.round((words * 4) / 1024);

  return (
    <svg className="so-svg" viewBox="0 0 460 154" role="img" aria-label={t('svgSplitAria')}>
      <rect className="so-svg-bg" x="4" y="4" width="452" height="146" rx="8" />
      <text className="so-svg-hdr" x="14" y="21">
        {maskEngine === 'xgrammar'
          ? `${t('svgSplitHdrXg')}: |V| = ${vocabSize.toLocaleString()} → ${words.toLocaleString()} × uint32 (${bitmaskKB} KB)`
          : maskEngine === 'fsm_index'
            ? `${t('svgSplitHdrFsm')}: |V| = ${vocabSize.toLocaleString()}`
            : `${t('svgSplitHdrNaive')}: |V| = ${vocabSize.toLocaleString()}`}
      </text>

      {maskEngine === 'xgrammar' && (
        <g>
          {/* 99% Context-Independent Offline */}
          <g className="so-svg-node emerald">
            <rect x="14" y="34" width="268" height="72" rx="6" />
            <text className="so-svg-t" x="26" y="54">{t('svgXgLTitle')}</text>
            <text className="so-svg-s" x="26" y="70">{t('svgXgL1')}</text>
            <text className="so-svg-s" x="26" y="85">{`${t('svgXgL2')} ${bitmaskKB} KB`}</text>
            <text className="so-svg-s" x="26" y="99">{t('svgXgL3')}</text>
          </g>
          {/* ~1% Context-Dependent Runtime */}
          <g className="so-svg-node amber">
            <rect x="292" y="34" width="154" height="72" rx="6" />
            <text className="so-svg-t" x="302" y="54">{t('svgXgRTitle')}</text>
            <text className="so-svg-s" x="302" y="70">{t('svgXgR1')}</text>
            <text className="so-svg-s" x="302" y="85">{t('svgXgR2')}</text>
            <text className="so-svg-s" x="302" y="99">{t('svgXgR3')}</text>
          </g>
          <text className="so-svg-s" x="14" y="132">{t('svgXgFoot')}</text>
        </g>
      )}

      {maskEngine === 'fsm_index' && (
        <g>
          <g className="so-svg-node blue">
            <rect x="14" y="34" width="222" height="72" rx="6" />
            <text className="so-svg-t" x="26" y="54">{t('svgFsmLTitle')}</text>
            <text className="so-svg-s" x="26" y="70">{t('svgFsmL1')}</text>
            <text className="so-svg-s" x="26" y="85">{t('svgFsmL2')}</text>
            <text className="so-svg-s" x="26" y="99">{t('svgFsmL3')}</text>
          </g>
          <line className="so-svg-edge" x1="236" y1="70" x2="264" y2="70" />
          <g className="so-svg-node indigo">
            <rect x="266" y="34" width="180" height="72" rx="6" />
            <text className="so-svg-t" x="276" y="54">{t('svgFsmRTitle')}</text>
            <text className="so-svg-s" x="276" y="70">{t('svgFsmR1')}</text>
            <text className="so-svg-s" x="276" y="85">{t('svgFsmR2')}</text>
            <text className="so-svg-s" x="276" y="99">{t('svgFsmR3')}</text>
          </g>
          <text className="so-svg-s" x="14" y="132">{t('svgFsmFoot')}</text>
        </g>
      )}

      {maskEngine === 'naive_scan' && (
        <g>
          <g className="so-svg-node amber">
            <rect x="14" y="34" width="432" height="72" rx="6" />
            <text className="so-svg-t" x="26" y="54">{t('svgNaiveTitle')}</text>
            <text className="so-svg-s" x="26" y="72">{t('svgNaive1')}</text>
            <text className="so-svg-s" x="26" y="90">{t('svgNaive2')}</text>
          </g>
          <text className="so-svg-s" x="14" y="132">{t('svgNaiveFoot')}</text>
        </g>
      )}
    </svg>
  );
}

export function JumpFsmSvg({ jumpMode, t }) {
  const isJump = jumpMode === 'jump_forward';
  // Exact 13-token breakdown matching model.js: 3 + 1 + 3 + 1 + 5 = 13!
  const nodes = [
    { x: 14, w: 94, cls: isJump ? 'emerald' : 'blue', title: isJump ? t('svgJumpSpan1') : t('svgJumpSteps3'), sub: '{"status":"' },
    { x: 132, w: 80, cls: 'amber', title: t('svgJumpSample1'), sub: t('svgJumpFreeOk') },
    { x: 236, w: 96, cls: isJump ? 'emerald' : 'blue', title: isJump ? t('svgJumpSpan2') : t('svgJumpSteps3'), sub: '","count":' },
    { x: 356, w: 72, cls: 'amber', title: t('svgJumpSample2'), sub: t('svgJumpFree42') },
    { x: 452, w: 74, cls: isJump ? 'emerald' : 'blue', title: isJump ? t('svgJumpSpan3') : t('svgJumpSteps5'), sub: ',"tag":..}' },
  ];

  return (
    <svg className="so-svg" viewBox="0 0 540 132" role="img" aria-label={t('svgJumpAria')}>
      <rect className="so-svg-bg" x="4" y="4" width="532" height="124" rx="8" />
      <text className="so-svg-hdr" x="14" y="21">
        {isJump ? t('svgJumpHdrOn') : t('svgJumpHdrOff')}
      </text>

      {nodes.map((n, idx, arr) => (
        <g key={n.sub}>
          <g className={`so-svg-node ${n.cls}`}>
            <rect x={n.x} y="36" width={n.w} height="52" rx="6" strokeDasharray={isJump && n.cls === 'emerald' ? '4 2' : undefined} />
            <text className="so-svg-t" x={n.x + n.w / 2} y="56" textAnchor="middle">{n.title}</text>
            <text className="so-svg-s" x={n.x + n.w / 2} y="74" textAnchor="middle">{n.sub}</text>
          </g>
          {idx < arr.length - 1 && (
            <line
              className={`so-svg-edge ${isJump ? 'hi' : ''}`}
              x1={n.x + n.w}
              y1="62"
              x2={arr[idx + 1].x}
              y2="62"
            />
          )}
        </g>
      ))}

      <text className="so-svg-s" x="14" y="112">
        {isJump ? t('svgJumpFootOn') : t('svgJumpFootOff')}
      </text>
    </svg>
  );
}
