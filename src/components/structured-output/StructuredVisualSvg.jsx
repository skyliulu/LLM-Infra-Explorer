import React from 'react';

export function XGrammarSplitSvg({ maskEngine, vocabSize }) {
  const words = Math.ceil(vocabSize / 32);
  const bitmaskKB = Math.round((words * 4) / 1024);

  return (
    <svg className="so-svg" viewBox="0 0 460 154" role="img" aria-label="Vocabulary Bitmask Splitting Comparison">
      <rect className="so-svg-bg" x="4" y="4" width="452" height="146" rx="8" />
      <text className="so-svg-hdr" x="14" y="21">
        {maskEngine === 'xgrammar'
          ? `XGrammar Adaptive Split: |V| = ${vocabSize.toLocaleString()} → ${words.toLocaleString()} × uint32 (${bitmaskKB} KB/state)`
          : maskEngine === 'fsm_index'
            ? `Outlines Full FSM Index: Pre-Index Entire |V| = ${vocabSize.toLocaleString()} Per State`
            : `Naive Per-Step Scan: Re-Evaluate Regex Across All ${vocabSize.toLocaleString()} Tokens Every Step`}
      </text>

      {maskEngine === 'xgrammar' && (
        <g>
          {/* 99% Context-Independent Offline */}
          <g className="so-svg-node emerald">
            <rect x="14" y="34" width="268" height="72" rx="6" />
            <text className="so-svg-t" x="26" y="54">~99% Context-Independent Tokens (Offline)</text>
            <text className="so-svg-s" x="26" y="70">Validity depends only on current local rule</text>
            <text className="so-svg-s" x="26" y="85">Precomputed Adaptive Bitmask · {bitmaskKB} KB / state</text>
            <text className="so-svg-s" x="26" y="99">O(1) table lookup at decode time (0 regex work)</text>
          </g>
          {/* ~1% Context-Dependent Runtime */}
          <g className="so-svg-node amber">
            <rect x="292" y="34" width="154" height="72" rx="6" />
            <text className="so-svg-t" x="302" y="54">~1% Boundary Tokens</text>
            <text className="so-svg-s" x="302" y="70">Closing &#125;, ], quotes</text>
            <text className="so-svg-s" x="302" y="85">Checked via PDA stack</text>
            <text className="so-svg-s" x="302" y="99">~1,200 tok · ~40 µs CPU</text>
          </g>
          <text className="so-svg-s" x="14" y="132">
            Offline bitmask + tiny runtime stack patch → merged into one {bitmaskKB} KB GPU uint32 bitmask before Softmax.
          </text>
        </g>
      )}

      {maskEngine === 'fsm_index' && (
        <g>
          <g className="so-svg-node blue">
            <rect x="14" y="34" width="222" height="72" rx="6" />
            <text className="so-svg-t" x="26" y="54">Offline Regex → DFA Index</text>
            <text className="so-svg-s" x="26" y="70">Builds state → valid token list</text>
            <text className="so-svg-s" x="26" y="85">High RAM (~180 MB+) on large schemas</text>
            <text className="so-svg-s" x="26" y="99">Cannot express arbitrary nested CFG</text>
          </g>
          <line className="so-svg-edge" x1="236" y1="70" x2="264" y2="70" />
          <g className="so-svg-node indigo">
            <rect x="266" y="34" width="180" height="72" rx="6" />
            <text className="so-svg-t" x="276" y="54">Decode-Time Mask Fill</text>
            <text className="so-svg-s" x="276" y="70">Materialize valid IDs → mask</text>
            <text className="so-svg-s" x="276" y="85">~0.42 ms / step on CPU</text>
            <text className="so-svg-s" x="276" y="99">Fast for flat JSON / regex</text>
          </g>
          <text className="so-svg-s" x="14" y="132">
            Eliminates per-step regex scanning, but cold compile latency and DFA state explosion limit deep recursion.
          </text>
        </g>
      )}

      {maskEngine === 'naive_scan' && (
        <g>
          <g className="so-svg-node amber">
            <rect x="14" y="34" width="432" height="72" rx="6" />
            <text className="so-svg-t" x="26" y="54">100% Brute-Force Vocab Scan Every Decode Step ({vocabSize.toLocaleString()} iterations)</text>
            <text className="so-svg-s" x="26" y="72">For every token v in 0..|V|-1: clone parser state → feed token string → test accept/reject</text>
            <text className="so-svg-s" x="26" y="90">8.4–16.8 ms CPU stall per token → destroys 15 ms GPU decode step (56%+ overhead!)</text>
          </g>
          <text className="so-svg-s" x="14" y="132">
            Modern 128K–256K vocabularies make naive runtime vocabulary scanning unusable for online serving.
          </text>
        </g>
      )}
    </svg>
  );
}

export function JumpFsmSvg({ jumpMode }) {
  const isJump = jumpMode === 'jump_forward';
  return (
    <svg className="so-svg" viewBox="0 0 540 132" role="img" aria-label="Compressed FSM Jump-Forward Graph">
      <rect className="so-svg-bg" x="4" y="4" width="532" height="124" rx="8" />
      <text className="so-svg-hdr" x="14" y="21">
        {isJump
          ? 'Compressed FSM: Singular-Edge Deterministic Chains Collapse Into Mini-Prefill Jumps'
          : 'Uncompressed FSM: Every Deterministic JSON Key Token Triggers a Full 70B GPU Decode Step'}
      </text>

      {/* Nodes */}
      {[
        { x: 14, w: 94, cls: isJump ? 'emerald' : 'blue', t: isJump ? 'Jump Span 1' : '3 GPU Steps', s: '{"status":"' },
        { x: 132, w: 80, cls: 'amber', t: 'Sample #1', s: '"ok" (Free)' },
        { x: 236, w: 96, cls: isJump ? 'emerald' : 'blue', t: isJump ? 'Jump Span 2' : '4 GPU Steps', s: '","count":' },
        { x: 356, w: 72, cls: 'amber', t: 'Sample #2', s: '42 (Free)' },
        { x: 452, w: 74, cls: isJump ? 'emerald' : 'blue', t: isJump ? 'Jump → End' : '6 GPU Steps', s: ',"tag":..}' },
      ].map((n, idx, arr) => (
        <g key={n.s}>
          <g className={`so-svg-node ${n.cls}`}>
            <rect x={n.x} y="36" width={n.w} height="52" rx="6" strokeDasharray={isJump && n.cls === 'emerald' ? '4 2' : undefined} />
            <text className="so-svg-t" x={n.x + n.w / 2} y="56" textAnchor="middle">{n.t}</text>
            <text className="so-svg-s" x={n.x + n.w / 2} y="74" textAnchor="middle">{n.s}</text>
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
        {isJump
          ? 'Out-degree-1 chains bypass sampling → KV updated via parallel mini-prefill (13 → 4 GPU steps, 3.25×).'
          : '13 serial decode steps reload full 70B weights 13× from HBM even when 10 of 13 tokens are deterministic.'}
      </text>
    </svg>
  );
}
