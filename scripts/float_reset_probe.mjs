// Verifies the float reset rule: only Apply (button / Enter) and the
// place-on-click-away drop keep a floating move-transform — every other
// mutation first discards it:
//   [1] rotate (floating) → Edit→Select All (menu): float gone, full-doc
//       selection, no history entry for the cancelled transform.
//   [2] rotate again → Edit→Undo: float gone, undo applied to prior entry.
//   [3] rotate again → switch to brush tool: float gone, history UNCHANGED
//       (reset, not silent commit).
//   [4] Enter still applies (drop commits with history growth).
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
	});

	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(2000);
	await page.evaluate(() => { [...document.querySelectorAll('.menubar-btn')].find((e) => e.textContent.includes('File'))?.click(); });
	await sleep(200);
	await page.evaluate(() => { [...document.querySelectorAll('.menu-item')].find((e) => (e.textContent || '').includes('New'))?.click(); });
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

	// rect selection + rotate mode, shared setup
	await page.evaluate(async () => {
		const { setRectSelection } = await import('/src/lib/services/selectionService.ts');
		const { activeToolId, moveToolMode } = await import('/src/lib/state/ui.ts');
		setRectSelection('rect', { x: 20, y: 20 }, { x: 220, y: 140 });
		activeToolId.set('move-pixels');
		moveToolMode.set('rotate');
		await new Promise((r) => setTimeout(r, 300));
	});
	const grabPt = () =>
		page.evaluate(() => {
			const doc = window.__REGISTRY__.active;
			const v = doc.view;
			const box = document.querySelector('canvas.absolute')?.getBoundingClientRect();
			return { x: box.x + v.panX + 180 * v.zoom, y: box.y + v.panY + 80 * v.zoom };
		});
	async function ringDrag(px = 60) {
		const g0 = await grabPt();
		await page.mouse.move(g0.x, g0.y);
		await page.mouse.down();
		await sleep(120);
		for (let i = 1; i <= 10; i++) {
			await page.mouse.move(g0.x - (px * i) / 10, g0.y, { steps: 1 });
			await sleep(20);
		}
		await page.mouse.up();
		await sleep(300);
	}
	const floatState = () =>
		page.evaluate(() => ({
			floating: !!window.__MOVE__.engine()?.floating,
			hist: window.__REGISTRY__.active.history.length,
			cursor: window.__REGISTRY__.active.history.cursor,
			bounds: window.__REGISTRY__.active.selection.bounds
		}));

	// --- [1] floating + Edit→Select All ------------------------------------
	await ringDrag();
	const f1 = await floatState();
	if (!f1.floating) throw new Error('setup failed: no float after ring drag');
	const h1 = f1.hist;
	await clickText('.menubar-btn', 'Edit');
	await sleep(200);
	await clickText('.menu-item', 'Select All');
	await sleep(500);
	const s1 = await page.evaluate(() => ({
		floating: !!window.__MOVE__.engine()?.floating,
		hist: window.__REGISTRY__.active.history.length,
		bounds: window.__REGISTRY__.active.selection.bounds,
		docW: window.__REGISTRY__.active.width
	}));
	log('[1] select-all:', JSON.stringify(s1));
	const ok1 = !s1.floating && s1.hist === h1 && s1.bounds.width === s1.docW;

	// --- [2] floating + Edit→Undo -------------------------------------------
	// need a prior history entry: apply one committed transform first
	await page.evaluate(async () => {
		const { setRectSelection } = await import('/src/lib/services/selectionService.ts');
		setRectSelection('rect', { x: 20, y: 20 }, { x: 220, y: 140 });
		await new Promise((r) => setTimeout(r, 200));
	});
	await ringDrag();
	await page.keyboard.press('Enter'); // apply → history +1
	await sleep(500);
	const h2base = await page.evaluate(() => window.__REGISTRY__.active.history.cursor);
	await ringDrag(); // floating again
	const f2 = await floatState();
	await clickText('.menubar-btn', 'Edit');
	await sleep(200);
	const menuOpen2 = await page.evaluate(() => document.querySelectorAll('.menu-item').length);
	await clickText('.menu-item', 'Undo');
	await sleep(500);
	const s2 = await page.evaluate((h) => ({
		floating: !!window.__MOVE__.engine()?.floating,
		cursor: window.__REGISTRY__.active.history.cursor,
		base: h
	}), h2base);
	log('[2] undo:', JSON.stringify({ ...s2, wasFloating: f2.floating, menuItems: menuOpen2 }));
	const ok2 = f2.floating && !s2.floating && s2.cursor === h2base - 1;

	// --- [3] floating + tool switch → reset, NOT silent commit ---------------
	await page.evaluate(async () => {
		const { activeToolId, moveToolMode } = await import('/src/lib/state/ui.ts');
		activeToolId.set('move-pixels');
		moveToolMode.set('rotate');
		await new Promise((r) => setTimeout(r, 200));
	});
	await ringDrag();
	const h3 = await page.evaluate(() => window.__REGISTRY__.active.history.length);
	await page.evaluate(async () => {
		const { activeToolId } = await import('/src/lib/state/ui.ts');
		activeToolId.set('brush');
		await new Promise((r) => setTimeout(r, 400));
	});
	const s3 = await page.evaluate((h) => ({
		floating: !!window.__MOVE__.engine()?.floating,
		hist: window.__REGISTRY__.active.history.length,
		base: h
	}), h3);
	log('[3] tool switch:', JSON.stringify(s3));
	const ok3 = !s3.floating && s3.hist === h3;

	// --- [4] Enter still applies ---------------------------------------------
	await page.evaluate(async () => {
		const { activeToolId, moveToolMode } = await import('/src/lib/state/ui.ts');
		activeToolId.set('move-pixels');
		moveToolMode.set('rotate');
		await new Promise((r) => setTimeout(r, 200));
	});
	await ringDrag();
	const f4 = await floatState();
	await page.keyboard.press('Enter');
	await page.keyboard.press('Enter');
	await sleep(500);
	const s4 = await page.evaluate(() => {
		const doc = window.__REGISTRY__.active;
		const labels = doc.history.labels();
		return {
			floating: !!window.__MOVE__.engine()?.floating,
			lastLabel: labels[labels.length - 1] ?? null,
			atTip: doc.history.cursor === labels.length - 1
		};
	});
	log('[4] enter applies:', JSON.stringify({ ...s4, wasFloating: f4.floating }));
	// NOTE: length need not grow — a drop after undos replaces the redo tail.
	const ok4 = f4.floating && !s4.floating && s4.lastLabel === 'Rotate Selection' && s4.atTip;

	const allOk = ok1 && ok2 && ok3 && ok4;
	if (errors.length) log('page errors:', JSON.stringify(errors.slice(0, 6)));
	if (!allOk) throw new Error('float reset probe FAILED');
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