// Same as paste-probe.mjs but varying the FOCUS TARGET while an IMAGE sits on
// the OS clipboard. Tells us which element must hold focus for Chrome to emit
// a real 'paste' event for image content.
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

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.bringToFront();

await page.setContent(`<!doctype html><html><body style="background:#222;color:#eee;font:16px sans-serif">
<button id="b" style="padding:14px;font-size:16px">seed image</button>
<div id="plain" tabindex="0" style="margin:12px;padding:12px;border:1px solid #888">plain div (tabindex)</div>
<div id="ce" contenteditable="true" style="margin:12px;padding:12px;border:1px solid #0f0;min-height:40px">contenteditable</div>
<textarea id="ta" style="margin:12px;display:block">textarea</textarea>
<div id="out" style="margin-top:20px">idle</div>
<script>
window.__log = [];
window.__seed = {};
window.addEventListener('paste', (e) => {
  const cd = e.clipboardData;
  window.__log.push({
    types: cd ? Array.from(cd.types) : null,
    items: cd ? Array.from(cd.items).map((i) => i.kind + '/' + i.type) : null,
    files: cd ? Array.from(cd.files || []).map((f) => f.type + ' ' + f.size + 'B') : null,
    targetTag: e.target && e.target.tagName,
    targetId: e.target && e.target.id
  });
}, true);
document.getElementById('b').addEventListener('click', async () => {
  try {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ff0000'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#00ff00'; g.fillRect(0, 0, 32, 32);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    window.__seed = { bytes: blob.size };
    document.getElementById('out').textContent = 'seeded ' + blob.size + 'B';
  } catch (err) {
    window.__seed = { error: String(err) };
    document.getElementById('out').textContent = 'SEED FAIL: ' + String(err);
  }
});
window.__focus = (id) => { document.getElementById(id).focus(); };
</script></body></html>`);

async function ctrlV() {
	const m = 2;
	await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', modifiers: m, key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', modifiers: m, key: 'v', code: 'KeyV', windowsVirtualKeyCode: 86, nativeVirtualKeyCode: 86, text: '' });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: m, key: 'v', code: 'KeyV', windowsVirtualKeyCode: 86, nativeVirtualKeyCode: 86 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 0, key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17 });
}

async function seed() {
	await page.evaluate(() => { window.__log.length = 0; });
	await page.click('#b');
	await new Promise((r) => setTimeout(r, 400));
}

async function run(targetId) {
	await seed();
	if (targetId === 'body') await page.evaluate(() => document.activeElement && document.activeElement.blur());
	else await page.evaluate((id) => window.__focus(id), targetId);
	await new Promise((r) => setTimeout(r, 150));
	await ctrlV();
	await new Promise((r) => setTimeout(r, 800));
	const res = await page.evaluate(() => ({
		seed: window.__seed,
		log: window.__log,
		active: document.activeElement ? document.activeElement.id || document.activeElement.tagName : null
	}));
	console.log(`\n=== focus: ${targetId} ===`);
	console.log('seed    :', JSON.stringify(res.seed));
	console.log('activeEl:', res.active);
	console.log('pasteLog:', JSON.stringify(res.log));
}

await run('body');
await run('plain');
await run('ce');
await run('ta');

await browser.close();
