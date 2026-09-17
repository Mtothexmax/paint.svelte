// After a committed Move, does the Rotate gizmo re-centre on the moved
// selection — or does it still sit on the pre-move bounds?
// No drag here: marquee -> move (commit) -> switch to Rotate -> read the rings.
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
const pickTool = async (l) => {
	await page.evaluate((x) => document.querySelector(`button[aria-label="${x}"]`)?.click(), l);
	await new Promise((r) => setTimeout(r, 350));
};
const pickMode = async (l) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('.seg-btn')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, l);
	await new Promise((r) => setTimeout(r, 450));
};
const drag = async (x1, y1, x2, y2, steps = 20) => {
	await page.mouse.move(x1, y1);
	await page.mouse.down();
	await page.mouse.move(x2, y2, { steps });
	await page.mouse.up();
	await new Promise((r) => setTimeout(r, 500));
};

/** Centre of the drawn rotate rings (blue Z path), in screen px. */
const ringCentre = () =>
	page.evaluate(() => {
		const p = [...document.querySelectorAll('svg path')].find((n) => n.getAttribute('stroke') === '#4a90e2');
		if (!p) return null;
		const r = p.ownerSVGElement.getBoundingClientRect();
		const nums = (p.getAttribute('d') ?? '').replace(/[MLZ]/g, ' ').trim().split(/[\s,]+/).map(Number);
		const pts = [];
		for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i] + r.left, y: nums[i + 1] + r.top });
		const xs = pts.map((q) => q.x);
		const ys = pts.map((q) => q.y);
		return {
			cx: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
			cy: Math.round((Math.min(...ys) + Math.max(...ys)) / 2),
			n: pts.length
		};
	});

/** Centre of the blue veil, in screen px (veil over black -> rgb(46,64,82)). */
const veilCentre = async () => {
	const clip = await page.evaluate(() => {
		const el = document.querySelector('div[style*="touch-action"]');
		const r = el.getBoundingClientRect();
		return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
	});
	const buf = await page.screenshot({ clip });
	const b = await page.evaluate(
		async (arg) => {
			const img = new Image();
			img.src = 'data:image/png;base64,' + arg.data;
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
					const r = px[i], g = px[i + 1], bl = px[i + 2];
					if (r >= 32 && r <= 62 && g >= 48 && g <= 82 && bl >= 62 && bl <= 102) {
						count++;
						if (x < minX) minX = x;
						if (x > maxX) maxX = x;
						if (y < minY) minY = y;
						if (y > maxY) maxY = y;
					}
				}
			}
			return count
				? { cx: Math.round((minX + maxX) / 2) + arg.ox, cy: Math.round((minY + maxY) / 2) + arg.oy, count }
				: null;
		},
		{ data: buf.toString('base64'), ox: clip.x, oy: clip.y }
	);
	return b;
};

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1600));
await pickTool('Paint Bucket');
await page.mouse.move(650, 450);
await page.mouse.down();
await page.mouse.up();
await new Promise((r) => setTimeout(r, 900));

await pickTool('Rectangle Select');
await drag(430, 300, 700, 540);
const veilBefore = await veilCentre();

await pickTool('Move Selected Pixels');
// start away from the pivot (centre) so this is a real content move
await drag(470, 340, 670, 540, 20);
const veilAfter = await veilCentre();

await pickMode('Rotate');
await new Promise((r) => setTimeout(r, 600));
const rings = await ringCentre();
await page.screenshot({ path: `${OUT}ring-centre.png`, clip: { x: 140, y: 0, width: 1070, height: 900 } });

await browser.close();

console.log('veil centre before move :', veilBefore);
console.log('veil centre after move  :', veilAfter);
console.log('rotate ring centre      :', rings);
if (rings && veilAfter) {
	const dx = rings.cx - veilAfter.cx;
	const dy = rings.cy - veilAfter.cy;
	const off = Math.hypot(dx, dy);
	console.log(`\nring centre - veil centre : dx=${dx} dy=${dy}  |off|=${off.toFixed(1)} px`);
	console.log(off < 25 ? 'PASS  gizmo re-centred on the moved selection' : 'FAIL  gizmo is off the moved selection');
}
console.log('errors :', errors.length ? errors.join(' | ') : 'none');
