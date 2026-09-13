import {KV_SOURCES, RECORD} from './model.js';

export const WINDOW = 128;
const bytesPerRecord = RECORD.main + RECORD.index;
export const globalBytes = n => (3 * Math.floor(n / 2) + n) * bytesPerRecord;
const tail = n => ({start: Math.max(1, n - WINDOW + 1), end: n, count: Math.min(n, WINDOW)});
// Teaching trace: operation-complete checkpoints, not GPU kernel timings.
// Global source publication is grouped by the two architectural halves.
export function buildCedSession(input = 4096) {
  const initial = Math.max(1, Math.min(1000000, Math.trunc(Number.isFinite(input) ? input : 4096)));
  const frames = [], requests = [];
  let state = {request:0, prefix:0, target:initial, completed:0, encoderEnd:0, decoderEnd:0,
    encoderWindow:0, decoderWindow:0, saved:0, checkpoint:0, resident:true,
    repair:0, decoderReplay:0, loaded:0, active:'input', operation:'admit', added:0};
  const push = (operation, active, change = {}) => {
    state = {...state, ...change, operation, active};
    frames.push({...state});
  };
  const append = (end, kind) => {
    push(kind === 'prefill' ? 'encodeInput' : 'encodeToken', 'encoder', {
      encoderEnd:end, encoderWindow:end, added:end-state.completed,
    });
    push(kind === 'prefill' ? 'buildTail' : 'decodeToken', 'decoder', {
      decoderEnd:end, decoderWindow:end, completed:end,
      decoderReplay:kind === 'prefill' ? Math.min(end, WINDOW) : state.decoderReplay,
    });
  };
  for (let request = 0; request < 3; request++) {
    const prefix = state.completed, suffix = request === 0 ? initial : request === 1 ? 3 : 2;
    const target = prefix + suffix;
    requests.push({id:request, prefix, suffix, target, start:frames.length});
    push('admit', 'input', {request,prefix,target,repair:0,decoderReplay:0,loaded:0,added:0});
    if (request > 0) {
      push('load', 'archive', {resident:true,loaded:globalBytes(prefix)});
      if (request === 1) push('restore', 'encoder', {encoderWindow:prefix});
      else push('repair', 'encoder', {encoderWindow:prefix,repair:Math.min(prefix,WINDOW)});
    }
    append(target,'prefill');
    for (let i = 0; i < (request === 0 ? 4 : 2); i++) append(state.completed+1,'decode');
    push('save', 'archive', {saved:state.completed,checkpoint:state.completed,decoderWindow:0,resident:false,encoderWindow:0});
    if (request === 1) push('expire','archive',{checkpoint:0});
    requests[request].end = frames.length - 1;
  }
  return {initial,frames,requests};
}

export function deriveCedSession(trace, cursor = 0) {
  const step = Math.max(0,Math.min(trace.frames.length-1,Math.trunc(Number.isFinite(cursor)?cursor:0)));
  const frame = trace.frames[step], previous = trace.frames[Math.max(0,step-1)];
  const groups = KV_SOURCES.map(owner => {
    const ratio = owner < 20 ? 2 : 1, end = owner < 20 ? frame.encoderEnd : frame.decoderEnd;
    const oldEnd = owner < 20 ? previous.encoderEnd : previous.decoderEnd;
    const count = Math.floor(end/ratio), oldCount = Math.floor(oldEnd/ratio);
    return {owner,ratio,count,pending:end%ratio,pendingReady:frame.encoderWindow>0||frame.checkpoint>0,end,bytes:count*bytesPerRecord,
      delta:count-oldCount, savedCount:Math.floor(frame.saved/ratio),
      cells:Array.from({length:Math.min(count,5)},(_,i)=>{
        const record=count-Math.min(count,5)+i+1;
        return {id:`${owner}:${record}`,record,start:(record-1)*ratio+1,end:record*ratio,fresh:record>oldCount};
      })};
  });
  const total = groups.reduce((sum,g)=>sum+g.bytes,0);
  const position = Math.max(frame.encoderEnd,frame.decoderEnd,frame.target);
  const visible = Array.from({length:Math.min(position,10)},(_,i)=>position-Math.min(position,10)+i+1);
  return {...frame,step,phase:step===0?'idle':step===trace.frames.length-1?'done':'running',
    done:step===trace.frames.length-1,groups,total,delta:groups.reduce((sum,g)=>sum+g.delta*bytesPerRecord,0),
    persistentBytes:globalBytes(frame.saved),prefixBytes:globalBytes(frame.prefix),
    encoderTail:tail(frame.encoderWindow),decoderTail:tail(frame.decoderWindow),checkpointTail:tail(frame.checkpoint),
    repairTail:tail(frame.prefix),inputTail:tail(frame.target),visible,
    evicted:Math.max(0,frame.completed-WINDOW),
    tokens:visible.map(id=>({id,kind:id<=frame.prefix?'prefix':id<=frame.target?'input':'generated',
      complete:id<=frame.completed,inflight:id>frame.completed&&id<=frame.encoderEnd})),
  };
}
