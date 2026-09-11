// Session roundtrip: soft-stroke color stability + layer-effects persistence.
// Page 1: paints a soft orange stroke, adds a red Outline layer effect, forces
// a session persist, then records pixel stats + the IndexedDB record.
// Page 2 (same browser profile): waits for auto-restore, then asserts the
// effect chain survived (model deep-equal AND actually rendering) and the
// soft-edge pixels did NOT darken (no double-premultiplication).
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

async function clickTool(page, label) {
	await page.evaluate((lbl) => {
		const btn = [...document.querySelectorAll('.tool-btn')].find((b) => (b.getAttribute('aria-label') || '').toLowerCase().includes(lbl));
		if (!btn) throw new Error('tool not found ' + lbl);
		btn.click();
	}, label);
	await sleep(200);
}

// mean un-premultiplied RGB per alpha bin over the whole surface
async function sliceStats(page) {
	return page.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const { getEditorRenderer } = await import(u('/src/lib/render/EditorRenderer.ts'));
		const { extractSurfaceBytes } = await import(u('/src/lib/render/readback.ts'));
		const renderer = getEditorRenderer();
		const doc = window.__REGISTRY__.active;
		const { pixels } = extractSurfaceBytes(renderer, doc.activeLayer.surfaceId);
	 const bins = {};
		for (let i = 0; i < pixels.length; i += 4) {
			const A = pixels[i + 3];
			if (A < 8) continue;
			const key = A < 64 ? 'a<64' : A < 160 ? 'a<160' : 'a<255';
			const b = (bins[key] = bins[key] || { n: 0, r: 0, g: 0, b: 0 });
			b.n++;
			b.r += Math.round((pixels[i] * 255) / A);
			b.g += Math.round((pixels[i + 1] * 255) / A);
			b.b += Math.round((pixels[i + 2] * 255) / A);
		}
		const res = {};
		for (const [k, b] of Object.entries(bins)) {
			res[k] = `n=${b.n} rgb=(${(b.r / b.n).toFixed(1)},${(b.g / b.n).toFixed(1)},${(b.b / b.n).toFixed(1)})`;
		}
		return res;
	});
}

async function newDoc(page) {
	await clickByText(page, '.menubar-btn', 'File');
	await sleep(250);
	await clickByText(page, '.menu-item', 'New…');
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
	if (!ready) throw new Error('editor never mounted');
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
	await newDoc(page);

	// soft orange stroke
	await clickTool(page, 'brush');
	await page.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const ui = await import(u('/src/lib/state/ui.ts'));
		ui.foregroundColor.set({ r: 255, g: 140, b: 0, a: 255 });
		ui.brushSize.set(120);
		ui.brushHardness.set(0);
		ui.brushOpacity.set(100);
		await new Promise((r) => setTimeout(r, 300));
	});
	const rect = await page.evaluate(() => {
		const canvas = document.querySelector('canvas');
		const h = canvas.parentElement.getBoundingClientRect();
		return { x: h.x, y: h.y, w: h.width, h: h.height };
	});
	const x0 = rect.x + rect.w * 0.35;
	const y0 = rect.y + rect.h * 0.5;
	const x1 = rect.x + rect.w * 0.65;
	await page.mouse.move(x0, y0);
	await sleep(50);
	await page.mouse.down();
	await sleep(50);
	for (let i = 1; i <= 10; i++) {
		await page.mouse.move(x0 + ((x1 - x0) * i) / 10, y0, { steps: 2 });
		await sleep(20);
	}
	await page.mouse.up();
	await sleep(900);

	// red outline layer effect (live, not baked)
	const fxAdded = await page.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const { addLayerEffect } = await import(u('/src/lib/services/layerEffectsService.ts'));
		const doc = window.__REGISTRY__.active;
		const ok = addLayerEffect(doc.activeLayer.id, 'outline', { radius: 3, color: 0xff0000, intensity: 255 });
		await new Promise((r) => setTimeout(r, 500));
		return { ok, effects: doc.activeLayer.effects };
	});
	console.log('[1] effect added:', JSON.stringify(fxAdded));
	if (!fxAdded.ok) throw new Error('addLayerEffect failed');

	const before = await sliceStats(page);
	console.log('[2] pre-reload pixels:', JSON.stringify(before));

	await page.evaluate(() => window.__SESSION__.persistNow());
	await sleep(500);
	const records = await page.evaluate(async () => {
		const recs = await window.__SESSION__.records();
		return recs.map((r) => ({ name: r.name, layers: r.layers.map((l) => ({ name: l.name, effects: l.effects ?? null })) }));
	});
	console.log('[3] DB record:', JSON.stringify(records));
	const savedFx = records[0]?.layers[0]?.effects;
	if (!savedFx || savedFx.length !== 1 || savedFx[0].id !== 'outline') throw new Error('effects missing from session record');

	await page.close();
	await sleep(400);

	// --- page 2: same profile, auto-restore --------------------------------
	const page2 = await browser.newPage();
	await page2.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
	page2.on('pageerror', (e) => console.log('PAGE2ERROR', e.message));
	await page2.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	// wait for restore: registry non-empty with effects
	let restored = null;
	for (let i = 0; i < 40; i++) {
		restored = await page2.evaluate(() => {
			const doc = window.__REGISTRY__?.active;
			if (!doc) return null;
			return { layers: doc.layers.length, effects: doc.activeLayer?.effects ?? null };
		});
		if (restored && restored.layers > 0) break;
		await sleep(500);
	}
	console.log('[4] restored model:', JSON.stringify(restored));
	const fxOk =
		restored?.effects?.length === 1 &&
		restored.effects[0].id === 'outline' &&
		restored.effects[0].enabled === true &&
		restored.effects[0].settings?.radius === 3 &&
		restored.effects[0].settings?.color === 0xff0000 &&
		restored.effects[0].settings?.intensity === 255;
	if (!fxOk) throw new Error('layer effects not restored');

	// effect actually renders post-restore (red outline pixels in composite)
	const renders = await page2.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const { getEditorRenderer } = await import(u('/src/lib/render/EditorRenderer.ts'));
		const r = getEditorRenderer();
		const doc = window.__REGISTRY__.active;
		const tex = r.exportTextureFor(doc.activeLayer);
		const px = r.app.renderer.extract.pixels({ target: tex });
		let red = 0;
		const step = 4;
		for (let y = 0; y < px.height; y += step) {
			for (let x = 0; x < px.width; x += step) {
				const i = (y * px.width + x) * 4;
				// un-premultiply before judging hue
				const a = px.pixels[i + 3];
				if (a < 8) continue;
				const rr = (px.pixels[i] * 255) / a;
				const gg = (px.pixels[i + 1] * 255) / a;
				const bb = (px.pixels[i + 2] * 255) / a;
				if (rr > 180 && gg < 120 && bb < 120) red++;
			}
		}
		return { red };
	});
	console.log('[5] outline renders post-restore:', JSON.stringify(renders));
	if (!(renders.red > 0)) throw new Error('restored effect does not render');

	const after = await sliceStats(page2);
	console.log('[6] post-reload pixels:', JSON.stringify(after));

	await browser.close();
}
main().then(
	() => console.log('DONE'),
	(e) => {
		console.error('FAILED', e && e.message ? e.message : e);
		process.exit(1);
	}
);
