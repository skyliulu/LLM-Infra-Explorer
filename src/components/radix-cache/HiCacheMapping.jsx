import React,{useState} from 'react';
import {layoutCopy} from './hicache-layout-content';

const copy={zh:{logical:'逻辑坐标 · 层 × Token',physical:'内存地址 · 每行从左到右连续，接下一行',hint:'点击任意向量，连线追踪同一份数据。紫色为本次访问范围，绿色为已完成搬运。',selected:'当前向量'},en:{logical:'Logical coordinates · layer × token',physical:'Memory · contiguous left to right, then next row',hint:'Select any vector to trace the same data. Purple marks this access; green marks completed transfers.',selected:'Selected vector'}};
export default function HiCacheMapping({model:m,lang,activeSegment}){
 const [selected,setSelected]=useState(null),t=k=>copy[lang][k]||layoutCopy[lang][k];
 const focus=m.cells.find(c=>c.id===selected)||m.cells.find(c=>c.selected)||m.cells[0];
 const channels=[...new Set(m.cells.map(c=>c.channel))];
 const position=(c,physical)=>{const channel=channels.indexOf(c.channel);const index=physical?m.cells.filter(v=>v.channel===c.channel).findIndex(v=>v.id===c.id):c.layer*6+m.pages.indexOf(c.page)*2+c.token;return{x:(physical?548:18)+(index%6)*71,y:54+channel*185+Math.floor(index/6)*48};};
 const left=position(focus,false),right=position(focus,true);
 return <div className="hc-mapping"><p>{t('hint')}</p><div className="hc-mapping-scroll"><svg viewBox={`0 0 1000 ${channels.length*185+36}`} role="group" aria-label={t('logical')}>
 <text x="18" y="18" className="hc-map-heading">{t('logical')}</text><text x="548" y="18" className="hc-map-heading">{t('physical')}</text>
 <path d={`M${left.x+33},${left.y} V${left.y-5} H490 V${right.y-5} H${right.x+33} V${right.y}`} stroke="#4338ca" strokeWidth="2" fill="none"/>
 {[false,true].map(physical=><g key={String(physical)}>{channels.map((ch,i)=><text key={ch} x={physical?548:18} y={45+i*185} className="hc-map-heading">{ch}</text>)}{m.cells.map(c=>{const pos=position(c,physical);return <g key={c.id} role="button" tabIndex={0} aria-label={`${physical?t('address'):t('logical')} ${c.channel} ${c.page} ${c.word} ${t('layerLabel')} ${c.layer+1} ${c.offset} B`} aria-pressed={focus.id===c.id} onClick={()=>setSelected(c.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(c.id);}}} className={`hc-map-cell ${c.selected?'chosen':''} ${m.completedIds.includes(c.id)?'complete':''} ${activeSegment?.ids.includes(c.id)?'active':''} ${focus.id===c.id?'focused':''}`} transform={`translate(${pos.x},${pos.y})`}><rect width="66" height="41" rx="4"/><text x="33" y="16" textAnchor="middle">{c.word}</text><text x="33" y="31" textAnchor="middle" className="hc-map-meta">{physical?`${c.offset} B`:`${c.page} · ${t('layerLabel')} ${c.layer+1}`}</text></g>;})}</g>)}
 </svg></div><div className="hc-map-trace"><strong>{t('selected')}</strong><span>{focus.channel} · {focus.page} · {focus.word} · {t('layerLabel')} {focus.layer+1}</span><b>→</b><span>{t('address')} {focus.offset}–{focus.offset+31} B</span></div></div>;
}
