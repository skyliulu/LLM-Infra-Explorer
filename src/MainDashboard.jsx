import {useLanguage} from './lib/LanguageContext';
import {readSharedSettings} from './lib/experiment-sharing';
import {CHAPTERS as TABS, matchesChapter} from './lib/chapter-registry';
import {ExperimentContext} from './lib/ExperimentContext';
import ChapterTools,{RelatedChapters} from './components/ChapterTools';
import './components/workbench.css';
import SiteHeader from './components/SiteHeader';
import { MODULE_GROUPS } from './lib/module-groups';
import { getModuleLabel } from './lib/module-titles';
import React, { lazy, Suspense, useEffect, useLayoutEffect, useState, useRef } from 'react';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const HomeLanding = lazy(() => import('./components/HomeLanding.jsx'));

function LoadingFallback() {
  const [lang]=useLanguage();
  return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-lg animate-pulse">
      {lang==='zh'?'正在载入工作台…':'Loading visualization…'}
    </div>
  );
}

function readChapterHash() {
  const chapter = window.location.hash.slice(1).split('?')[0];
  return TABS.some(tab => tab.id === chapter) ? chapter : 'home';
}

export default function MainDashboard() {
  const experiments = useRef({});
  const [navigationHash,setNavigationHash]=useState(()=>location.hash);
  const [search,setSearch] = useState('');
  const [activeTab, setActiveTabState] = useState(readChapterHash);
  const setActiveTab = chapter => {
    if (window.location.hash !== `#${chapter}`) window.location.hash = chapter;
  };
  useEffect(() => {
    const onHashChange = () => {setActiveTabState(readChapterHash());setNavigationHash(location.hash);};
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useLayoutEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[activeTab]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => { try { return localStorage.getItem('llm-infra.sidebar-collapsed') === 'true'; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem('llm-infra.sidebar-collapsed', String(sidebarCollapsed)); } catch {} }, [sidebarCollapsed]);
  useEffect(() => {
    document.title = activeTab === 'home' ? 'LLM Infra Explorer' : `${getModuleLabel(activeTab)} · LLM Infra Explorer`;
    setSidebarOpen(false);
  }, [activeTab]);
  useEffect(() => {
    if (!sidebarOpen) return;
    const sidebar = document.getElementById('chapter-sidebar');
    const items = () => [...sidebar.querySelectorAll('button,a,input')].filter(el => el.getClientRects().length);
    items()[0]?.focus();
    const handleKey = event => {
      if (event.key === 'Escape') { setSidebarOpen(false); document.getElementById('site-menu')?.focus(); }
      if (event.key === 'Tab') {
        const controls=items(), first=controls[0], last=controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [sidebarOpen]);

  const compact = sidebarCollapsed && !sidebarOpen;
  const lang = 'en';
  const navigationGroups = MODULE_GROUPS.map(group => ({ ...group, tabs: group.chapters.map(id => TABS.find(tab => tab.id === id)).filter(tab=>tab && matchesChapter(tab,search)) })).filter(group=>group.tabs.length);

  if (activeTab === 'home') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <SiteHeader />
        <main id="main-content" tabIndex={-1}><Suspense fallback={<LoadingFallback />}>
          <HomeLanding onExplore={setActiveTab} />
        </Suspense></main>
      </div>
    );
  }

  const chapter = TABS.find(t=>t.id===activeTab);
  const ActiveComponent = chapter?.component;
  const session = experiments.current[activeTab] ||= {values:{}};
  if(session.hash!==navigationHash){const shared=readSharedSettings(activeTab,navigationHash);if(shared)session.values={...session.values,...shared};session.hash=navigationHash;}

  return (
    <><SiteHeader onMenu={()=>setSidebarOpen(open=>!open)} menuOpen={sidebarOpen} chapter={getModuleLabel(activeTab)}/><div className="min-h-[calc(100vh-52px)] flex bg-slate-950 text-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside id="chapter-sidebar"
        className={cn(
          'fixed top-[52px] bottom-0 left-0 z-30 flex flex-col bg-slate-900 border-r border-slate-800 transition-transform duration-300',
          compact ? 'w-14' : 'w-44',
          'md:sticky md:top-[52px] md:h-[calc(100vh-52px)] md:translate-x-0 shrink-0',
          sidebarOpen ? 'translate-x-0 visible' : '-translate-x-full invisible md:visible'
        )}
      >
        <div className="sidebar-edge">
          <button onClick={()=>setSidebarCollapsed(value=>!value)} className="sidebar-edge-toggle" aria-label={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'} title={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'}>{sidebarCollapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}</button>
        </div>
        <button onClick={()=>{setSidebarOpen(false);document.getElementById('site-menu')?.focus();}} className="sidebar-mobile-close md:hidden" aria-label="Close sidebar"><X size={18}/></button>

        {compact ? <button className="mx-auto mt-2 p-2 text-slate-400" title="Search chapters" aria-label="Search chapters" onClick={()=>{setSidebarCollapsed(false);requestAnimationFrame(()=>document.getElementById('chapter-search')?.focus());}}><Search size={16}/></button> : <div className="chapter-search"><Search size={14}/><input id="chapter-search" type="search" placeholder="Search chapters" aria-label="Search chapters" value={search} onChange={event=>setSearch(event.target.value)}/></div>}
        {!navigationGroups.length && <p className="px-3 py-4 text-xs text-slate-400" role="status">No chapters found</p>}
        <nav aria-label="Chapter navigation" className="flex-1 min-h-0 py-3 px-2 overflow-y-auto">
          {navigationGroups.map(group => {
            return <section key={group.id} aria-label={group.label[lang]} className="mb-3 last:mb-0">
              {compact ? <div className="mx-3 my-3 border-t border-slate-800" title={group.label.en} /> : (
                <h2 className="px-3 pt-3 pb-2 text-[10px] font-medium tracking-wide text-slate-500">{group.label.en}</h2>
              )}
              <div id={`nav-group-${group.id}`} className="space-y-0.5">
                {group.tabs.map(tab => {
                  const Icon = tab.icon;
                  const title = getModuleLabel(tab.id, lang);
                  const isActive = tab.id === activeTab;
                  return <a key={tab.id} href={`#${tab.id}`}
                    onClick={() => {setSidebarOpen(false);if(sidebarOpen)requestAnimationFrame(()=>document.getElementById("main-content")?.focus({preventScroll:true}));}}
                    className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300', compact && 'justify-center px-0', isActive ? 'bg-slate-800 text-sky-200' : 'text-slate-400 hover:text-white hover:bg-slate-800')}
                    aria-label={title} aria-current={isActive ? 'page' : undefined} title={compact ? `${group.label[lang]} · ${title}` : title}>
                    <Icon size={16} className="shrink-0" />
                    {!compact && <span className="min-w-0 whitespace-nowrap">{title}</span>}
                  </a>;
                })}
              </div>
            </section>;
          })}
        </nav>

      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <main id="main-content" tabIndex={-1} className="workbench-content flex-1 min-w-0">
          <ExperimentContext.Provider value={session}>
            <ChapterTools key={`tools-${navigationHash}`} chapter={chapter} session={session}/>
            <div key={`chapter-${navigationHash}`} data-chapter={activeTab}>
              <Suspense fallback={<LoadingFallback />}>
                {ActiveComponent && <ActiveComponent />}
              </Suspense>
            </div>
            <RelatedChapters chapter={chapter}/>
          </ExperimentContext.Provider>
        </main>

        <footer className="shrink-0 border-t border-slate-800 py-3 px-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} LLM-Infra-Explorer — Interactive AI Infrastructure Explorer
        </footer>
      </div>
    </div></>
  );
}
