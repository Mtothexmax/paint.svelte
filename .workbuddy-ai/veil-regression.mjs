// Regression: the blue veil must track the selection through every transform
// path now that it is drawn ABOVE the floating content.
//  1) marquee            -> veil over the marquee
//  2) move the pixels    -> veil travels with the content (not left behind)
//  3) rotate (3D rings)  -> veil follows the rotating preview
//  4) Apply              -> veil back on the committed shape
//  5) Deselect           -> veil gone
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
	if (tag) await page.screenshot({ path: `${OUT}reg-${tag}.png`, clip });
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

const cx = (b) => (b.box ? Math.round((b.box[0] + b.box[2]) / 2) : null);
const cy = (b) => (b.box ? Math.round((b.box[1] + b.box[3]) / 2) : null);

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1600));
await pickTool('Paint Bucket');
await page.mouse.move(650, 450);
await page.mouse.down();
await page.mouse.up();
await new Promise((r) => setTimeout(r, 900));

const results = [];
const step = (name, b, note) => results.push({ name, count: b.count, box: b.box, cx: cx(b), cy: cy(b), note });

// 1) marquee
await pickTool('Rectangle Select');
await drag(430, 300, 700, 540);
step('1 marquee', await veilBox('1-marquee'), 'veil over the marquee');

// 2) move the pixels by a large offset — the veil must travel, not stay.
//    Start AWAY from the selection centre: that is the pivot handle, and
//    grabbing it drags the pivot instead of the content.
await pickTool('Move Selected Pixels');
await drag(470, 340, 670, 540, 20);
step('2 moved +200/+200', await veilBox('2-moved'), 'veil should be ~200px right/down of step 1');

// 3) rotate preview (grab the blue Z ring) — veil must follow
await pickMode('Rotate');
await new Promise((r) => setTimeout(r, 450));
const zPts = await page.evaluate(() => {
	const p = [...document.querySelectorAll('svg path')].find((n) => n.getAttribute('stroke') === '#4a90e2');
	if (!p) return [];
	const r = p.ownerSVGElement.getBoundingClientRect();
	const nums = (p.getAttribute('d') ?? '').replace(/[MLZ]/g, ' ').trim().split(/[\s,]+/).map(Number);
	const pts = [];
	for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i] + r.left, y: nums[i + 1] + r.top });
	return pts;
});
if (zPts.length) {
	const i0 = Math.floor(zPts.length / 4);
	const a0 = zPts[(i0 - 1 + zPts.length) % zPts.length];
	const b0 = zPts[(i0 + 1) % zPts.length];
	const tl = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
	// mid-drag sample: press, move, screenshot, then release
	await page.mouse.move(zPts[i0].x, zPts[i0].y);
	await page.mouse.down();
	await page.mouse.move(zPts[i0].x + ((b0.x - a0.x) / tl) * 70, zPts[i0].y + ((b0.y - a0.y) / tl) * 70, { steps: 14 });
	await new Promise((r) => setTimeout(r, 400));
	step('3 rotating (mid-drag)', await veilBox('3-rotating'), 'veil must be visible while dragging');
	await page.mouse.up();
	await new Promise((r) => setTimeout(r, 400));
}

// 4) Apply
await page.evaluate(() => {
	const b = [...document.querySelectorAll('.mini-btn')].find((x) => x.textContent.includes('Apply'));
	b?.click();
});
await new Promise((r) => setTimeout(r, 900));
step('4 after Apply', await veilBox('4-applied'), 'veil on the committed rotated shape');

// 5) Deselect — Edit ▸ Deselect, i.e. Ctrl+D (there is no top-level button)
await page.keyboard.down('Control');
await page.keyboard.press('d');
await page.keyboard.up('Control');
await new Promise((r) => setTimeout(r, 800));
step('5 after Deselect', await veilBox('5-deselected'), 'veil must be gone');

await browser.close();

for (const r of results) {
	console.log(`${r.name.padEnd(22)} count=${String(r.count).padStart(7)}  box=${r.box ? '[' + r.box.join(', ') + ']' : 'none'}  centre=(${r.cx}, ${r.cy})  — ${r.note}`);
}
const m1 = results[0], m2 = results[1];
console.log(`\nmove delta (step2 - step1 centre) : dx=${m2.cx - m1.cx} dy=${m2.cy - m1.cy}  (expected ~+200/+200)`);
const checks = [
	['marquee veil visible', m1.count > 20000],
	['move veil travels', m2.cx - m1.cx > 120 && m2.cy - m1.cy > 120],
	['rotate veil visible mid-drag', results[2].count > 20000],
	['applied veil visible', results[3].count > 20000],
	['deselect clears veil', results[4].count < 200]
];
console.log('');
for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
console.log(`\nerrors : ${errors.length ? errors.join(' | ') : 'none'}`);
