import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
// extract the vertex shader string from pixi's js bundle
const vertMod = fs.readFileSync('node_modules/pixi.js/lib/filters/defaults/defaultFilter.vert.mjs','utf8');
const inner = vertMod.match(/"((?:[^"\\]|\\.)*)"/)?.[1] ?? '';
const vertexSrc = JSON.parse('"' + inner + '"');
// fallback simpler extraction
const VERTEX_FALLBACK = `in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
void main(void){
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vTextureCoord = aPosition;
}`;
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-angle=swiftshader'] });
  const p = await b.newPage();
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  const out = await p.evaluate((vertexSrc) => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return { err: 'no webgl2' };
    let compiled = '';
    try {
      const fragSrc = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform vec4 uInputSize;
	uniform float uDepth;
	uniform float uAngle;

	void main()
	{
		vec4 c = texture(uTexture, vTextureCoord);
		if (c.a < 0.01)
		{
			finalColor = c;
			return;
		}
		vec2 px = uInputSize.zw;
		float aR = texture(uTexture, vTextureCoord + vec2(px.x, 0.0)).a;
		float aL = texture(uTexture, vTextureCoord - vec2(px.x, 0.0)).a;
		float aU = texture(uTexture, vTextureCoord + vec2(0.0, px.y)).a;
		float aD = texture(uTexture, vTextureCoord - vec2(0.0, px.y)).a;
		float dx = aR - aL;
		float dy = aU - aD;
		float rad = radians(uAngle);
		float lx = cos(rad);
		float ly = sin(rad);
		float lighting = (dx * lx + dy * ly) * uDepth;
		if (lighting > 0.0)
			c.rgb = clamp(c.rgb + lighting * vec3(1.0), 0.0, 1.0);
		else
			c.rgb = clamp(c.rgb + lighting * vec3(0.3, 0.3, 0.4), 0.0, 1.0);
		finalColor = c;
	}`;
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vertexSrc);
      gl.compileShader(vs);
      compiled += 'VS:' + gl.getShaderInfoLog(vs) + '|ok=' + gl.getShaderParameter(vs, gl.COMPILE_STATUS) + ';';
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fragSrc);
      gl.compileShader(fs);
      compiled += 'FS:' + gl.getShaderInfoLog(fs) + '|ok=' + gl.getShaderParameter(fs, gl.COMPILE_STATUS) + ';';
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      compiled += 'LINK:' + gl.getProgramInfoLog(prog) + '|ok=' + gl.getProgramParameter(prog, gl.LINK_STATUS);
    } catch (e) { compiled += 'THROW:' + e.message; }
    return compiled;
  }, vertexSrc || VERTEX_FALLBACK);
  console.log(out);
  await b.close();
})();
