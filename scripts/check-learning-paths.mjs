import assert from 'node:assert/strict';
import {READING_ORDER,LEARNING_PATHS,learningHref} from '../src/lib/chapter-learning.js';
import {MODULE_GROUPS} from '../src/lib/module-groups.js';
import {SHARE_SCHEMA} from '../src/lib/experiment-sharing.js';

assert.equal(new Set(READING_ORDER).size,13);
assert.deepEqual([...READING_ORDER].sort(),Object.keys(SHARE_SCHEMA).sort());
assert.deepEqual(READING_ORDER,MODULE_GROUPS.flatMap(group=>group.chapters));
assert.deepEqual(READING_ORDER,['llm','flash','flashdecode','sparseattn','linearattn','quantization','radixcache','parallel','dpattention','speculative','engram','cachearch','deepinfer']);
for(const [id,path] of Object.entries(LEARNING_PATHS)) {
  for(const topic of path.before) {
    assert(READING_ORDER.indexOf(topic.chapter)<READING_ORDER.indexOf(id),'Foundations precede their dependent chapter');
    assert(topic.label.en&&topic.label.zh&&topic.section);
    assert.equal(new URLSearchParams(learningHref(topic).split('?')[1]).get('section'),topic.section);
  }
  if(path.next)assert(READING_ORDER.indexOf(path.next)>READING_ORDER.indexOf(id),'Continuations move forward without cycles');
}
assert.deepEqual(LEARNING_PATHS.cachearch.before.map(t=>t.chapter),['sparseattn','quantization','radixcache']);
assert(!LEARNING_PATHS.cachearch.before.some(t=>t.chapter==='linearattn'));
assert.equal(LEARNING_PATHS.parallel.next,'dpattention');
assert.deepEqual(LEARNING_PATHS.deepinfer.before.map(t=>t.section),['llminference-1','llminference-2'],'Framework entry needs generation/KV foundations; specialized algorithms remain optional deep dives');
assert.equal(LEARNING_PATHS.cachearch.next,'deepinfer');
console.log('PASS learning order: 13 unique chapters, forward-only prerequisites/continuations, bilingual section links and CED / DeepInfer dependencies');
