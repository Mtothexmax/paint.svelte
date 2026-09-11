// Real-clipboard paste test: writes a genuine PNG to the OS clipboard from
// inside the page, then sends a REAL Ctrl+V (not a synthetic ClipboardEvent).
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
// Headless refuses the high-level clipboard permission, so grant it over CDP.
{
	const cdp = await page.target().createCDPSession();
	await cdp.send('Browser.grantPermissions', {
		origin: URL,
		permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite']
	});
}
await page.setViewport({ width: 1400, height: 900 });
await page.bringToFront();

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const clickByText = async (text) => {
	const ok = await page.evaluate((t) => {
		const b = [...document.querySelectorAll('button')].find((x) => (x.textContent ?? '').includes(t));
		if (!b) return false;
		b.click();
		return true;
	}, text);
	if (!ok) throw new Error('button not found: ' + text);
	await new Promise((r) => setTimeout(r, 300));
};

// Small canvas so we can also distinguish "fits" vs "oversize".
await clickByText('New…');
await new Promise((r) => setTimeout(r, 500));
await clickByText('SVGA');
await new Promise((r) => setTimeout(r, 300));
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1500));

const layerCount = () => page.evaluate(() => document.querySelectorAll('[class*=layer-]').length);
const dialogOpen = () => page.evaluate(() => !!document.querySelector('.m-dialog'));

/** Puts a real PNG on the OS clipboard (what Paint.NET effectively does). */
const putOnClipboard = (w, h) =>
	page.evaluate(
		async ({ w, h }) => {
			const c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			const ctx = c.getContext('2d');
			ctx.fillStyle = '#ff0000';
			ctx.fillRect(0, 0, 64, 64);
			ctx.fillStyle = '#00ff00';
			ctx.fillRect(w - 64, h - 64, 64, 64);
			ctx.fillStyle = 'rgba(0,0,255,0.5)';
			ctx.fillRect(64, 64, w - 128, h - 128);
			const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
			return blob.size;
		},
		{ w, h }
	);

const realPaste = async () => {
	await page.keyboard.down('Control');
	await page.keyboard.press('KeyV');
	await page.keyboard.up('Control');
	await new Promise((r) => setTimeout(r, 1200));
};

// --- TEST 1: fresh session, nothing in the internal clipboard --------------
const b1 = await layerCount();
const size1 = await putOnClipboard(1000, 700); // bigger than 800x600 -> dialog
console.log('clipboard PNG bytes:', size1);
await realPaste();
const d1 = await dialogOpen();
const a1 = await layerCount();
console.log(`TEST1 (no internal copy): dialogOpen=${d1}  layers ${b1} -> ${a1}`);

// answer the dialog if it opened
if (d1) {
	await page.evaluate(() => {
		[...document.querySelectorAll('.pd-choice')].find((x) => x.textContent.includes('Keep'))?.click();
	});
	await new Promise((r) => setTimeout(r, 800));
}

// --- TEST 2: after copying INSIDE the app (internal clipboard non-empty) ---
// Select all + copy so hasClipboardImage() becomes true.
await page.keyboard.down('Control');
await page.keyboard.press('KeyA');
await page.keyboard.up('Control');
await new Promise((r) => setTimeout(r, 400));
await page.keyboard.down('Control');
await page.keyboard.press('KeyC');
await page.keyboard.up('Control');
await new Promise((r) => setTimeout(r, 900));
console.log('internal copy done');

const b2 = await layerCount();
await putOnClipboard(1000, 700);
await realPaste();
const d2 = await dialogOpen();
const a2 = await layerCount();
console.log(`TEST2 (internal clipboard NON-empty): dialogOpen=${d2}  layers ${b2} -> ${a2}`);
console.log('  -> if dialogOpen=false and layers unchanged, Ctrl+V was swallowed by the internal clipboard');

console.log('console errors:', errors.length ? JSON.stringify(errors.slice(0, 8), null, 1) : 'none');
await page.screenshot({ path: '.workbuddy-ai/paste-real.png' });
await browser.close();
