// Does Chrome fire a REAL 'paste' event on a NON-EDITABLE page?
// Seeded from the OS clipboard (text via execCommand, image via the async
// Clipboard API) inside a genuine click, then Ctrl+V is driven through CDP so
// it travels the same path a human keystroke does.
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

// Same origin (localhost = secure context) but a bare page: no app listeners.
await page.setContent(`<!doctype html><html><body style="background:#222;color:#eee;font:16px sans-serif">
<button id="b" style="padding:14px;font-size:16px">seed</button>
<button id="other" style="padding:14px;font-size:16px">other focus</button>
<div id="out" style="margin-top:20px">idle</div>
<script>
window.__log = [];
window.__seed = {};
window.addEventListener('paste', (e) => {
  const cd = e.clipboardData;
  window.__log.push({
    phase: 'capture',
    types: cd ? Array.from(cd.types) : null,
    items: cd ? Array.from(cd.items).map((i) => i.kind + '/' + i.type) : null,
    files: cd ? Array.from(cd.files || []).map((f) => f.type + ' ' + f.size + 'B') : null,
    target: e.target ? (e.target.tagName || String(e.target)) : null,
    defaultPrevented: e.defaultPrevented
  });
}, true);
window.addEventListener('paste', (e) => { window.__log.push({ phase: 'bubble' }); }, false);
document.getElementById('b').addEventListener('click', async (ev) => {
  const mode = ev.currentTarget.dataset.mode || 'image';
  try {
    if (mode === 'text') {
      const ta = document.createElement('textarea');
      ta.value = 'hello-from-clipboard';
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      window.__seed = { mode, ok };
    } else {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#ff0000';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#00ff00';
      g.fillRect(0, 0, 32, 32);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      window.__seed = { mode, bytes: blob.size };
    }
    document.getElementById('out').textContent = 'seeded: ' + JSON.stringify(window.__seed);
  } catch (err) {
    window.__seed = { mode, error: String(err) };
    document.getElementById('out').textContent = 'SEED FAIL: ' + String(err);
  }
  document.getElementById('other').focus();
});
</script></body></html>`);

async function ctrlV() {
	const m = 2; // Ctrl
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'rawKeyDown', modifiers: m, key: 'Control', code: 'ControlLeft',
		windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17
	});
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'rawKeyDown', modifiers: m, key: 'v', code: 'KeyV',
		windowsVirtualKeyCode: 86, nativeVirtualKeyCode: 86, text: ''
	});
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'keyUp', modifiers: m, key: 'v', code: 'KeyV',
		windowsVirtualKeyCode: 86, nativeVirtualKeyCode: 86
	});
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'keyUp', modifiers: 0, key: 'Control', code: 'ControlLeft',
		windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17
	});
}

async function run(mode) {
	await page.evaluate((m) => {
		window.__log.length = 0;
		document.getElementById('b').dataset.mode = m;
	}, mode);
	await page.click('#b'); // real mouse click = user gesture
	await new Promise((r) => setTimeout(r, 400));
	// Leave focus on a NON-editable element (a plain div / body), like the app.
	await page.evaluate(() => document.activeElement && document.activeElement.blur());
	await page.mouse.click(700, 600);
	await new Promise((r) => setTimeout(r, 150));
	await ctrlV();
	await new Promise((r) => setTimeout(r, 900));
	const res = await page.evaluate(() => ({
		seed: window.__seed,
		log: window.__log,
		active: document.activeElement ? document.activeElement.tagName : null
	}));
	console.log(`\n=== seeded ${mode} ===`);
	console.log('seed     :', JSON.stringify(res.seed));
	console.log('activeEl :', res.active);
	console.log('pasteLog :', JSON.stringify(res.log, null, 2));
}

await run('text');
await run('image');

await browser.close();
