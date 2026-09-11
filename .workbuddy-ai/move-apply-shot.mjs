// Screenshot the options strip with the Move tool's Apply / Cancel buttons,
// both idle (disabled) and with a floating transform (enabled).
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

const clickTool = async (label) => {
	await page.evaluate((l) => document.querySelector(`button[aria-label="${l}"]`)?.click(), label);
	await new Promise((r) => setTimeout(r, 350));
};

await clickTool('Rectangle Select');
await page.mouse.move(560, 400);
await page.mouse.down();
await page.mouse.move(760, 540, { steps: 12 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 400));

await clickTool('Move Selected Pixels');
await page.evaluate(() => {
	const b = [...document.querySelectorAll('.seg-btn')].find((x) => (x.textContent ?? '').includes('Rotate'));
	b?.click();
});
await new Promise((r) => setTimeout(r, 400));

const strip = await page.$('.options-strip');
await strip.screenshot({ path: OUT + 'move-apply-idle.png' });

// Lift the pixels so the buttons enable.
await page.mouse.move(660, 470);
await page.mouse.down();
await page.mouse.move(710, 505, { steps: 10 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 600));
await strip.screenshot({ path: OUT + 'move-apply-lifted.png' });

console.log('screenshots written');
await browser.close();
