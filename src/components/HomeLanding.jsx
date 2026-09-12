import {CHAPTERS as featureCards} from '../lib/chapter-registry';
import {useLanguage} from '../lib/LanguageContext';
import { MODULE_GROUPS } from '../lib/module-groups';
import { getModuleLabel } from '../lib/module-titles';
import React, { useMemo, useState } from 'react';
import { ArrowRight, Cpu, Database, FastForward, Github, GitBranch, Network, Sparkles, Star, Zap, Activity, Layers, ScanLine, Play } from 'lucide-react';
import inferencePreview from '../../media/previews/llm-inference.png';
import parallelPreview from '../../media/previews/parallel-strategies.png';
import sparsePreview from '../../media/previews/sparse-attention.png';
import './HomeLanding.css';

const i18n = {
  en: {
    chinese: '中文', english: 'EN', languages: 'EN / 中文', github: 'GitHub',
    badge: 'An interactive systems workbench', title: 'From a single token', titleEnd: 'to the whole system.',
    description: 'Trace tensors. Inspect memory. Understand the tradeoffs.',
    cta: 'Start exploring', browse: 'Browse workbenches', language: 'Language',
    preview: 'Inside the workbench', open: 'Open workbench', previewNote: 'Actual workbench preview · open to interact',
    chapters: 'Choose your next deep dive.', chapterIntro: 'From execution to optimization. Every chapter is a place to experiment.',
    all: 'All chapters', execution: 'Execution', attention: 'Attention', memory: 'Memory & precision', distributed: 'Parallelism',
    system: 'See the system', systemBody: 'Start with the complete architecture and its connections.',
    inspect: 'Look closer', inspectBody: 'Drill into tensors, caches and individual operations.',
    follow: 'Follow execution', followBody: 'Step through data movement and compare the tradeoffs.',
    count: 'interactive workbenches', footer: 'Built to make LLM infrastructure visible.', source: 'Explore the source', brand: 'LLM Infra Explorer',
  },
  zh: {
    chinese: '中文', english: 'EN', languages: 'EN / 中文', github: 'GitHub',
    badge: '大模型基础设施交互工作台', title: '从一个 Token，', titleEnd: '到整个系统。',
    description: '追踪张量。检查显存。理解每一项权衡。',
    cta: '开始探索', browse: '浏览全部章节', language: '语言',
    preview: '走进工作台', open: '打开工作台', previewNote: '真实工作台预览 · 打开后交互探索',
    chapters: '选择下一次深入探索。', chapterIntro: '从执行流程到优化原理，每个章节都可以动手实验。',
    all: '全部章节', execution: '推理执行', attention: '注意力', memory: '缓存与精度', distributed: '并行策略',
    system: '看见整体', systemBody: '从完整架构出发，理解各个组件之间的关系。',
    inspect: '逐层放大', inspectBody: '深入张量、缓存与每一个具体操作。',
    follow: '追踪执行', followBody: '逐步观察数据流动，对照优化前后的权衡。',
    count: '个交互工作台', footer: '让大模型基础设施看得见。', source: '查看源代码', brand: 'LLM Infra Explorer',
  },
};



const groups = Object.fromEntries(MODULE_GROUPS.map(group => [group.id, group.chapters]));
const previews = [
  { id: 'llm', image: inferencePreview },
  { id: 'parallel', image: parallelPreview },
  { id: 'sparseattn', image: sparsePreview },
];

export default function HomeLanding({ onExplore }) {
  const [language] = useLanguage();
  const [group, setGroup] = useState('all');
  const [previewId, setPreviewId] = useState('llm');
  const t = key => i18n[language][key];
  const preview = previews.find(item => item.id === previewId);
  const cards = useMemo(() => featureCards.filter(card => group === 'all' || groups[group].includes(card.id)), [group]);
  const navigate = (event, id) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onExplore(id);
  };
  return (
    <section className="home-landing" lang={language === 'zh' ? 'zh-CN' : 'en'}>
      <div className="home-container">


        <div className="home-hero">
          <div className="home-intro">
            <p className="home-eyebrow"><span />{t('badge')}</p>
            <h1>{t('title')}<br /><span>{t('titleEnd')}</span></h1>
            <p className="home-description">{t('description')}</p>
            <div className="home-hero-actions">
              <a className="home-primary" href="#llm" onClick={event => navigate(event, 'llm')}>{t('cta')}<ArrowRight size={17} /></a>
              <button className="home-secondary" onClick={() => document.getElementById('workbenches').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}>{t('browse')}<span aria-hidden="true">↓</span></button>
            </div>
            <div className="home-meta"><Layers size={15} /><strong>{featureCards.length}</strong> {t('count')}<span className="home-meta-divider" />{t('languages')}</div>
          </div>
          <div className="home-showcase">
            <div className="home-showcase-heading"><span><span className="home-status-dot" />{t('preview')}</span><span aria-hidden="true">0{previews.findIndex(item => item.id === previewId) + 1} / 0{previews.length}</span></div>
            <div className="home-preview-tabs" role="group" aria-label={t('preview')}>
              {previews.map(item => <button key={item.id} aria-pressed={previewId === item.id} onClick={() => setPreviewId(item.id)}>{getModuleLabel(item.id, language)}</button>)}
            </div>
            <a className="home-preview-image" href={`#${preview.id}`} onClick={event => navigate(event, preview.id)} aria-label={`${t('open')}: ${getModuleLabel(preview.id, language)}`}>
              <img src={preview.image} alt={`${getModuleLabel(preview.id, language)} — ${t('preview')}`} width="3520" height="2320" fetchPriority="high" />
              <span className="home-preview-open">{t('open')}<ArrowRight size={16} /></span>
            </a>
            <p className="home-preview-note">{t('previewNote')}</p>
          </div>
        </div>

        <div className="home-principles">
          {[[Layers, 'system', 'systemBody'], [ScanLine, 'inspect', 'inspectBody'], [Play, 'follow', 'followBody']].map(([Icon, title, body], index) => <div key={title} className="home-principle"><span className="home-principle-icon"><Icon size={19} /></span><div><h2><span>0{index + 1}</span>{t(title)}</h2><p>{t(body)}</p></div></div>)}
        </div>

        <section id="workbenches" className="home-workbenches" aria-labelledby="workbenches-title">
          <div className="home-section-heading"><div><h2 id="workbenches-title">{t('chapters')}</h2><p>{t('chapterIntro')}</p></div><span className="home-chapter-count">{cards.length} / {featureCards.length}</span></div>
          <div className="home-filters" role="group" aria-label={t('browse')}>
            {['all', ...Object.keys(groups)].map(key => <button key={key} onClick={() => setGroup(key)} aria-pressed={group === key}>{key === 'all' ? t(key) : MODULE_GROUPS.find(group => group.id === key).label[language]}<span>{key === 'all' ? featureCards.length : featureCards.filter(card => groups[key].includes(card.id)).length}</span></button>)}
          </div>
          <div className="home-card-grid">
            {cards.map(item => {
              const Icon = item.icon;
              const category = Object.keys(groups).find(key => groups[key].includes(item.id));
              return <a key={item.id} className="home-module-card" href={`#${item.id}`} onClick={event => navigate(event, item.id)}>
                <div className="home-card-top"><span className={`home-module-icon ${item.iconClass}`}><Icon size={22} /></span><span>{MODULE_GROUPS.find(group => group.id === category).label[language]}</span><ArrowRight size={17} className="home-card-arrow" /></div>
                <h3>{getModuleLabel(item.id, language)}</h3>
                <p>{item.description[language]}</p>
              </a>;
            })}
          </div>
        </section>
        <footer className="home-footer"><span>{t('footer')}</span><a href="https://github.com/skyliulu/LLM-Infra-Explorer" target="_blank" rel="noreferrer">{t('source')}<ArrowRight size={14} /></a></footer>
      </div>
    </section>
  );
}
