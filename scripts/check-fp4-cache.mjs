import {deriveCapacityModel} from '../src/components/quantization/model.js';
import assert from 'node:assert/strict';
import {deriveFP4Model, encodeFP4, decodeFP4, quantizeBlock} from '../src/components/quantization/fp4-model.js';
for (let code=0;code<16;code++) assert.equal(encodeFP4(decodeFP4(code)),code);
assert.equal(encodeFP4(.75),2);
assert.equal(encodeFP4(2.5),4);
assert.equal(encodeFP4(100),7);
for (const kind of ['main','index']) {
  for (const peak of [0, .5, 6, 12, 24]) {
    const m=deriveFP4Model(kind,17,peak);
    assert.equal(m.total,kind==='main'?288:68);
    assert.equal(m.metadata,kind==='main'?32:4);
    assert.ok(Number.isFinite(m.mse));
    for (const g of m.groups) {
      assert.ok(g.scale>0);
      g.packed.forEach((byte,i)=>{assert.equal(byte&15,g.codes[2*i]);assert.equal(byte>>4,g.codes[2*i+1]);});
      g.codes.forEach((c,i)=>assert.equal(g.restored[i],decodeFP4(c)*g.scale));
      if(kind==='index') assert.ok(g.scale*6>=g.amax);
    }
  }
  const zero=quantizeBlock(Array(kind==='main'?16:32).fill(0),kind);
  assert.ok(zero.scale>0);
  assert.ok(zero.restored.every(v=>v===0));
}
const a=deriveFP4Model('main',17,6), b=deriveFP4Model('main',17,24);
assert.deepEqual(a.groups[0],b.groups[0]);
assert.notEqual(a.block.scale,b.block.scale);
console.log('FP4 cache: codebook, ties, packing, zero blocks, group isolation and byte budgets passed.');

for (const mode of ['fp16','w4','fp4','w8','fp8']) {
  const base=deriveCapacityModel({mode,kv:'fp16'});
  for (const kv of ['fp16','fp8','fp4']) {
    const m=deriveCapacityModel({mode,kv});
    assert.equal(m.weightBytes,base.weightBytes);
    assert.equal(m.kb,kv==='fp4'?4:kv==='fp8'?8:16);
    if(kv==='fp4') assert.equal(m.kvScales,m.kvElements/16);
    if(mode==='fp4') {assert.equal(m.wb,4);assert.equal(m.ab,16);assert.equal(m.weightScales,m.weights/16);}
  }
}
assert.equal(deriveFP4Model('main',17,6,true).total,18);
