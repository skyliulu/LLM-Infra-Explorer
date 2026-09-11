import React, { useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import { MathFormula } from '../linear-attention/MathFormula';
import { sampleMatrixRows } from './matrix-model';

const SCENE_WIDTH = 600;

const columnSymbols = {
  shared: ['c_0', 'c_1'], local: ['k_0=v_0', 'k_1=v_1'],
  separate: ['k_0', 'k_1', 'v_0', 'v_1'], index: ['k^I_0', 'k^I_1', 'I'],
  reads: ['k_0', 'k_1', '\\ell', 'a', 'v_0', 'v_1'], query: ['d_0', 'd_1'],
};

function Matrix({ rows, kind, traceId, compact, t, onSelect }) {
  const columns = columnSymbols[kind];
  const visible = sampleMatrixRows(rows, traceId, 6);
  return <div className={`sm-matrix sm-${kind}`} data-matrix={kind} data-total-rows={rows.length}>
    <div className="sm-matrix-head" style={{ '--columns': columns.length }}><span>{kind === 'query' ? <MathFormula>{'q'}</MathFormula> : t('matrixRows')}</span>{columns.map(symbol => <span key={symbol} title={symbol === 'a' ? t('matrixWeight') : symbol === '\\ell' ? t('matrixLogit') : symbol === 'I' ? t('matrixScore') : undefined}><MathFormula>{symbol}</MathFormula></span>)}<span/></div>
    {!rows.length && <p className="sm-empty">{t('matrixEmpty')}</p>}
    {visible.map(row => row.gap ? <div key={row.id} className="sm-gap">⋮ {row.gap} {t('matrixOmitted')}</div> :
      <MatrixRow key={row.id} row={row} columns={columns} kind={kind} selected={row.id === traceId} t={t} onSelect={onSelect}/>) }
    {kind === 'separate' && <small className="sm-narrow-note">{t('matrixNarrowKeys')}</small>}
  </div>;
}

function MatrixRow({ row, columns, kind, selected, t, onSelect }) {
  const Tag = onSelect ? 'button' : 'div';
  return <Tag className={`sm-row ${row.read ? 'sm-read' : ''}`} style={{ '--columns': columns.length }}
    data-matrix-record={row.id} data-read={row.read ?? undefined}
    {...(onSelect ? { onClick: () => onSelect(row), 'aria-pressed': selected,
      'aria-label': `${row.id} · ${t(row.read ? 'matrixRead' : 'matrixResident')}` } : {})}>
    <span className="sm-row-id">{row.symbol ? <MathFormula>{row.symbol}</MathFormula> : row.id}</span>
    <MatrixCells values={row.cells} kind={kind}/>
    <span className="sm-read-mark" aria-hidden="true">{row.read ? '✓' : ''}</span>
  </Tag>;
}


function MatrixCells({ values, kind }) {
  return values.map((value, i) => {
    const weight = kind === 'reads' && i === 3;
    return <span key={i} className={`sm-cell ${value < 0 ? 'sm-negative' : 'sm-positive'}`} title={value.toFixed(5)}
      style={{ '--strength': .08 + Math.min(Math.abs(value) / (weight ? 1 : 1.5), 1) * .26 }}>
      {weight ? `${(value * 100).toFixed(1)}%` : value.toFixed(2)}
    </span>;
  });
}

function NodeTitle({ id, m, t, onFocus, shape }) {
  return <div className="sm-node-heading"><span className="sm-node-title"><strong>{t(`${id}Node`)}</strong><ArrowUpRight size={16}/></span>{shape && <span title={t('matrixDimensions')}><MathFormula>{shape}</MathFormula></span>}</div>;
}

function BlockHit({ id, m, t, onFocus, target = id }) {
  return <button className="sm-block-hit" data-node={id} aria-label={t(`${id}Node`)} aria-pressed={m.focus === id} onClick={() => onFocus(target)}/>;
}

// The same scene is scaled, never reflowed or sampled differently for drill-down.
function ScaledGraph({ children, compact, t, onFocus }) {
  const host = useRef(null), scene = useRef(null);
  const [size, setSize] = useState({ width: SCENE_WIDTH, height: 900 });
  const [actualSize, setActualSize] = useState(false);
  useLayoutEffect(() => {
    const measure = () => {
      const next = { width: host.current.clientWidth, height: scene.current.offsetHeight };
      setSize(old => old.width === next.width && old.height === next.height ? old : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host.current); observer.observe(scene.current);
    return () => observer.disconnect();
  }, []);
  const scale = actualSize ? 1 : Math.min(1, size.width / SCENE_WIDTH);
  return <div style={{ '--scene-width': `${SCENE_WIDTH}px` }} className={`sm-viewport ${compact ? 'sm-detail-map' : ''}`}>
    <div className="sm-zoom-tools"><span>{t('sameMap')} · {Math.round(scale * 100)}%</span><button onClick={() => setActualSize(value => !value)} aria-pressed={actualSize}>{t(actualSize ? 'fitMap' : 'actualMap')}</button>{compact && <button onClick={() => onFocus('overview')}>{t('expandMap')}</button>}</div>
    <div className="sm-scene-scroll" ref={host}><div className="sm-scene-size" style={{ width: SCENE_WIDTH * scale, height: size.height * scale }}><div ref={scene} className="sm-scene" style={{ transform:`scale(${scale})` }}>{children}</div></div></div>
  </div>;
}

function GlobalRecords({ m, t, chooseRecord, onFocus }) {
  return <div className="sm-global-system">
    {m.indexed && <>
      <section className="sm-index-block sm-block" data-matrix-node="index">
        <BlockHit id="index" m={m} t={t} onFocus={onFocus}/>
        <NodeTitle id="index" m={m} t={t}/>
        <div className="sm-index-summary"><MathFormula>{'q^I,K^I'}</MathFormula><ArrowRight size={14}/><span>{t('alignedScan')} {m.indexReads}</span><ArrowRight size={14}/><MathFormula>{`\\operatorname{TopK}(I,${m.topK})`}</MathFormula></div>
        <div className="sm-index-ids"><span>{t('selectedIds')}</span>{m.matrices.selection.globalIds.map(id => <button key={id} onClick={() => chooseRecord(m.matrices.global.find(row => row.id === id),'index')}>{id}</button>)}{!m.global.length && <span>{t('matrixEmpty')}</span>}</div>
      </section>
      <div className="sm-id-link"><ArrowDown size={18}/><span>{t('idsNotValues')}</span></div>
    </>}
    <section className="sr-global sm-block" data-matrix-node="cache">
      <BlockHit id="cache" m={m} t={t} onFocus={onFocus}/>
      <NodeTitle id="cache" m={m} t={t} shape={`${m.compressed ? 'C' : 'K,V'}:${m.global.length}\\times2`}/>
      <div className="sr-branch-caption"><strong>{t('mainStoresValues')}</strong><span>{t('resident')} {m.global.length} · {t('readNow')} {m.globalReads}</span></div>
      <Matrix rows={m.matrices.global} kind={m.compressed ? 'shared' : 'separate'} traceId={m.matrices.traceId} t={t} onSelect={row => chooseRecord(row,'cache')}/>
      <div className="sr-global-caption"><MathFormula>{m.compressed ? `N=${m.tokens}\\xrightarrow{r=${m.ratio}}G=${m.global.length}` : `G=N=${m.tokens}`}</MathFormula></div>
      {m.compressed && m.tail.length > 0 && <small className="sr-independent">{t('matrixPending')} · {m.tail.length}</small>}
    </section>
    {m.indexed && <small className="sm-independent-note">{t('separateStorage')}</small>}
  </div>;
}

function StorageScale({ m, t, onFocus }) {
  const parts = [{id:'cache', bytes:m.resources.globalStoredBytes}, ...(m.hasWindow ? [{id:'local', bytes:m.resources.localStoredBytes}] : []), ...(m.indexed ? [{id:'index',bytes:m.resources.indexStoredBytes}] : [])];
  return <div className="sm-storage-scale">
    <div className="sm-storage-labels"><strong>{t('storageScale')}</strong>{parts.map(part => <button key={part.id} onClick={() => onFocus(part.id)}><i className={`sm-storage-${part.id}`}/>{t(`${part.id}Node`)} {+(part.bytes/1024).toFixed(3)} KiB</button>)}</div>
    <div className="sm-storage-bar" aria-label={t('storageScale')}>{parts.map(part => <button key={part.id} className={`sm-storage-${part.id}`} style={{width:`${100*part.bytes/m.resources.storedBytes}%`}} data-storage-part={part.id} data-bytes={part.bytes} disabled={!part.bytes} onClick={() => onFocus(part.id)} aria-label={`${t(`${part.id}Node`)} ${part.bytes} B`}/>)}</div>
    <small>{t('storageScaleNote')}</small>
  </div>;
}

export function MatrixSystemGraph({ model: m, t, onFocus, chooseRecord, compact }) {
  const title = (id, shape) => <NodeTitle id={id} shape={shape} m={m} t={t} onFocus={onFocus}/>;
  const output = (branch, count, detail) => <div className={`sr-short-edge sr-edge-${branch}`}>
    <button className="sr-flow-output" data-flow={`${branch}-attention`} onClick={() => onFocus('attention')}>
      <span><strong>{t(branch === 'global' ? 'flowGlobalOut' : 'flowLocalOut')} · {count} {t('readRows')}</strong><ArrowRight size={14}/>{t('attentionNode')}</span>
      <small>{detail}</small>
    </button>
  </div>;
  return <ScaledGraph compact={compact} t={t} onFocus={onFocus}><div className="sm-graph sr-graph sr-fixed" aria-label={t('overview')}>
    <div className="sm-guide"><span>{t('matrixAction')}</span><small>{t('matrixLegend')}</small></div>
    <div className="sm-history sm-block" data-matrix-node="history" title={t('matrixSourceHint')}>
      <BlockHit id="history" target="cache" m={m} t={t} onFocus={onFocus}/><div><strong>{t('historyNode')}</strong><MathFormula>{`N=${m.tokens}`}</MathFormula><span>{t('matrixSource')}{m.tracedRecord && ` · ${m.tracedRecord.id}`}</span></div>
      <div className="sm-token-strip">{m.matrices.history.map(row => <span key={row.position} className={`${row.traced ? 'sm-source' : ''} ${row.traced && row.previous ? 'sm-previous' : ''} ${row.local ? 'sm-window' : ''}`} title={`T${row.position + 1}`} data-source-token={row.position + 1} data-traced={row.traced}>{row.position + 1}</span>)}</div>
    </div>
    <section className="sr-query sm-block" data-matrix-node="query"><BlockHit id="query" m={m} t={t} onFocus={onFocus}/>
      {title('query')}
      <div className="sr-query-vectors">
        <div className="sr-query-vector"><MathFormula>{'q'}</MathFormula><MatrixCells values={m.mainQuery}/><button className="sr-query-port" data-flow="query-attention" onClick={() => onFocus('attention')}><ArrowRight size={14}/>{t('alignedToAttention')}<ArrowUpRight size={12}/></button></div>
        {m.indexed && <div className="sr-index-query" data-testid="index-query-path">{m.queryHeads.map((values,i) => <div key={i} className="sr-query-vector"><MathFormula>{`q^I_{${i+1}}`}</MathFormula><MatrixCells values={values}/></div>)}<button className="sr-query-port" data-flow="query-index" onClick={() => onFocus('index')}><ArrowRight size={14}/>{t('alignedToIndex')}<ArrowUpRight size={12}/></button></div>}
      </div>
    </section>
    <StorageScale m={m} t={t} onFocus={onFocus}/><div className="sr-input-note">{t(m.hasWindow ? 'flowParallel' : 'flowSingle')}</div>
    <div className={`sr-branches ${m.hasWindow ? '' : 'sr-single'}`}>
      <div className="sr-branch"><div className="sr-flow-input"><span>{t('flowGlobalIn')}</span><ArrowDown size={18}/></div><GlobalRecords m={m} t={t} compact={compact} chooseRecord={chooseRecord} onFocus={onFocus}/>{output('global',m.globalReads,t(m.indexed ? 'matrixSelect' : 'alignedNoIndex'))}</div>
      {m.hasWindow && <div className="sr-branch"><div className="sr-flow-input"><span>{t('flowLocalIn')}</span><ArrowDown size={18}/></div><section className="sr-local sm-block" data-matrix-node="local"><BlockHit id="local" m={m} t={t} onFocus={onFocus}/><div className="sr-branch-caption"><strong>{t('alignedLocal')}</strong><span>{t('readNow')} {m.local.length}</span></div>{title('local',`${m.local.length}\\times2`)}<Matrix rows={m.matrices.local} kind="local" traceId={m.matrices.traceId} compact={compact} t={t} onSelect={row=>chooseRecord(row,'local')}/><div className="sr-global-caption"><MathFormula>{`L=\\min(N,W)=${m.local.length}`}</MathFormula></div></section>{output('local',m.local.length,t('alignedAllLocal'))}</div>}
    </div>
    <div className="sr-merge-link"><ArrowDown size={20}/><span>{t(m.hasWindow ? 'flowMerge' : 'matrixSelect')}</span></div>
    <section className="sr-attention sm-block" data-matrix-node="attention"><BlockHit id="attention" m={m} t={t} onFocus={onFocus}/>
      <div className="sm-read-set" aria-label={t('jointReadSet')}><span>{t('globalLabel')}</span><b>{m.matrices.selection.globalIds.join(' · ') || t('matrixEmpty')}</b>{m.hasWindow && <><span>＋ {t('localLabel')}</span><b>{m.matrices.selection.localRange.join('–')}</b></>}<ArrowRight size={13}/><strong>{m.mainReads} {t('readRows')}</strong></div>
      {title('attention',`K_{\\mathcal R},V_{\\mathcal R}:${m.mainReads}\\times2`)}
      <div className="sr-attention-body">
        <Matrix rows={m.matrices.reads} kind="reads" traceId={m.matrices.traceId} compact={compact} t={t} onSelect={row=>chooseRecord(row,'attention')}/>
        <div className="sr-attention-result"><span>{t('alignedToAttention')} <MathFormula>{'q'}</MathFormula></span><div className="sr-query-vector"><MatrixCells values={m.mainQuery}/></div><MathFormula>{'\\ell=K_{\\mathcal R}q^T/\\sqrt2'}</MathFormula><MathFormula>{'a=\\operatorname{softmax}(\\ell)'}</MathFormula><MathFormula>{'o=a^TV_{\\mathcal R}'}</MathFormula><div className="sm-output"><span>{t('matrixOutput')}</span><MathFormula>{`o=\\begin{bmatrix}${m.output.map(v=>v.toFixed(3)).join('&')}\\end{bmatrix}`}</MathFormula></div></div>
      </div>
      <small className="sr-independent">{t('matrixAllWeights')}</small>
    </section>
    <p className="sm-boundary">{t('matrixBoundary')}</p>
  </div></ScaledGraph>;
}
