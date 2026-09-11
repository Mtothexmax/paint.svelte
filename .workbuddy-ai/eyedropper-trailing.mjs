// Edge case: move onto a new pixel and STOP inside the readback throttle
// window — the HUD must still catch up (trailing update).
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
const errors = [];
page.on('console', (m) => {
	if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

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

const clickTool = async (l) => {
	await page.evaluate((x) => document.querySelector(`button[aria-label="${x}"]`)?.click(), l);
	await new Promise((r) => setTimeout(r, 400));
};

const hudText = () =>
	page.evaluate(() => {
		const el = document.querySelector('.probe-hud');
		return el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
	});

// Opaque blue fill, then punch a transparent hole with a rect selection + Delete.
await page.evaluate(async () => {
	const ui = await import('/src/lib/state/ui.ts');
	ui.foregroundColor.set({ r: 59, g: 130, b: 246, a: 255 });
});
await page.mouse.move(640, 440);
await page.keyboard.press('Backspace');
await new Promise((r) => setTimeout(r, 800));

await clickTool('Rectangle Select');
await page.mouse.move(540, 380);
await page.mouse.down();
await page.mouse.move(660, 470, { steps: 10 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 400));
await page.keyboard.press('Delete');
await new Promise((r) => setTimeout(r, 700));
await page.keyboard.press('Escape'); // drop the selection
await new Promise((r) => setTimeout(r, 400));

await clickTool('Color Picker');

// Settle on a transparent pixel.
await page.mouse.move(600, 425);
await new Promise((r) => setTimeout(r, 500));
console.log('on hole (A 0)     :', await hudText());

// Jump to an opaque pixel and STOP immediately (two moves back-to-back, well
// inside the 40 ms readback budget).
await page.mouse.move(760, 560);
await page.mouse.move(765, 565);
await new Promise((r) => setTimeout(r, 250));
console.log('after quick stop  :', await hudText());

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
