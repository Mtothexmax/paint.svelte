// Capture the bottom status strip mid-drag with the Rectangle Select tool, so
// the three read-outs (image size / selection size / cursor position) are all
// visible at once. Also dumps the strip's text content for a machine check.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const TAG = process.argv[3] ?? 'before';
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

await page.evaluate(() => document.querySelector('button[aria-label="Rectangle Select"]')?.click());
await new Promise((r) => setTimeout(r, 350));

// Drag a marquee and screenshot WHILE the button is still down.
await page.mouse.move(560, 400);
await page.mouse.down();
await page.mouse.move(760, 540, { steps: 12 });
await new Promise((r) => setTimeout(r, 500));

const strip = await page.$('.status-strip');
await strip.screenshot({ path: `${OUT}statusbar-${TAG}.png` });

// Zoomed crop of just the read-outs, for eyeballing the icons.
const box = await strip.boundingBox();
await page.screenshot({
	path: `${OUT}statusbar-${TAG}-zoom.png`,
	clip: { x: box.x + 60, y: box.y, width: 470, height: box.height }
});

const info = await page.evaluate(() => {
	const strip = document.querySelector('.status-strip');
	const icons = [...strip.querySelectorAll('.sb-ic')].map((n) => {
		const svg = n.querySelector('svg');
		return {
			cls: n.className,
			fill: svg ? getComputedStyle(svg).fill : null,
			w: svg ? Math.round(svg.getBoundingClientRect().width) : null
		};
	});
	return {
		text: (strip.textContent ?? '').replace(/\s+/g, ' ').trim(),
		iconCount: icons.length,
		icons
	};
});

await page.mouse.up();
await browser.close();

console.log(`tag              : ${TAG}`);
console.log(`strip text       : ${info.text}`);
console.log(`icons found      : ${info.iconCount}`);
for (const i of info.icons) console.log(`  icon           : ${i.cls} fill=${i.fill} w=${i.w}`);
console.log(`errors           : ${errors.length ? errors.join(' | ') : 'none'}`);
