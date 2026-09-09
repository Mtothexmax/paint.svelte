import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-angle=swiftshader'] });
  const p = await b.newPage();
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  const out = await p.evaluate(async () => {
    const { makeGlFilter } = await import('/src/lib/effects/shaders.ts');
    const { effectById } = await import('/src/lib/effects/index.ts');
    const grab = (id, setts) => {
      const f = effectById(id).filter(setts);
      const prog = f['glProgram'];
      const res = { fragment: prog.fragment, vertex: prog.vertex };
      f.destroy();
      return res;
    };
    return {
      bevel: grab('bevel', { depth: 25, angle: 135 }).fragment,
      emboss: grab('emboss', { angle: 45, strength: 70 }).fragment
    };
  });
  console.log('=== BEVEL (processed) ===');
  console.log(out.bevel);
  console.log('=== EMBOSS (processed) ===');
  console.log(out.emboss);
  await b.close();
})();
