// Diagnostic: what actually arrives at the window 'paste' event on a REAL
// Ctrl+V, and does the app's handler see an image?
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// HEADED: headless Chrome never emits a real 'paste' event from Ctrl+V, so the
// native paste chain can only be exercised in a real window.
const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: false,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1400,900']
});
const page = await browser.newPage();
{
	const cdp = await page.target().createCDPSession();
	await cdp.send('Browser.grantPermissions', {
		origin: URL,
		permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite']
	});
}
await page.setViewport({ width: 1400, height: 900 });
await page.bringToFront();

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));

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

await clickByText('New…');
await new Promise((r) => setTimeout(r, 500));
await clickByText('SVGA');
await new Promise((r) => setTimeout(r, 300));
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1500));

// Capture-phase probe installed BEFORE the app's handler runs.
await page.evaluate(() => {
	window.__pasteLog = [];
	window.addEventListener(
		'paste',
		(e) => {
			const dt = e.clipboardData;
			const items = dt ? Array.from(dt.items) : [];
			window.__pasteLog.push({
				phase: 'capture',
				types: dt ? Array.from(dt.types) : null,
				items: items.map((i) => ({ kind: i.kind, type: i.type })),
				hasFiles: dt ? dt.files.length : -1,
				target: e.target?.tagName + '.' + (e.target?.className || '')
			});
		},
		true
	);
	// Bubble-phase probe installed AFTER (runs after the app's handler).
	window.addEventListener('paste', (e) => {
		window.__pasteLog.push({ phase: 'bubble', defaultPrevented: e.defaultPrevented });
	});
});

const putOnClipboard = (w, h) =>
	page.evaluate(
		async ({ w, h }) => {
			const c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			const ctx = c.getContext('2d');
			ctx.fillStyle = '#ff0000';
			ctx.fillRect(0, 0, 64, 64);
			ctx.fillStyle = 'rgba(0,0,255,0.5)';
			ctx.fillRect(64, 64, w - 128, h - 128);
			const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
			return blob.size;
		},
		{ w, h }
	);

console.log('clipboard bytes:', await putOnClipboard(1000, 700));

// Also ask the browser what IT thinks is on the clipboard right now.
const readBack = await page.evaluate(async () => {
	try {
		const items = await navigator.clipboard.read();
		return items.map((i) => Array.from(i.types));
	} catch (err) {
		return 'read failed: ' + err.message;
	}
});
console.log('navigator.clipboard.read() types:', JSON.stringify(readBack));

await page.keyboard.down('Control');
await page.keyboard.press('KeyV');
await page.keyboard.up('Control');
await new Promise((r) => setTimeout(r, 1500));

const log = await page.evaluate(() => window.__pasteLog);
console.log('PASTE EVENT LOG:', JSON.stringify(log, null, 1));
console.log('dialog open:', await page.evaluate(() => !!document.querySelector('.m-dialog')));
console.log('logs:', JSON.stringify(logs.slice(0, 10), null, 1));

await browser.close();
