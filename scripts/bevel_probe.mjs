// Regression check for the broken-layer-effect transparency bug: Bevel (and the
// object highlight effects) used to blank the ENTIRE layer because their custom
// GLSL failed to compile/link. Verifies that each custom-shader layer effect
// renders the filled base surface instead of wiping it transparent.
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
		if (m.type() === 'error' && !/Failed to load resource|GPU stall|\[vite\]/.test(t)) errors.push('console.error: ' + t);
		else if (m.type() === 'warning' && /shader|program|uniform|glGet|WebGL/i.test(t) && !/GPU stall/.test(t))
			errors.push('console.warn: ' + t);
	});
	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(2000);

	log('[1] create doc via File→New (mounts editor)');
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
	await clickText('.menubar-btn', 'File');
	await sleep(200);
	await clickText('.menu-item', 'New…');
	await page.waitForSelector('.dialog', { timeout: 8000 });
	await sleep(120);
	await page.evaluate(() => document.querySelector('.dialog .btn-primary').click());
	for (let i = 0; i < 60; i++) {
		const ready = await page.evaluate(async () => {
			const { hasEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
			return hasEditorRenderer();
		});
		if (ready) break;
		await sleep(250);
	}
	await sleep(800);
	const setup = await page.evaluate(async () => {
		const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
		const { sampleSurfacePixels } = await import('/src/lib/render/readback.ts');
		const doc = window.__REGISTRY__.active;
		if (!doc) return { err: 'no doc' };
		const r = getEditorRenderer();
		const samples = sampleSurfacePixels(r, doc.activeLayer.surfaceId, doc.width, doc.height, [{ x: 4, y: 4 }, { x: 100, y: 100 }]);
		return { w: doc.width, h: doc.height, samples, effects: doc.activeLayer.effects?.length ?? 0 };
	});
	log('    setup:', JSON.stringify(setup));
	if (setup.err) throw new Error('no doc: ' + setup.err);
	if (setup.samples[0][3] !== 0) log('    NOTE: default bg is not transparent');

	// Make the canvas fully opaque so the effect has something to show.
	await page.evaluate(async () => {
		const { applyFill, reapplyLastFill } = await import('/src/lib/services/fillService.ts');
		const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
		const doc = window.__REGISTRY__.active;
		let res = applyFill(50, 50, { r: 255, g: 80, b: 40, a: 255 });
		if (res !== 'ok') {
			// Some global path may need a brush tool first; retry via fill service.
			res = applyFill(50, 50, { r: 255, g: 80, b: 40, a: 255 });
		}
		if (res !== 'ok') throw new Error('fill failed: ' + res);
		await new Promise((r) => setTimeout(r, 500));
		void getEditorRenderer;
	});

	// Adds an effect, then reads the LIVE layer-effect texture pixels directly.
	const probe = (effId, setts) =>
		page.evaluate(async (id, st) => {
			const { addLayerEffect, removeLayerEffect } = await import('/src/lib/services/layerEffectsService.ts');
			const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
			const doc = window.__REGISTRY__.active;
			const effs = doc.activeLayer.effects || [];
			for (let i = effs.length - 1; i >= 0; i--) removeLayerEffect(doc.activeLayer.id, i);
			await new Promise((r) => setTimeout(r, 200));
			const ok = addLayerEffect(doc.activeLayer.id, id, st);
			await new Promise((r) => setTimeout(r, 500));
			if (!ok) return { added: false };
			const r = getEditorRenderer();
			const scene = r['activeScene'];
			const effTex = scene['layerEffectTextures'].get(doc.activeLayer.id);
			if (!effTex) return { added: true, noTexture: true };
			const tx = r.app.renderer.extract.pixels({ target: effTex });
			const d = tx.pixels;
			const at = (x, y) => {
				const i = (y * tx.width + x) * 4;
				return Array.from(d.slice(i, i + 4));
			};
			let opaque = 0;
			for (let i = 3; i < d.length; i += 4) if (d[i] > 0) opaque++;
			return { added: true, w: tx.width, h: tx.height, opaque, at: at(4, 4) };
		}, effId, setts);

	// Every effect with a custom GLSL shader (the fixed class of the bug).
	const EFFORTS = [
		{ id: 'bevel', settings: { depth: 25, angle: 135 } },
		{ id: 'outline', settings: { radius: 3, color: 0xff0000, intensity: 255 } },
		{ id: 'feather', settings: { radius: 3, shrink: 0 } },
		{ id: 'shadow', settings: { offsetX: 4, offsetY: 4, blur: 4, colorR: 0, colorG: 0, colorB: 0, intensity: 128 } },
		{ id: 'emboss', settings: { angle: 45, strength: 70 } },
		{ id: 'glow', settings: { radius: 8, brightness: 40 } }
	];
	let failed = 0;
	for (const e of EFFORTS) {
		const r = await probe(e.id, e.settings);
		const ok = r.added && !r.noTexture && r.opaque > 0 && r.at[3] > 0;
		log(`[2] ${e.id}: ${JSON.stringify(r)} ${ok ? 'PASS' : 'FAIL'}`);
		if (!ok) failed++;
	}
	if (failed) throw new Error(`${failed} effect(s) still blank the layer`);
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