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
    const embossG = grab('emboss', { angle: 45, strength: 70 });
    const link = (gl2, vertIdx, fragIdx) => {
      const prog = gl2.createProgram();
      const vs = gl2.createShader(gl2.VERTEX_SHADER);
      const fs = gl2.createShader(gl2.FRAGMENT_SHADER);
      gl2.shaderSource(vs, vertIdx); gl2.compileShader(vs);
      gl2.shaderSource(fs, fragIdx); gl2.compileShader(fs);
      const vsOk = gl2.getShaderParameter(vs, gl2.COMPILE_STATUS);
      const fsOk = gl2.getShaderParameter(fs, gl2.COMPILE_STATUS);
      gl2.attachShader(prog, vs); gl2.attachShader(prog, fs);
      gl2.linkProgram(prog);
      const linkOk = gl2.getProgramParameter(prog, gl2.LINK_STATUS);
      const log = gl2.getProgramInfoLog(prog) || '';
      return { vsOk, fsOk, linkOk, log };
    };
    const gl2 = document.createElement('canvas').getContext('webgl2');
    const gl1 = document.createElement('canvas').getContext('webgl');
    const res = {
      bevelW2: link(gl2, bevel.vertex, bevel.fragment),
      bevelW1: link(gl1, bevel.vertex, bevel.fragment),
      embossW2: link(gl2, embossG.vertex, embossG.fragment),
      embossW1: link(gl1, embossG.vertex, embossG.fragment)
    };
    return { processedBevelFrag: bevel.fragment, processedBevelVert: bevel.vertex, res };
  });
  console.log('RES', JSON.stringify(out.res, null, 1));
  console.log('--- processed bevel vertex ---');
  console.log(out.processedBevelVert);
  await b.close();
})();
