import React from 'react';
import {GitBranch,Lock} from 'lucide-react';

export default function RadixTreeView({m,t,selection,onSelect}){
 const renderNode=node=>{
  const pages=node.pages.map(id=>m.pages.find(p=>p.id===id));
  const indexed=pages.some(p=>p.locations.some(k=>k!=='storage'));
  const children=m.tree.filter(n=>n.parent===node.id);
  return <div className="hc-tree-branch" key={node.id}>
   <button className={`hc-node ${indexed?'':'planned'} ${node.pages.includes(selection)?'selected':''} ${m.event?.ids.some(id=>node.pages.includes(id))?'touched':''}`} aria-label={`${t('treeNode')} ${node.pages.join(' / ')}`} aria-pressed={node.pages.includes(selection)} onClick={()=>onSelect(node.pages[0])}>
    <span><strong>{node.pages.join(' · ')}</strong><small>{node.id==='compressed'?t('compressedNode'):node.id==='A'?t('oldSuffix'):['X','Y'].includes(node.id)?t('coldPrefix'):`${pages[0].start}–${pages.at(-1).end} ${t('tokens')}`}</small>{pages.some(p=>p.locked)&&<Lock size={13}/>}</span>
    <span className="hc-badges">{['gpu','host'].map((k,j)=><i className={pages.every(p=>p.locations.includes(k))?k:'absent'} key={k}>L{j+1}</i>)}<i className={pages.every(p=>p.remoteKnown&&p.locations.includes('storage'))?'storage':'absent'}>{!m.hierarchical?'L3 —':pages.every(p=>p.remoteKnown)?'L3':'L3 ?'}</i><small>{t('refs')}: {pages.some(p=>p.locked)?1:0}</small></span>
   </button>
   {children.length>0&&<div className={`hc-tree-children ${children.length>1?'fork':''}`}>{children.map(renderNode)}</div>}
  </div>;
 };
 return <div className="hc-tree"><h3><GitBranch size={17}/>{t('tree')}</h3><small>{t('unifiedTreeHint')}</small><div className="hc-root">{t('root')}</div>{m.tree.filter(n=>n.parent===null).map(renderNode)}<div className="hc-match-ledger"><h4>{t('matchDecision')}</h4>{m.routes.map(r=><button key={r.id} aria-pressed={selection===r.id} onClick={()=>onSelect(r.id)}><strong>{r.id}</strong><span>{m.step===0?t('notMatched'):m.hierarchical&&!['gpu','host'].includes(r.source)&&!m.queried?t('lookupPending'):t(r.source==='miss'?'missing':`${r.source}Hit`)}</span><b>{m.step===0?'—':m.hierarchical&&!['gpu','host'].includes(r.source)&&!m.queried?t('query'):t(r.decision)}</b></button>)}<small>{t('matchRule')}</small></div></div>;
}
