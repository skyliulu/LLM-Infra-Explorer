import React,{useState} from 'react';
import {ArrowRight,ArrowLeftRight,ChevronRight,CornerUpLeft,ExternalLink,Layers} from 'lucide-react';
import {FRAMEWORK,RELATED_TOPICS,deriveFrameworkView} from './system-model';
import {systemI18n} from './system-content';
import './system.css';

export default function SystemExplorer({lang}){
 const t=key=>systemI18n[lang][key]??key;
 const [navigation,setNavigation]=useState({level:'engine',selection:'scheduler'});
 const view=deriveFrameworkView(navigation.level,navigation.selection);
 const open=id=>setNavigation(FRAMEWORK[id]?.children?{level:id,selection:FRAMEWORK[id].children[0]}:{level:view.level,selection:id});
 const back=()=>setNavigation({level:view.parent,selection:view.level});
 const node=id=><button key={id} className={`dh-node ${view.selected===id?'selected':''}`} aria-pressed={view.selected===id} onClick={()=>open(id)} data-component={id}><span className="dh-number">{String(view.children.indexOf(id)+1).padStart(2,'0')}</span><strong>{t(id)}</strong><span>{t(`${id}Tag`)}</span>{FRAMEWORK[id].children&&<small><Layers size={12}/>{t('enter')}<ChevronRight size={12}/></small>}</button>;
 return <section className="di-section dh-section" aria-labelledby="di-system" data-testid="di-system-explorer" data-level={view.level}>
  <div className="di-section-heading"><div><h2 id="di-system" data-section-anchor="deepinfer-system">{t('title')}</h2><p>{t('hint')}</p></div></div>
  <nav className="dh-breadcrumb" aria-label={t('levels')}>{view.trail.map((id,index)=><React.Fragment key={id}>{index>0&&<ChevronRight size={14} aria-hidden="true"/>}{id===view.level?<span aria-current="page">{t(id)}</span>:<button onClick={()=>setNavigation({level:id,selection:view.trail[index+1]})}>{t(id)}</button>}</React.Fragment>)}</nav>
  <div className="dh-question"><div><h3 data-section-anchor="deepinfer-overview">{t(`${view.level}Question`)}</h3><p>{t(`${view.level}Intro`)}</p></div>{view.parent&&<button className="dh-back" onClick={back}><CornerUpLeft size={14}/>{t('back')}</button>}</div>
  <div className="dh-layout"><div className={`dh-map dh-map-${view.level}`}>
   <div className="dh-flow">{view.level==='execution'?<><div className="dh-layer-pair"><span className="dh-group-label">{t('modelLayers')}</span><div>{node('attention')}<ArrowRight className="dh-arrow" size={18} aria-hidden="true"/>{node('experts')}</div></div><ArrowRight className="dh-arrow" size={18} aria-hidden="true"/>{node('sampling')}</>:view.children.map((id,index)=><React.Fragment key={id}>{node(id)}{index<view.children.length-1&&(view.level==='service'&&index===1?<ArrowLeftRight className="dh-arrow" size={18} aria-hidden="true"/>:<ArrowRight className="dh-arrow" size={18} aria-hidden="true"/>)}</React.Fragment>)}</div>
   <p className="dh-map-note">{t(view.level==='execution'?'layerLoop':view.level==='service'?'serviceConnection':'feedback')}</p>
  </div><aside className="dh-inspector" aria-live="polite" data-testid="di-framework-inspector" data-selected={view.selected}>
   <h3>{t(view.selected)}</h3><dl>{[['input','Input'],['action','Action'],['output','Output']].map(([label,suffix])=><div key={label}><dt>{t(label)}</dt><dd>{t(`${view.selected}${suffix}`)}</dd></div>)}</dl><p className="dh-why">{t(`${view.selected}Why`)}</p>
   {view.related.length>0&&<div className="dh-related"><strong>{t('related')}</strong>{view.related.map(id=><a href={RELATED_TOPICS[id]} key={id}>{t(`related${id}`)}<ChevronRight size={13}/></a>)}</div>}
  </aside></div>
  <details className="dh-notes"><summary>{t('noteTitle')}</summary><p>{t('note')}</p><a href={view.source} target="_blank" rel="noreferrer">{t('source')}<ExternalLink size={12}/></a></details>
 </section>;
}
