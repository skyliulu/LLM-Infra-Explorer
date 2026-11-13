import { COMMIT } from './model.js';

export const OFFICIAL = `https://github.com/deepseek-ai/DeepInfer/blob/${COMMIT}/doc/inference_deployment_qa.md`;
export const PERFORMANCE_DEFAULTS = { hit: 80, ep: 8, balanced: true, traffic: 'decode', capital: 30000, cost: 8, revenue: 100 };
const clamp = (value, lo, hi, fallback) => Number.isFinite(Number(value)) ? Math.max(lo, Math.min(hi, Number(value))) : fallback;

export function derivePerformance(input = {}) {
  const config = {
    hit: clamp(input.hit, 0, 100, 80), ep: [2,8].includes(input.ep) ? input.ep : 8, balanced: typeof input.balanced === 'boolean' ? input.balanced : true,
    traffic: ['prefill', 'decode'].includes(input.traffic) ? input.traffic : 'decode',
    capital: clamp(input.capital, 10000, 100000, 30000), cost: clamp(input.cost, 0, 50, 8),
    revenue: clamp(input.revenue, 0, 100, 100),
  };
  // Equal-length illustrative inputs: token coverage, not a FLOP or wall-time estimate.
  const reused = 1000 * config.hit / 100;
  const loads = config.balanced ? [9, 8, 8, 7] : [16, 4, 6, 6];
  const slowest = Math.max(...loads), average = loads.reduce((a, b) => a + b) / loads.length;
  const hourlyRevenue = 38 * config.revenue / 100;
  const dailyNet = 24 * (hourlyRevenue - config.cost);
  return {
    config, reused, remaining: 1000 - reused, total: 1000,
    loads, slowest, average, waiting: loads.map(load => slowest - load), imbalance: slowest / average,
    wide: { groups: 8/config.ep, expertsPerRank: 8/config.ep, tokensPerGroup: 4*config.ep, tokensPerExpert: config.ep/2, totalWeightUnits: 64/config.ep,
      ranks: Array.from({length:8},(_,rank)=>({rank,group:Math.floor(rank/config.ep),experts:Array.from({length:8/config.ep},(_,i)=>(rank%config.ep)*(8/config.ep)+i)})) },
    // Eight resource shares, not eight physical GPUs; no modeled service rate.
    pools: config.traffic === 'prefill' ? [6, 2] : [2, 6],
    hourlyRevenue, dailyNet, days: dailyNet > 0 ? config.capital / dailyNet : null,
    grossDays: hourlyRevenue > 0 ? config.capital / (24 * hourlyRevenue) : null,
    requiredHourlyNet: config.capital / (30 * 24),
  };
}
