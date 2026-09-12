import assert from 'node:assert/strict';
import postcss from 'postcss';
import themeColors,{themeValue,darkColor} from './theme-colors.mjs';

assert.equal(themeValue('#0d1117','surface'),'#0d1117','Keep code backgrounds dark');
assert.equal(themeValue('#ffffff','text'),'#ffffff','Keep text on solid buttons light');
assert.equal(themeValue('url("/preview-white.png")','surface'),'url("/preview-white.png")','Do not recolor assets');
assert.match(themeValue('rgb(255 255 255 / var(--tw-bg-opacity))','surface'),/19 29 46 \/ var\(--tw-bg-opacity\)/);
assert.match(themeValue('#fff8','surface'),/0\.533333/,'Preserve alpha');
const once=themeValue('#fff','surface');assert.equal(themeValue(once,'surface'),once,'Idempotent processing');
assert.notDeepEqual(darkColor(239,246,255,'surface'),darkColor(240,253,244,'surface'),'Blue and green must remain distinct');
const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
for(const fg of [[15,23,42],[71,85,105],[100,116,139],[30,64,175],[6,95,70]]){
 const ratio=(luminance(darkColor(...fg,'text'))+.05)/(luminance(darkColor(255,255,255,'surface'))+.05);
 assert(ratio>=4.5,`Body contrast ${fg}: ${ratio}`);
}
const result=await postcss([themeColors()]).process('.a{background:#fff;color:#0f172a;width:24px;border:1px solid #e2e8f0}@media(max-width:600px){.a:hover{background:#eff6ff}}',{from:undefined});
assert.match(result.css,/width:24px/);assert.match(result.css,/@media/);assert.match(result.css,/light-dark\(#eff6ff/);
console.log('Theme checks passed: alpha, assets, idempotence, role mapping, hue identity, body contrast and media rules.');
const gradient=await postcss([themeColors()]).process('.title{background:linear-gradient(90deg,#a5f3fc,#a5b4fc);background-clip:text;color:transparent}',{from:undefined});
assert(!gradient.css.includes('light-dark('),'Keep bright gradient text readable');
const branded=await postcss([themeColors()]).process('.home-primary{background:#a5f3fc;color:#082f49}',{from:'src/components/HomeLanding.css'});
assert(!branded.css.includes('light-dark('),'Preserve the intentionally dark home palette');
