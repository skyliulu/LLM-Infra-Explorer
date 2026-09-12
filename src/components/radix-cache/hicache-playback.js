const hiddenCheckpoints=new Set(['allocate','queued','query_pending','victim','release']);
export const nextVisualStep=(history,step)=>{let next=step+1;while(next<history.length-1&&hiddenCheckpoints.has(history[next].kind))next++;return Math.min(next,history.length-1);};
