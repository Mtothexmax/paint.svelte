import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-angle=swiftshader'] });
  const p = await b.newPage();
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  const clickText = (sel, text) => p.evaluate((s,t)=>{const el=[...document.querySelectorAll(s)].find(e=>(e.textContent||'').replace(/\s+/g,' ').trim().includes(t)); if(!el) return false; el.click(); return true;}, sel, text);
  await clickText('.menubar-btn','File'); await sleep(200);
  await clickText('.menu-item','New…'); await p.waitForSelector('.dialog',{timeout:8000}); await sleep(120);
  await p.evaluate(()=>document.querySelector('.dialog .btn-primary').click()); await sleep(700);
  await p.evaluate(async()=>{ const {applyFill}=await import('/src/lib/services/fillService.ts'); const r=applyFill(100,100,{r:255,g:80,b:40,a:255}); if(r!=='ok') throw new Error(r); await new Promise(rs=>setTimeout(rs,600)); });
  await p.evaluate(async()=>{ const {addLayerEffect}=await import('/src/lib/services/layerEffectsService.ts'); const doc=window.__REGISTRY__.active; addLayerEffect(doc.activeLayer.id,'emboss',{}); await new Promise(rs=>setTimeout(rs,500)); });
  const out = await p.evaluate(async()=>{
    const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
    const r = getEditorRenderer(); const doc = window.__REGISTRY__.active;
    const scene = r['activeScene'];
    const idx = doc.layers.findIndex(l=>l.id===doc.activeLayerId);
    const live = scene['layerSprites'][idx];
    const clone = live.clone();
    clone.position.set(0,0); clone.scale.set(1,1); clone.anchor.set(0,0); clone.alpha=1; clone.filters=[];
    const tx = r.app.renderer.extract.pixels({ target: clone, resolution: 1 });
    const d = tx.pixels;
    const at=(x,y)=>{const i=(y*tx.width+x)*4; return Array.from(d.slice(i,i+4));};
    let op=0, minA=255, maxA=0;
    for(let i=3;i<d.length;i+=4){const a=d[i]; if(a>0)op++; if(a<minA)minA=a; if(a>maxA)maxA=a;}
    const res = {
      w: tx.width, h: tx.height, op, minA, maxA,
      at04: at(0,4), at4404: at(44,4), at100100: at(100,100), at1000540: at(1000,540),
      liveTransform: { a: live.worldTransform.a, d: live.worldTransform.d, tx: live.worldTransform.tx, ty: live.worldTransform.ty },
      liveW: live.width, liveH: live.height
    };
    clone.destroy();
    return res;
  });
  console.log(JSON.stringify(out,null,1));
  await b.close();
})();
