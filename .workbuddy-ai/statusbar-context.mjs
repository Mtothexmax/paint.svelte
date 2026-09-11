// Presentation shot: the app mid-drag with a selection marquee on the canvas,
// cropped so the status read-outs sit next to what they describe.
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

// Paint a colourful band so the marquee has something to sit on.
await page.evaluate(() => {
	const swatch = [...document.querySelectorAll('button')].find((b) =>
		(b.getAttribute('title') ?? '').toLowerCase().includes('blue')
	);
	swatch?.click();
});
await page.evaluate(() => document.querySelector('button[aria-label="Paint Bucket"]')?.click());
await page.mouse.move(700, 450);
await page.mouse.down();
await page.mouse.up();
await new Promise((r) => setTimeout(r, 700));

await page.evaluate(() => document.querySelector('button[aria-label="Rectangle Select"]')?.click());
await new Promise((r) => setTimeout(r, 350));
await page.mouse.move(560, 400);
await page.mouse.down();
await page.mouse.move(760, 540, { steps: 12 });
await new Promise((r) => setTimeout(r, 500));

await page.screenshot({
	path: `${OUT}statusbar-context.png`,
	clip: { x: 0, y: 590, width: 900, height: 310 }
});
await page.mouse.up();
await browser.close();
console.log('statusbar-context.png written');
