// Verifies the Paint.NET-style Levels Adjustment dialog end-to-end:
//   1. Structure: title, 2 histograms, 5 handles, 5 spinboxes at defaults,
//      R/G/B checkboxes (checked), Auto/Reset/OK/Cancel buttons.
//   2. Track drag moves the white-point handle (spinbox follows).
//   3. Setting Input Black to 100 + OK swaps the surface + grows history.
//   4. Cancel leaves the surface untouched.
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

	// --- create doc via File→New, fill with color --------------------------
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
	log('[1] create doc + fill');
	const fileClicked = await clickText('.menubar-btn', 'File');
	await sleep(200);
	const newClicked = await clickText('.menu-item', 'New');
	log('    clicks:', JSON.stringify({ fileClicked, newClicked }));
	try {
		await page.waitForSelector('.dialog', { timeout: 8000 });
	} catch {
		const dump = await page.evaluate(() => ({
			menus: [...document.querySelectorAll('.menubar-btn')].map((e) => e.textContent.trim()),
			items: [...document.querySelectorAll('.menu-item')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).slice(0, 12),
			dialogs: document.querySelectorAll('.dialog, .m-dialog').length
		}));
		throw new Error('no .dialog; dump=' + JSON.stringify(dump));
	}
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
	await page.evaluate(async () => {
		const { applyFill } = await import('/src/lib/services/fillService.ts');
		if (applyFill(50, 50, { r: 255, g: 80, b: 40, a: 255 }) !== 'ok') throw new Error('fill failed');
		await new Promise((r) => setTimeout(r, 500));
	});

	// --- open Levels --------------------------------------------------------
	const opened = await page.evaluate(async () => {
		const { commands } = await import('/src/lib/services/commandRegistry.ts');
		commands.run('effects.levels');
		await new Promise((r) => setTimeout(r, 600));
		return !!document.querySelector('.m-dialog .lv-main');
	});
	log('[2] levels dialog open:', opened);
	if (!opened) throw new Error('levels dialog did not open');

	// --- structure ----------------------------------------------------------
	const structure = await page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		const title = d?.querySelector('.m-title-text')?.textContent?.trim() ?? null;
		const hists = d?.querySelectorAll('canvas.lv-hist').length ?? 0;
		const handles = d?.querySelectorAll('.lv-handle').length ?? 0;
		const spins = [...(d?.querySelectorAll('.lv-num') ?? [])].map((i) => i.value);
		const checks = [...(d?.querySelectorAll('.lv-channels input[type=checkbox]') ?? [])].map((c) => c.checked);
		const btns = [...(d?.querySelectorAll('.lv-actions button') ?? [])].map((b) => b.textContent.trim());
		return { title, hists, handles, spins, checks, btns };
	});
	log('[3] structure:', JSON.stringify(structure));
	const structureOk =
		structure.title === 'Levels Adjustment' &&
		structure.hists === 2 &&
		structure.handles === 5 &&
		JSON.stringify(structure.spins) === JSON.stringify(['255', '0', '255', '1.00', '0']) &&
		JSON.stringify(structure.checks) === JSON.stringify([true, true, true]) &&
		JSON.stringify(structure.btns) === JSON.stringify(['Auto', 'Reset', 'OK', 'Cancel']);
	if (!structureOk) throw new Error('levels structure wrong');

	// --- geometry: spins beside tracks, gamma centered, upright hists -----
	const geo = await page.evaluate(() => {
		const q = (sel) => document.querySelector(`.m-dialog ${sel}`).getBoundingClientRect();
		const inSpin = q('input[aria-label="Input white point"]');
		const tracks = [...document.querySelectorAll('.m-dialog .lv-track')].map((t) => t.getBoundingClientRect());
		const outSpin = q('input[aria-label="Output white point"]');
		const gammaSpin = q('input[aria-label="Gamma"]');
		const hists = [...document.querySelectorAll('.m-dialog canvas.lv-hist')].map((c) => ({ w: c.width, h: c.height }));
		return {
			inSpinRight: inSpin.right,
			inTrackLeft: tracks[0].left,
			outSpinLeft: outSpin.left,
			outTrackRight: tracks[1].right,
			gammaMid: gammaSpin.top + gammaSpin.height / 2,
			trackMid: tracks[1].top + tracks[1].height / 2,
			hists
		};
	});
	log('[3b] geometry:', JSON.stringify(geo));
	const geoOk =
		geo.inSpinRight <= geo.inTrackLeft &&
		geo.outSpinLeft >= geo.outTrackRight &&
		Math.abs(geo.gammaMid - geo.trackMid) < 14 &&
		geo.hists.length === 2 &&
		geo.hists.every((h) => h.w === 120 && h.h === 190);
	if (!geoOk) throw new Error('levels geometry wrong');

	// --- track drag: grab near the top of the input track (real mouse) ----
	const trackBox = await (await page.$('.m-dialog .lv-track')).boundingBox();
	await page.mouse.move(trackBox.x + trackBox.width / 2, trackBox.y + 4);
	await page.mouse.down();
	await page.mouse.move(trackBox.x + trackBox.width / 2, trackBox.y + 50, { steps: 5 });
	await page.mouse.up();
	await sleep(300);
	const drag = await page.evaluate(
		() => document.querySelector('.m-dialog input[aria-label="Input white point"]').value
	);
	log('[4] after track drag, input white:', drag);
	if (!(Number(drag) < 255 && Number(drag) > 150)) throw new Error('track drag did not move white point');

	// --- set Input Black = 100, OK applies ----------------------------------
	const applied = await page.evaluate(async () => {
		const doc = window.__REGISTRY__.active;
		const beforeId = doc.activeLayer.surfaceId;
		const histBefore = doc.history.length;
		const spin = document.querySelector('.m-dialog input[aria-label="Input black point"]');
		spin.value = '100';
		spin.dispatchEvent(new Event('change', { bubbles: true }));
		await new Promise((r) => setTimeout(r, 400));
		const okBtn = [...document.querySelectorAll('.m-dialog .lv-actions button')].find((b) => b.textContent.trim() === 'OK');
		const okEnabled = okBtn && !okBtn.disabled;
		okBtn?.click();
		await new Promise((r) => setTimeout(r, 800));
		const { sampleSurfacePixels } = await import('/src/lib/render/readback.ts');
		const px = sampleSurfacePixels(
			(await import('/src/lib/render/EditorRenderer.ts')).getEditorRenderer(),
			doc.activeLayer.surfaceId,
			doc.width,
			doc.height,
			[{ x: 60, y: 60 }]
		)[0];
		return {
			okEnabled: !!okEnabled,
			closed: !document.querySelector('.m-dialog'),
			surfaceChanged: doc.activeLayer.surfaceId !== beforeId,
			historyGrew: doc.history.length > histBefore,
			px
		};
	});
	log('[5] apply:', JSON.stringify(applied));
	if (!applied.okEnabled || !applied.closed || !applied.surfaceChanged || !applied.historyGrew)
		throw new Error('levels apply failed');
	if (!(applied.px[0] === 255 && applied.px[1] === 0 && applied.px[2] === 0))
		throw new Error('levels mapping wrong, px=' + JSON.stringify(applied.px));

	// --- Cancel leaves the surface alone ------------------------------------
	const cancelled = await page.evaluate(async () => {
		const { commands } = await import('/src/lib/services/commandRegistry.ts');
		const doc = window.__REGISTRY__.active;
		commands.run('effects.levels');
		await new Promise((r) => setTimeout(r, 600));
		const beforeId = doc.activeLayer.surfaceId;
		const spin = document.querySelector('.m-dialog input[aria-label="Gamma"]');
		spin.value = '2.00';
		spin.dispatchEvent(new Event('change', { bubbles: true }));
		await new Promise((r) => setTimeout(r, 400));
		[...document.querySelectorAll('.m-dialog .lv-actions button')].find((b) => b.textContent.trim() === 'Cancel')?.click();
		await new Promise((r) => setTimeout(r, 400));
		return { closed: !document.querySelector('.m-dialog'), unchanged: doc.activeLayer.surfaceId === beforeId };
	});
	log('[6] cancel:', JSON.stringify(cancelled));
	if (!cancelled.closed || !cancelled.unchanged) throw new Error('levels cancel failed');

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