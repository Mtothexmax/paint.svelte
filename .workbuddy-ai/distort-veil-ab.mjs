// A/B: does the blue veil follow a Distort corner drag?
//   A) plain marquee  -> distort drag   (selection NOT composite)
//   B) marquee -> rotate -> Apply -> distort drag  (selection IS composite)
// If A tracks and B does not, the `usesGeometryTint` gate in
// EditorRenderer.previewWarpedSelectionOutline is the culprit.
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
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
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
const pickTool = async (label) => {
	await page.evaluate((l) => document.querySelector(`button[aria-label="${l}"]`)?.click(), label);
	await new Promise((r) => setTimeout(r, 350));
};
const pickMode = async (label) => {
	await page.evaluate((l) => {
		const b = [...document.querySelectorAll('.seg-btn')].find((x) => (x.textContent ?? '').includes(l));
		b?.click();
	}, label);
	await new Promise((r) => setTimeout(r, 400));
};
const drag = async (x1, y1, x2, y2, steps = 16) => {
	await page.mouse.move(x1, y1);
	await page.mouse.down();
	await page.mouse.move(x2, y2, { steps });
	await page.mouse.up();
	await new Promise((r) => setTimeout(r, 500));
};

const veilBox = async (tag) => {
	const clip = await page.evaluate(() => {
		const el = document.querySelector('div[style*="touch-action"]');
		const r = el.getBoundingClientRect();
		return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
	});
	const buf = await page.screenshot({ clip });
	if (tag) await page.screenshot({ path: `${OUT}ab-${tag}.png`, clip });
	return page.evaluate(async (data) => {
		const img = new Image();
		img.src = 'data:image/png;base64,' + data;
		await img.decode();
		const c = document.createElement('canvas');
		c.width = img.width;
		c.height = img.height;
		const ctx = c.getContext('2d');
		ctx.drawImage(img, 0, 0);
		const px = ctx.getImageData(0, 0, c.width, c.height).data;
		let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, count = 0;
		for (let y = 0; y < c.height; y++) {
			for (let x = 0; x < c.width; x++) {
				const i = (y * c.width + x) * 4;
				const r = px[i], g = px[i + 1], b = px[i + 2];
				if (r >= 32 && r <= 62 && g >= 48 && g <= 82 && b >= 62 && b <= 102) {
					count++;
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
				}
			}
		}
		return { count, box: count ? [minX, minY, maxX, maxY] : null };
	}, buf.toString('base64'));
};

/** Screen-space centre of the NW distort dragger. */
const nwDragger = () =>
	page.evaluate(() => {
		const boxes = [...document.querySelectorAll('div.bg-blue-500')]
			.map((n) => n.getBoundingClientRect())
			.filter((r) => r.width > 0);
		boxes.sort((a, b) => a.y - b.y || a.x - b.x);
		const r = boxes[0];
		return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), n: boxes.length } : null;
	});

const logTail = () =>
	page.evaluate(() => {
		const raw = localStorage.getItem('paint.transform-debug');
		const arr = raw ? JSON.parse(raw) : [];
		return arr.slice(-6).map((e) => `${e.event}${e.composite !== undefined ? ' composite=' + e.composite : ''}`);
	});

// ---- document + black layer ----------------------------------------------
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1600));
await pickTool('Paint Bucket');
await page.mouse.move(650, 450);
await page.mouse.down();
await page.mouse.up();
await new Promise((r) => setTimeout(r, 900));

const scenario = async (name, rotateFirst) => {
	await pickTool('Rectangle Select');
	await drag(430, 300, 700, 540);
	await pickTool('Move Selected Pixels');
	if (rotateFirst) {
		await pickMode('Rotate');
		await new Promise((r) => setTimeout(r, 400));
		const zPts = await page.evaluate(() => {
			const p = [...document.querySelectorAll('svg path')].find((n) => n.getAttribute('stroke') === '#4a90e2');
			if (!p) return [];
			const r = p.ownerSVGElement.getBoundingClientRect();
			const nums = (p.getAttribute('d') ?? '').replace(/[MLZ]/g, ' ').trim().split(/[\s,]+/).map(Number);
			const pts = [];
			for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i] + r.left, y: nums[i + 1] + r.top });
			return pts;
		});
		if (!zPts.length) return { name, aborted: 'no rings' };
		const i0 = Math.floor(zPts.length / 4);
		const a0 = zPts[(i0 - 1 + zPts.length) % zPts.length];
		const b0 = zPts[(i0 + 1) % zPts.length];
		const tl = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
		await drag(zPts[i0].x, zPts[i0].y, zPts[i0].x + ((b0.x - a0.x) / tl) * 70, zPts[i0].y + ((b0.y - a0.y) / tl) * 70);
		await page.evaluate(() => {
			const b = [...document.querySelectorAll('.mini-btn')].find((x) => x.textContent.includes('Apply'));
			b?.click();
		});
		await new Promise((r) => setTimeout(r, 900));
	}
	await pickMode('Distort');
	await new Promise((r) => setTimeout(r, 600));
	const idle = await veilBox(`${name}-1-idle`);
	const nw = await nwDragger();
	if (!nw) return { name, aborted: 'no draggers' };
	await drag(nw.x, nw.y, nw.x - 170, nw.y - 130, 18);
	const dragged = await veilBox(`${name}-2-dragged`);
	const tail = await logTail();
	return { name, idle, dragged, nw, tail };
};

const A = await scenario('A-norotate', false);
console.log('--- A: marquee -> distort (no rotation) ---');
console.log(JSON.stringify(A, null, 1));

const B = await scenario('B-rotated', true);
console.log('--- B: marquee -> rotate -> Apply -> distort ---');
console.log(JSON.stringify(B, null, 1));

console.log('errors :', errors.length ? errors.join(' | ') : 'none');
await browser.close();
