// Verifies that PNG export composites live layer effects:
//   1. Fill a small rect selection -> opaque block on transparent canvas.
//   2. Add a red Outline layer effect.
//   3. The export composite (renderer.exportTextureFor, used by exportPng)
//      contains red outline pixels; the raw base surface does not.
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const log = (...a) => console.log(...a);

async function main() {
	const browser = await puppeteer.launch({
		executablePath: CHROME,
		headless: 'new',
		args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

	const errors = [];
	page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
	page.on('console', (m) => {
		const t = m.text();
		const benign = /Failed to load resource/.test(t) || /GPU stall due to ReadPixels/.test(t) || /\[vite\]/.test(t);
		if (m.type() === 'error' && !benign) errors.push('console.error: ' + t);
		else if (m.type() === 'warning' && /shader|program|uniform|glGet|WebGL/i.test(t) && !/GPU stall/.test(t))
			errors.push('console.warn: ' + t);
	});

	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(2000);

	// --- create doc via File→New (mounts the editor) ----------------------
	const clickText = (sel, text) =>
		page.evaluate(
			(s, t) => {
				const el = [...document.querySelectorAll(s)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t));
				if (!el) return false;
				el.click();
				return true;
			},
			sel,
			text
		);
	log('[1] create doc via File->New');
	const fileClicked = await clickText('.menubar-btn', 'File');
	await sleep(200);
	const newClicked = await clickText('.menu-item', 'New');
	await page.waitForSelector('.dialog', { timeout: 8000 });
	await sleep(120);
	await page.evaluate(() => document.querySelector('.dialog .btn-primary').click());
	let ready = false;
	for (let i = 0; i < 60; i++) {
		ready = await page.evaluate(async () => {
			const entries = performance.getEntriesByType('resource').map((r) => r.name);
			const hit = entries.find((u) => u.includes('/render/EditorRenderer.ts'));
			const url = hit ? new URL(hit).pathname + new URL(hit).search : '/src/lib/render/EditorRenderer.ts';
			const { hasEditorRenderer } = await import(url);
			return hasEditorRenderer();
		});
		if (ready) break;
		await sleep(250);
	}
	await sleep(800);
	log('    clicks:', JSON.stringify({ fileClicked, newClicked }), 'ready:', ready);
	if (!ready) throw new Error('editor never mounted');

	// --- bounded fill + red outline, then compare composite vs base -------
	const res = await page.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const { applySelectionRect, fillSelection } = await import(u('/src/lib/services/selectionService.ts'));
		const { addLayerEffect } = await import(u('/src/lib/services/layerEffectsService.ts'));
		const { getEditorRenderer } = await import(u('/src/lib/render/EditorRenderer.ts'));
		const { sampleSurfacePixels, extractStraightBytes } = await import(u('/src/lib/render/readback.ts'));
		const doc = window.__REGISTRY__.active;
		const r = getEditorRenderer();
		const layer = doc.activeLayer;

		applySelectionRect('replace', 'rect', { x: 100, y: 100, width: 200, height: 150 });
		await new Promise((res2) => setTimeout(res2, 300));
		if (!fillSelection({ r: 255, g: 80, b: 40, a: 255 })) return { err: 'fill failed' };
		await new Promise((res2) => setTimeout(res2, 400));

		if (!addLayerEffect(layer.id, 'outline', { radius: 3, color: 0xff0000, intensity: 255 }))
			return { err: 'add outline failed' };
		await new Promise((res2) => setTimeout(res2, 500));

		// Sample ring just OUTSIDE the filled rect (97..99 / 301..303 etc.).
		const pts = [];
		for (let x = 96; x <= 304; x += 4) for (const y of [96, 97, 98, 99, 251, 252, 253, 254]) pts.push({ x, y });
		for (let y = 100; y <= 250; y += 4) for (const x of [96, 97, 98, 99, 301, 302, 303, 304]) pts.push({ x, y });
		const isRed = (p) => p[0] > 200 && p[1] < 100 && p[2] < 100 && p[3] > 0;

		// Base surface (what the old export used).
		const baseSamples = sampleSurfacePixels(r, layer.surfaceId, doc.width, doc.height, pts);
		const baseRed = baseSamples.filter(isRed).length;

		// Export composite path (what exportPng now uses). Straight-alpha
		// readback: direct extract.pixels on float targets is
		// implementation-defined (may return blank), so sample straight.
		const tex = r.exportTextureFor(layer);
		const sb = extractStraightBytes(r, tex);
		const at = (x, y) => {
			const i = (y * sb.width + x) * 4;
			return [sb.pixels[i], sb.pixels[i + 1], sb.pixels[i + 2], sb.pixels[i + 3]];
		};
		const compRed = pts.filter(({ x, y }) => isRed(at(x, y))).length;

		return { samples: pts.length, baseRed, compRed, isRenderTexture: tex.constructor.name };
	});
	log('[2] export composite vs base:', JSON.stringify(res));

	if (res.err) throw new Error(res.err);
	if (!(res.compRed > 0)) throw new Error('export composite has no outline pixels');
	if (!(res.baseRed === 0)) throw new Error('base surface unexpectedly contains red');

	// --- [3] feather: blur inward only + shrink cuts inward ----------------
	const feather = await page.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const { addLayerEffect, removeLayerEffect } = await import(u('/src/lib/services/layerEffectsService.ts'));
		const { fillSelection } = await import(u('/src/lib/services/selectionService.ts'));
		const { getEditorRenderer } = await import(u('/src/lib/render/EditorRenderer.ts'));
		const { extractStraightBytes } = await import(u('/src/lib/render/readback.ts'));
		const doc = window.__REGISTRY__.active;
		const r = getEditorRenderer();
		const layer = doc.activeLayer;
		const clear = async () => {
			const effs = layer.effects ?? [];
			for (let i = effs.length - 1; i >= 0; i--) removeLayerEffect(layer.id, i);
			await new Promise((res2) => setTimeout(res2, 250));
		};
		await clear();
		fillSelection({ r: 255, g: 80, b: 40, a: 255 }); // reset block (selection still active)
		await new Promise((res2) => setTimeout(res2, 300));

		const read = () => {
			const tex = r.exportTextureFor(layer);
			const sb = extractStraightBytes(r, tex);
			return (x, y) => {
				const i = (y * sb.width + x) * 4;
				return [sb.pixels[i], sb.pixels[i + 1], sb.pixels[i + 2], sb.pixels[i + 3]];
			};
		};

		addLayerEffect(layer.id, 'feather', { radius: 5, shrink: 0 });
		await new Promise((res2) => setTimeout(res2, 500));
		let at = read();
		const outsideA = [at(96, 175)[3], at(97, 175)[3], at(98, 175)[3], at(99, 175)[3]];
		const insideA = [at(100, 175)[3], at(101, 175)[3], at(102, 175)[3]];
		const insideRgb = at(150, 175).slice(0, 3);
		const centerA = at(150, 175)[3];

		await clear();
		fillSelection({ r: 255, g: 80, b: 40, a: 255 });
		await new Promise((res2) => setTimeout(res2, 300));
		addLayerEffect(layer.id, 'feather', { radius: 0, shrink: 3 });
		await new Promise((res2) => setTimeout(res2, 500));
		at = read();
		const shrinkEdgeA = at(101, 175)[3];
		const shrinkDeepA = at(150, 175)[3];
		// Spill kill: cut texels (were opaque blue) must be exactly (0,0,0,0).
		const cutTexel = at(102, 175);
		return { outsideA, insideA, insideRgb, centerA, shrinkEdgeA, shrinkDeepA, cutTexel };
	});
	log('[3] feather inward+shrink:', JSON.stringify(feather));
	const featherOk =
		feather.outsideA.every((a) => a === 0) &&
		feather.insideA.some((a) => a > 0 && a < 255) &&
		JSON.stringify(feather.insideRgb) === JSON.stringify([255, 80, 40]) &&
		feather.centerA === 255 &&
		feather.shrinkEdgeA === 0 &&
		feather.shrinkDeepA === 255 &&
		JSON.stringify(feather.cutTexel) === JSON.stringify([0, 0, 0, 0]);
	if (!featherOk) throw new Error('feather behavior wrong');

	// --- [4] noise respects "link to alpha" -------------------------------
	const noise = await page.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const { addLayerEffect, removeLayerEffect } = await import(u('/src/lib/services/layerEffectsService.ts'));
		const { fillSelection } = await import(u('/src/lib/services/selectionService.ts'));
		const { getEditorRenderer } = await import(u('/src/lib/render/EditorRenderer.ts'));
		const { extractStraightBytes } = await import(u('/src/lib/render/readback.ts'));
		const doc = window.__REGISTRY__.active;
		const r = getEditorRenderer();
		const layer = doc.activeLayer;
		const clear = async () => {
			const effs = layer.effects ?? [];
			for (let i = effs.length - 1; i >= 0; i--) removeLayerEffect(layer.id, i);
			await new Promise((res2) => setTimeout(res2, 250));
		};
		await clear();
		fillSelection({ r: 255, g: 80, b: 40, a: 255 });
		await new Promise((res2) => setTimeout(res2, 300));
		const pts = [[10, 10], [20, 30], [1500, 900], [500, 500], [1000, 100], [60, 700], [1200, 400], [800, 60]];
		const readPts = () => {
			const tex = r.exportTextureFor(layer);
			const sb = extractStraightBytes(r, tex);
			return pts.map(([x, y]) => {
				const i = (y * sb.width + x) * 4;
				return [sb.pixels[i], sb.pixels[i + 1], sb.pixels[i + 2]];
			});
		};
		addLayerEffect(layer.id, 'addNoise', { amount: 100, monochrome: 0, seed: 7, linkAlpha: 1 });
		await new Promise((res2) => setTimeout(res2, 500));
		const linked = readPts();
		await clear();
		addLayerEffect(layer.id, 'addNoise', { amount: 100, monochrome: 0, seed: 7, linkAlpha: 0 });
		await new Promise((res2) => setTimeout(res2, 500));
		const unlinked = readPts();
		const noisy = (p) => p.some((v) => v > 0);
		return {
			linkedClean: linked.every((p) => !noisy(p)),
			unlinkedNoisy: unlinked.filter(noisy).length
		};
	});
	log('[4] noise link-to-alpha:', JSON.stringify(noise));
	if (!noise.linkedClean || !(noise.unlinkedNoisy >= 3)) throw new Error('noise alpha link wrong');
	if (errors.length) throw new Error('page errors: ' + JSON.stringify(errors.slice(0, 6)));

	await browser.close();
	log('DONE');
}

main().then(
	() => process.exit(0),
	(e) => {
		console.error('FAILED', e && e.message ? e.message : e);
		process.exit(1);
	}
);


