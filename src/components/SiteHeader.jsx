import React from 'react';
import {Github, Menu} from 'lucide-react';
import {useLanguage} from '../lib/LanguageContext';
import './SiteHeader.css';
const copy = {
  en: {home:'Home', language:'Site language', source:'GitHub repository', menu:'Open chapter navigation', skip:'Skip to content'},
  zh: {home:'返回首页', language:'全站语言', source:'GitHub 仓库', menu:'打开章节导航', skip:'跳至内容'},
};
export default function SiteHeader({onMenu, menuOpen=false, chapter}) {
  const [lang,setLang] = useLanguage(), t=key=>copy[lang][key];
  return <header className={`site-header ${chapter ? 'has-chapter' : ''}`}>
    <a className="site-skip" href="#main-content" onClick={event=>{event.preventDefault();document.getElementById('main-content')?.focus();}}>{t('skip')}</a>
    {onMenu && <button id="site-menu" className="site-menu" onClick={onMenu} aria-label={t('menu')} aria-expanded={menuOpen} aria-controls="chapter-sidebar"><Menu size={20}/></button>}
    <a href="#home" className="site-brand" aria-label={t('home')}><img src={`${import.meta.env.BASE_URL}favicon.svg`} width="30" height="30" alt=""/><span>LLM Infra Explorer</span></a>
    {chapter && <div className="site-context"><div id="site-location" className="site-location"/></div>}
    <div className="site-tools">
      {chapter && <div id="site-share" className="site-share"/>}
      <div className="site-language" role="group" aria-label={t('language')}>
        <button onClick={()=>setLang('zh')} aria-pressed={lang==='zh'} lang="zh-CN">中文</button>
        <button onClick={()=>setLang('en')} aria-pressed={lang==='en'} lang="en">EN</button>
      </div>
      <a href="https://github.com/skyliulu/LLM-Infra-Explorer" className="site-github" aria-label={t('source')} title={t('source')} target="_blank" rel="noreferrer"><Github size={19}/><span>GitHub</span></a>
    </div>
  </header>;
}
