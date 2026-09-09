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
  const dump = async (effectId, settings) => p.evaluate(async (effId, setts)=>{
    const { addLayerEffect, removeLayerEffect } = await import('/src/lib/services/layerEffectsService.ts');
    const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
    const doc = window.__REGISTRY__.active;
    for (let i=(doc.activeLayer.effects||[]).length-1;i>=0;i--) removeLayerEffect(doc.activeLayer.id,i);
    await new Promise(rs=>setTimeout(rs,200));
    addLayerEffect(doc.activeLayer.id, effId, setts);
    await new Promise(rs=>setTimeout(rs,500));
    const r = getEditorRenderer(); const scene = r['activeScene'];
    const effTex = scene['layerEffectTextures'].get(doc.activeLayer.id);
    if (!effTex) return { err: 'no effect texture' };
    const tx = r.app.renderer.extract.pixels({ target: effTex });
    const d = tx.pixels;
    const at=(x,y)=>{const i=(y*tx.width+x)*4; return Array.from(d.slice(i,i+4));};
    let op=0, minA=255, maxA=0;
    for(let i=3;i<d.length;i+=4){const a=d[i]; if(a>0)op++; if(a<minA)minA=a; if(a>maxA)maxA=a;}
    return { w: tx.width, h: tx.height, op, minA, maxA,
      at00: at(0,0), at44: at(4,4), at100100: at(100,100), at1000540: at(1000,540) };
  }, effectId, settings);
  for (const [id, setts] of [['bevel',{depth:25,angle:135}], ['emboss',{}], ['outline',{width:4}], ['feather',{radius:4}], ['shadow',{distance:4}], ['gaussianBlur',{amount:4}], ['dropShadow',{}], ['glow',{}]]) {
    const res = await dump(id, setts);
    console.log(id + ':', JSON.stringify(res));
  }
  await b.close();
})();
