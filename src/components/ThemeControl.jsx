import React,{useState,useRef,useEffect} from 'react';
import {Moon,Sun,Monitor,Check} from 'lucide-react';
import {useTheme} from '../lib/ThemeContext';
import {useLanguage} from '../lib/LanguageContext';
const copy={zh:{theme:'外观',light:'浅色',dark:'深色',system:'跟随系统'},en:{theme:'Appearance',light:'Light',dark:'Dark',system:'System'}};
export default function ThemeControl(){
 const {theme,preference,setPreference}=useTheme(),[lang]=useLanguage(),[open,setOpen]=useState(false),root=useRef(null),button=useRef(null),t=k=>copy[lang][k];
 useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 const Icon=theme==='dark'?Moon:Sun;
 return <div className="theme-control" ref={root} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);button.current?.focus();}}}><button ref={button} className="site-theme-button" aria-label={t('theme')} title={t('theme')} aria-expanded={open} aria-controls="theme-options" onClick={()=>setOpen(v=>!v)}><Icon size={18}/></button>{open&&<div id="theme-options" className="theme-options" role="group" aria-label={t('theme')}>{[['light',Sun],['dark',Moon],['system',Monitor]].map(([value,OptionIcon])=><button key={value} aria-pressed={preference===value} onClick={()=>{setPreference(value);setOpen(false);button.current?.focus();}}><OptionIcon size={16}/><span>{t(value)}</span>{preference===value&&<Check size={15}/>}</button>)}</div>}</div>;
}
