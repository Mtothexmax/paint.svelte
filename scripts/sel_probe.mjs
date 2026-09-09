// Verifies selection-scoped effect apply:
//   - OUTSIDE the selection: pixels identical before/after applying Clouds
//   - INSIDE the selection: pixels change (clouds render there) at full Grainyness
//   - undo restores the pre-filter surface / outside pixels
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

	log('[1] create doc');
	await clickText('.menubar-btn', 'File');
	await sleep(200);
	await clickText('.menu-item', 'New…');
	await page.waitForSelector('.dialog', { timeout: 8000 });
	await sleep(120);
	await page.evaluate(() => document.querySelector('.dialog .btn-primary').click());
	await sleep(600);

	const readAt = (pts) =>
		page.evaluate(async (points) => {
			const doc = window.__REGISTRY__.active;
			const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
			const { sampleSurfacePixels } = await import('/src/lib/render/readback.ts');
			const samples = sampleSurfacePixels(
				getEditorRenderer(),
				doc.activeLayer.surfaceId,
				doc.width,
				doc.height,
				points
			);
			return { surfaceId: doc.activeLayer.surfaceId, samples };
		}, pts);

	// Samples the LIVE filtered layer sprite (extract renders its filters, but
	// NOT the selection tint overlay — that lives in a separate container), so
	// the preview scoping can be checked before Apply is pressed.
	const previewAt = (pts) =>
		page.evaluate(async (points) => {
			const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
			const r = getEditorRenderer();
			const doc = window.__REGISTRY__.active;
			const stack = [r.app.stage];
			let target = null;
			while (stack.length && !target) {
				const c = stack.pop();
				if (c && Array.isArray(c.filters) && c.filters.length) {
					target = c;
					break;
				}
				if (c && c.children) stack.push(...c.children);
			}
			if (!target) throw new Error('no filtered layer sprite found');
			const extracted = r.app.renderer.extract.pixels({ target, resolution: 1 });
			if (extracted.width !== doc.width || extracted.height !== doc.height) {
				throw new Error(`preview extract size mismatch: ${extracted.width}x${extracted.height}`);
			}
			const data = extracted.pixels;
			return points.map(({ x, y }) => {
				const i = (Math.round(y) * doc.width + Math.round(x)) * 4;
				return [data[i], data[i + 1], data[i + 2], data[i + 3]];
			});
		}, pts);

	log('[2] select a 30x30 rect at (10,10)');
	await page.evaluate(async () => {
		const { setRectSelection } = await import('/src/lib/services/selectionService.ts');
		return setRectSelection('rect', { x: 10, y: 10 }, { x: 40, y: 40 });
	});
	await sleep(300);

	log('[3] sample outside (2,2) and inside (25,25) BEFORE apply');
	const BEFORE = await readAt([{ x: 2, y: 2 }, { x: 25, y: 25 }]);
	log('   before:', JSON.stringify(BEFORE.samples));
	const same = (a, b) => a.every((v, i) => v === b[i]);

	log('[4] open Clouds dialog at max Grainyness (400) and check the LIVE preview');
	await page.evaluate(async () => {
		const { commands } = await import('/src/lib/services/commandRegistry.ts');
		commands.run('effects.clouds');
		await new Promise((r) => setTimeout(r, 400));
		const sliders = [...document.querySelectorAll('.m-dialog input.fsl-range')];
		const grain = sliders[2];
		if (!grain) throw new Error('grainyness slider not found');
		grain.value = '400';
		grain.dispatchEvent(new Event('input', { bubbles: true }));
		grain.dispatchEvent(new Event('change', { bubbles: true }));
		await new Promise((r) => setTimeout(r, 400));
	});
	const PREVIEW = await previewAt([{ x: 2, y: 2 }, { x: 25, y: 25 }]);
	log('   preview:', JSON.stringify(PREVIEW));
	if (same(PREVIEW[1], BEFORE.samples[1])) throw new Error('PREVIEW did not show the filter inside the selection');
	if (!same(PREVIEW[0], BEFORE.samples[0])) throw new Error('PREVIEW leaked the filter OUTSIDE the selection');

	log('[5] apply Clouds at max Grainyness (400)');
	const APPLY = await page.evaluate(async () => {
		document.querySelector('.m-dialog .btn-primary')?.click();
		await new Promise((r) => setTimeout(r, 900));
		const doc = window.__REGISTRY__.active;
		return { hist: doc.history.length, selActive: doc.selection.active };
	});
	log('   apply:', JSON.stringify(APPLY));
	if (APPLY.hist < 1) throw new Error('no history entry');
	if (!APPLY.selActive) throw new Error('selection was dropped on apply');

	log('[6] sample the SAME points AFTER apply');
	const AFTER = await readAt([{ x: 2, y: 2 }, { x: 25, y: 25 }]);
	log('   after: ', JSON.stringify(AFTER.samples), 'surface:', AFTER.surfaceId);
	if (AFTER.surfaceId === BEFORE.surfaceId) throw new Error('surface was NOT swapped');
	if (!same(AFTER.samples[0], BEFORE.samples[0])) throw new Error('OUTSIDE selection pixel changed');
	if (same(AFTER.samples[1], BEFORE.samples[1])) throw new Error('INSIDE selection pixel did NOT change');

	log('[7] Ctrl+Z undo restores the layer');
	await page.evaluate(async () => {
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
		await new Promise((r) => setTimeout(r, 500));
	});
	const UNDID = await readAt([{ x: 2, y: 2 }, { x: 25, y: 25 }]);
	log('   undone surface:', UNDID.surfaceId);
	if (UNDID.surfaceId !== BEFORE.surfaceId) throw new Error('undo did not restore surface');
	if (!same(UNDID.samples[0], BEFORE.samples[0])) throw new Error('undo left outside pixels modified');
	if (!same(UNDID.samples[1], BEFORE.samples[1])) throw new Error('undo did not restore inside pixels');

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