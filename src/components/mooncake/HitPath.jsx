import React, {useEffect, useMemo, useState} from 'react';
import {Pause, Play, RotateCcw, SkipForward} from 'lucide-react';
import {LEASE_SECONDS, PAGE_BYTES, deriveHitScenario} from './model';
import {fmtBytes, fmtMs, fmtTokens, shortHash} from './format';

const STEPS = ['match', 'query', 'replica', 'prefetch', 'load', 'compute', 'write', 'done'];
const CODE = [
  {id: 'match', text: 'prefix   = local_match(tokens)        # L1 first, then L2'},
  {id: 'query', text: 'keys     = [prefix_hash(page) for page in run]'},
  {id: 'replica', text: 'replicas = master.get_replica_list(keys)\n# grants 10s read lease TTL on master'},
  {id: 'prefetch', text: 'te.read(replica.segment -> l2.slot)   # zero-copy RDMA'},
  {id: 'load', text: 'load_layers(l2.slots -> gpu)          # overlapped with compute'},
  {id: 'compute', text: 'prefill(tokens[prefix_tokens:])'},
  {id: 'write', text: 'dst = master.put_start(new_key, page_bytes)\nte.write(l2.slot -> dst.segment)\nmaster.put_end(new_key)        # object becomes readable'},
  {id: 'done', text: '# read complete; lease TTL expires naturally on master'},
];
const TIMING_STEPS = {lookup: ['query', 'replica'], prefetch: ['prefetch'], load: ['load'], compute: ['compute']};

export default function HitPath({t}) {
  const scenario = useMemo(() => deriveHitScenario(), []);
  const [step, setStep] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const limit = STEPS.length;
  const phase = step === 0 ? 'idle' : step === limit ? 'done' : 'running';
  const active = step > 0 ? STEPS[step - 1] : null;
  const done = step === limit;

  const reset = () => { setPlaying(false); setStep(0); };
  const handleNextStep = () => { setPlaying(false); setStep(value => Math.min(limit, value + 1)); };
  const togglePlay = () => { if (done) setStep(0); setPlaying(value => !value); };
  useEffect(() => {
    if (!isPlaying || done) return undefined;
    const timer = setTimeout(() => setStep(value => Math.min(limit, value + 1)), 900);
    return () => clearTimeout(timer);
  }, [isPlaying, step, done, limit]);

  const prefetched = step >= 4;
  const loaded = step >= 5;
  const computed = step >= 6;
  const published = step >= 7;
  const remotePages = scenario.remote.map(entry => entry.id);
  const localPages = scenario.local.map(entry => entry.id);
  const newPages = scenario.computed.map(entry => entry.id);
  const relevant = [...localPages, ...(prefetched ? remotePages : []), ...(published ? newPages : [])];
  const l2Occupied = scenario.l2Slots.filter(Boolean).length;
  const others = Math.max(0, l2Occupied - relevant.length);
  const gpu = loaded ? [...localPages, ...remotePages, ...(computed ? newPages : [])] : [];
  const totalMs = scenario.ms.total;
  const segments = [
    {id: 'lookup', ms: scenario.ms.lookup, key: 'lookup'},
    {id: 'prefetch', ms: scenario.ms.prefetch, key: 'prefetch'},
    {id: 'load', ms: scenario.ms.load, key: 'load'},
    {id: 'compute', ms: scenario.ms.compute, key: 'compute'},
  ];
  const isActive = id => (TIMING_STEPS[id] || []).includes(active);
  const cellClass = id => {
    if (newPages.includes(id)) return 'new';
    if (remotePages.includes(id)) return 'pool-hit';
    return 'l2-hit';
  };

  return (
    <section className="mk-section">
      <h2 data-section-anchor="mooncake-hit">{t('s2Title')}</h2>
      <p className="mk-lead">{t('s2Lead')}</p>

      <div className="mk-controls">
        <div className="mk-step-label" aria-live="polite" data-phase={phase}>
          <strong>{active ? t(`step_${active}`) : t('s2Title')}</strong>
          <span>{step}/{limit}</span>
        </div>
        <div className="chapter-playback mk-playback">
          <button type="button" onClick={reset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={17}/></button>
          <button type="button" onClick={togglePlay} aria-label={isPlaying && !done ? t('pause') : t('play')} title={isPlaying && !done ? t('pause') : t('play')}>{isPlaying && !done ? <Pause size={17}/> : <Play size={17}/>}</button>
          <button type="button" onClick={handleNextStep} disabled={done} aria-label={t('next')} title={t('next')}><SkipForward size={17}/></button>
        </div>
      </div>

      <div className="mk-hit-grid">
        <div className="mk-hit-arch">
          <div className={`mk-master ${['query', 'replica', 'write'].includes(active) ? 'on' : ''}`}>
            <strong>{t('masterRole')}</strong>
            <small>{t('masterNote')}</small>
            <div className="mk-replicas" aria-live="polite">
              <small>{t('replicaTitle')}</small>
              {scenario.objects.map(object => (
                <span key={object.id} className={step >= 3 ? 'ready' : 'pending'}>
                  {step >= 3 ? `${object.id} · ${t('segment')} ${object.segment} · ${fmtBytes(object.bytes)}` : '—'}
                </span>
              ))}
            </div>
          </div>

          <div className="mk-hit-flow">
            <div className={`mk-seg-node ${active === 'prefetch' ? 'on' : ''}`}>
              <header><strong>{t('segmentRole')}</strong><span>{scenario.objects.length}/{scenario.segmentAll.length} {t('pagesUnit')}</span></header>
              <ul>
                {scenario.objects.map(object => (
                  <li key={object.id}>
                    <b>{object.id}</b>
                    <small>{fmtBytes(object.bytes)}</small>
                  </li>
                ))}
              </ul>
              {scenario.segmentMore > 0 && <em>{scenario.segmentMore} {t('segmentMore')}</em>}
            </div>

            <div className={`mk-arrow ${active === 'prefetch' ? 'on' : ''}`}>
              <span>RDMA</span>
              <b>{fmtBytes(scenario.bytes.prefetch)}</b>
              <small>{fmtMs(scenario.ms.prefetch)}</small>
            </div>

            <div className="mk-inst">
              <header><strong>{t('clientRole')}</strong></header>
              <div className={`mk-l2box ${['match', 'prefetch', 'load'].includes(active) ? 'on' : ''}`}>
                <small>{t('l2Role')}</small>
                <div className="mk-cells">
                  {relevant.map(id => (
                    <span key={id} className={`mk-cell filled ${cellClass(id)}`}>{id}</span>
                  ))}
                  {Array.from({length: others}, (_, index) => (
                    <span key={`other-${index}`} className="mk-cell other" title={t('l2Other')}>·</span>
                  ))}
                  {Array.from({length: Math.max(0, 12 - relevant.length - others)}, (_, index) => (
                    <span key={`empty-${index}`} className="mk-cell empty">·</span>
                  ))}
                </div>
                <em>{l2Occupied}/{scenario.l2Slots.length} · {relevant.length} {t('l2Relevant')}</em>
              </div>
              <div className={`mk-arrow vertical ${active === 'load' ? 'on' : ''}`}>
                <span>load</span>
                <b>{fmtBytes(scenario.bytes.load)}</b>
                <small>{fmtMs(scenario.ms.load)}</small>
              </div>
              <div className={`mk-gpubox ${['compute', 'load'].includes(active) ? 'on' : ''}`}>
                <small>{t('gpuRole')}</small>
                <div className="mk-cells">
                  {gpu.length
                    ? gpu.map(id => <span key={id} className={`mk-cell filled ${cellClass(id)}`}>{id}</span>)
                    : <span className="mk-off">—</span>}
                </div>
              </div>
            </div>
          </div>

          <div className={`mk-transport ${active === 'prefetch' ? 'on' : prefetched ? 'ready' : ''}`}>
            <div className="mk-transport-head"><small>{t('transport')}</small><span className="mk-zero">{t('cpuCopies')}</span></div>
            <div className="mk-transport-rows">
              <span><b>{t('srcMR')}</b><code>{`mr#${scenario.segment} · ${scenario.objects.length} × ${fmtBytes(PAGE_BYTES)}`}</code></span>
              <span><b>{t('dstMR')}</b><code>{`mr#${scenario.request.instance} · slot 1–${scenario.objects.length}`}</code></span>
              <span><b>{t('pathSel')}</b><code>{`${scenario.nicLinks} × NIC`}</code></span>
            </div>
            <p>{t('mrNote')}</p>
          </div>

          <div className={`mk-writeback ${active === 'write' ? 'on' : ''} ${published ? 'done' : ''}`}>
            <small>{t('writeback')}</small>
            <span>{newPages.join(', ')} → {t('segment')} {scenario.writeSegment} {t('segmentUnit')}</span>
            {published && <em>{t('readable')}</em>}
            <b>{fmtBytes(scenario.bytes.write)}</b>
          </div>

          <div className="mk-keyline">
            <div><small>{t('objectKey')} · {scenario.objects[0]?.id} · {t('keyOf')}</small><code>qwen70_pp0_{shortHash(scenario.objects[0]?.id || 'C0R1')}</code></div>
            <p>{t('objectKeyNote')}</p>
            <div className="mk-lease"><small>{t('lease')} · {LEASE_SECONDS}s</small><p>{t('leaseNote')}</p></div>
          </div>

          <dl className="mk-figures">
            <div><dt>{t('reused')}</dt><dd>{fmtTokens(scenario.tokens.reused)} {t('tokensUnit')}</dd></div>
            <div><dt>{t('computed')}</dt><dd>{fmtTokens(scenario.tokens.computed)} {t('tokensUnit')}</dd></div>
            <div><dt>{t('poolRead')}</dt><dd>{fmtBytes(scenario.bytes.prefetch)}</dd></div>
            <div><dt>{t('speedupLabel')} · L3</dt><dd>{scenario.ratioL3.toFixed(2)}×</dd></div>
          </dl>
          <p className="mk-note">{t('pageSizeNote')}</p>
        </div>

        <aside className="mk-hit-side">
          <div className="mk-detail" aria-live="polite">
            <p>{active ? t(`detail_${active}`) : t('hitHint')}</p>
          </div>

          <div className="mk-timing">
            <h3>{t('timing')}</h3>
            <div className="mk-stack">
              {segments.map(segment => (
                <div key={segment.id} className={`mk-stack-row ${isActive(segment.id) ? 'on' : ''}`}>
                  <small>{t(segment.key)}</small>
                  <div className="mk-bar"><i className={segment.id} style={{width: `${totalMs ? (segment.ms / totalMs) * 100 : 0}%`}}/></div>
                  <b>{fmtMs(segment.ms)}</b>
                </div>
              ))}
            </div>
            <div className="mk-compare">
              <div><small>{t('thisRequest')} · L2+L3</small><strong>{fmtMs(totalMs)}</strong></div>
              <div><small>{t('withoutL3')}</small><strong>{fmtMs(scenario.ms.withoutL3)}</strong></div>
              <div className="saved"><small>{t('l3Saved')}</small><strong>{fmtMs(scenario.ms.l3Saved)}</strong></div>
            </div>
            <p className="mk-note">{t('fullRecomputeLabel')} · {fmtMs(scenario.ms.baseline)} — {t('l2ShareNote')}</p>
            <p className="mk-note">{t('timeNote')}</p>
          </div>

          <div className="mk-code">
            <h3>{t('pseudoTitle')}</h3>
            <pre>{CODE.map(line => <span key={line.id} className={active === line.id ? 'on' : ''}>{line.text}{'\n'}</span>)}</pre>
            <small>{t('pseudoNote')}</small>
          </div>
        </aside>
      </div>
    </section>
  );
}
