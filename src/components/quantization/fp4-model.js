import { FP8_VALUES, nearestFP8 } from './model.js';

export const FP4_VALUES = [0, .5, 1, 1.5, 2, 3, 4, 6];
export const RECIPES = {main: {channels:512, group:16, scaleFormat:'E4M3'}, index: {channels:128, group:32, scaleFormat:'E8M0'}};
export function encodeFP4(value) {
  let code = 0;
  FP4_VALUES.forEach((v, i) => {
    const d = Math.abs(v - Math.abs(value)), old = Math.abs(FP4_VALUES[code] - Math.abs(value));
    if (d < old || (d === old && i % 2 === 0)) code = i;
  });
  return code | ((value < 0 || Object.is(value, -0)) ? 8 : 0);
}
export const decodeFP4 = code => (code & 8 ? -1 : 1) * FP4_VALUES[code & 7];
export function quantizeBlock(values, kind) {
  const amax = Math.max(...values.map(Math.abs));
  const scale = kind === 'main' ? nearestFP8(Math.max(amax / 6, 2 ** -9)) : 2 ** Math.ceil(Math.log2(Math.max(amax / 6, 2 ** -126)));
  const scaleCode = kind === 'main' ? FP8_VALUES.indexOf(scale) : Math.log2(scale) + 127;
  const codes = values.map(v => encodeFP4(Math.max(-6, Math.min(6, v / scale))));
  const restored = codes.map(c => decodeFP4(c) * scale);
  const packed = Array.from({length:values.length / 2}, (_, i) => codes[2*i] | (codes[2*i+1] << 4));
  return {amax, scale, scaleCode, codes, restored, packed};
}
export function deriveFP4Model(kind = 'main', selected = 17, peak = 6, sample = false) {
  const recipe = {...(RECIPES[kind] || RECIPES.main), ...(sample ? {channels:32} : {})};
  kind = RECIPES[kind] ? kind : 'main';
  selected = Math.max(0, Math.min(recipe.channels - 1, Math.trunc(selected) || 0));
  peak = Math.max(0, Math.min(24, Number.isFinite(peak) ? peak : 6));
  const values = Array.from({length:recipe.channels}, (_, i) => i === 17 ? peak : ((i * 7 % 31) - 15) / 8);
  const groups = Array.from({length:recipe.channels / recipe.group}, (_, i) => {
    const start = i * recipe.group, input = values.slice(start, start + recipe.group);
    return {start, input, ...quantizeBlock(input, kind)};
  });
  const groupIndex = Math.floor(selected / recipe.group), block = groups[groupIndex], local = selected - block.start;
  const restored = groups.flatMap(g => g.restored), payload = recipe.channels / 2, metadata = groups.length;
  return {...recipe, kind, selected, peak, values, groups, groupIndex, block, local, restored, payload, metadata, total:payload+metadata, baseline:recipe.channels*2,
    mse:values.reduce((s,v,i) => s+(v-restored[i])**2,0)/values.length,
    maxError:Math.max(...values.map((v,i) => Math.abs(v-restored[i])))};
}
