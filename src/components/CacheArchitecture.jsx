import ChapterIcon from './ChapterIcon';
import {useExperimentState} from '../lib/ExperimentContext';
import {useLanguage} from '../lib/LanguageContext';
import React from 'react';
import {ArrowDown, ArrowRight} from 'lucide-react';
import {MathFormula} from './linear-attention/MathFormula';
import {deriveCacheArchitectureModel, LAYERS} from './cache-architecture/model';
import {i18n} from './cache-architecture/content';
import './cache-architecture/style.css';
import './module-header.css';
import BusinessOverview from './cache-architecture/BusinessOverview';
import TechnicalFlow from './cache-architecture/TechnicalFlow';
import HierarchicalIndexer from './cache-architecture/HierarchicalIndexer';

const number=n=>n.toLocaleString('en-US');
const size=n=>n>=1e6?`${(n/1e6).toFixed(2)} MB`:n>=1024?`${(n/1024).toFixed(2)} KiB`:`${n} B`;
const sourceBase='https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/517ef625df97ec57aadc91b67506a57c20fdc5bb/';
function ShapeTensor({start,end,dim,symbol,t,tone='encoder'}) {
 const count=end-start+1, rows=count<=4?Array.from({length:count},(_,i)=>start+i):[start,start+1,end-1,end];
 return <div className={`ca-tensor ${tone}`}><MathFormula>{`${symbol}\\in\\mathbb{R}^{${count}\\times${dim}}`}</MathFormula><div>{rows.map((position,i)=><React.Fragment key={position}>{count>4&&i===2&&<small className="ca-omission">…</small>}<div className="ca-tensor-row"><small>{t('token')} {number(position)}</small><span>{Array.from({length:8},(_,c)=><i key={c}/>)}</span></div></React.Fragment>)}</div></div>;
}
export default function CacheArchitecture(){
 const [lang] = useLanguage();
 const [tokens,setTokens]=useExperimentState('CacheArchitecture.tokens', 4096),[layer,setLayer]=useExperimentState('CacheArchitecture.layer', 20),[phase,setPhase]=useExperimentState('CacheArchitecture.phase', 'prefill'),[entry,setEntry]=useExperimentState('CacheArchitecture.entry', 0);
 const t=k=>i18n[lang][k],m=deriveCacheArchitectureModel({tokens,layer,phase,entry}),s=m.selected;
 const select=id=>{setLayer(id);setEntry(0);};
 const sections=[{key:'local',ids:[0,1]},...m.groups.map(g=>({key:g.owner<20?'encoder':'decoder',ids:g.consumers.map(l=>l.id),group:g}))];
 return <div className="chapter-page ca-page"><header className="ca-top module-header-card chapter-header"><div><h1><ChapterIcon chapter="cachearch"/>{t('title')}</h1><p>{t('subtitle')}</p></div></header>
 <div className="chapter-body"><BusinessOverview m={m} lang={lang}><div className="ca-business-controls"><label>{t('tokens')}<select aria-label={t('tokens')} value={tokens} onChange={e=>{setTokens(Number(e.target.value));setEntry(0);}}>{[1,32,129,4096,1000000].map(n=><option key={n} value={n}>{number(n)}</option>)}</select></label><div className="ca-toggle" role="group" aria-label={t('phase')}>{['prefill','decode'].map(v=><button key={v} aria-pressed={phase===v} onClick={()=>setPhase(v)}>{t(v)}</button>)}</div></div></BusinessOverview> <TechnicalFlow key={`${tokens}-${phase}`} m={m} lang={lang} ShapeTensor={ShapeTensor} t={t}/><section className="ca-budget"><div className="ca-heading"><div><h2 data-section-anchor="cachearchitecture-1">{t('budget')}</h2><p>{t('budgetHint')}</p></div></div>
 <div className="ca-budget-grid"><div>{[['noShare',m.unshared16],['shared16',m.shared16],['shared4',m.total]].map(([key,v])=><div className="ca-budget-row" key={key}><div><strong>{t(key)}</strong><span>{size(v)}</span></div><div className="ca-track"><i className={key} style={{width:`${v/m.unshared16*100}%`}}/></div></div>)}</div><div className="ca-equation"><MathFormula block>{String.raw`b_{\mathrm{global}}=\left(\frac{3}{2}+1\right)(288+68)=890\ \mathrm{B/token}`}</MathFormula><p>{t('reported')}</p><small>{t('globalOnly')}</small></div></div>
 </section>
 <section className="ca-workbench"><div className="ca-heading"><div><h2 data-section-anchor="cachearchitecture-2">{t('overview')}</h2><p>{t('inspect')}</p></div></div>
 <div className="ca-role-legend">{['local','full','reindex','reuse'].map(role=><span key={role}><i className={role}/>{t(role)}</span>)}</div><div className="ca-work-grid"><div className="ca-topology">{sections.map((part,i)=><div className={`ca-group ${part.group?.owner===s.owner?'related':''}`} key={i}>
 <div className="ca-group-label"><strong>{t(part.key)} · L{part.ids[0]+1}–L{part.ids.at(-1)+1}</strong>{part.group&&<button className="ca-cache" aria-pressed={s.owner===part.group.owner} onClick={()=>select(part.group.owner)}><span>{part.group.ratio}:1 · {number(part.group.count)} {t('records')}</span><strong>{size(part.group.total)}</strong></button>}</div>
 <div className="ca-layers">{part.ids.map(id=>{const l=LAYERS[id];return <button key={id} className={`ca-layer ${l.mode}`} title={`${t('layer')} ${id+1} · ${t(l.mode)}`} aria-label={`${t('layer')} ${id+1} ${t(l.mode)}`} aria-pressed={layer===id} onClick={()=>select(id)}><strong>L{id+1}</strong></button>;})}</div>
 {i<sections.length-1&&<ArrowDown className="ca-down" size={17}/>}</div>)}</div>
 <div className="ca-inspector" aria-live="polite"><h3>L{layer+1} · {t(s.mode)}</h3><p>{t(s.mode==='full'&&s.half==='decoder'?'decoderFullNote':`${s.mode}Note`)}</p>
 {s.owner!==null&&<><h4>{t('source')}</h4><div className="ca-sources"><button onClick={()=>select(s.owner)}><small>{t('owner')}</small><strong>L{s.owner+1}</strong></button><ArrowRight size={16}/><button onClick={()=>select(s.indexOwner)}><small>{t('indexOwner')}</small><strong>L{s.indexOwner+1}</strong></button><ArrowRight size={16}/><div><small>{t('layer')}</small><strong>L{layer+1}</strong></div></div></>}
 <div className="ca-own"><h4>{t('own')}</h4><MathFormula>{`Q_{${layer+1}},\\quad KV^{\\mathrm{SWA}}_{${layer+1}},\\quad O_{${layer+1}}`}</MathFormula><p>{t('ownNote')}</p></div>
 {m.group&&<details className="ca-entry" open><summary>{t('entryTitle')}</summary>{m.group.count>0?<><label>{t('entry')}<input aria-label={t('entry')} type="number" min={1} max={m.group.count} value={m.entry+1} onChange={e=>setEntry(Number(e.target.value)-1)}/></label><div className="ca-position-flow"><div><small>{t('positions')}</small><div>{m.sourceTokens.map(v=><span key={v}>{number(v)}</span>)}</div></div><ArrowRight size={18}/><div><small>{t('entry')}</small><strong>{number(m.entry+1)}</strong></div></div>
 <div className="ca-record"><div><strong>{t('main')} · 288 B</strong><div className="ca-packed"><i style={{width:`${256/356*100}%`}}/><b style={{width:`${32/356*100}%`}}/></div><small>512 × E2M1 · {t('payload')} 256 B + {t('scale')} 32 B</small></div><div><strong>{t('index')} · 68 B</strong><div className="ca-packed"><i style={{width:`${64/356*100}%`}}/><b style={{width:`${4/356*100}%`}}/></div><small>128 × E2M1 · {t('payload')} 64 B + {t('scale')} 4 B</small></div></div><MathFormula>{m.group.ratio===2?`\\{x_{${2*m.entry+1}},x_{${2*m.entry+2}}\\}\\longrightarrow c_{${m.entry+1}}`:`x_{${m.entry+1}}\\longrightarrow c_{${m.entry+1}}`}</MathFormula></>:<p>{t('empty')}</p>}</details>}
 <div className="ca-local-budget"><span>{t('pending')} <strong>{m.pending}</strong></span><span>{t('window')} <strong>{number(m.localRecords)}</strong></span></div>
 </div></div><HierarchicalIndexer key={`${tokens}-${layer}-${phase}`} m={m} lang={lang} onSelect={select}/></section>
<details className="ca-evidence"><summary>{t('sourceTitle')}</summary><p>{t('sourceNote')}</p>{[['config','inference/config.json'],['implementation','inference/model.py'],['report','DeepSeek_V41_Tech_Report.pdf']].map(([key,path])=><a key={key} href={sourceBase+path} target="_blank" rel="noreferrer">{t(key)} ↗</a>)}</details></div></div>;
}
