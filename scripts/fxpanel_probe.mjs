// Verifies the docked Layer-Effects panel end-to-end in a real (headless)
// Chrome:
//   1. The panel renders when a doc + active layer exist.
//   2. The "+" flyout lists effect groups; clicking one adds a live effect
//      (shader renders, layer not blanked).
//   3. The checkbox toggles the effect's enabled state.
//   4. Copy / Paste move the whole effect chain onto another layer.
//   5. Remove deletes the selected effect.
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

	// --- create doc via File→New (mounts the editor + panel) --------------
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

	log('[1] panel visible:', await page.evaluate(() => !!document.querySelector('.fx-panel')));
	log('    head:', await page.evaluate(() => document.querySelector('.fx-head')?.textContent?.replace(/\s+/g, ' ').trim()));

	// --- [0] open the panel through the real UX path ----------------------
	// The panel starts closed; hovering a layer row reveals its fx badge
	// (opacity 0 → 1 when the layer has no effects), clicking the badge
	// selects the layer and opens the panel.
	const rowBox = await (await page.$('.layer-row')).boundingBox();
	const idleOpacity = await page.evaluate(() => getComputedStyle(document.querySelector('.layer-fx')).opacity);
	await page.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2);
	await sleep(250);
	const hoverOpacity = await page.evaluate(() => getComputedStyle(document.querySelector('.layer-fx')).opacity);
	await page.evaluate(() => document.querySelector('.layer-fx')?.click());
	await sleep(400);
	const opened = await page.evaluate(() => !!document.querySelector('.fx-panel'));
	log('[0] badge reveal + open:', JSON.stringify({ idleOpacity, hoverOpacity, opened }));
	if (!(idleOpacity === '0' && hoverOpacity === '1' && opened)) throw new Error('panel open FAILED');

	// --- via service: add, toggle, copy, second layer, paste ---------------
	const serviceStep = await page.evaluate(async () => {
		const { addLayer, selectLayer } = await import('/src/lib/services/layersService.ts');
		const { addLayerEffect, toggleLayerEffect, copyLayerEffects, pasteLayerEffects, removeLayerEffect } =
			await import('/src/lib/services/layerEffectsService.ts');
		const doc = window.__REGISTRY__.active;
		const l1 = doc.activeLayer.id;
		// clean slate: drop any effects left from the previous run
		const old = doc.activeLayer.effects ?? [];
		for (let i = old.length - 1; i >= 0; i--) removeLayerEffect(l1, i);
		await new Promise((r) => setTimeout(r, 300));

		const added1 = addLayerEffect(l1, 'bevel', { depth: 25, angle: 135 });
		await new Promise((r) => setTimeout(r, 400));
		let arr1 = doc.activeLayer.effects?.length ?? 0;

		const toggled = toggleLayerEffect(l1, 0);
		await new Promise((r) => setTimeout(r, 300));
		const enabled1 = doc.activeLayer.effects?.[0]?.enabled;

		addLayer();
		await new Promise((r) => setTimeout(r, 300));
		const l2 = doc.activeLayer.id;
		const distinct = l1 !== l2;

		const copied = copyLayerEffects(l1);
		const pasted = pasteLayerEffects(l2);
		await new Promise((r) => setTimeout(r, 400));
		const l2eff = doc.activeLayer.effects;
		const pastedOk = pasted && l2eff?.length === 1 && l2eff[0].id === 'bevel' && l2eff[0].enabled === enabled1;

		// remove it from layer 2
		const removed = removeLayerEffect(l2, 0);
		await new Promise((r) => setTimeout(r, 300));
		const l2len = doc.activeLayer.effects?.length ?? 0;

		selectLayer(l1);
		return { added1, arr1, toggled, enabled1, distinct, copied, pastedOk, removed, l2len };
	});
	log('[2] service add/toggle/copy/paste/remove:', JSON.stringify(serviceStep));
	const serviceOk =
		serviceStep.added1 && serviceStep.arr1 === 1 && serviceStep.toggled && serviceStep.enabled1 === false &&
		serviceStep.distinct && serviceStep.copied && serviceStep.pastedOk && serviceStep.removed && serviceStep.l2len === 0;

	// --- DOM: + button flyout ---------------------------------------------
	log('[3] DOM: add via flyout');
	// clean slate again (re-select l1 and clear)
	await page.evaluate(async () => {
		const { selectLayer } = await import('/src/lib/services/layersService.ts');
		const { removeLayerEffect } = await import('/src/lib/services/layerEffectsService.ts');
		const doc = window.__REGISTRY__.active;
		const all = doc.layers;
		for (const l of all) {
			selectLayer(l.id);
			const effs = l.effects ?? [];
			for (let i = effs.length - 1; i >= 0; i--) removeLayerEffect(l.id, i);
		}
		selectLayer(all.find((l) => l.id === doc.activeLayerId)?.id ?? all[0].id);
		await new Promise((r) => setTimeout(r, 300));
	});
	await page.evaluate(() => document.querySelector('.fx-add button')?.click());
	await sleep(400);
	const menuText = await page.evaluate(() => document.querySelector('.fx-add-menu')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120));
	log('    flyout:', JSON.stringify(menuText ?? 'MISSING'));
	const menuItems = await page.evaluate(() => document.querySelectorAll('.fx-add-item').length);
	const bevelItem = await page.evaluate(() => {
		const el = [...document.querySelectorAll('.fx-add-item')].find((e) => e.textContent?.includes('Bevel'));
		if (!el) return false;
		el.click();
		return true;
	});
	await sleep(500);
	const domAdd = await page.evaluate(async () => {
		const doc = window.__REGISTRY__.active;
		const effs = doc.activeLayer?.effects ?? [];
		const items = document.querySelectorAll('.fx-item').length;
		const selected = document.querySelector('.fx-item.on')?.textContent ?? '';
		const hasProps = document.querySelectorAll('.fx-props .fsl').length;
		const checked = document.querySelector('.fx-item input[type=checkbox]')?.checked;
		return { count: effs.length, items, selected: selected.replace(/\s+/g, ' ').trim(), propsRows: hasProps, checked };
	});
	log('    after add:', JSON.stringify(domAdd));
	const domAddOk = menuItems > 0 && bevelItem && domAdd.count === 1 && domAdd.items === 1 && domAdd.propsRows > 0 && domAdd.checked === true;

	// --- DOM: checkbox toggle ---------------------------------------------
	const toggleDom = await page.evaluate(() => {
		const box = document.querySelector('.fx-item input[type=checkbox]');
		const before = box?.checked;
		box?.click();
		return before;
	});
	await sleep(400);
	const afterToggle = await page.evaluate(async () => {
		const doc = window.__REGISTRY__.active;
		return doc.activeLayer?.effects?.[0]?.enabled;
	});
	log('    checkbox: before=', toggleDom, 'after=', afterToggle);
	const toggleOk = toggleDom === true && afterToggle === false;

	// --- DOM: copy + paste to second layer --------------------------------
	await page.evaluate(() => {
		const btns = [...document.querySelectorAll('.fx-tools .fx-btn')];
		btns[2]?.click(); // copy
	});
	await sleep(300);
	await page.evaluate(async () => {
		const { addLayer } = await import('/src/lib/services/layersService.ts');
		addLayer();
	});
	await sleep(300);
	await page.evaluate(() => {
		const btns = [...document.querySelectorAll('.fx-tools .fx-btn')];
		btns[3]?.click(); // paste
	});
	await sleep(500);
	const domPaste = await page.evaluate(async () => {
		const doc = window.__REGISTRY__.active;
		return { count: doc.activeLayer?.effects?.length ?? 0, items: document.querySelectorAll('.fx-item').length };
	});
	log('    after DOM copy+paste onto new layer:', JSON.stringify(domPaste));
	const pasteOk = domPaste.count === 1 && domPaste.items === 1;

	// --- DOM: remove selected ---------------------------------------------
	await page.evaluate(() => {
		const btns = [...document.querySelectorAll('.fx-tools .fx-btn')];
		btns[1]?.click(); // remove
	});
	await sleep(400);
	const domRemoved = await page.evaluate(async () => {
		const doc = window.__REGISTRY__.active;
		return { count: doc.activeLayer?.effects?.length ?? 0, items: document.querySelectorAll('.fx-item').length };
	});
	log('    after remove:', JSON.stringify(domRemoved));
	const removeOk = domRemoved.count === 0 && domRemoved.items === 0;

	// --- close via ✕, reopen via the layer "fx" badge ----------------------
	await page.evaluate(() => document.querySelector('.fx-close')?.click());
	await sleep(250);
	const panelGone = await page.evaluate(() => !document.querySelector('.fx-panel'));
	const fxBadge = await page.evaluate(() => {
		const badge = document.querySelector('.layer-fx');
		if (!badge) return null;
		badge.click();
		return badge.className;
	});
	await sleep(350);
	const panelBack = await page.evaluate(() => !!document.querySelector('.fx-panel'));
	log('    close+reopen: panelGone=', panelGone, ' badge=', JSON.stringify(fxBadge), ' panelBack=', panelBack);
	const closeToggleOk = panelGone && fxBadge !== null && panelBack;

	// --- outline color row: fg/bg buttons, stored swatch, persistence -----
	const colorRow = await page.evaluate(async () => {
		const { addLayerEffect, removeLayerEffect } = await import('/src/lib/services/layerEffectsService.ts');
		const { effectById } = await import('/src/lib/effects/index.ts');
		const { getSettings } = await import('/src/lib/services/settingsService.ts');
		const { foregroundColor, backgroundColor } = await import('/src/lib/state/ui.ts');
		const doc = window.__REGISTRY__.active;
		const layer = doc.activeLayer;
		const effs = layer.effects ?? [];
		for (let i = effs.length - 1; i >= 0; i--) removeLayerEffect(layer.id, i);
		await new Promise((r) => setTimeout(r, 300));
		const def = effectById('outline');
		addLayerEffect(layer.id, 'outline', getSettings('effects.outline', def.defaults));
		await new Promise((r) => setTimeout(r, 400));

		const row = document.querySelector('.fx-props .fcol');
		const btns = [...document.querySelectorAll('.fx-props .fcol-btn')].map((b) => b.textContent.replace(/\s+/g, ' ').trim());
		const sliderLabels = [...document.querySelectorAll('.fx-props .fsl-label')].map((s) => s.textContent.trim());
		const stored = document.querySelector('.fx-props .fcol-stored')?.style?.background ?? null;

		// choose a known foreground color, then click its button
		foregroundColor.set({ r: 11, g: 22, b: 33, a: 255 });
		await new Promise((r) => setTimeout(r, 150));
		const fgBtn = [...document.querySelectorAll('.fx-props .fcol-btn')].find((b) => b.textContent.includes('foreground'));
		fgBtn?.click();
		await new Promise((r) => setTimeout(r, 400));
		const afterFg = doc.activeLayer.effects.find((e) => e.id === 'outline')?.settings?.color;
		const storedAfterFg = document.querySelector('.fx-props .fcol-stored')?.style?.background ?? null;

		// same for background
		backgroundColor.set({ r: 200, g: 100, b: 50, a: 255 });
		await new Promise((r) => setTimeout(r, 150));
		const bgBtn = [...document.querySelectorAll('.fx-props .fcol-btn')].find((b) => b.textContent.includes('background'));
		bgBtn?.click();
		await new Promise((r) => setTimeout(r, 400));
		const afterBg = doc.activeLayer.effects.find((e) => e.id === 'outline')?.settings?.color;

		// persisted defaults?
		let saved = null;
		try {
			saved = JSON.parse(localStorage.getItem('paint.svelte.settings.v1') || '{}')['effects.outline'] ?? null;
		} catch { saved = 'unreadable'; }
		return { hasRow: !!row, btns, sliderLabels, stored, afterFg, storedAfterFg, afterBg, saved };
	});
	log('[4] outline color row:', JSON.stringify(colorRow));
	const colorOk =
		colorRow.hasRow &&
		colorRow.btns.length === 2 &&
		colorRow.btns[0].includes('Choose foreground color') &&
		colorRow.btns[1].includes('Choose background color') &&
		!colorRow.sliderLabels.includes('Red') &&
		!colorRow.sliderLabels.includes('Green') &&
		!colorRow.sliderLabels.includes('Blue') &&
		colorRow.afterFg === 0x0b1621 &&
		colorRow.storedAfterFg && /11,\s*22,\s*33/.test(colorRow.storedAfterFg) &&
		colorRow.afterBg === 0xc86432 &&
		colorRow.saved?.color === 0xc86432;

	// --- [5] fx badge: blue with effects, gray without; color row is 1 line
	const badge = await page.evaluate(async () => {
		const { removeLayerEffect } = await import('/src/lib/services/layerEffectsService.ts');
		const doc = window.__REGISTRY__.active;
		const withFx = !!document.querySelector('.layer-fx.hasFx');
		const ringWith = getComputedStyle(document.querySelector('.layer-fx')).boxShadow;
		const fcolDir = getComputedStyle(document.querySelector('.fx-props .fcol')).flexDirection;
		const layer = doc.activeLayer;
		const effs = layer.effects ?? [];
		for (let i = effs.length - 1; i >= 0; i--) removeLayerEffect(layer.id, i);
		await new Promise((r) => setTimeout(r, 300));
		const withoutFx = !document.querySelector('.layer-fx.hasFx') && !!document.querySelector('.layer-fx');
		const ringWithout = getComputedStyle(document.querySelector('.layer-fx')).boxShadow;
		return { withFx, ringWith, fcolDir, withoutFx, ringWithout };
	});
	log('[5] badge + single-row:', JSON.stringify(badge));
	const badgeOk =
		badge.withFx === true &&
		/59,\s*130,\s*246/.test(badge.ringWith) &&
		badge.withoutFx === true &&
		/154,\s*154,\s*154/.test(badge.ringWithout) &&
		badge.fcolDir === 'row';

	// --- [6] drag & drop reorder via synthetic DragEvents -------------------
	const reorder = await page.evaluate(async () => {
		const { addLayerEffect } = await import('/src/lib/services/layerEffectsService.ts');
		const doc = window.__REGISTRY__.active;
		const layer = doc.activeLayer;
		addLayerEffect(layer.id, 'bevel', { depth: 25, angle: 135 });
		await new Promise((r) => setTimeout(r, 200));
		addLayerEffect(layer.id, 'shadow', { offsetX: 4, offsetY: 4, blur: 4, colorR: 0, colorG: 0, colorB: 0, intensity: 128 });
		await new Promise((r) => setTimeout(r, 400));
		const before = layer.effects.map((e) => e.id);

		const rows = [...document.querySelectorAll('.fx-item')];
		const dt = new DataTransfer();
		rows[1].dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
		const r0 = rows[0].getBoundingClientRect();
		rows[0].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r0.x + 5, clientY: r0.top + 2 }));
		await new Promise((r) => setTimeout(r, 80)); // let Svelte flush the indicator class
		const indicator = rows[0].className;
		rows[0].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
		rows[1].dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true }));
		await new Promise((r) => setTimeout(r, 400));

		const after = layer.effects.map((e) => e.id);
		const domFirst = document.querySelector('.fx-item .fx-item-name')?.textContent?.trim() ?? '';
		const selIdx = [...document.querySelectorAll('.fx-item')].findIndex((el) => el.classList.contains('on'));

		// drag back: row 0 (now shadow) after row 1
		const rows2 = [...document.querySelectorAll('.fx-item')];
		const dt2 = new DataTransfer();
		rows2[0].dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt2 }));
		const r1 = rows2[1].getBoundingClientRect();
		rows2[1].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt2, clientX: r1.x + 5, clientY: r1.bottom - 2 }));
		rows2[1].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt2 }));
		await new Promise((r) => setTimeout(r, 400));
		const restored = layer.effects.map((e) => e.id);
		return { before, after, domFirst, selIdx, indicator, restored };
	});
	log('[6] reorder:', JSON.stringify(reorder));
	const reorderOk =
		JSON.stringify(reorder.before) === JSON.stringify(['bevel', 'shadow']) &&
		JSON.stringify(reorder.after) === JSON.stringify(['shadow', 'bevel']) &&
		/Shadow/.test(reorder.domFirst) &&
		reorder.selIdx === 0 &&
		/drop-before/.test(reorder.indicator) &&
		JSON.stringify(reorder.restored) === JSON.stringify(['bevel', 'shadow']);

	// --- [7] resize the panel by dragging the header bar ------------------
	// Drag starts on the title (not the grip) to prove the whole bar drags.
	const gripBox = await (await page.$('.fx-title')).boundingBox();
	const hBefore = await page.evaluate(() => document.querySelector('.fx-panel').getBoundingClientRect().height);
	await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
	await page.mouse.down();
	await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y - 80, { steps: 10 });
	await page.mouse.up();
	await sleep(300);
	const resize = await page.evaluate(() => ({
		h: document.querySelector('.fx-panel').getBoundingClientRect().height,
		saved: localStorage.getItem('paint.svelte.fxPanelHeight.v1')
	}));
	log('[7] resize:', JSON.stringify({ hBefore, ...resize }));
	const resizeOk = resize.h > hBefore + 40 && Math.abs(resize.h - (hBefore + 80)) < 12 && resize.saved === String(Math.round(resize.h));

	// --- [8] feather shrink slider + noise link-to-alpha checkbox in panel
	const widgets = await page.evaluate(async () => {
		const { addLayerEffect, removeLayerEffect } = await import('/src/lib/services/layerEffectsService.ts');
		const { effectById } = await import('/src/lib/effects/index.ts');
		const { getSettings } = await import('/src/lib/services/settingsService.ts');
		const doc = window.__REGISTRY__.active;
		const layer = doc.activeLayer;
		const clear = async () => {
			const effs = layer.effects ?? [];
			for (let i = effs.length - 1; i >= 0; i--) removeLayerEffect(layer.id, i);
			await new Promise((r) => setTimeout(r, 250));
		};
		await clear();
		addLayerEffect(layer.id, 'feather', getSettings('effects.feather', effectById('feather').defaults));
		await new Promise((r) => setTimeout(r, 400));
		const sliderLabels = [...document.querySelectorAll('.fx-props .fsl-label')].map((s) => s.textContent.trim());

		await clear();
		addLayerEffect(layer.id, 'addNoise', getSettings('effects.addNoise', effectById('addNoise').defaults));
		await new Promise((r) => setTimeout(r, 400));
		const box = document.querySelector('.fx-props input[type=checkbox]');
		const boxLabel = box?.closest('label')?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
		const initiallyChecked = box?.checked ?? null;
		box?.click();
		await new Promise((r) => setTimeout(r, 350));
		const afterOff = doc.activeLayer.effects.find((e) => e.id === 'addNoise')?.settings?.linkAlpha;
		document.querySelector('.fx-props input[type=checkbox]')?.click();
		await new Promise((r) => setTimeout(r, 350));
		const afterOn = doc.activeLayer.effects.find((e) => e.id === 'addNoise')?.settings?.linkAlpha;
		return { sliderLabels, boxLabel, initiallyChecked, afterOff, afterOn };
	});
	log('[8] panel widgets:', JSON.stringify(widgets));
	const widgetsOk =
		widgets.sliderLabels.includes('Feather') &&
		widgets.sliderLabels.includes('Shrink') &&
		widgets.boxLabel === 'Link to alpha' &&
		widgets.initiallyChecked === true &&
		widgets.afterOff === 0 &&
		widgets.afterOn === 1;

	const allOk = serviceOk && domAddOk && toggleOk && pasteOk && removeOk && closeToggleOk && colorOk && badgeOk && reorderOk && resizeOk && widgetsOk;
	if (!allOk) throw new Error('panel probe FAILED');
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