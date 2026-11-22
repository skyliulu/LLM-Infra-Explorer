import React from 'react';
import ChapterIcon from './ChapterIcon';
import {useLanguage} from '../lib/LanguageContext';
import {useExperimentState} from '../lib/ExperimentContext';
import {i18n} from './mooncake/content';
import {CONCURRENCY_LEVELS, KV_PROFILES, MEDIA, POOL_DEFAULT, POOL_MAX, POOL_MIN, READOUT, SERIES_TOKENS} from './mooncake/model';
import ServingArchitecture from './mooncake/ServingArchitecture';
import TierCanvas from './mooncake/TierCanvas';
import HitPath from './mooncake/HitPath';
import Economics from './mooncake/Economics';
import './mooncake/mooncake.css';

const normalizeMode = value => (value === 'instance' ? 'instance' : 'cluster');
const normalizePool = value => Math.min(POOL_MAX, Math.max(POOL_MIN, Math.round(Number(value) || POOL_DEFAULT)));
const normalizeReplicas = value => (value === 2 ? 2 : 1);
const normalizeCost = value => {
  const source = value && typeof value === 'object' ? value : {};
  const medium = MEDIA.some(item => item.id === source.medium) ? source.medium : 'rdma';
  const hitTokens = SERIES_TOKENS.includes(source.hitTokens) ? source.hitTokens : 2048;
  const rate = Math.round((Number(source.prefillRate) || READOUT.prefillRate) / 1000) * 1000;
  const kvProfile = KV_PROFILES.some(item => item.id === source.kvProfile) ? source.kvProfile : 'dense_bf16';
  const concurrency = CONCURRENCY_LEVELS.includes(source.concurrency) ? source.concurrency : 1;
  return {medium, hitTokens, prefillRate: Math.min(24000, Math.max(4000, rate)), kvProfile, concurrency};
};

export default function MooncakeL3() {
  const [lang] = useLanguage();
  const t = key => i18n[lang][key];
  const [mode, setMode] = useExperimentState('Mooncake.mode', 'cluster');
  const [poolPages, setPoolPages] = useExperimentState('Mooncake.poolPages', POOL_DEFAULT);
  const [hotReplicas, setHotReplicas] = useExperimentState('Mooncake.hotReplicas', 1);
  const [cost, setCost] = useExperimentState('Mooncake.cost', {medium: 'rdma', hitTokens: 2048, prefillRate: READOUT.prefillRate, kvProfile: 'dense_bf16', concurrency: 1});

  return (
    <div className="chapter-page mk-page">
      <header className="chapter-header">
        <div>
          <h1><ChapterIcon chapter="mooncake"/>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>
      <div className="chapter-layout chapter-body">
        <ServingArchitecture t={t}/>
        <TierCanvas t={t} mode={normalizeMode(mode)} setMode={setMode} poolPages={normalizePool(poolPages)} setPoolPages={setPoolPages} hotReplicas={normalizeReplicas(hotReplicas)} setHotReplicas={setHotReplicas}/>
        <HitPath t={t}/>
        <Economics t={t} config={normalizeCost(cost)} setConfig={setCost}/>
        <details className="mk-evidence">
          <summary>{t('evidence')}</summary>
          <ul>
            <li><a href="https://arxiv.org/abs/2407.00079" target="_blank" rel="noreferrer">{t('sourcePaper')} ↗</a></li>
            <li><a href="https://kvcache-ai.github.io/Mooncake/design/architecture.html" target="_blank" rel="noreferrer">{t('sourceArch')} ↗</a></li>
            <li><a href="https://kvcache-ai.github.io/Mooncake/design/store/mooncake-store.html" target="_blank" rel="noreferrer">{t('sourceStore')} ↗</a></li>
            <li><a href="https://github.com/kvcache-ai/Mooncake" target="_blank" rel="noreferrer">{t('sourceReadme')} ↗</a></li>
            <li><a href="https://docs.sglang.io/docs/advanced_features/hicache_design.md" target="_blank" rel="noreferrer">{t('sourceSih')} ↗</a></li>
            <li><a href="https://kvcache-ai.github.io/Mooncake/performance/sglang/sglang-hicache-benchmark-results-v1.html" target="_blank" rel="noreferrer">{t('sourceBench')} ↗</a></li>
          </ul>
          <p>{t('relatedNote')}</p>
        </details>
      </div>
    </div>
  );
}
