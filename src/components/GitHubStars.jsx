import React, {useEffect, useState} from 'react';
import {Star} from 'lucide-react';
import {useLanguage} from '../lib/LanguageContext';

const copy = {
  en: {loading:'Loading GitHub stars', unavailable:'GitHub star count unavailable', stars:'GitHub stars'},
  zh: {loading:'正在获取 GitHub 星标数', unavailable:'暂时无法获取 GitHub 星标数', stars:'GitHub 星标数'},
};
const cacheKey='llm-infra-github-stars';
const ttl=15*60*1000;
let pending;
function readCache() {
  try {
    const item=JSON.parse(sessionStorage.getItem(cacheKey));
    if(Number.isSafeInteger(item?.count)&&item.count>=0&&Date.now()-item.time<ttl)return item.count;
  } catch { /* Storage may be disabled. */ }
  return null;
}
function getStars() {
  if(pending)return pending;
  pending=(async()=>{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    try {
      const response=await fetch('https://api.github.com/repos/skyliulu/LLM-Infra-Explorer',{signal:controller.signal});
      if(!response.ok)throw new Error('GitHub request failed');
      const data=await response.json();
      const count=data.stargazers_count;
      if(!Number.isSafeInteger(count)||count<0)throw new Error('Invalid star count');
      try {sessionStorage.setItem(cacheKey,JSON.stringify({count,time:Date.now()}));} catch { /* Cache is optional. */ }
      return count;
    } finally {clearTimeout(timeout);}
  })().finally(()=>{pending=null;});
  return pending;
}

export default function GitHubStars() {
  const [lang]=useLanguage(),t=key=>copy[lang][key];
  const [count,setCount]=useState(readCache);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(count!==null)return;
    let active=true;
    getStars().then(value=>{if(active)setCount(value);}).catch(()=>{if(active)setFailed(true);});
    return()=>{active=false;};
  },[]);
  const label=count===null?t(failed?'unavailable':'loading'):`${t('stars')}: ${count.toLocaleString(lang)}`;
  return <span className="site-github-stars" title={label} aria-label={label}>
    <Star size={13} aria-hidden="true"/><span aria-hidden="true">{count===null?(failed?'—':'…'):count.toLocaleString(lang)}</span>
  </span>;
}
