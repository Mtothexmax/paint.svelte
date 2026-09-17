// Does the new transparency slider actually change what gets painted?
//   fill the layer white, then paint the SAME red stroke twice — once at
//   alpha 255 and once at ~alpha 128 — and sample the two strokes.
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
const pickTool = async (l) => {
	await page.evaluate((x) => document.querySelector(`button[aria-label="${x}"]`)?.click(), l);
	await new Promise((r) => setTimeout(r, 350));
};
const setSlider = async (sel, v) => {
	await page.evaluate(
		(a) => {
			const el = document.querySelector(a.s);
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(a.v));
			el.dispatchEvent(new Event('input', { bubbles: true }));
		},
		{ s: sel, v }
	);
	await new Promise((r) => setTimeout(r, 200));
};
const fgCss = () => page.evaluate(() => getComputedStyle(document.querySelector('.cs-fg .cs-fill')).backgroundColor);

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1600));

// white base layer — the Paint Bucket's right button uses the background slot
await pickTool('Paint Bucket');
await page.mouse.move(650, 450);
await page.mouse.down({ button: 'right' });
await page.mouse.up({ button: 'right' });
await new Promise((r) => setTimeout(r, 900));

// vivid red, fully opaque
await pickTool('Paintbrush');
const a = await page.evaluate(() => {
	const b = document.querySelector('.fg-picker-area').getBoundingClientRect();
	return { x: b.x, y: b.y, w: b.width, h: b.height };
});
await page.mouse.move(a.x + a.w - 4, a.y + 4);
await page.mouse.down();
await page.mouse.up();
await setSlider('.fg-bright-slider', 50);
await setSlider('.fg-alpha-slider', 0); // transparency 0 -> alpha 255
const fgOpaque = await fgCss();

const stroke = async (y) => {
	await page.mouse.move(420, y);
	await page.mouse.down();
	await page.mouse.move(700, y, { steps: 24 });
	await page.mouse.up();
	await new Promise((r) => setTimeout(r, 500));
};

await stroke(250);

// same colour, half transparency
await setSlider('.fg-alpha-slider', 50);
const fgHalf = await fgCss();
await stroke(520);

// --- sample the two strokes -------------------------------------------------
const clip = await page.evaluate(() => {
	const r = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
});
const buf = await page.screenshot({ clip });
await page.screenshot({ path: `${OUT}alpha-paint.png`, clip });

const sample = await page.evaluate(
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
		const at = (sx, sy) => {
			const x = Math.round(sx - arg.ox);
			const y = Math.round(sy - arg.oy);
			const i = (y * c.width + x) * 4;
			return { r: px[i], g: px[i + 1], b: px[i + 2] };
		};
		return { opaque: at(arg.x, arg.y1), half: at(arg.x, arg.y2), base: at(arg.x, 650) };
	},
	{ data: buf.toString('base64'), ox: clip.x, oy: clip.y, x: 560, y1: 250, y2: 520 }
);

await browser.close();

console.log(`fg opaque        : ${fgOpaque}`);
console.log(`fg half          : ${fgHalf}`);
console.log(`stroke alpha 255 : ${JSON.stringify(sample.opaque)}`);
console.log(`stroke alpha 128 : ${JSON.stringify(sample.half)}`);
console.log(`untouched white  : ${JSON.stringify(sample.base)}`);

const near = (c, r, g, b, tol = 30) => Math.abs(c.r - r) <= tol && Math.abs(c.g - g) <= tol && Math.abs(c.b - b) <= tol;
// white base is (255,255,255); a 50% red over it lands near (255,128,128)
const isRed = near(sample.opaque, 255, 0, 0, 40);
const isBlend = sample.half.g > 70 && sample.half.g < 200 && sample.half.b > 70 && sample.half.b < 200;
const isWhite = near(sample.base, 255, 255, 255, 6);

const checks = [
	['base layer is white', isWhite],
	['alpha 255 paints solid red', isRed],
	['alpha 128 paints a white/red blend', isBlend],
	['the two strokes differ', Math.abs(sample.half.g - sample.opaque.g) > 40]
];
console.log('');
for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
console.log(`\nerrors : ${errors.length ? errors.join(' | ') : 'none'}`);
