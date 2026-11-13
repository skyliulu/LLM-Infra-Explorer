import React from 'react';
import ChapterIcon from './ChapterIcon';
import { useLanguage } from '../lib/LanguageContext';
import ConnectedReport from './deepinfer/ConnectedReport';
import './deepinfer/lesson.css';

export default function DeepInfer() {
 const [lang]=useLanguage();
 const i18n={zh:{title:'DeepInfer 推理引擎',subtitle:'从前缀复用到专家执行，理解吞吐与成本的来源。'},en:{title:'DeepInfer Inference Engine',subtitle:'From prefix reuse to expert execution: the mechanisms behind throughput and cost.'}};
 const t=key=>i18n[lang][key];
 return <div className="chapter-page dl-page bg-slate-50 text-slate-800"><header className="chapter-header"><h1><ChapterIcon chapter="deepinfer"/>{t('title')}</h1><p>{t('subtitle')}</p></header><div className="chapter-layout chapter-body"><ConnectedReport lang={lang}/></div></div>;
}
