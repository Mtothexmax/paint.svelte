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
    const bevel = grab('bevel', { depth: 25, angle: 135 });
    const emboss = grab('emboss', { angle: 45, strength: 70 });
    const compile = (ctx, type, src) => {
      const sh = ctx.createShader(type);
      ctx.shaderSource(sh, src);
      ctx.compileShader(sh);
      return { ok: ctx.getShaderParameter(sh, ctx.COMPILE_STATUS), log: ctx.getShaderInfoLog(sh) || '' };
    };
    const test = (label, frag) => {
      const vi = Array.isArray(document.createElement('canvas').getContext('webgl', {failIfMajorPerformanceCaveat: false}));
      const res = {};
      const c1 = document.createElement('canvas').getContext('webgl2');
      res.webgl2 = c1 ? compile(c1, c1.FRAGMENT_SHADER, frag) : 'no-ctx';
      const c2 = document.createElement('canvas').getContext('webgl');
      res.webgl1 = c2 ? compile(c2, c2.FRAGMENT_SHADER, frag) : 'no-ctx';
      return res;
    };
    return {
      api: {
        ctx2: !!document.createElement('canvas').getContext('webgl2'),
        ctx1: !!document.createElement('canvas').getContext('webgl')
      },
      bevel: test('bevel', bevel.fragment),
      emboss: test('emboss', emboss.fragment)
    };
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
