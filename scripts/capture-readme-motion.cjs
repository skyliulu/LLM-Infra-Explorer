// Capture real English UI states, then encode portable animated README previews.
// Requires Playwright/Chromium and ffmpeg on PATH. No application code is changed.
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
(async()=>{
 const output=path.resolve('media/previews'),temp=await fs.mkdtemp(path.join(os.tmpdir(),'infra-readme-motion-'));
 const browser=await chromium.launch({headless:true});
 const manifest={locale:'en-US',deviceScaleFactor:2,frameDurationSeconds:2,viewport:{width:1760,height:1160},source:'Complete English workbench tours: overview, real controls, execution and connected details',previews:[],errors:[]};
 try{
 const page=await browser.newPage({viewport:{width:1760,height:1160},deviceScaleFactor:2,locale:'en-US'});
 page.on('pageerror',e=>manifest.errors.push(e.message));
 await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5173/');
 await page.getByRole('button',{name:/^LLM Inference /}).click();
 await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
 async function wait(){await page.waitForTimeout(500);await page.evaluate(()=>document.fonts.ready);}
 async function frame(view){
  if(!view){await page.evaluate(()=>window.scrollTo(0,0));}
  else {await page.locator(view).first().scrollIntoViewIfNeeded();}
  await wait();
 }
 async function sequence(name,actions){
  const dir=path.join(temp,name);await fs.mkdir(dir);const shots=[];
  const selected=process.env.PREVIEW_ONLY?actions.slice(0,1):actions;
  for(let i=0;i<selected.length;i++){
   await selected[i].run();await wait();await frame(selected[i].view);
   const file=path.join(dir,`${i}.png`);
   // Keep the complete browser workbench in frame, including controls and adjacent views.
   await page.screenshot({path:file,animations:'disabled'});
   if(i===0)await fs.copyFile(file,path.join(output,name+'.png'));
   const bytes=await fs.readFile(file);shots.push({file,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),state:selected[i].label});
  }
  if(process.env.PREVIEW_ONLY){console.log('Overview',name);return;}
  // Pad changing element heights without resizing or cropping the browser's contents.
  const width=Math.max(...shots.map(s=>s.width)),height=Math.max(...shots.map(s=>s.height));
  for(const shot of shots){const normalized=shot.file.replace('.png','-padded.png');execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',shot.file,'-vf',`pad=${width}:${height}:0:0:white`,normalized]);shot.file=normalized;}
  const concat=shots.map(s=>`file '${s.file.replace(/\\/g,'/')}'\nduration 2`).join('\n')+`\nfile '${shots.at(-1).file.replace(/\\/g,'/')}'\n`;
  const listing=path.join(dir,'frames.txt');await fs.writeFile(listing,concat);
  const filter=`pad=${width}:${height}:0:0:white,scale='min(1600,iw)':-2:flags=lanczos,fps=5`;
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',listing,'-filter_complex',`${filter},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,'-loop','0',path.join(output,name+'.gif')]);
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',listing,'-vf',`pad=${width}:${height}:0:0:white,pad=ceil(iw/2)*2:ceil(ih/2)*2,fps=10`,'-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart',path.join(output,name+'.mp4')]);
  manifest.previews.push({name,width,height,states:shots.map(s=>s.state),gifBytes:(await fs.stat(path.join(output,name+'.gif'))).size});console.log(name,shots.length,'states',width,height);
 }
 const click=name=>()=>page.getByRole('button',{name,exact:true}).click();
 const idle=async()=>{};
 await sequence('llm-inference',[
  {label:'Full inference workbench with committed first-layer KV',run:async()=>{for(let i=0;i<3;i++)await click('Next')();}},
  {label:'Replay prefill embedding in the full pipeline',run:async()=>{await click('Reset')();await click('Next')();},view:'[data-testid="tensor-workbench"]'},
  {label:'Per-layer attention and cache',run:click('Next'),view:'[data-testid="tensor-stage-attention"]'},
  {label:'Attention results and FFN/MoE',run:click('Next'),view:'[data-testid="tensor-stage-ffn"]'},
  {label:'Next layer begins; inspect the whole pipeline',run:click('Next'),view:'[data-testid="tensor-workbench"]'},
  {label:'Back to inference overview with accumulated state',run:idle}]);
 await page.getByRole('button',{name:'Parallel Strategy',exact:true}).click();await wait();
 await sequence('parallel-strategies',[
  {label:'All six controls, TP=2/PP=2 and four physical GPUs',run:async()=>{await page.getByTestId('degree-tp-2').click();await page.getByTestId('degree-pp-2').click();}},
  {label:'TP=4: tensor shards and eight-GPU map',run:()=>page.getByTestId('degree-tp-4').click(),view:'[data-testid="logical-canvas-column"]'},
  {label:'PP=1: change the layer partition and GPU count',run:()=>page.getByTestId('degree-pp-1').click(),view:'[data-testid="gpu-map-column"]'},
  {label:'EP=2: expert ownership and communication',run:()=>page.getByTestId('degree-ep-2').click(),view:'[data-testid="moe-graph"]'},
  {label:'Return to controls with the composed topology',run:idle}]);
 await page.getByRole('button',{name:'Sparse Attention',exact:true}).click();await wait();
 await sequence('sparse-attention',[
  {label:'Full workbench and simultaneous resource comparison',run:idle},
  {label:'Connected architecture before querying',run:click('Replay from start'),view:'[data-testid="canvas-workspace"]'},
  ...Array.from({length:9},(_,i)=>({label:`Query execution operation ${i+1}`,run:click('Execute next step'),view:'[data-testid="canvas-workspace"]'})),
  {label:'Drill into Query while retaining the same architecture',run:()=>page.getByRole('button',{name:'Query projection',exact:true}).click({position:{x:20,y:20}}),view:'[data-testid="canvas-workspace"]'},
  {label:'Return to resource comparison',run:idle}]);
 await page.getByRole('button',{name:'Quantization',exact:true}).click();await wait();
 await sequence('quantization',[
  {label:'Full workbench: weight/activation modes and resource targets',run:idle},
  {label:'BF16 source versus INT4 storage and error',run:click('W(INT4) / A(BF16)'),view:'main main > section:nth-of-type(2)'},
  {label:'Switch to grouped FP4 in the same storage workbench',run:click('W(FP4) / A(BF16)'),view:'main main > section:nth-of-type(2)'},
  {label:'Inspect another FP4 channel and reconstruction',run:click('Selected channel 5 BF16 reference'),view:'main main > section:nth-of-type(2)'},
  {label:'Offline preparation and inference engine workbenches',run:idle,view:'main main > section:nth-of-type(3)'},
  {label:'Loading, activation conversion and paged KV access',run:idle,view:'main main > section:nth-of-type(4)'},
  {label:'Return to the full precision controls',run:idle}]);
 await page.getByRole('button',{name:'Engram',exact:true}).click();await wait();
 await sequence('engram',[
  {label:'Full network, completed retrieval/gating pipeline and code',run:async()=>{for(let i=0;i<9;i++)await click('Next')();}},
  ...Array.from({length:5},(_,i)=>({label:`Retrieval operation ${i+1}`,run:async()=>{if(i===0)await click('Reset')();await click('Next')();},view:'[data-testid="engram-tensor-flow"]'})),
  ...['Projection','Dependency gate','Convolution and residual','Block output'].map(label=>({label,run:click('Next'),view:'[data-testid="engram-gating-canvas"]'})),
  {label:'System data movement timeline',run:idle,view:'[data-testid="engram-system-timeline"]'},
  {label:'Return to the full architecture',run:idle}]);
 if(!process.env.PREVIEW_ONLY)await fs.writeFile(path.join(output,'motion-capture.json'),JSON.stringify(manifest,null,2));
 if(manifest.errors.length)throw Error(manifest.errors.join('\n'));
 }finally{await browser.close();}
})();
