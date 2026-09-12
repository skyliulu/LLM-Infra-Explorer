import React from 'react';
import {useLanguage} from '../lib/LanguageContext';
import HiCacheWorkbench from './radix-cache/HiCacheWorkbench';

export default function RadixCache(){
 const [lang]=useLanguage();
 return <div className="chapter-page min-h-screen bg-slate-50 text-slate-800 font-sans p-4 lg:p-6"><div className="chapter-layout max-w-[90rem] mx-auto space-y-4"><HiCacheWorkbench lang={lang}/></div></div>;
}
