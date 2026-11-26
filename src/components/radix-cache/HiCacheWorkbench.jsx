import ChapterIcon from '../ChapterIcon';
import React,{useState} from 'react';
import {useExperimentState} from '../../lib/ExperimentContext';
import {hcCopy} from './hicache-content';
import {engineCopy} from './hicache-engine-content';
import HiCacheStory from './HiCacheStory';
import {CacheAwareScheduling} from './HybridStateCache';
import HiCacheLayout from './HiCacheLayout';
import './hicache.css';
export default function HiCacheWorkbench({lang}){
 const [selected,setSelected]=useState('P0');
 const [pool,setPool]=useExperimentState('RadixCache.layoutPool','mha');
 const t=k=>engineCopy[lang][k]||hcCopy[lang][k];
 return <><header className="chapter-header hc-header"><h1><ChapterIcon chapter="radixcache"/>{t('title')}</h1><p>{t('subtitle')}</p></header><HiCacheStory {...{lang,pool,setPool,selected,setSelected}}/><CacheAwareScheduling lang={lang}/><HiCacheLayout {...{lang,page:selected,pool,setPool}}/></>;
}
