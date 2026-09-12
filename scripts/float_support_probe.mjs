// Env probe: is rgba16float actually active in the headless probe browser?
// Reports: isFloatRenderSupported(), the GL extension list for a fresh webgl2
// context, and the actual format of a surface texture created via the helper
// after the editor has mounted.
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function main() {
	const browser = await puppeteer.launch({
		executablePath: CHROME,
		headless: 'new',
		args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
	page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(1500);

	const env = await page.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const st = await import(u('/src/lib/render/surfaceTexture.ts'));
		const gl = document.createElement('canvas').getContext('webgl2');
		const ext = {};
		if (gl) {
			ext.color_buffer_float = !!gl.getExtension('EXT_color_buffer_float');
			ext.color_buffer_half_float = !!gl.getExtension('EXT_color_buffer_half_float');
			ext.renderer = gl.getParameter(gl.RENDERER);
		} else {
			ext.renderer = 'no webgl2 context';
		}
		const tex = st.createSurfaceTexture(4, 4);
		const fmt = tex.format;
		tex.destroy(true);
		return {
			isFloatRenderSupported: st.isFloatRenderSupported(),
			ext,
			surfaceFormat: fmt,
			expected: st.SURFACE_FORMAT
		};
	});
	console.log(JSON.stringify(env, null, 1));

	// Also check the pixi renderer's own GL context extensions
	const pixiGl = await page.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const { getEditorRenderer } = await import(u('/src/lib/render/EditorRenderer.ts'));
		const r = getEditorRenderer();
		if (!r || !r.app) return { mounted: false };
		const gl = r.app.renderer.gl;
		return {
			mounted: true,
			webgl2: gl instanceof WebGL2RenderingContext,
			color_buffer_float: !!gl.getExtension('EXT_color_buffer_float'),
			renderer: gl.getParameter(gl.RENDERER)
		};
	});
	console.log(JSON.stringify(pixiGl, null, 1));
	await browser.close();
}
main().then(
	() => console.log('DONE'),
	(e) => {
		console.error('FAILED', e && e.message ? e.message : e);
		process.exit(1);
	}
);
