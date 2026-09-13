import assert from 'node:assert/strict';
import {buildCedSession,deriveCedSession,globalBytes} from '../src/components/cache-architecture/session-model.js';
import {sessionCopy} from '../src/components/cache-architecture/session-content.js';

assert.deepEqual(Object.keys(sessionCopy.zh).sort(),Object.keys(sessionCopy.en).sort());
let checks=0;
for(const n of [1,2,31,32,126,127,128,129,4096,999999,1000000]) {
  const trace=buildCedSession(n);
  let previous=deriveCedSession(trace,0);
  for(let i=0;i<trace.frames.length;i++) {
    const s=deriveCedSession(trace,i);
    assert.equal(s.step,i);
    assert.equal(s.done,i===trace.frames.length-1);
    assert(s.total>=previous.total,'Global records never shrink when local windows are evicted');
    assert(s.encoderTail.count<=128 && s.decoderTail.count<=128);
    assert.equal(s.persistentBytes,globalBytes(s.saved));
    assert.equal(s.total,(3*Math.floor(s.encoderEnd/2)+s.decoderEnd)*356);
    assert(s.encoderEnd>=s.decoderEnd && s.decoderEnd===s.completed);
    for(const g of s.groups) {
      assert.equal(g.count,Math.floor(g.end/g.ratio));
      assert.equal(g.pending,g.ratio===2?g.end%2:0);
      for(const cell of g.cells) {
        assert.equal(cell.id,`${g.owner}:${cell.record}`);
        assert.equal(cell.end-cell.start+1,g.ratio);
        assert(cell.end<=g.end);
      }
    }
    if(['repair','restore','load','save','expire','admit'].includes(s.operation)) {
      assert.equal(s.delta,0,'Replay, retention and reads must not create records');
      assert.equal(s.completed,previous.completed);
    }
    if(s.operation==='encodeToken') {
      assert.equal(s.completed,previous.completed,'No token advance before Decoder');
      assert.equal(s.encoderEnd,s.completed+1);
      assert.equal(s.delta,s.encoderEnd%2===0?3*356:0,'Publish paired sources only at even boundary');
    }
    if(s.operation==='decodeToken') {
      assert.equal(s.delta,356,'Decoder source adds one record, not twenty');
      assert.equal(s.completed,previous.completed+1);
      assert(s.resident && s.encoderTail.count>0 && s.decoderTail.count>0);
    }
    if(s.operation==='repair') {
      assert.equal(s.repair,Math.min(s.prefix,128));
      assert.equal(s.total,previous.total);
      assert.equal(s.loaded,globalBytes(s.prefix),'Load must precede repair');
      assert.equal(s.checkpoint,0);
    }
    if(s.operation==='buildTail') {
      assert.equal(s.decoderReplay,Math.min(s.target,128));
      assert.equal(s.decoderWindow,s.target);
    }
    if(s.operation==='save') {
      assert.equal(s.decoderWindow,0);
      assert.equal(s.encoderWindow,0);
      assert.equal(s.checkpoint,s.completed);
      assert.equal(s.resident,false);
    }
    if(s.operation==='expire') {
      assert.equal(s.checkpoint,0);
      assert.equal(s.persistentBytes,previous.persistentBytes);
    }
    assert(sessionCopy.en[`title${s.operation}`]);
    assert(sessionCopy.zh[`note${s.operation}`]);
    previous=s;checks++;
  }
  assert.equal(previous.completed,n+13);
  assert.equal(previous.total,globalBytes(n+13));
  assert.equal(trace.requests.length,3);
  assert.equal(trace.frames.filter(f=>f.operation==='repair').length,1);
  for(const r of trace.requests)assert.equal(deriveCedSession(trace,r.start).request,r.id);
  assert.equal(deriveCedSession(trace,-20).step,0);
  assert.equal(deriveCedSession(trace,Infinity).step,0);
  assert(deriveCedSession(trace,99999).done);
}
assert.equal(buildCedSession(NaN).initial,4096);
assert.equal(buildCedSession(-100).initial,1);
console.log(`PASS ${checks} CED session snapshots: pairing, immutable prefix replay, load-before-read, bounded windows, persistence, completion and bilingual coverage`);
