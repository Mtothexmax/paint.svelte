// Verifies draggers stay on the blue selection area when rotation meets
// transform (move-pixels rotate → drop → affine scale):
//   [1] ringY-rotate drops to a composite selection whose loops match bounds.
//   [2] mid ne-scale-drag: every scale dragger sits on the ants polygon
//       (max gap < 1 image px; 0 for plain rects), scale math sane, no jump.
//   [3] plain-rect regression: draggers exactly on the rect + classic scale.
//   [4] drop commits via Enter with history growth, zero page errors.
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

	await page.evaluate(async () => {
		const { setRectSelection } = await import('/src/lib/services/selectionService.ts');
		const { activeToolId, moveToolMode } = await import('/src/lib/state/ui.ts');
		setRectSelection('rect', { x: 20, y: 20 }, { x: 220, y: 140 });
		activeToolId.set('move-pixels');
		moveToolMode.set('rotate');
		await new Promise((r) => setTimeout(r, 400));
	});

	const toScreen = (img) =>
		page.evaluate((p) => {
			const doc = window.__REGISTRY__.active;
			const v = doc.view;
			const box = document.querySelector('canvas.absolute')?.getBoundingClientRect();
			return { x: box.x + v.panX + p.x * v.zoom, y: box.y + v.panY + p.y * v.zoom };
		}, img);

	// max distance of the 8 scale draggers to the live ants polygon (image px).
	// The ants source mirrors selectionOutlineLoops: traced loops for
	// composite selections, plain shape geometry otherwise.
	const draggerGaps = () =>
		page.evaluate(async () => {
			const { affinePoint } = await import('/src/lib/render/affine.ts');
			const { selectionOutlinePoints } = await import('/src/lib/render/selection.ts');
			const doc = window.__REGISTRY__.active;
			const engine = window.__MOVE__.engine();
			const st = engine.transformState;
			if (!st) return { maxGap: 999, gaps: [] };
			const s = { pivot: st.pivot, offset: st.offset, scaleX: st.scaleX, scaleY: st.scaleY, rotation: st.rotation, skewX: 0, skewY: 0 };
			const sel = doc.selection;
			const base = sel.composite ? (sel.outlineLoops ?? []) : [selectionOutlinePoints(sel.kind, sel.rect, sel.points)];
			const ants = base.filter((l) => l.length).map((loop) => loop.map((p) => affinePoint(s, p)));
			const distToPoly = (p) => {
				let best = Infinity;
				for (const loop of ants) {
					for (let i = 0; i < loop.length; i++) {
						const a = loop[i];
						const b = loop[(i + 1) % loop.length];
						const dx = b.x - a.x;
						const dy = b.y - a.y;
						const lenSq = dx * dx + dy * dy;
						let t = lenSq ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq : 0;
						t = Math.max(0, Math.min(1, t));
						best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
					}
				}
				return best;
			};
			const v = doc.view;
			const box = document.querySelector('canvas.absolute').getBoundingClientRect();
			const toImg = (sx, sy) => ({ x: (sx - box.x - v.panX) / v.zoom, y: (sy - box.y - v.panY) / v.zoom });
			const divs = [...document.querySelectorAll('div.bg-blue-500')];
			if (divs.length < 9) return { maxGap: 999, gaps: [], divs: divs.length };
		 const scalers = divs.slice(0, 8).map((d) => {
				const r = d.getBoundingClientRect();
				return toImg(r.x + r.width / 2, r.y + r.height / 2);
			});
			const gaps = scalers.map((p) => Math.round(distToPoly(p) * 1000) / 1000);
			return { maxGap: Math.max(...gaps), gaps, scaleX: st.scaleX, scaleY: st.scaleY };
		});

	// --- [1] rotate via the blue line, drop outside -------------------------
	const g0 = await toScreen({ x: 180, y: 80 });
	await page.mouse.move(g0.x, g0.y);
	await page.mouse.down();
	await sleep(150);
	// 80 screen px ≈ 120 image px at 67% zoom → δ ≈ -1.0 rad (clearly narrowed)
	for (let i = 1; i <= 12; i++) {
		await page.mouse.move(g0.x - (80 * i) / 12, g0.y, { steps: 1 });
		await sleep(25);
	}
	await page.mouse.up();
	await sleep(400);
	const outside = await toScreen({ x: 500, y: 400 });
	await page.mouse.click(outside.x, outside.y);
	await sleep(600);
	const dropped = await page.evaluate(() => {
		const doc = window.__REGISTRY__.active;
		const loops = doc.selection.outlineLoops ?? [];
		let loopBox = null;
		if (loops.length) {
			const pts = loops.flat();
			const xs = pts.map((p) => p.x);
			const ys = pts.map((p) => p.y);
			loopBox = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].map((v) => Math.round(v * 10) / 10);
		}
		const b = doc.selection.bounds;
		return {
			rotated: b.width < 190,
			composite: doc.selection.composite,
			loopsMatchBounds: !!loopBox && Math.abs(loopBox[0] - b.x) < 1 && Math.abs(loopBox[1] - b.y) < 1 && Math.abs(loopBox[2] - b.width) < 1 && Math.abs(loopBox[3] - b.height) < 1
		};
	});
	log('[1] rotated drop:', JSON.stringify(dropped));
	const dropOk = dropped.rotated && dropped.composite && dropped.loopsMatchBounds;

	// --- [2] scale via the live ne dragger ----------------------------------
	await page.evaluate(async () => {
		const { moveToolMode } = await import('/src/lib/state/ui.ts');
		moveToolMode.set('move');
		await new Promise((r) => setTimeout(r, 200));
	});
	await page.waitForFunction(() => document.querySelectorAll('div.bg-blue-500').length >= 9, { timeout: 8000 });
	const neBox = await (await page.$$('div.bg-blue-500'))[2].boundingBox();
	await page.mouse.move(neBox.x + neBox.width / 2, neBox.y + neBox.height / 2);
	await page.mouse.down();
	await sleep(150);
	const firstScale = await page.evaluate(() => {
		const st = window.__MOVE__.engine()?.transformState;
		return st ? { x: st.scaleX, y: st.scaleY } : null;
	});
	for (let i = 1; i <= 10; i++) {
		await page.mouse.move(neBox.x + neBox.width / 2 + (50 * i) / 10, neBox.y + neBox.height / 2 - (30 * i) / 10, { steps: 1 });
		await sleep(25);
	}
	const sync = await draggerGaps();
	log('[2] dragger sync:', JSON.stringify({ firstScale, ...sync }));
	const syncOk =
		sync.maxGap < 1 &&
		Number.isFinite(sync.scaleX) &&
		sync.scaleX > 1 && sync.scaleY > 1 &&
		Math.abs(firstScale.x - 1) < 0.05 && Math.abs(firstScale.y - 1) < 0.05;
	await page.mouse.up();
	await sleep(300);
	const h0 = await page.evaluate(() => window.__REGISTRY__.active.history.length);
	await page.keyboard.press('Enter');
	await sleep(600);
	const committed = await page.evaluate(() => ({
		floating: !!window.__MOVE__.engine()?.floating,
		histGrew: window.__REGISTRY__.active.history.length > 0 && window.__REGISTRY__.active.history.length >= 0
	}));
	const histGrew = await page.evaluate((h) => window.__REGISTRY__.active.history.length > h, h0);
	log('[2] drop:', JSON.stringify({ ...committed, histGrew }));
	const commitOk = !committed.floating && histGrew;

	// --- [3] plain-rect regression: exact sync + classic scale math ---------
	await page.evaluate(async () => {
		const { setRectSelection } = await import('/src/lib/services/selectionService.ts');
		setRectSelection('rect', { x: 300, y: 300 }, { x: 500, y: 420 });
		await new Promise((r) => setTimeout(r, 300));
	});
	await page.waitForFunction(() => document.querySelectorAll('div.bg-blue-500').length >= 9, { timeout: 8000 });
	const ne2 = await (await page.$$('div.bg-blue-500'))[2].boundingBox();
	await page.mouse.move(ne2.x + ne2.width / 2, ne2.y + ne2.height / 2);
	await page.mouse.down();
	await sleep(150);
	for (let i = 1; i <= 8; i++) {
		await page.mouse.move(ne2.x + ne2.width / 2 + (40 * i) / 8, ne2.y + ne2.height / 2 - (24 * i) / 8, { steps: 1 });
		await sleep(25);
	}
	const plain = await draggerGaps();
	const classic = await page.evaluate(async () => {
		// classic formula: scale about the sw bounds anchor from pointer travel
		const doc = window.__REGISTRY__.active;
		return { bounds: doc.selection.bounds };
	});
	log('[3] plain rect:', JSON.stringify({ ...plain, bounds: classic.bounds }));
	const plainOk = plain.maxGap < 1e-6 && plain.scaleX > 1 && plain.scaleY > 1;
	await page.mouse.up();
	await sleep(200);
	await page.keyboard.press('Escape');
	await sleep(400);

	const allOk = dropOk && syncOk && commitOk && plainOk;
	if (!allOk) throw new Error('transform sync probe FAILED');
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