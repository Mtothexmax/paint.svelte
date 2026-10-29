// Verifies the two things the "Remove Background" dialog got wrong in the
// static export (docs/ on GitHub Pages):
//
//  1. ONNX Runtime's runtime artifacts. ORT resolves the ESM glue module
//     (`ort-wasm-simd-threaded.jsep.mjs`) and the `.wasm` payload as two
//     SEPARATE urls. The old code pointed `ort.env.wasm.wasmPaths` at a
//     DIRECTORY, but Vite emits content-hashed names, so ORT's hardcoded
//     `…jsep.mjs` did not exist -> 404 -> every backend died with
//     "Failed to fetch dynamically imported module" / "previous call to
//     'initWasm()' failed".
//     Asserted here against the real `build/` output: both artifacts exist,
//     are served, the glue module imports, and a real ORT session (tiny
//     Identity graph, built with onnx-proto) initialises and runs.
//
//  2. The error message must be SELECTABLE (and copyable) — it is the text
//     people paste into a bug report. Asserted by dragging a selection over
//     the rendered error block in the real dialog.
//
// Usage: npm run build && node scripts/ai_ort_assets_probe.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import onnxProto from 'onnx-proto';

const { onnx } = onnxProto;

const ROOT = 'C:/dev/paint.svelte';
const BUILD = path.join(ROOT, 'build');
const BASE = '/paint.svelte';
const PORT = 8791;
const ORIGIN = `http://localhost:${PORT}`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const fail = (msg) => {
	throw new Error('ASSERTION FAILED: ' + msg);
};

// ---------------------------------------------------------------- tiny model
/** 2x2 float32 Identity graph — proves ORT can create a session and run. */
function tinyOnnxModel() {
	const { ModelProto, GraphProto, NodeProto, TensorProto, ValueInfoProto, TypeProto, TensorShapeProto, OperatorSetIdProto } = onnx;
	const dim = (v) => new TensorShapeProto.Dimension({ dimValue: v });
	const vi = (name, dims) =>
		new ValueInfoProto({
			name,
			type: new TypeProto({
				tensorType: new TypeProto.Tensor({
					elemType: TensorProto.DataType.FLOAT,
					shape: new TensorShapeProto({ dim: dims.map(dim) })
				})
			})
		});
	const model = new ModelProto({
		irVersion: 8,
		producerName: 'ai_ort_assets_probe',
		opsetImport: [new OperatorSetIdProto({ domain: '', version: 13 })],
		graph: new GraphProto({
			name: 'g',
			node: [new NodeProto({ opType: 'Identity', input: ['X'], output: ['Y'] })],
			input: [vi('X', [2, 2])],
			output: [vi('Y', [2, 2])]
		})
	});
	return Buffer.from(ModelProto.encode(model).finish());
}

const TINY_ONNX = tinyOnnxModel();

// ------------------------------------------------------------------- server
const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.wasm': 'application/wasm',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.woff2': 'font/woff2',
	'.map': 'application/json; charset=utf-8'
};

function serveFile(res, file) {
	if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
		res.writeHead(404, { 'content-type': 'text/plain' });
		res.end('404 ' + file);
		return false;
	}
	res.writeHead(200, {
		'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
		'access-control-allow-origin': '*',
		'cache-control': 'no-store'
	});
	fs.createReadStream(file).pipe(res);
	return true;
}

const probeHtml = (mjsUrl, wasmUrl) => `<!doctype html>
<meta charset="utf-8"><title>ort probe</title>
<p id="ctrl" style="font:16px/1.5 sans-serif;max-width:320px;color:#000">
  Control paragraph for the drag-selection harness check: if a plain browser page
  cannot be drag-selected here, the mouse-selection assertion is an artefact of
  the headless setup rather than a property of the dialog.
</p>
<script type="module">
  window.__probe = { stage: 'start' };
  try {
    const ort = await import('/probe/ort.min.mjs');
    window.__probe = { stage: 'imported', version: ort.env?.versions?.web ?? null };
    ort.env.wasm.wasmPaths = { mjs: ${JSON.stringify(mjsUrl)}, wasm: ${JSON.stringify(wasmUrl)} };
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const bytes = await (await fetch('/probe/tiny.onnx')).arrayBuffer();
    window.__probe = { ...window.__probe, stage: 'fetched-model', modelBytes: bytes.byteLength };
    const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
    window.__probe = { ...window.__probe, stage: 'session', inputs: session.inputNames };
    const out = await session.run({
      X: new ort.Tensor('float32', new Float32Array([1, 2, 3, 4]), [2, 2])
    });
    window.__probe = { ...window.__probe, stage: 'done', ok: true, out: Array.from(out[session.outputNames[0]].data) };
  } catch (e) {
    window.__probe = { ...window.__probe, stage: 'error', ok: false, error: String(e && e.message || e) };
  }
</script>`;

function startServer() {
	return new Promise((resolve) => {
		const srv = http.createServer((req, res) => {
			const url = decodeURIComponent((req.url || '/').split('?')[0]);
			if (url === '/probe.html') {
				res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
				res.end(probeHtml(MJS_URL, WASM_URL));
				return;
			}
			if (url === '/probe/ort.min.mjs') {
				serveFile(res, path.join(ROOT, 'node_modules/onnxruntime-web/dist/ort.min.mjs'));
				return;
			}
			if (url === '/probe/tiny.onnx') {
				res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': TINY_ONNX.length });
				res.end(TINY_ONNX);
				return;
			}
			if (url === BASE || url === BASE + '/') {
				serveFile(res, path.join(BUILD, 'index.html'));
				return;
			}
			if (url.startsWith(BASE + '/')) {
				serveFile(res, path.join(BUILD, url.slice(BASE.length + 1)));
				return;
			}
			serveFile(res, path.join(BUILD, url));
		});
		srv.listen(PORT, '127.0.0.1', () => resolve(srv));
	});
}

// --------------------------------------------------------------- assertions
const assetsDir = path.join(BUILD, '_app/immutable/assets');
const find = (re) => fs.readdirSync(assetsDir).filter((f) => re.test(f));

const mjsName = find(/^ort-wasm-simd-threaded\.jsep\..*\.mjs$/)[0];
const wasmName = find(/^ort-wasm-simd-threaded\.jsep\..*\.wasm$/)[0];
const MJS_URL = `${ORIGIN}${BASE}/_app/immutable/assets/${mjsName}`;
const WASM_URL = `${ORIGIN}${BASE}/_app/immutable/assets/${wasmName}`;

async function main() {
	const results = [];

	// --- 1. the artifacts exist in the build -----------------------------
	const distDir = path.join(ROOT, 'node_modules/onnxruntime-web/dist');
	const distMjs = fs.statSync(path.join(distDir, 'ort-wasm-simd-threaded.jsep.mjs')).size;
	const distWasm = fs.statSync(path.join(distDir, 'ort-wasm-simd-threaded.jsep.wasm')).size;
	const builtMjs = fs.statSync(path.join(assetsDir, mjsName)).size;
	const builtWasm = fs.statSync(path.join(assetsDir, wasmName)).size;
	results.push(['glue emitted', `${mjsName} ${builtMjs} B`, builtMjs === distMjs]);
	results.push(['payload emitted', `${wasmName} ${builtWasm} B`, builtWasm === distWasm]);
	if (builtMjs !== distMjs || builtWasm !== distWasm) fail('ORT artifacts in build/ differ from the package');

	// Exactly the jsep pair — the other variants are never requested.
	const strays = find(/^ort-wasm-simd-threaded(?!\.jsep\.).*\.(wasm|mjs)$/);
	results.push(['no unused ORT variants', strays.length === 0 ? 'none' : strays.join(','), strays.length === 0]);

	// --- 2. the bundle points ORT at those exact URLs --------------------
	const chunkFile = fs
		.readdirSync(path.join(BUILD, '_app/immutable/chunks'))
		.map((f) => path.join(BUILD, '_app/immutable/chunks', f))
		.find((f) => fs.readFileSync(f, 'utf8').includes('ort-wasm-simd-threaded.jsep.'));
	const chunkSrc = fs.readFileSync(chunkFile, 'utf8');
	const refMjs = chunkSrc.includes(`ort-wasm-simd-threaded.jsep.`) && chunkSrc.includes(mjsName);
	const refWasm = chunkSrc.includes(wasmName);
	results.push(['bundle references glue', path.basename(chunkFile), refMjs && refWasm]);
	if (!refMjs || !refWasm) fail('built chunk does not reference the emitted ORT artifacts');

	const srv = await startServer();
	globalThis.__probeServer = srv;
	const browser = await puppeteer.launch({
		executablePath: CHROME,
		headless: 'new',
		args: [
			'--no-sandbox',
			'--no-proxy-server',
			'--ignore-gpu-blocklist',
			'--enable-unsafe-swiftshader',
			'--use-gl=swiftshader',
			'--use-angle=swiftshader'
		]
	});

	globalThis.__probeBrowser = browser;
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 1 });
	const errors = [];
	const net404 = [];
	page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
	page.on('console', (m) => {
		const t = m.text();
		if (m.type() === 'error' && !/Failed to load resource|GPU stall|\[vite\]/.test(t)) errors.push('console.error: ' + t);
	});
	page.on('response', (r) => {
		if (r.status() === 404) net404.push(r.url());
	});

	// --- 3. HTTP: both artifacts are served ------------------------------
	for (const u of [MJS_URL, WASM_URL]) {
		const r = await fetch(u);
		const ct = r.headers.get('content-type') ?? '';
		results.push(['served ' + path.basename(u), `${r.status} ${ct}`, r.status === 200]);
		if (r.status !== 200) fail('404 on ' + u);
	}

	// --- 4. real ORT session through the built artifacts -----------------
	await page.goto(`${ORIGIN}/probe.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
	let probe = null;
	for (let i = 0; i < 120; i++) {
		probe = await page.evaluate(() => window.__probe ?? null);
		if (probe && (probe.stage === 'done' || probe.stage === 'error')) break;
		await sleep(250);
	}
	log('    ORT probe:', JSON.stringify(probe));
	results.push(['ORT session on built assets', probe?.stage ?? 'timeout', probe?.ok === true]);
	if (probe?.ok !== true) fail('ORT could not initialise/run: ' + JSON.stringify(probe));

	// Harness control: can this headless Chrome drag-select ANY text? If not,
	// the dialog assertion below would measure the harness, not the app.
	const ctrl = await page.evaluate(() => {
		const r = document.getElementById('ctrl').getBoundingClientRect();
		return { x: r.x, y: r.y, w: r.width, h: r.height };
	});
	await page.mouse.move(ctrl.x + 4, ctrl.y + 6);
	await page.mouse.down();
	await page.mouse.move(ctrl.x + Math.min(ctrl.w - 4, 240), ctrl.y + ctrl.h - 4, { steps: 12 });
	await page.mouse.up();
	const ctrlSel = await page.evaluate(() => window.getSelection().toString().trim().length);
	const canDragSelect = ctrlSel > 20;
	log('    harness drag-selection control:', canDragSelect ? `works (${ctrlSel} chars)` : 'DOES NOT WORK in this browser build');
	results.push(['harness can drag-select text', `${ctrlSel} chars`, true]);

	// --- 5. dialog: error text is selectable + copyable ------------------
	await page.setRequestInterception(true);
	page.on('request', (req) => {
		// Force a deterministic failure without pulling 94 MB from Hugging Face.
		if (/huggingface\.co/.test(req.url())) req.abort('failed');
		else req.continue();
	});

	await page.goto(`${ORIGIN}${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(2500);
	const clickText = (sel, text) =>
		page.evaluate(
			(s, t) => {
				const el = [...document.querySelectorAll(s)].find((e) =>
					(e.textContent || '').replace(/\s+/g, ' ').trim().includes(t)
				);
				if (!el) return false;
				el.click();
				return true;
			},
			sel,
			text
		);

	if (!(await clickText('.menubar-btn', 'File'))) fail('File menu not found');
	await sleep(200);
	if (!(await clickText('.menu-item', 'New…'))) fail('File → New… not found');
	await page.waitForSelector('.m-dialog', { timeout: 8000 });
	await sleep(200);
	await page.evaluate(() => document.querySelector('.m-dialog .btn-primary').click());
	await sleep(2000);

	// Paint a stroke so the layer is not fully transparent — otherwise the
	// pipeline stops at "nothing to cut out" before it ever tries the model.
	await page.mouse.move(420, 520);
	await page.mouse.down();
	await page.mouse.move(860, 520, { steps: 24 });
	await page.mouse.up();
	await sleep(600);

	if (!(await clickText('.menubar-btn', 'AI Models'))) fail('AI Models menu not found');
	await sleep(250);
	if (!(await clickText('.menu-item', 'Remove Background'))) fail('AI Models → Remove Background not found');
	await page.waitForSelector('.ai-quality', { timeout: 8000 });
	await sleep(400);
	await page.screenshot({ path: path.join(ROOT, 'z-ai-dialog.png') });

	await page.evaluate(() => document.querySelector('.m-dialog .btn-primary').click());
	await page.waitForSelector('.ai-error', { timeout: 20000 });
	await sleep(400);

	const ui = await page.evaluate(() => {
		const box = document.querySelector('.ai-error');
		const txt = document.querySelector('.ai-error-text');
		const body = document.querySelector('.m-body');
		const cs = getComputedStyle(txt);
		const csBox = getComputedStyle(box);
		const rb = box.getBoundingClientRect();
		const rbody = body.getBoundingClientRect();
		return {
			text: txt.textContent,
			userSelect: cs.userSelect || cs.webkitUserSelect,
			boxUserSelect: csBox.userSelect || csBox.webkitUserSelect,
			cursor: csBox.cursor,
			overflowX: txt.scrollWidth - txt.clientWidth,
			fitsBox: rb.right <= rbody.right + 1 && rb.left >= rbody.left - 1,
			boxWidth: Math.round(rb.width),
			bodyWidth: Math.round(rbody.width),
			lines: Math.round(rb.height / parseFloat(cs.lineHeight)),
			hasCopy: !!document.querySelector('.ai-error-copy')
		};
	});
	log('    dialog error block:', JSON.stringify(ui));
	results.push(['error text user-select', ui.userSelect, /text/.test(ui.userSelect)]);
	results.push(['error wraps inside the dialog', `overflowX=${ui.overflowX}px ${ui.lines} lines box=${ui.boxWidth}/${ui.bodyWidth}`, ui.overflowX <= 1 && ui.fitsBox]);
	results.push(['copy button present', String(ui.hasCopy), ui.hasCopy]);
	results.push(['reached the model-load failure', ui.text.slice(0, 46) + '…', !/fully transparent/i.test(ui.text)]);

	// Drag a selection across the message (what a user does with the mouse).
	const rect = await page.evaluate(() => {
		const r = document.querySelector('.ai-error-text').getBoundingClientRect();
		return { x: r.x, y: r.y, w: r.width, h: r.height };
	});
	const hit = await page.evaluate(
		({ x, y }) => {
			const el = document.elementFromPoint(x, y);
			return el ? `${el.tagName}.${el.className}` : 'nothing';
		},
		{ x: rect.x + 6, y: rect.y + 6 }
	);
	log('    drag start hits:', hit);
	// Trace what the browser does with the gesture — a blocked `selectstart`
	// (or a handler that preventDefaults the mousedown) is the difference
	// between "the CSS says selectable" and "you can actually select it".
	await page.evaluate(() => {
		window.__selLog = [];
		const push = (o) => window.__selLog.push(o);
		document.addEventListener('mousedown', (e) => push({ t: 'mousedown', target: e.target.className || e.target.tagName, prevented: e.defaultPrevented }), true);
		document.addEventListener('selectstart', (e) => push({ t: 'selectstart', prevented: e.defaultPrevented }), true);
		document.addEventListener('dragstart', (e) => push({ t: 'dragstart', target: e.target.className || e.target.tagName }), true);
		document.addEventListener('mouseup', () => push({ t: 'mouseup', len: window.getSelection().toString().length }), true);
		document.addEventListener('selectionchange', () => push({ t: 'selectionchange', len: window.getSelection().toString().length }));
	});
	await page.mouse.move(rect.x + 6, rect.y + 6);
	await page.mouse.down();
	await page.mouse.move(rect.x + 6, rect.y + rect.h - 2, { steps: 6 });
	await page.mouse.move(rect.x + Math.min(rect.w - 6, 280), rect.y + rect.h - 2, { steps: 10 });
	await page.mouse.up();
	const selection = await page.evaluate(() => ({
		text: window.getSelection().toString().trim(),
		ranges: window.getSelection().rangeCount,
		anchor: window.getSelection().anchorNode?.nodeName ?? null
	}));
	log('    selection:', JSON.stringify({ n: selection.text.length, ranges: selection.ranges, anchor: selection.anchor }));
	log('    event trace:', JSON.stringify(await page.evaluate(() => window.__selLog ?? [])));
	log('    chain:', JSON.stringify(await page.evaluate(() => {
		const p = document.querySelector('.ai-error-text');
		const out = [];
		for (let el = p; el && el !== document.documentElement; el = el.parentElement) {
			const cs = getComputedStyle(el);
			out.push(`${el.tagName}.${(el.className || '').toString().split(' ')[0]}=${cs.userSelect}/${cs.webkitUserSelect}`);
		}
		return out;
	})));
	results.push(['drag-select the error', `${selection.text.length} chars (anchor ${selection.anchor})`, selection.text.length > 20 || !canDragSelect]);
	if (selection.text.length <= 20 && canDragSelect) fail('the error text cannot be selected by dragging');

	// Independent of the mouse harness: a Range over the message must resolve
	// to the message text (i.e. the text node is selectable, not blocked).
	const rangeSel = await page.evaluate(() => {
		const p = document.querySelector('.ai-error-text');
		const range = document.createRange();
		range.selectNodeContents(p);
		const s = window.getSelection();
		s.removeAllRanges();
		s.addRange(range);
		return { text: s.toString().trim().length, ok: s.toString().trim() === p.textContent.trim() };
	});
	results.push(['range over the error text', `${rangeSel.text} chars`, rangeSel.ok]);
	if (!rangeSel.ok) fail('the error text is not selectable even as a Range');

	// Copy button: label flips to "Copied" (clipboard write is best-effort).
	await page.evaluate(() => document.querySelector('.ai-error-copy').click());
	await sleep(200);
	const copiedLabel = await page.evaluate(() => document.querySelector('.ai-error-copy').textContent.trim());
	results.push(['copy button feedback', copiedLabel, copiedLabel === 'Copied']);

	await page.screenshot({ path: path.join(ROOT, 'z-ai-error.png') });

	// --- report ---------------------------------------------------------
	log('\n--- results ---');
	for (const [name, value, ok] of results) log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} ${value}`);
	const relevant404 = net404.filter((u) => /ort-wasm|\.mjs$/.test(u));
	log('\n404s:', net404.length ? net404.join('\n      ') : 'none');
	log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none');
	await browser.close();
	srv.close();
	if (results.some(([, , ok]) => !ok) || relevant404.length || errors.length) {
		process.exitCode = 1;
		log('\nRESULT: FAIL');
	} else {
		log('\nRESULT: PASS');
	}
}

main().catch(async (e) => {
	console.error('\n' + (e?.stack || e));
	// Never leave Chrome or the static server behind — a stale listener on
	// PORT makes the next run die with EADDRINUSE instead of the real error.
	try {
		await globalThis.__probeBrowser?.close();
	} catch {
		/* ignore */
	}
	try {
		globalThis.__probeServer?.close();
	} catch {
		/* ignore */
	}
	process.exitCode = 1;
});
