// Eyedropper constancy: paints one soft dab, then asserts BOTH the straight
// surface readback AND the live eyedropper readout (sampleCompositeColorAt)
// return the paint color (±1) at every soft-edge texel. Catches regressions
// where an observation path reintroduces 8-bit premultiplied quantization
// (e.g. direct 1x1 extract.pixels + CPU divide reads (28,227,57) for a
// (25,230,70) dab at alpha 9). Also asserts region reads agree with the
// full-surface readback (orientation/offset of the region blit).
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function clickByText(page, sel, t) {
	const ok = await page.evaluate(
		(s, text) => {
			const el = [...document.querySelectorAll(s)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(text));
			if (!el) return false;
			el.click();
			return true;
		},
		sel,
		t
	);
	if (!ok) throw new Error('click failed ' + sel + ' ' + t);
}

async function main() {
	const browser = await puppeteer.launch({
		executablePath: CHROME,
		headless: 'new',
		args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
	page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
	page.on('console', (m) => {
		if (m.type() === 'error') console.log('PAGE console.error:', m.text());
	});
	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(1500);
	await clickByText(page, '.menubar-btn', 'File');
	await sleep(250);
	await clickByText(page, '.menu-item', 'New…');
	await page.waitForSelector('.dialog', { timeout: 8000 });
	await sleep(120);
	await page.evaluate(() => document.querySelector('.dialog .btn-primary').click());
	await sleep(2500);

	const C = [25, 230, 70];
	await page.evaluate(async (cc) => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const ui = await import(u('/src/lib/state/ui.ts'));
		ui.foregroundColor.set({ r: cc[0], g: cc[1], b: cc[2], a: 255 });
		ui.brushSize.set(80);
		ui.brushHardness.set(0);
		ui.brushOpacity.set(100);
		await new Promise((r) => setTimeout(r, 300));
	}, C);
	await page.evaluate(() => [...document.querySelectorAll('.tool-btn')].find((b) => (b.getAttribute('aria-label') || '').toLowerCase().includes('brush'))?.click());
	await sleep(200);
	const p = await page.evaluate(() => {
		const canvas = document.querySelector('canvas');
		const bb = canvas.getBoundingClientRect();
		const doc = window.__REGISTRY__.active;
		const v = doc.view;
		return { x: bb.x + v.panX + 960 * v.zoom, y: bb.y + v.panY + 540 * v.zoom };
	});
	await page.mouse.move(p.x, p.y);
	await sleep(80);
	await page.mouse.down();
	await sleep(80);
	await page.mouse.up();
	await sleep(900);

	const report = await page.evaluate(async (cc) => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (pp) => {
			const hit = entries.find((x) => x.includes(pp));
			return hit ? new URL(hit).pathname + new URL(hit).search : pp;
		};
		const { getEditorRenderer } = await import(u('/src/lib/render/EditorRenderer.ts'));
		const rb = await import(u('/src/lib/render/readback.ts'));
		const ed = await import(u('/src/lib/render/eyedropper.ts'));
		const renderer = getEditorRenderer();
		const doc = window.__REGISTRY__.active;
		const { pixels } = rb.extractSurfaceBytes(renderer, doc.activeLayer.surfaceId);
		const W = doc.width;
		let n = 0, sDev = 0, eDev = 0;
		const sEx = [], eEx = [];
		for (let y = 480; y < 600; y++) {
			for (let x = 900; x < 1020; x++) {
				const i = (y * W + x) * 4;
				const A = pixels[i + 3];
				if (A < 8 || A > 250) continue;
				n++;
				const sd = Math.max(Math.abs(pixels[i] - cc[0]), Math.abs(pixels[i + 1] - cc[1]), Math.abs(pixels[i + 2] - cc[2]));
				if (sd > sDev) sDev = sd;
				if (sd > 1 && sEx.length < 5) sEx.push({ x, y, a: A, v: [pixels[i], pixels[i + 1], pixels[i + 2]] });
				const e = ed.sampleCompositeColorAt(renderer, doc, x, y);
				const edev = Math.max(Math.abs(e.r - cc[0]), Math.abs(e.g - cc[1]), Math.abs(e.b - cc[2]));
				if (edev > eDev) eDev = edev;
				if (edev > 1 && eEx.length < 5) eEx.push({ x, y, a: A, v: [e.r, e.g, e.b] });
			}
		}
		// Region-vs-full consistency (catches flip/offset in the region blit).
		// Gated on visible alpha like every other probe: below A<8 the
		// divide amplifies float residue and the two paths may take
		// different zero branches — invisible either way.
		const rx = 920, ry = 500, rw = 80, rh = 80;
		const reg = rb.extractStraightRegion(renderer, renderer.surfaces.getTexture(doc.activeLayer.surfaceId), rx, ry, rw, rh);
		let rDev = 0, rN = 0;
		for (let dy = 0; dy < rh; dy++) {
			for (let dx = 0; dx < rw; dx++) {
				const fa = pixels[((ry + dy) * W + rx + dx) * 4 + 3];
				if (fa < 8) continue;
				rN++;
				const a = pixels[((ry + dy) * W + rx + dx) * 4];
				const b = reg.pixels[(dy * rw + dx) * 4];
				const d = Math.abs(a - b);
				if (d > rDev) rDev = d;
			}
		}
		return { n, straightMaxDev: sDev, eyedropperMaxDev: eDev, regionMaxDev: rDev, regionN: rN, straightEx: sEx, eyedropperEx: eEx };
	}, C);
	console.log(JSON.stringify(report, null, 1));
	await browser.close();
	if (report.n < 1000) throw new Error(`too few edge pixels sampled (n=${report.n})`);
	if (report.straightMaxDev > 1) throw new Error(`surface hue varies at soft edge (maxDev=${report.straightMaxDev})`);
	if (report.eyedropperMaxDev > 1) throw new Error(`eyedropper hue varies at soft edge (maxDev=${report.eyedropperMaxDev})`);
	if (report.regionMaxDev > 0) throw new Error(`region read disagrees with full readback (maxDev=${report.regionMaxDev}, n=${report.regionN})`);
	console.log(`DROPPER-OK: n=${report.n} edge pixels, surface and eyedropper both exact`);
}
main().then(
	() => console.log('DONE'),
	(e) => {
		console.error('FAILED', e && e.message ? e.message : e);
		process.exit(1);
	}
);





