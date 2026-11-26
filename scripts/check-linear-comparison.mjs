import assert from 'node:assert/strict';
import { deriveLinearComparison as derive } from '../src/components/linear-attention/comparison-model.js';

for (const mode of ['linear', 'gla', 'deltanet']) {
  for (const context of ['decode', 'prefill']) {
    for (const n of [16, 1024]) {
      for (const [dk, dv] of [[16, 32], [128, 16]]) {
        const params = { mode, context, n, dk, dv };
        const end = derive(params);
        const steps = context === 'decode' ? 1 : n;
        assert.equal(end.full.mac, (context === 'decode' ? n : (n * (n + 1)) / 2) * (dk + dv));
        const expectedPerMac = mode === 'deltanet' ? 4 * dk * dv : mode === 'gla' ? 3 * dk * dv : 2 * dk * dv + dk;
        assert.equal(end.state.mac, steps * expectedPerMac);
        // Full KV is BF16 (2B), recurrent state S is FP32 (4B)
        assert.equal(end.full.storedBytes, 2 * n * (dk + dv));
        assert.equal(end.state.storedBytes, 4 * (dk * dv + (mode === 'linear' ? dk : 0)));

        let prior = derive({ ...params, cursor: 0 });
        assert.equal(prior.full.mac, 0);
        assert.equal(prior.state.mac, 0);
        let independent = false;
        for (let cursor = 1; cursor <= end.total; cursor++) {
          const next = derive({ ...params, cursor });
          for (const lane of ['full', 'state']) {
            for (const metric of ['mac', 'readBytes', 'storedBytes']) {
              assert(Number.isFinite(next[lane][metric]));
              assert(next[lane][metric] >= prior[lane][metric], `${mode}/${context}/${lane}/${metric}/${cursor}`);
            }
          }
          if (next.state.done && !next.full.done) independent = true;
          prior = next;
        }
        assert(independent);
        assert(prior.done);
      }
    }
  }
}
console.log('Linear/GLA/DeltaNet comparison: final cost, FP32 state vs BF16 KV, monotonic counters and independent completion passed.');
