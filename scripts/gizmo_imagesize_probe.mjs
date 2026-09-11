// Verifies the flat rotate gizmo + the non-modal Image Size dialog:
//   A. move-pixels/rotate shows 3 thick handles: green vertical line (X/tip),
//      blue horizontal line (Y/turn), red circle (Z/spin); pickRing resolves
//      each shape to its axis and tangents run along the handles.
//   B. imageSize opens as a MovableDialog (X button, draggable, NO dimming
//      backdrop), title follows the mode tab, and OK applies the resize.
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

	// --- [A] flat rotate gizmo -------------------------------------------
	const gizmo = await page.evaluate(async () => {
		const { setRectSelection } = await import('/src/lib/services/selectionService.ts');
		const { activeToolId, moveToolMode } = await import('/src/lib/state/ui.ts');
		const { rotateRingsFor, pickRing, ringTangent, gizmoRadiusFor } = await import('/src/lib/render/move/gizmo3d.ts');
		setRectSelection('rect', { x: 20, y: 20 }, { x: 220, y: 140 });
		activeToolId.set('move-pixels');
		moveToolMode.set('rotate');
		await new Promise((r) => setTimeout(r, 400));

		const paths = [...document.querySelectorAll('svg path')]
			.filter((p) => p.getAttribute('stroke'))
			.map((p) => ({
				stroke: p.getAttribute('stroke'),
				w: p.getAttribute('stroke-width'),
				d: p.getAttribute('d') ?? ''
			}));

		// math-level: shapes + hit-testing around a 100x100 box
		const center = { x: 50, y: 50 };
		const R = gizmoRadiusFor({ x: 0, y: 0, width: 100, height: 100 });
		const rings = rotateRingsFor(center, R);
		const byAxis = Object.fromEntries(rings.map((r) => [r.axis, r]));
		const span = (pts) => {
			const xs = pts.map((p) => p.x);
			const ys = pts.map((p) => p.y);
			return { x: Math.max(...xs) - Math.min(...xs), y: Math.max(...ys) - Math.min(...ys) };
		};
		const gx = span(byAxis.x.points);
		const gy = span(byAxis.y.points);
		const zc = byAxis.z.points;
		const zd = zc.map((p) => Math.hypot(p.x - center.x, p.y - center.y));
		const zMean = zd.reduce((a, b) => a + b, 0) / zd.length;
		const zStd = Math.sqrt(zd.reduce((a, b) => a + (b - zMean) ** 2, 0) / zd.length);
		const t = R * 0.2;
		const hitX = pickRing(rings, { x: center.x, y: center.y + R * 0.6 }, t)?.axis ?? null;
		const hitY = pickRing(rings, { x: center.x + R * 0.6, y: center.y }, t)?.axis ?? null;
		const hitZ = pickRing(rings, { x: center.x + R * 0.7, y: center.y + R * 0.7 }, t)?.axis ?? null;
		const tx = ringTangent(byAxis.x.points, 12);
		const ty = ringTangent(byAxis.y.points, 12);
		return {
			paths, R,
			greenLine: gx, blueLine: gy, redCircle: { mean: zMean, std: zStd },
			hitX, hitY, hitZ,
			tanX: tx, tanY: ty,
			grabX: byAxis.x.grabRadius ?? null, grabY: byAxis.y.grabRadius ?? null
		};
	});
	log('[A] gizmo:', JSON.stringify(gizmo, (k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)));
	const strokes = gizmo.paths.map((p) => p.stroke);
	const widths = new Set(gizmo.paths.map((p) => p.w));
	const gizmoOk =
		gizmo.paths.length === 3 &&
		JSON.stringify(strokes) === JSON.stringify(['#7ac74f', '#4a90e2', '#e5534b']) &&
		widths.size === 1 && widths.has('5') &&
		gizmo.greenLine.x < 2 && Math.abs(gizmo.greenLine.y - 2 * gizmo.R) < 2 &&
		gizmo.blueLine.y < 2 && Math.abs(gizmo.blueLine.x - 2 * gizmo.R) < 2 &&
		Math.abs(gizmo.redCircle.mean - gizmo.R) < gizmo.R * 0.02 && gizmo.redCircle.std < gizmo.R * 0.02 &&
		gizmo.hitX === 'x' && gizmo.hitY === 'y' && gizmo.hitZ === 'z' &&
		Math.abs(gizmo.tanX.x) < 0.01 && Math.abs(Math.abs(gizmo.tanX.y) - 1) < 0.01 &&
		Math.abs(gizmo.tanY.y) < 0.01 && Math.abs(Math.abs(gizmo.tanY.x) - 1) < 0.01 &&
		gizmo.grabX === gizmo.R && gizmo.grabY === gizmo.R;

	// --- [A2] spin past 360°: circling the red handle accumulates ---------
	const spin = await page.evaluate(async () => {
		const { MoveEngine } = await import('/src/lib/render/MoveEngine.ts');
		const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
		const { gizmoRadiusFor } = await import('/src/lib/render/move/gizmo3d.ts');
		const doc = window.__REGISTRY__.active;
		const sel = doc.selection.bounds;
		const cx = sel.x + sel.width / 2;
		const cy = sel.y + sel.height / 2;
		const R = gizmoRadiusFor(sel);
		const engine = new MoveEngine(getEditorRenderer());
		engine.setMode('rotate');
		const began = engine.begin();
		if (began !== 'ok') return { began };
		const TURNS = 2.5;
		const STEPS = 120;
		const pt = (a) => ({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
		engine.beginTransform('ringZ', pt(0));
		const series = []; // [step, cornerAngle][], nulls skipped
		const sample = (step) => {
			const q = engine.warpCorners;
			if (!q) return;
			series.push([step, Math.atan2(q[1].y - cy, q[1].x - cx)]); // q[1] = ne
		};
		sample(0);
		for (let i = 1; i <= STEPS; i++) {
			engine.transformTo(pt((i / STEPS) * TURNS * Math.PI * 2));
			if (i % 4 === 0) sample(i);
		}
		// unwrap the corner-angle series: total wound angle proves accumulation
		const wound = (a, b) => {
			let t = 0;
			for (let i = a + 1; i <= b; i++) {
				let d = series[i][1] - series[i - 1][1];
				while (d > Math.PI) d -= 2 * Math.PI;
				while (d <= -Math.PI) d += 2 * Math.PI;
				t += d;
			}
			return t;
		};
		const valid = series.length >= 10;
		const total = valid ? wound(0, series.length - 1) : 0;
		const half = valid ? wound(0, Math.floor((series.length - 1) / 2)) : 0;
		// commanded rotation over the covered span (skips the pre-first-move gap)
		const spanTurns = valid ? ((series[series.length - 1][0] - series[0][0]) / STEPS) * TURNS : 0;
		const halfTurns = valid ? spanTurns / 2 : 0;
		engine.cancel();
		return { began, samples: series.length, valid, total, half, spanTurns, halfTurns };
	});
	log('[A2] spin:', JSON.stringify(spin, (k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)));
	const spinOk =
		spin.began === 'ok' &&
		spin.valid &&
		Math.abs(spin.total - spin.spanTurns * Math.PI * 2) < 0.5 &&
		Math.abs(spin.half - spin.halfTurns * Math.PI * 2) < 0.4;

	// --- [A3] infinite turn (blue) + tip (green) + mirrored commit -----
	const revolve = await page.evaluate(async () => {
		const { MoveEngine } = await import('/src/lib/render/MoveEngine.ts');
		const { getEditorRenderer } = await import('/src/lib/render/EditorRenderer.ts');
		const { gizmoRadiusFor } = await import('/src/lib/render/move/gizmo3d.ts');
		const doc = window.__REGISTRY__.active;
		const sel = doc.selection.bounds;
		const cx = sel.x + sel.width / 2;
		const cy = sel.y + sel.height / 2;
		const R = gizmoRadiusFor(sel);
		const drive = (handle, from, to, steps, measure) => {
			const engine = new MoveEngine(getEditorRenderer());
			engine.setMode('rotate');
			if (engine.begin() !== 'ok') return { began: false };
			engine.beginTransform(handle, from);
			const series = [];
			for (let i = 1; i <= steps; i++) {
				const t = i / steps;
				engine.transformTo({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
				const q = engine.warpCorners;
				series.push(q ? measure(q) : null);
			}
			engine.cancel();
			const vals = series.filter((v) => v !== null);
			return {
				began: true,
				n: vals.length,
				min: Math.min(...vals),
				max: Math.max(...vals),
				final: vals[vals.length - 1],
				edgeCrossings: vals.filter((v) => Math.abs(v) < 0.25).length
			};
		};
		// blue, 2 full turns left: travel -4πR (25 steps/turn — never lands on edge-on)
		const yLeft = drive('ringY', { x: cx + R, y: cy }, { x: cx + R - 4 * Math.PI * R, y: cy }, 50,
			(q) => (q[1].x - cx) / (sel.width / 2));
		// blue, 1 full turn right
		const yRight = drive('ringY', { x: cx - R, y: cy }, { x: cx - R + 2 * Math.PI * R, y: cy }, 25,
			(q) => (q[1].x - cx) / (sel.width / 2));
		// green, 1 full tip forward (drag down). NOTE: ne.y reads -cosθ here,
		// so identity is -1 and the full mirror is +1.
		const xDown = drive('ringX', { x: cx, y: cy - R }, { x: cx, y: cy - R + 2 * Math.PI * R }, 25,
			(q) => (q[1].y - cy) / (sel.height / 2));
		// commit a mirrored (135°) state: exercises the bake path on the back half
		const engine = new MoveEngine(getEditorRenderer());
		engine.setMode('rotate');
		const began = engine.begin();
		const h0 = doc.history.length;
		engine.beginTransform('ringY', { x: cx + R, y: cy });
		engine.transformTo({ x: cx + R - 0.75 * Math.PI * R, y: cy });
		const mid = engine.warpCorners;
		const midCos = mid ? (mid[1].x - cx) / (sel.width / 2) : null;
		const committed = engine.drop();
		await new Promise((r) => setTimeout(r, 400));
		return { yLeft, yRight, xDown, mirror: { began, midCos, committed, histGrew: doc.history.length > h0 } };
	});
	log('[A3] revolve:', JSON.stringify(revolve, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)));
	const revolveOk =
		revolve.yLeft.began && revolve.yLeft.min < -0.9 && revolve.yLeft.edgeCrossings >= 3 && Math.abs(revolve.yLeft.final - 1) < 0.15 &&
		revolve.yRight.began && revolve.yRight.min < -0.9 && Math.abs(revolve.yRight.final - 1) < 0.15 &&
		revolve.xDown.began && revolve.xDown.max > 0.9 && Math.abs(revolve.xDown.final + 1) < 0.15 &&
		revolve.mirror.began && revolve.mirror.midCos !== null && revolve.mirror.midCos < -0.5 &&
		revolve.mirror.committed && revolve.mirror.histGrew;
	// --- [B] non-modal Image Size dialog ----------------------------------
	// NOTE: [A3] baked a mirrored turn into the doc — resize works on any content.
	// Opened through the real status-bar button (the in-app graph owns the
	// dialog store; evaluate-imported openDialog() does not reach DialogHost).
	await page.evaluate(() => document.querySelector('.status-dim')?.click());
	await sleep(400);
	const dlg = await page.evaluate(async () => {
		const box = document.querySelector('.m-dialog');
		return {
			hasDialog: !!box,
			title: document.querySelector('.m-dialog .m-title-text')?.textContent?.trim() ?? null,
			hasX: !!document.querySelector('.m-dialog .m-close'),
			hasBackdrop: !!document.querySelector('.dialog-backdrop'),
			left: box?.getBoundingClientRect().left ?? null,
			top: box?.getBoundingClientRect().top ?? null,
			focusedWidth: document.activeElement?.tagName === 'INPUT' && document.activeElement?.type === 'number'
		};
	});
	log('[B] open:', JSON.stringify(dlg));

	// drag by the title bar
	const titleBox = await (await page.$('.m-dialog .m-title')).boundingBox();
	await page.mouse.move(titleBox.x + 40, titleBox.y + 10);
	await page.mouse.down();
	await page.mouse.move(titleBox.x + 100, titleBox.y + 50, { steps: 8 });
	await page.mouse.up();
	await sleep(200);
	const moved = await page.evaluate(() => {
		const box = document.querySelector('.m-dialog')?.getBoundingClientRect();
		return box ? { left: box.left, top: box.top } : null;
	});
	log('    moved:', JSON.stringify({ from: { left: dlg.left, top: dlg.top }, to: moved }));
	const dragOk = moved && Math.abs(moved.left - dlg.left - 60) < 6 && Math.abs(moved.top - dlg.top - 40) < 6;

	// X button closes
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(250);
	const closedX = await page.evaluate(() => !document.querySelector('.m-dialog'));

	// canvas mode tab + real apply (halve the width), opened via Image menu
	await clickText('.menubar-btn', 'Image');
	await sleep(200);
	await clickText('.menu-item', 'Canvas Size');
	await sleep(400);
	const apply = await page.evaluate(async () => {
		const doc = window.__REGISTRY__.active;
		const before = { w: doc.width, h: doc.height };
		const titleCanvas = document.querySelector('.m-dialog .m-title-text')?.textContent?.trim() ?? null;
		[...document.querySelectorAll('.m-dialog .seg-btn')].find((b) => b.textContent.includes('Resize image'))?.click();
		await new Promise((r) => setTimeout(r, 200));
		const titleResize = document.querySelector('.m-dialog .m-title-text')?.textContent?.trim() ?? null;
		const input = document.querySelector('.m-dialog input[type=number]');
		const target = Math.max(1, Math.floor(before.w / 2));
		input.focus();
		input.value = String(target);
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new Event('change', { bubbles: true }));
		await new Promise((r) => setTimeout(r, 200));
		document.querySelector('.m-dialog .btn-primary')?.click();
		await new Promise((r) => setTimeout(r, 800));
		return {
			titleCanvas, titleResize, target,
			afterW: doc.width, closed: !document.querySelector('.m-dialog')
		};
	});
	log('[B] apply:', JSON.stringify(apply));
	const dlgOk =
		dlg.hasDialog && dlg.title === 'Resize Image' && dlg.hasX && !dlg.hasBackdrop && dlg.focusedWidth &&
		dragOk && closedX &&
		apply.titleCanvas === 'Canvas Size' && apply.titleResize === 'Resize Image' &&
		apply.afterW === apply.target && apply.closed;

	const allOk = gizmoOk && spinOk && revolveOk && dlgOk;
	if (!allOk) throw new Error('gizmo/imagesize probe FAILED');
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