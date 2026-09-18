// Screenshot each of the four migrated effect dialogs, so the XY pad / dial
// layout can be eyeballed.  Output: .workbuddy-ai/fx-<leaf>.png
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
// A Vite full-reload destroys the execution context mid-run, which surfaces as
// "Execution context was destroyed, most likely because of a navigation". Log
// navigations so the cause is visible rather than mysterious.
page.on('framenavigated', (f) => console.log(`  [nav] ${f.url()}`));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Wait for the shell instead of a fixed delay: a cold Vite build can be slow.
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
// Absorb any full-reload Vite has queued from recent source edits. Without this
// the reload lands in the middle of the loop and kills the execution context
// ("Execution context was destroyed, most likely because of a navigation").
await new Promise((r) => setTimeout(r, 2500));
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickByText = async (t) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await sleep(450);
};

const openEffect = async (sub, leaf) => {
	await page.evaluate(() => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
	});
	await sleep(250);
	await page.evaluate((s) => {
		[...document.querySelectorAll('.menu-panel .menu-item')].find((b) => b.textContent.includes(s))?.click();
	}, sub);
	await sleep(300);
	await page.evaluate((l) => {
		[...document.querySelectorAll('.sub-panel .menu-item')].find((x) => x.textContent.includes(l))?.click();
	}, leaf);
	for (let i = 0; i < 40; i++) {
		if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) break;
		await sleep(150);
	}
	await sleep(400);
};

// a document is needed before the effects menu will do anything useful
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1800);

for (const [sub, leaf] of [
	['Blurs', 'Zoom Blur'],
	['Blurs', 'Rotary Blur'],
	['Blurs', 'Radial Blur'],
	['Blurs', 'Motion Blur'],
	['Distort', 'Twist'],
	['Distort', 'Polar Inversion'],
	['Distort', 'Bulge'],
	['Distort', 'Warp'],
	['Distort', 'Smudge'],
	['Render', 'Julia Fractal'],
	['Object', 'Drop Shadow'],
	['Object', 'Outline'],
	['Stylize', 'Emboss'],
	['Stylize', 'Relief'],
	['Object', 'Bevel']
]) {
	await openEffect(sub, leaf);
	const box = await page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		if (!d) return null;
		const r = d.getBoundingClientRect();
		return {
			x: Math.max(0, Math.round(r.x) - 8),
			y: Math.max(0, Math.round(r.y) - 8),
			width: Math.round(r.width) + 16,
			height: Math.round(r.height) + 16
		};
	});
	if (!box) {
		console.log(`MISS ${leaf}: no dialog`);
		continue;
	}
	const file = `${OUT}fx-${leaf.toLowerCase().replace(/\s+/g, '-')}.png`;
	await page.screenshot({ path: file, clip: box });
	console.log(`shot  ${leaf.padEnd(12)} -> ${file.split('/').pop()}  ${box.width}x${box.height}`);
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(400);
}

await browser.close();
