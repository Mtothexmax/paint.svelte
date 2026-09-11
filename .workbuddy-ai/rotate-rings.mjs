// Verify the rotate gizmo:
//   (a) rings appear the moment Rotate mode is picked — before any canvas click
//   (b) the rings do NOT move/resize while rotating (Blender behaviour)
//   (c) the rotation actually happens (transform debug log gets deltas)
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const clickByText = async (t) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await new Promise((r) => setTimeout(r, 450));
};
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1600));

// A chunky selection so the rings are comfortably large.
await page.evaluate(() => document.querySelector('button[aria-label="Rectangle Select"]')?.click());
await new Promise((r) => setTimeout(r, 350));
await page.mouse.move(500, 330);
await page.mouse.down();
await page.mouse.move(800, 560, { steps: 14 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 500));

// --- pick the Move tool, then the Rotate sub-mode -------------------------
await page.evaluate(() => document.querySelector('button[aria-label="Move Selected Pixels"]')?.click());
await new Promise((r) => setTimeout(r, 400));
await page.evaluate(() => {
	const b = [...document.querySelectorAll('.seg-btn')].find((x) => (x.textContent ?? '').includes('Rotate'));
	b?.click();
});
await new Promise((r) => setTimeout(r, 500));
const modeNow = await page.evaluate(() =>
	[...document.querySelectorAll('.seg-btn.on')].map((b) => (b.textContent ?? '').trim())
);
console.log('DIAG active sub-mode:', JSON.stringify(modeNow));

/** The three gizmo rings: their d + bbox, keyed by stroke colour. */
const readRings = () =>
	page.evaluate(() => {
		const AXIS = { '#e5534b': 'x', '#7ac74f': 'y', '#4a90e2': 'z' };
		const out = {};
		for (const p of document.querySelectorAll('svg path')) {
			const axis = AXIS[p.getAttribute('stroke')];
			if (!axis) continue;
			const b = p.getBBox();
			out[axis] = {
				d: p.getAttribute('d'),
				bbox: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]
			};
		}
		return out;
	});

// (a) NO canvas click has happened yet — the rings must already be there.
const beforeClick = await readRings();
await page.screenshot({ path: `${OUT}rotate-rings-idle.png` });
console.log('DIAG rings right after Rotate mode:', JSON.stringify(Object.keys(beforeClick)));
if (!beforeClick.z) {
	const dump = await page.evaluate(() => {
		const svgs = [...document.querySelectorAll('svg')];
		return {
			svgCount: svgs.length,
			paths: [...document.querySelectorAll('svg path')].map((p) => ({
				stroke: p.getAttribute('stroke'),
				d: (p.getAttribute('d') ?? '').slice(0, 40)
			})),
			tool: [...document.querySelectorAll('button[aria-pressed="true"], .seg-btn.on')].map((b) =>
				(b.textContent ?? '').trim()
			)
		};
	});
	console.log('DIAG dump:', JSON.stringify(dump, null, 1));
	await browser.close();
	process.exit(1);
}

// The ring paths are in SVG-local coords; the overlay is `absolute inset-0`
// inside the canvas host, so page coords need the SVG's own offset added —
// without this the drags land beside the rings and silently become translates.
const svgRect = await page.evaluate(() => {
	const p = [...document.querySelectorAll('svg path')].find((n) => n.getAttribute('stroke') === '#4a90e2');
	const r = p.ownerSVGElement.getBoundingClientRect();
	return { left: r.left, top: r.top };
});

/** Parse a ring path into SVG-local points, shifted into page coords. */
const ringPoints = (axis) =>
	page.evaluate(
		(a, off) => {
			const colours = { x: '#e5534b', y: '#7ac74f', z: '#4a90e2' };
			const p = [...document.querySelectorAll('svg path')].find(
				(n) => n.getAttribute('stroke') === colours[a]
			);
			if (!p) return [];
			const nums = (p.getAttribute('d') ?? '')
				.replace(/[MLZ]/g, ' ')
				.trim()
				.split(/[\s,]+/)
				.map(Number);
			const pts = [];
			for (let i = 0; i + 1 < nums.length; i += 2) {
				pts.push({ x: nums[i] + off.left, y: nums[i + 1] + off.top });
			}
			return pts;
		},
		axis,
		svgRect
	);

const dragRing = async (pts, idx, distance) => {
	const a = pts[(idx - 1 + pts.length) % pts.length];
	const b = pts[(idx + 1) % pts.length];
	const tx = b.x - a.x;
	const ty = b.y - a.y;
	const len = Math.hypot(tx, ty) || 1;
	const start = pts[idx];
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + (tx / len) * distance, start.y + (ty / len) * distance, { steps: 16 });
	await page.mouse.up();
	await new Promise((r) => setTimeout(r, 500));
};

const logEvents = () =>
	page.evaluate(() => {
		for (const k of Object.keys(localStorage)) {
			if (!k.toLowerCase().includes('transform')) continue;
			try {
				const arr = JSON.parse(localStorage.getItem(k));
				const counts = {};
				for (const e of arr) counts[e.event] = (counts[e.event] ?? 0) + 1;
				return { total: arr.length, counts };
			} catch {
				return { total: -1, counts: {} };
			}
		}
		return { total: -1, counts: {} };
	});

const logsBefore = await logEvents();
const zPoints = await ringPoints('z');
await dragRing(zPoints, Math.floor(zPoints.length / 4), 90);
const afterZ = await readRings();
await page.screenshot({ path: `${OUT}rotate-rings-after-z.png` });

// Now a foreshortening X (red) rotation — the old code moved AND resized the
// rings here, so this is the case that really proves the fix.
const xPoints = await ringPoints('x');
await dragRing(xPoints, Math.floor(xPoints.length / 4), 80);
const afterX = await readRings();
await page.screenshot({ path: `${OUT}rotate-rings-after-x.png` });

const logsAfter = await logEvents();

await browser.close();

const axes = ['x', 'y', 'z'];
const fmt = (r) => axes.map((a) => `${a}:${r[a] ? r[a].bbox.join(',') : 'MISSING'}`).join('  ');
console.log('--- (a) rings right after picking Rotate, BEFORE any canvas click ---');
console.log(`  rings present    : ${axes.filter((a) => beforeClick[a]).join(', ') || 'NONE'}`);
console.log(`  bboxes           : ${fmt(beforeClick)}`);
console.log('--- (b) after dragging the Z (blue) ring 90px ---');
console.log(`  rings present    : ${axes.filter((a) => afterZ[a]).join(', ') || 'NONE'}`);
console.log(`  bboxes           : ${fmt(afterZ)}`);
console.log(`  d identical      : ${axes.every((a) => beforeClick[a]?.d === afterZ[a]?.d)}`);
console.log('--- (b2) after dragging the X (red) ring 80px (foreshortening) ---');
console.log(`  bboxes           : ${fmt(afterX)}`);
console.log(`  d identical      : ${axes.every((a) => beforeClick[a]?.d === afterX[a]?.d)}`);
console.log('--- (c) did the content actually rotate? ---');
console.log(`  transform log    : ${logsBefore.total} -> ${logsAfter.total} entries`);
const delta = {};
for (const [k, v] of Object.entries(logsAfter.counts)) {
	const d = v - (logsBefore.counts[k] ?? 0);
	if (d) delta[k] = d;
}
console.log(`  new events       : ${JSON.stringify(delta)}`);
console.log(`  rotateRingTo     : ${delta['engine.rotateRingTo'] ?? 0}  (0 = the drags missed the rings)`);
console.log(`  engine.transformTo: ${delta['engine.transformTo'] ?? 0}  (translate fallbacks)`);
console.log(`errors             : ${errors.length ? errors.join(' | ') : 'none'}`);
