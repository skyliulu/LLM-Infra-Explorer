import ChapterIcon from '../ChapterIcon';
import React,{useState} from 'react';
import {hcCopy} from './hicache-content';
import {engineCopy} from './hicache-engine-content';
import HiCacheStory from './HiCacheStory';
import HiCacheLayout from './HiCacheLayout';
import './hicache.css';
export default function HiCacheWorkbench({lang}){
 const [selected,setSelected]=useState('P0');const t=k=>engineCopy[lang][k]||hcCopy[lang][k];
 return <><header className="chapter-header hc-header"><h1><ChapterIcon chapter="radixcache"/>{t('title')}</h1><p>{t('subtitle')}</p></header><HiCacheStory pool="mha" {...{lang,selected,setSelected}}/><HiCacheLayout lang={lang} page={selected}/></>;
}
