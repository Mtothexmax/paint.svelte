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
    const scene = r['activeScene']; const idx = doc.layers.findIndex(l=>l.id===doc.activeLayerId);
    const sprite = scene['layerSprites'][idx];
    const extracted = r.app.renderer.extract.pixels({ target: sprite, resolution: 1 });
    const data = extracted.pixels;
    const at = (x,y)=>{ const i=(y*doc.width+x)*4; return Array.from(data.slice(i,i+4)); };
    let zeroA=0, op=0, maxA=0, minA=255;
    for(let i=3;i<data.length;i+=4){ const a=data[i]; if(a===0) zeroA++; if(a>0) op++; if(a>maxA)maxA=a; if(a<minA)minA=a; }
    const pts = [(4*1920+4)*4, (50*1920+50)*4, (1000*1920+540)*4, (0)].map(i=>Array.from(data.slice(i,i+4)));
    return { size: extracted.width+'x'+extracted.height, zeroA, op, maxA, minA, pts, firstBytes: Array.from(data.slice(0,40)) };
  });
  console.log(JSON.stringify(out,null,1));
  await b.close();
})();
