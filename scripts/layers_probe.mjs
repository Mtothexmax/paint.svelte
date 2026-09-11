// Verifies the LayersPanel restyle end-to-end in headless Chrome:
//   1. Visibility is a checkbox on the very left (no more eye icon), toggling
//      it flips layer.visible.
//   2. The fx badge sits on the very right of the row; it is hidden unless the
//      row is hovered OR the layer has effects; with effects it is always
//      visible and blue.
//   3. Clicking the layer name opens an inline rename input (non-text layers);
//      Enter commits via setLayerName, Escape cancels.
//   4. Text layers do not enter rename mode on click.
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
	await clickText('.menu-item', 'New');
	await page.waitForSelector('.dialog', { timeout: 8000 });
	await sleep(120);
	await page.evaluate(() => document.querySelector('.dialog .btn-primary').click());

	let ready = false;
	for (let i = 0; i < 60; i++) {
		ready = await page.evaluate(async () => {
			const { hasEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
			return hasEditorRenderer();
		});
		if (ready) break;
		await sleep(250);
	}
	await sleep(800);
	if (!ready) throw new Error('editor never mounted');

	// --- [1] checkbox replaces the eye; toggling flips visibility ----------
	const vis = await page.evaluate(async () => {
		const doc = window.__REGISTRY__.active;
		const eye = document.querySelector('.layer-eye');
		const cb = document.querySelector('.layer-row input.layer-vis');
		const checkedBefore = cb?.checked ?? null;
		const visibleBefore = doc.activeLayer.visible;

		cb?.click();
		await new Promise((r) => setTimeout(r, 250));
		const visibleAfter = doc.activeLayer.visible;

		// order: checkbox is the first interactive child, left of the thumbnail
		const cbBox = cb && cb.getBoundingClientRect();
		const thumbBox = document.querySelector('.layer-row .layer-thumb')?.getBoundingClientRect();
		const leftmost = !!cbBox && !!thumbBox && cbBox.left <= thumbBox.left;

		// no eye icon anywhere
		const noEye = !eye;

		return { checkedBefore, visibleBefore, visibleAfter, leftmost, noEye, hasCheckbox: !!cb };
	});
	log('[1] checkbox: ', JSON.stringify(vis));
	const visOk =
		vis.hasCheckbox &&
		vis.noEye &&
		vis.leftmost &&
		vis.checkedBefore === true &&
		vis.visibleBefore === true &&
		vis.visibleAfter === false;

	// --- [2] fx badge position + hover-only visibility ----------------------
	const badge = await page.evaluate(async () => {
		const { addLayerEffect, removeLayerEffect } = await import('/src/lib/services/layerEffectsService.ts');
		const doc = window.__REGISTRY__.active;
		const layer = doc.activeLayer;
		const clean = async () => {
			const effs = layer.effects ?? [];
			for (let i = effs.length - 1; i >= 0; i--) removeLayerEffect(layer.id, i);
			await new Promise((r) => setTimeout(r, 300));
		};

		const row = document.querySelector('.layer-row');
		const badge = document.querySelector('.layer-row .layer-fx');
		const rowBox = row.getBoundingClientRect();
		const badgeBox = badge.getBoundingClientRect();
		const onRight = badgeBox.right >= rowBox.right - 8;
		const hiddenIdle = getComputedStyle(badge).opacity === '0'; // no fx, not hovered

		await clean();
		addLayerEffect(layer.id, 'bevel', { depth: 25, angle: 135 });
		await new Promise((r) => setTimeout(r, 400));
		const hasFxClass = badge.classList.contains('hasFx');
		const visibleWithFx = getComputedStyle(badge).opacity;

		await clean();
		return { onRight, hiddenIdle, hasFxClass, visibleWithFx };
	});
	log('[2] fx badge: ', JSON.stringify(badge));
	const badgeOk =
		badge.onRight &&
		badge.hiddenIdle &&
		badge.hasFxClass &&
		badge.visibleWithFx === '1';

	// hover shows the badge even without effects
	await page.evaluate(async () => {
		const doc = window.__REGISTRY__.active;
		const layer = doc.activeLayer;
		const effs = layer.effects ?? [];
		const { removeLayerEffect } = await import('/src/lib/services/layerEffectsService.ts');
		for (let i = effs.length - 1; i >= 0; i--) removeLayerEffect(layer.id, i);
		await new Promise((r) => setTimeout(r, 300));
	});
	const rowBox = await (await page.$('.layer-row')).boundingBox();
	await page.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2);
	await sleep(200);
	const hovered = await page.evaluate(() => getComputedStyle(document.querySelector('.layer-fx')).opacity);
	log('    hover opacity (no fx):', hovered);
	const hoverOk = hovered === '1';

	// --- [3] inline rename on non-text layers -------------------------------
	await page.mouse.move(0, 0);
	await sleep(150);
	await page.evaluate(() => {
		const name = document.querySelector('.layer-name');
		name.click();
	});
	await sleep(150);
	const inputGone = await page.evaluate(() => !document.querySelector('.layer-rename'));
	const rename = await page.evaluate(async () => {
		const doc = window.__REGISTRY__.active;
		const input = document.querySelector('.layer-rename');
		if (!input) return { opened: false };
		input.focus();
		input.value = 'Renamed Layer';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await new Promise((r) => setTimeout(r, 300));
		const name = doc.layers.find((l) => l.id === doc.activeLayerId)?.name;
		const inputClosed = !document.querySelector('.layer-rename');
		return { opened: true, name, inputClosed };
	});
	log('[3] rename: ', JSON.stringify(rename));
	const renameOk = !inputGone && rename.opened && rename.name === 'Renamed Layer' && rename.inputClosed;

	// --- [4] text layers do not rename -------------------------------------
	const text = await page.evaluate(async () => {
		const { createTextLayer } = await import('/src/lib/core/layers/Layer.ts');
		const { documentRegistry } = await import('/src/lib/core/document/registry.ts');
		const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
		const doc = window.__REGISTRY__.active;
		const renderer = getEditorRenderer();
		// Real (blank) surface so session serialisation + thumbnails stay happy.
		const surfaceId = renderer.surfaces.create(Math.max(1, doc.width), Math.max(1, doc.height));
		const layer = createTextLayer(surfaceId, 'Text Layer: A', {
			x: 0, y: 0, width: 10, height: 10, text: 'A',
			family: 'Arial', size: 12, bold: false, italic: false,
			underline: false, strike: false, align: 'left',
			color: { r: 0, g: 0, b: 0, a: 255 }
		});
		doc.insertLayer(layer, doc.layers.length);
		doc.setActiveLayer(layer.id);
		documentRegistry.notifyChange(doc);
		await new Promise((r) => setTimeout(r, 300));
		const nameEl = [...document.querySelectorAll('.layer-row')]
			.find((r) => r.textContent.includes('Text Layer: A'))
			?.querySelector('.layer-name');
		nameEl?.click();
		await new Promise((r) => setTimeout(r, 150));
		const renameInput = !!document.querySelector('.layer-rename');
		const rowStayed = !!nameEl;
		doc.removeLayer(layer.id);
		renderer.surfaces.dispose(surfaceId);
		documentRegistry.notifyChange(doc);
		return { rowStayed, renameInput };
	});
	log('[4] text rename guard: ', JSON.stringify(text));
	const textOk = text.rowStayed && text.renameInput === false;

	const allOk = visOk && badgeOk && hoverOk && renameOk && textOk;
	if (!allOk) throw new Error('layers probe FAILED');
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