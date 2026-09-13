import {ProjectionInspector} from './QueryProjection';
import React from 'react';
import { MathFormula } from '../linear-attention/MathFormula';
import { InformationTradeoff } from './InformationTradeoff';

const vectorTex = (symbol, values) => `${symbol}=\\begin{bmatrix}${values.map(v => v.toFixed(3)).join('&')}\\end{bmatrix}`;

function Select({label,value,values,onChange}) { return <label className="sc-select"><span>{label}</span><select aria-label={label} value={value} onChange={e => onChange(+e.target.value)}>{values.map(v => <option key={v} value={v}>{v}</option>)}</select></label>; }
function Records({m,t,chooseRecord}) {
  return <><p>{t(m.compressed?'compressedIds':'tokenIds')}</p><small>{t('recordsHint')}</small><div className="sc-records">{m.global.map(e => <button key={e.id} className={e.read ? 'sc-read' : ''} aria-label={`${e.id} · ${t(e.read?'fetched':'notFetched')}`} aria-pressed={m.tracedRecord?.id === e.id} onClick={() => chooseRecord(e)}>{e.id}{e.read && <span> ✓</span>}</button>)}</div></>;
}

export function NodeMicroscope({model:m,t,update,chooseRecord,onFocus,projection}) {
  const c=m.channel;
  if(m.focus === 'history') return <><p>{t('historyIdentity')}</p><MathFormula block>{'H=\\begin{bmatrix}h_1^T\\\\h_2^T\\\\\\vdots\\\\h_N^T\\end{bmatrix}'}</MathFormula><p>{t('tokenIds')}</p><div className="sc-history">{m.history.map(row=><span key={row.position}>{`T${row.position+1}`}</span>)}</div><h3>{t('historyDerivation')}</h3><p>{t('historyProjection')}</p><MathFormula block>{'h_s\\xrightarrow{\\text{projection}}(k_s,v_s)'}</MathFormula>{m.indexed&&<MathFormula block>{'h_s\\xrightarrow{\\text{index projection}}k_s^I'}</MathFormula>}<p>{t(m.compressed?'historyCompressed':'historyUncompressed')}</p><p>{t('historyResidency')}</p><button className="sc-inline-link" onClick={()=>onFocus('cache')}>{t('inspectDerivedCache')} →</button></>;
  if(m.focus === 'query') return <>
    <p>{t(m.indexed?'queryRoles':'queryRolePlain')}</p>
    {m.indexed&&<ProjectionInspector selected={projection} t={t}/>}
    {m.indexed?<details open className="sc-projection-explanation"><summary>{t('pgReference')}</summary>
      <h3>{t('latentWhat')}</h3><p><MathFormula>{'c^Q'}</MathFormula> {t('latentDefinition')}</p>
      <h3>{t('weightOrigin')}</h3><p>{t('weightLifecycle')}</p>
      <div className="sc-weight-kinds"><div><strong>{t('weightFixed')}</strong><MathFormula block>{'W_{\\mathrm{down}},W_{\\mathrm{main}},W^I_1,W^I_2'}</MathFormula></div><div><strong>{t('weightDynamic')}</strong><MathFormula block>{'h_t,c^Q,q,q^I_1,q^I_2'}</MathFormula></div></div>
      <table className="sc-table sc-parameter-table"><thead><tr><th>{t('weightSymbol')}</th><th>{t('weightJob')}</th></tr></thead><tbody>{[['W_{\\mathrm{down}}','weightDown'],['W_{\\mathrm{main}}','weightMain'],['W^I_1','weightHeadOne'],['W^I_2','weightHeadTwo']].map(([symbol,key])=><tr key={key}><th><MathFormula>{symbol}</MathFormula></th><td>{t(key)}</td></tr>)}</tbody></table>
      <p><MathFormula>{'I'}</MathFormula> · {t('weightNotation')}</p>
      <h3>{t('latentFrom')}</h3><p><MathFormula>{'h_t'}</MathFormula> {t('hiddenDefinition')}</p>
      <MathFormula block>{'c^Q=\\operatorname{RMSNorm}(W_{\\mathrm{down}}h_t)'}</MathFormula>
      <p>{t('downDefinition')}</p>
      <MathFormula block>{'h_t\\in\\mathbb R^d,\\quad W_{\\mathrm{down}}\\in\\mathbb R^{r\\times d},\\quad c^Q\\in\\mathbb R^r'}</MathFormula>
      <p><MathFormula>{'d'}</MathFormula> · {t('dimHidden')}；<MathFormula>{'r<d'}</MathFormula> · {t('dimLatent')}</p>
      <h3>{t('latentTo')}</h3><p>{t('branchDefinition')}</p><p>{t('weightRelation')}</p>
      <div className="sc-head-example"><strong>{t('mainQueryLabel')}</strong><MathFormula block>{'q=W_{\\mathrm{main}}c^Q'}</MathFormula><MathFormula block>{'W_{\\mathrm{main}}\\in\\mathbb R^{d_q\\times r}'}</MathFormula></div>
      {[1,2].map(head=><div className="sc-head-example" key={head}><strong>{t('indexHeadLabel')} {head}</strong><MathFormula block>{`q^I_{${head}}=W^I_{${head}}c^Q`}</MathFormula><MathFormula block>{`W^I_{${head}}\\in\\mathbb R^{d_I\\times r}`}</MathFormula></div>)}
      <p>{t('weightStack')}</p><MathFormula block>{'\\begin{bmatrix}q^I_1\\\\q^I_2\\end{bmatrix}=\\underbrace{\\begin{bmatrix}W^I_1\\\\W^I_2\\end{bmatrix}}_{W^I}c^Q'}</MathFormula><p>{t('weightNotScore')}</p>
      <p><MathFormula>{'d_q'}</MathFormula> · {t('dimMain')}；<MathFormula>{'d_I'}</MathFormula> · {t('dimIndex')}</p>
      <p>{t('projectionScope')}</p><a className="sc-inline-link" href="https://huggingface.co/deepseek-ai/DeepSeek-V3.2/blob/main/inference/model.py" target="_blank" rel="noreferrer">{t('projectionSource')}</a>
      <h3>{t('projectionResult')}</h3>
    </details>:<p>{t('queryLatentPlain')}</p>}
    <div className="sc-formula"><strong>{t('mainQueryLabel')}</strong><MathFormula block>{vectorTex('q',m.mainQuery)}</MathFormula></div>
    <p>{t(m.indexed?'querySeparate':'noIndexer')}</p>
    {m.indexed&&<><p>{t('headsMeaning')}</p>{m.queryHeads.map((q,h)=><div className="sc-formula" key={h}><strong>{t('indexHeadLabel')} {h+1}</strong><MathFormula block>{vectorTex(`q^I_{${h+1}}`,q)}</MathFormula></div>)}<button className="sc-inline-link" onClick={()=>onFocus('index')}>{t('headCalculation')} →</button></>}
    <p>{t('vectorMeaning')}</p><p>{t('matrixQueryNote')}</p>
  </>;
  if(m.focus === 'local') return <><p>{t('tokenIds')}</p><div className="sc-local-controls"><Select label={t('window')} value={m.window} values={[4,8,16]} onChange={window => update({window})}/><MathFormula>{`L=\\min(N,W)=${m.local.length}`}</MathFormula></div><div className="sc-history">{m.history.map(h => <span key={h.position} className={h.local?'sc-in-window':''}>{`T${h.position+1}`}</span>)}</div><p>{t('localWindowHint')}</p><div className="sc-records">{m.local.map(e=><button key={e.id} aria-pressed={m.tracedRecord?.id===e.id} onClick={()=>chooseRecord(e)}>{e.id}</button>)}</div>{m.tracedRecord?.position!==undefined&&<div className="sc-formula"><MathFormula block>{vectorTex('k=v',m.tracedRecord.key)}</MathFormula><span>{t('sourcePreview')} · {`T${m.tracedRecord.position+1}`}</span></div>}<button className="sc-inline-link" onClick={()=>onFocus('attention')}>{t('tradeOpen')}</button></>;
  if(m.focus === 'cache') return <>
    {m.compressed && <div className="sc-local-controls"><Select label={t('ratio')} value={m.ratio} values={m.mode === 'csa'?[2,4,8]:[8,16]} onChange={ratio => update(m.mode === 'csa'?{csaRatio:ratio}:{hcaRatio:ratio})}/><MathFormula>{`G=\\lfloor N/r\\rfloor=${m.global.length}`}</MathFormula></div>}
    <Records m={m} t={t} chooseRecord={chooseRecord}/><p>{t(m.compressed ? m.mode === 'csa'?'overlapHint':'nonoverlapHint':'rawHint')}</p>
    {m.entry ? <div className="sc-record-detail"><div className="sc-local-controls"><h3>{t('recordDetail')} · {m.entry.id}</h3>{m.compressed && <Select label={t('channelLabel')} value={c} values={[0,1]} onChange={channel=>update({channel})}/>}</div>
      {m.compressed ? <><div className="sc-history">{m.history.map(h=><span key={h.position} className={h.source ? h.previous?'sc-previous':'sc-source':''}>{`T${h.position+1}`}</span>)}</div><div className="sc-compression-result"><span>{t('compressionResult')} · {m.entry.id}</span><MathFormula>{`c_{${m.inspect+1},${c}}=${m.entry.key[c].toFixed(3)}`}</MathFormula></div><small>{t('gateHint')}</small><div className="sc-formula"><MathFormula>{m.gateFormula}</MathFormula><MathFormula>{m.compressionFormula}</MathFormula></div><table className="sc-table"><thead><tr>{['sourcesLabel','valueLabel','weightLabel','contributionLabel'].map(key=><th key={key}>{t(key)}</th>)}</tr></thead><tbody>{m.entry.main.rows.map(row=><tr key={row.position}><th>{`T${row.position+1}`}<small>{t(row.previous?'previous':'currentGroup')}</small></th><td>{row.values[c].toFixed(3)}</td><td><div className="sc-cell-bar" style={{backgroundSize:`${row.weights[c]*100}% 100%`}}>{row.weights[c].toFixed(3)}</div></td><td>{(row.values[c]*row.weights[c]).toFixed(3)}</td></tr>)}</tbody></table><MathFormula block>{`c_{${m.inspect+1},${c}}=${m.entry.key[c].toFixed(3)}`}</MathFormula></> : <><p>{t('mainKVHint')}</p><MathFormula block>{vectorTex('k',m.entry.key)}</MathFormula><MathFormula block>{vectorTex('v',m.entry.value)}</MathFormula></>}
    </div>:<p>{t('empty')}</p>}
    {m.compressed && <p className="sc-tail">{t('pendingLabel')}: {m.tail.length} · {t('carryLabel')}: {m.carry.length}</p>}<button className="sc-inline-link" onClick={()=>onFocus('attention')}>{t('tradeOpen')}</button>
  </>;
  if(m.focus === 'index') return <IndexInspector m={m} t={t} update={update} chooseRecord={chooseRecord}/>;
  return <><div className="sc-local-controls">{m.indexed && <Select label={t('topK')} value={m.topK} values={[1,2,4,8]} onChange={topK=>update({topK})}/>}<MathFormula>{m.readFormula}</MathFormula></div><InformationTradeoff m={m} t={t}/><h3>{t('jointWeights')}</h3><div className="sc-weights">{m.reads.map(e=><button key={e.id} data-output-record={e.id} aria-pressed={m.tracedRecord?.id===e.id} onClick={()=>chooseRecord(e)}><span>{e.id}<small>{t(e.branch==='local'?'localLabel':'globalLabel')}</small></span><div className="sc-track"><i className={e.branch==='local'?'sc-teal':''} style={{width:`${e.weight*100}%`}}/></div><b>{(e.weight*100).toFixed(1)}%</b></button>)}</div>{m.reads.find(e=>e.id===m.tracedRecord?.id)&&<div className="sc-formula"><strong>{t('contribution')} · {m.tracedRecord.id}</strong><MathFormula block>{vectorTex('a_e v_e',m.reads.find(e=>e.id===m.tracedRecord.id).value.map(v=>v*m.reads.find(e=>e.id===m.tracedRecord.id).weight))}</MathFormula><button className="sc-inline-link" onClick={()=>onFocus(m.tracedRecord.position!==undefined?'local':'cache')}>{t('backSource')}</button></div>}<div className="sc-formula"><MathFormula block>{m.attentionFormula}</MathFormula><MathFormula block>{vectorTex('o',m.output)}</MathFormula></div><small>{t('readHint')}</small></>;
}

function IndexInspector({m,t,update,chooseRecord}) {
  const entry=m.entry;
  return <><p>{t('indexKeyHint')}</p><p>{t(m.compressed?'compressedIds':'tokenIds')}</p><div className="sc-local-controls"><Select label={t('topK')} value={m.topK} values={[1,2,4,8]} onChange={topK=>update({topK})}/><span>{t('scanLabel')} <b>{m.indexReads}</b></span><label className="sc-select"><span>{t('sortLabel')}</span><select aria-label={t('sortLabel')} value={m.scoreOrder} onChange={e=>update({scoreOrder:e.target.value})}><option value="position">{t('positionOrder')}</option><option value="score">{t('scoreOrder')}</option></select></label></div><small>{t('scoreScale')}</small>
    <div className="sc-index-layout"><div className="sc-score-grid" tabIndex={0} aria-label={t('sortLabel')}>{m.scoreEntries.map(e=><button key={e.id} aria-label={`${e.id} · ${t(e.read?'fetched':'notFetched')}`} aria-pressed={e.id===m.tracedRecord?.id} className={e.read?'sc-read':''} onClick={()=>chooseRecord(e)}><span>{e.id}{e.read?' ✓':''}</span><div className="sc-track"><i style={{width:`${e.score/Math.max(.001,...m.global.map(x=>x.score))*100}%`}}/></div><b>{e.score.toFixed(2)}</b></button>)}</div>
    {entry?<div className="sc-score-detail"><h3>{t('viewing')} · {entry.id}</h3><p>{t('tracePositions')}: {entry.sources.map(p=>`T${p+1}`).join(' · ')}</p><p>{t(entry.read?'fetched':'notFetched')}</p>
      <strong>{t('indexKeyLabel')}</strong><MathFormula block>{vectorTex('k^I_s',entry.indexKey)}</MathFormula>
      <h4>{t('headCalculation')}</h4><p>{t('headWeightHint')}</p>
      {m.queryHeads.map((q,h)=>{const dot=q.reduce((v,x,i)=>v+x*entry.indexKey[i],0);return <div key={h} className="sc-head-example"><strong>{t('indexHeadLabel')} {h+1}</strong><MathFormula block>{vectorTex(`q^I_{${h+1}}`,q)}</MathFormula><MathFormula block>{`\\begin{aligned}d_{${h+1}}&=(${q[0].toFixed(3)})(${entry.indexKey[0].toFixed(3)})\\\\&\\quad+(${q[1].toFixed(3)})(${entry.indexKey[1].toFixed(3)})\\\\&=${dot.toFixed(3)}\\end{aligned}`}</MathFormula><MathFormula block>{`${m.headWeights[h]}\\max(0,${dot.toFixed(3)})=${entry.headScores[h].toFixed(3)}`}</MathFormula></div>;})}
      <MathFormula block>{`I_{${m.inspect+1}}=${entry.headScores.map(v=>v.toFixed(3)).join('+')}=${entry.score.toFixed(3)}`}</MathFormula><p>{t('indexResult')}</p><MathFormula block>{m.indexFormula}</MathFormula><p>{t('indexVars')}</p><p>{t('indexReadResult')}</p>
    </div>:<p>{t('empty')}</p>}</div>{m.compressed&&<p>{t('indexIndependent')}</p>}
  </>;
}
