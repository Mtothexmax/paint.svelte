import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: false,
	defaultViewport: null,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1400,900']
});
const page = await browser.newPage();
const cdp = await page.target().createCDPSession();
await cdp.send('Browser.grantPermissions', {
	origin: URL,
	permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite']
});
page.on('console', (m) => console.log('  [page]', m.type(), m.text().slice(0, 200)));
page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 300)));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 3000));

const probe = async (label) => {
	const r = await page.evaluate(() => {
		const ta = document.querySelector('textarea[tabindex="-1"]');
		return {
			hasCatcher: !!ta,
			catcherValue: ta ? ta.value : null,
			active: document.activeElement ? document.activeElement.tagName + (document.activeElement.id ? '#' + document.activeElement.id : '') : null,
			activeIsCatcher: ta ? document.activeElement === ta : false,
			docHasFocus: document.hasFocus(),
			visState: document.visibilityState
		};
	});
	console.log(label, JSON.stringify(r));
	return r;
};

await probe('after load  :');
await page.evaluate(() => document.querySelector('textarea[tabindex="-1"]')?.focus({ preventScroll: true }));
await new Promise((r) => setTimeout(r, 200));
await probe('after focus :');

// Can we write to the OS clipboard from evaluate (no click gesture)?
const wr = await page.evaluate(async () => {
	const c = document.createElement('canvas');
	c.width = 40;
	c.height = 40;
	c.getContext('2d').fillRect(0, 0, 40, 40);
	const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
	try {
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
		return { ok: true, bytes: blob.size };
	} catch (e) {
		return { ok: false, error: String(e) };
	}
});
console.log('clipboard.write from evaluate:', JSON.stringify(wr));

await browser.close();
