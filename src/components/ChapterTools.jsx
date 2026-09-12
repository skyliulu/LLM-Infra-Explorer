import {createPortal} from 'react-dom';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Share2} from 'lucide-react';
import {useLanguage} from '../lib/LanguageContext';
import {createShareHash} from '../lib/experiment-sharing';
import {getModuleLabel} from '../lib/module-titles';

const copy = {
  en: {jump:'On this page', top:'Overview', share:'Share setup', copy:'Copy link', copied:'Copied', manual:'Select the link and copy it', close:'Close', related:'Explore next', note:'Settings kept · playback restarts on return', retention:'Configuration is kept while navigating this page. Use a share link to save it across reloads.', hint:'Shares this chapter, section and primary settings. Playback and inspector selections are not included.', link:'Share link'},
  zh: {jump:'本章定位', top:'概览', share:'分享配置', copy:'复制链接', copied:'已复制', manual:'请选中链接手动复制', close:'关闭', related:'相关章节', note:'配置保留 · 返回时播放从头开始', retention:'本次浏览中切换章节会保留配置；需要刷新后恢复时，请使用分享链接。', hint:'分享当前章节、位置和主要配置，不包含播放进度与检查器选择。', link:'分享链接'},
};
const headingsIn = content => [...(content?.querySelectorAll('[data-section-anchor]') || [])].filter(el => el.getClientRects().length);

export default function ChapterTools({chapter, session}) {
  const [lang] = useLanguage(), t = key => copy[lang][key];
  const [sections, setSections] = useState([]);
  const [section, setSection] = useState('');
  const [share, setShare] = useState('');
  const [copyStatus, setCopyStatus] = useState('copy');
  const root = useRef(null);
  const shareTrigger = useRef(null);
  const [hosts,setHosts] = useState(null);
  useLayoutEffect(()=>{setHosts({location:document.getElementById('site-location'),share:document.getElementById('site-share')});},[]);
  useEffect(()=>{
    if(!share)return;
    const close=event=>{if(event.key==='Escape'){setShare('');shareTrigger.current?.focus();}};
    const outside=event=>{if(root.current&&!root.current.contains(event.target))setShare('');};
    document.addEventListener('keydown',close);document.addEventListener('pointerdown',outside);
    return()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',outside);};
  },[share]);
  const pendingTarget = useRef(new URLSearchParams(location.hash.split('?')[1]).get('section'));

  useEffect(() => {
    const content = document.querySelector('[data-chapter]');
    if (!content) return;
    let target = pendingTarget.current;
    let frame, scrollFrame;
    const trackScroll = () => {
      const headings = headingsIn(content);
      let current = '';
      for(const el of headings){if(el.getBoundingClientRect().top<=100)current=el.dataset.sectionAnchor;}
      setSection(current);
    };
    const onScroll=()=>{cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(trackScroll);};
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',onScroll);
    const update = () => {
      const headings = headingsIn(content), seen = new Set();
      const list = headings.filter(el => {
        if (seen.has(el.dataset.sectionAnchor)) return false;
        seen.add(el.dataset.sectionAnchor); return true;
      }).map(el => ({id:el.dataset.sectionAnchor, label:el.textContent.trim()}));
      setSections(old => JSON.stringify(old) === JSON.stringify(list) ? old : list);
      setSection(old => list.some(item => item.id === old) ? old : '');
      if (target) {
        const found = headings.find(el => el.dataset.sectionAnchor === target);
        if (found) {
          found.scrollIntoView({block:'start'});
          found.tabIndex = -1; found.focus({preventScroll:true});
          setSection(target); target = null; pendingTarget.current = null;
        }
      }
    };
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame); frame = requestAnimationFrame(update);
    });
    observer.observe(content, {childList:true, subtree:true, characterData:true});
    update();
    return () => {observer.disconnect(); cancelAnimationFrame(frame);cancelAnimationFrame(scrollFrame);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll);};
  }, [chapter.id, lang]);

  const jump = id => {
    setSection(id);
    const content = document.querySelector('[data-chapter]');
    const el = id ? headingsIn(content).find(el => el.dataset.sectionAnchor === id) : content;
    el?.scrollIntoView({block:'start'});
    if (el) {el.tabIndex = -1; el.focus({preventScroll:true});}
  };
  const copyLink = async () => {
    try {await navigator.clipboard.writeText(share); setCopyStatus('copied');}
    catch {root.current.querySelector('input')?.select(); setCopyStatus('manual');}
  };

  if(!hosts?.location||!hosts?.share)return null;
  return <>
    {createPortal(<div className="site-breadcrumb">
      <a className="site-chapter-link" href={`#${chapter.id}`} onClick={event=>{event.preventDefault();jump('');}}>{chapter.title}</a>
      <span className="site-breadcrumb-divider" aria-hidden="true">/</span>
      <select aria-label={t('jump')} title={sections.find(item=>item.id===section)?.label || t('top')} value={section} onChange={event=>jump(event.target.value)}>
        <option value="">{t('top')}</option>
        {sections.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </div>,hosts.location)}
    {createPortal(<div ref={root} className="site-share-control">
      <button ref={shareTrigger} className="site-share-button" aria-label={t('share')} title={t('share')} aria-expanded={Boolean(share)} onClick={()=>{
        setShare(share?'':location.href.split('#')[0]+createShareHash(chapter.id,session.values,section));setCopyStatus('copy');
      }}><Share2 size={16}/></button>
      {share&&<div className="site-share-popover" role="region" aria-label={t('share')}>
        <div className="site-share-heading"><strong>{t('share')}</strong><button aria-label={t('close')} onClick={()=>{setShare('');shareTrigger.current?.focus();}}>×</button></div>
        <p>{t('hint')}</p>
        <input aria-label={t('link')} value={share} readOnly onFocus={event=>event.target.select()}/>
        <button className="site-copy-button" onClick={copyLink}>{t('copy')}</button>
        {copyStatus!=='copy'&&<span role="status">{t(copyStatus)}</span>}
      </div>}
    </div>,hosts.share)}
  </>;

}

export function RelatedChapters({chapter}) {
  const [lang] = useLanguage(), t = key => copy[lang][key];
  return <nav className="chapter-related" aria-label={t('related')}>
    <span>{t('related')}</span>
    {chapter.related.map(id => <a key={id} href={`#${id}`}>{getModuleLabel(id)}</a>)}
  </nav>;
}
