// Adapt the existing chapter palette by semantic CSS role, preserving hue identity.
// Already-dark surfaces and light text (e.g. code panels) remain unchanged.
export function darkColor(r,g,b,role){
 const values=[r,g,b].map(v=>v/255),max=Math.max(...values),min=Math.min(...values),l=(max+min)/2,d=max-min;
 const sat=d===0?0:d/(1-Math.abs(2*l-1));
 const neutral=d<.035 || sat<.18 || ['248,250,252','241,245,249','226,232,240','203,213,225','148,163,184','100,116,139','71,85,105','51,65,85','30,41,59','15,23,42','2,6,23'].includes([r,g,b].join(','));
 if(role==='text'){
  if(l>.68)return [r,g,b];
  if(neutral)return l<.3?[226,232,240]:[174,189,209];
  const amount=Math.max(0,(.76-l)/(1-l));return values.map(v=>Math.round((v+(1-v)*amount)*255));
 }
 if(role==='border'){
  if(l<.4)return [r,g,b];
  return neutral?[55,72,95]:values.map(v=>Math.round(v*110+22));
 }
 if(role==='surface'){
  if(l<.7){
   const luminance=values.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
   // Bright amber/cyan buttons also need a darker surface behind light text.
   return luminance>.28?values.map(v=>Math.round(v*Math.sqrt(.2/luminance)*255)):[r,g,b];
  }
  if(neutral)return l>.985?[19,29,46]:l>.95?[14,23,38]:[27,40,59];
  // Preserve the hue of pale semantic surfaces instead of collapsing all tints.
  const hue=d===0?0:max===values[0]?((values[1]-values[2])/d+6)%6:max===values[1]?(values[2]-values[0])/d+2:(values[0]-values[1])/d+4;
  const chroma=.32*Math.min(.65,sat),x=chroma*(1-Math.abs(hue%2-1)),base=.16-chroma/2;
  const rgb=hue<1?[chroma,x,0]:hue<2?[x,chroma,0]:hue<3?[0,chroma,x]:hue<4?[0,x,chroma]:hue<5?[x,0,chroma]:[chroma,0,x];
  return rgb.map(v=>Math.round((v+base)*255));
 }
 return [r,g,b];
}
export function themeValue(value,role){
 if(value.includes('light-dark(')||value.includes('url('))return value;
 return value.replace(/#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|\bwhite\b|\bblack\b|rgba?\(\s*\d+[\s,]+\d+[\s,]+\d+(?:\s*[,/]\s*(?:var\([^)]*\)|[\d.]+%?))?\s*\)/gi,original=>{
  let r,g,b,alpha='';
  if(original[0]==='#'){
   let hex=original.slice(1);if(hex.length<5)hex=[...hex].map(c=>c+c).join('');
   [r,g,b]=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));if(hex.length===8)alpha=String(parseInt(hex.slice(6),16)/255);
  }else if(/^(white|black)$/i.test(original)){r=g=b=original.toLowerCase()==='white'?255:0;}
  else{const match=original.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*(.*))?\)$/i);if(!match)return original;[r,g,b]=match.slice(1,4).map(Number);alpha=match[4]?.trim()||'';}
  const dark=darkColor(r,g,b,role);if(dark.every((v,i)=>v===[r,g,b][i]))return original;
  return `light-dark(${original}, rgb(${dark.join(' ')}${alpha?' / '+alpha:''}))`;
 });
}
export default function themeColors(){return {postcssPlugin:'chapter-theme-colors',OnceExit(root){root.walkDecls(decl=>{
 if(decl.source?.input?.file?.replaceAll('\\','/').endsWith('/HomeLanding.css'))return;
 const p=decl.prop;let role;
 if(p==='color'||p==='fill'||p==='stroke'||p==='text-decoration-color')role='text';
 else if(p.startsWith('background')||p.startsWith('--tw-gradient-'))role='surface';
 else if(p.includes('border')||p.includes('outline')||p==='--chapter-border'||p==='--tw-ring-color')role='border';
 if(p.startsWith('background')&&decl.parent.nodes?.some(node=>node.prop?.endsWith('background-clip')&&node.value==='text'))role='text';
 if(p==='fill'&&decl.parent.selector?.includes('rect'))role='surface';
 if(role)decl.value=themeValue(decl.value,role);
 });}};}
