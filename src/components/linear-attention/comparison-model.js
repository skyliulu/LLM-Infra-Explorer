import { getAttentionState } from './model.js';

const triangle = (n) => (n * (n + 1)) / 2;

export function deriveLinearComparison({
  mode = 'linear',
  context = 'decode',
  n = 1024,
  dk = 32,
  dv = 32,
  gateStrength = 0.45,
  cursor = null,
}) {
  const isGla = mode === 'gla';
  const isDelta = mode === 'deltanet';
  const isGated = isGla || isDelta;
  const stateStages = isDelta
    ? ['gate', 'keyread', 'outer', 'write', 'read']
    : isGla
      ? ['gate', 'outer', 'write', 'read']
      : ['map', 'outer', 'write', 'normalizer', 'read', 'divide'];

  const events = (kind) => {
    const list = [{ token: context === 'decode' ? 7 : 0, phase: 'ready', count: 0 }];
    for (let token = context === 'decode' ? 7 : 0; token < 8; token += 1) {
      if (kind === 'full') {
        for (let j = 1; j <= token + 1; j += 1) list.push({ token, phase: 'score', count: j });
        list.push({ token, phase: 'softmax', count: token + 1 });
        for (let j = 1; j <= token + 1; j += 1) list.push({ token, phase: 'value', count: j });
      } else {
        for (const phase of stateStages) list.push({ token, phase, count: token + 1 });
      }
    }
    list.push({ token: 7, phase: 'done', count: 8 });
    return list;
  };

  const fullEvents = events('full');
  const stateEvents = events('state');
  const total = Math.max(fullEvents.length, stateEvents.length) - 1;
  const tick = cursor === null ? total : Math.max(0, Math.min(total, cursor));

  const lane = (kind, list) => {
    const event = list[Math.min(tick, list.length - 1)];
    const s = getAttentionState({ mode, tokenIndex: event.token, step: 0, n: 8, dk, dv, gateStrength });
    const finished = event.phase === 'done';
    const idle = event.phase === 'ready';
    const end = context === 'decode' ? n : Math.ceil((n * (event.token + 1)) / 8);
    const start = context === 'decode' ? 0 : Math.ceil((n * event.token) / 8);
    const pairs = context === 'decode' ? n : triangle(end) - triangle(start);
    const prior = context === 'decode' ? 0 : triangle(start);
    const span = context === 'decode' ? 1 : end - start;

    let mac = 0;
    let reads = 0;
    if (kind === 'full') {
      const scored = idle ? 0 : event.phase === 'score' ? event.count / (event.token + 1) : 1;
      const valued = event.phase === 'value' ? event.count / (event.token + 1) : finished ? 1 : 0;
      mac = prior * (dk + dv) + pairs * (scored * dk + valued * dv);
      reads = mac;
    } else {
      const at = finished ? stateStages.length : stateStages.indexOf(event.phase);
      const has = (p) => at >= stateStages.indexOf(p) && !idle;

      // Exact per-token MACs:
      // - Kernel Linear: outer (dk*dv) + read (dk*dv + dk) = 2*dk*dv + dk
      // - GLA:           gate (dk*dv) + outer (dk*dv) + read (dk*dv) = 3*dk*dv
      // - Gated DeltaNet: gate (dk*dv) + keyread (dk*dv) + outer (dk*dv) + read (dk*dv) = 4*dk*dv
      const perMac = isDelta ? 4 * dk * dv : isGla ? 3 * dk * dv : 2 * dk * dv + dk;
      const perRead = isDelta ? 3 * dk * dv : isGla ? 2 * dk * dv : 2 * dk * dv + 2 * dk;

      const curMac =
        (isGated && has('gate') ? dk * dv : 0) +
        (isDelta && has('keyread') ? dk * dv : 0) +
        (has('outer') ? dk * dv : 0) +
        (has('read') ? dk * dv + (isGated ? 0 : dk) : 0);

      const curRead =
        (has(isGated ? 'gate' : 'write') ? dk * dv : 0) +
        (isDelta && has('keyread') ? dk * dv : 0) +
        (has('read') ? dk * dv : 0) +
        (mode === 'linear' ? (has('normalizer') ? dk : 0) + (has('read') ? dk : 0) : 0);

      mac = start * perMac + span * curMac;
      reads = start * perRead + span * curRead;
    }

    // Precision convention unified across chapter:
    // Full Attention KV cache in BF16 (2 B/elem); Linear/GLA/DeltaNet recurrent state S in FP32 (4 B/elem).
    const elemBytes = kind === 'full' ? 2 : 4;
    const storage = kind === 'full' ? end * (dk + dv) : dk * dv + (mode === 'linear' ? dk : 0);
    return {
      ...event,
      s,
      mac: Math.round(mac),
      readBytes: Math.round(reads * elemBytes),
      storedBytes: storage * elemBytes,
      elemBytes,
      done: finished,
    };
  };

  return {
    full: lane('full', fullEvents),
    state: lane('state', stateEvents),
    total,
    tick,
    done: tick === total,
  };
}
