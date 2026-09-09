import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-angle=swiftshader'] });
  const p = await b.newPage();
  const logs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type()+': '+m.text()); });
  p.on('pageerror', e=>logs.push('pageerror: '+e.message));
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  const clickText = (sel, text) => p.evaluate((s,t)=>{const el=[...document.querySelectorAll(s)].find(e=>(e.textContent||'').replace(/\s+/g,' ').trim().includes(t)); if(!el) return false; el.click(); return true;}, sel, text);
  await clickText('.menubar-btn','File'); await sleep(200);
  await clickText('.menu-item','New…'); await p.waitForSelector('.dialog',{timeout:8000}); await sleep(120);
  await p.evaluate(()=>document.querySelector('.dialog .btn-primary').click()); await sleep(700);
  await p.evaluate(async()=>{ const {applyFill}=await import('/src/lib/services/fillService.ts'); const r=applyFill(100,100,{r:255,g:80,b:40,a:255}); if(r!=='ok') throw new Error(r); await new Promise(rs=>setTimeout(rs,600)); });
  logs.length = 0;
  const out = await p.evaluate(async ()=>{
    const { addLayerEffect } = await import('/src/lib/services/layerEffectsService.ts');
    const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
    const doc = window.__REGISTRY__.active;
    const ok = addLayerEffect(doc.activeLayer.id, 'glow', { radius: 8, brightness: 40 });
    await new Promise(rs=>setTimeout(rs,600));
    const r = getEditorRenderer(); const scene = r['activeScene'];
    const effTex = scene['layerEffectTextures'].get(doc.activeLayer.id);
    if (!effTex) return { ok, err: 'no effect texture', n: (doc.activeLayer.effects||[]).length };
    const tx = r.app.renderer.extract.pixels({ target: effTex });
    const d = tx.pixels;
    const at=(x,y)=>{const i=(y*tx.width+x)*4; return Array.from(d.slice(i,i+4));};
    let op=0; for(let i=3;i<d.length;i+=4){ if(d[i]>0) op++; }
    return { ok, n: (doc.activeLayer.effects||[]).length, op, at00: at(0,0), at44: at(4,4) };
  }, []);
  console.log('glow add:', JSON.stringify(out));
  console.log('logs:', JSON.stringify(logs, null, 1));
  await b.close();
})();
