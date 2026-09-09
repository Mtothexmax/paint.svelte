import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-angle=swiftshader'] });
  const p = await b.newPage();
  const logs = [];
  p.on('console', m => { if (['error','warning'].includes(m.type())) logs.push(m.type()+': '+m.text().slice(0,300)); });
  p.on('pageerror', e=>logs.push('pageerror: '+e.message));
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  const info = await p.evaluate(async () => {
    const can = document.querySelector('canvas');
    const hasReg = typeof window.__REGISTRY__ !== 'undefined';
    const r = await (async()=>{ try { const { hasEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts'); return hasEditorRenderer(); } catch(e){ return 'err:'+e.message; } })();
    return { hasCanvas: !!can, hasReg, rendererReady: r, bodyText: document.body.innerText.slice(0,120) };
  });
  console.log(JSON.stringify(info, null, 1));
  console.log('LOGS:', JSON.stringify(logs, null, 1));
  await b.close();
})();
