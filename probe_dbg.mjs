import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-angle=swiftshader'] });
  const p = await b.newPage();
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  const info = await p.evaluate(async () => {
    const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
    const r = getEditorRenderer();
    const doc = window.__REGISTRY__.active;
    const scene = r['activeScene'];
    return {
      hasDoc: !!doc,
      keys: Object.keys(scene || {}),
      spritesLen: scene && Array.isArray(scene['layerSprites']) ? scene['layerSprites'].length : null,
      activeLayerIndex: doc ? doc['activeLayerIndex'] : null,
      layers: doc && doc.layers ? doc.layers.map(l=>l.name) : null
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await b.close();
})();
