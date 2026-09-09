// Reproduces the user's exact flow: File→New, optionally paint a stroke, wait
// D ms, close the browser tab (Ctrl+W / page.close), reopen a fresh tab
// (Ctrl+Shift+T / new page), then check whether the created image (and its
// painted pixels) were restored from IndexedDB.
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function clickByText(page, sel, t) {
	const ok = await page.evaluate(
		(s, text) => {
			const el = [...document.querySelectorAll(s)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(text));
			if (!el) return false;
			el.click();
			return true;
		},
		sel,
		t
	);
	if (!ok) throw new Error('click failed ' + sel + ' ' + t);
}

async function idbRecords(page) {
	return page.evaluate(async () => {
		const db = await new Promise((res, rej) => {
			const r = indexedDB.open('paint.svelte');
			r.onsuccess = () => res(r.result);
			r.onerror = () => rej(r.error);
		});
		const tx = db.transaction('documents', 'readonly');
		const req = tx.objectStore('documents').getAll();
		const records = await new Promise((res) => (req.onsuccess = () => res(req.result)));
		db.close();
		return records.map((rec) => ({
			name: rec.name,
			w: rec.width,
			h: rec.height,
			layers: rec.layers.length,
			active: rec.active,
			pngBytes: rec.layers.map((l) => l.png.size),
			dirty: rec.dirty
		}));
	});
}

/** Counts non-transparent pixels of the ACTIVE doc's top layer surface. */
async function opaquePixels(page) {
	return page.evaluate(async () => {
		const [{ getEditorRenderer }, { surfaceToPngBlob }] = await Promise.all([
			await import('/src/lib/render/EditorRenderer.ts'),
			await import('/src/lib/render/export.ts')
		]);
		const doc = window.__REGISTRY__?.active;
		if (!doc) return { count: -1, w: 0, h: 0 };
		const renderer = getEditorRenderer();
		const layer = doc.layers[doc.layers.length - 1];
		const blob = await surfaceToPngBlob(renderer, layer.surfaceId, doc.width, doc.height);
		const bmp = await createImageBitmap(blob);
		const c = document.createElement('canvas');
		c.width = bmp.width;
		c.height = bmp.height;
		const ctx = c.getContext('2d');
		ctx.drawImage(bmp, 0, 0);
		const d = ctx.getImageData(0, 0, c.width, c.height).data;
		let n = 0;
		for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) n++;
		const dims = { w: bmp.width, h: bmp.height };
		bmp.close();
		return { count: n, ...dims };
	});
}

/** Drags the default brush across the canvas centre, then waits for commit. */
async function paintStroke(page) {
	const rect = await page.evaluate(() => {
		const canvas = document.querySelector('canvas.editor') || document.querySelector('main canvas') || document.querySelector('canvas');
		if (!canvas) return null;
		const h = canvas.parentElement.getBoundingClientRect();
		return { x: h.x, y: h.y, w: h.width, h: h.height };
	});
	if (!rect) throw new Error('no canvas element to paint on');
	const x0 = rect.x + rect.w * 0.4;
	const y0 = rect.y + rect.h * 0.5;
	const x1 = rect.x + rect.w * 0.6;
	const y1 = rect.y + rect.h * 0.5;
	await page.mouse.move(x0, y0);
	await sleep(50);
	await page.mouse.down();
	await sleep(50);
	// Several small segments so the brush engine commits a real stroke.
	for (let i = 1; i <= 8; i++) {
		await page.mouse.move(x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8, { steps: 2 });
		await sleep(20);
	}
	await page.mouse.up();
	await sleep(500); // commit + history + notifyChange
}

async function run(it, delayMs, paint) {
	const browser = await puppeteer.launch({
		executablePath: CHROME,
		headless: 'new',
		args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
	page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
	// Simulate the reported real-browser bug: a PRE-EXISTING database from an
	// older build whose store has no key generator (out-of-line, no
	// autoIncrement) — future writes would then fail with DataError.
	if (process.env.LEGACY === '1') {
		await page.evaluateOnNewDocument(() => {
			const openLegacy = () =>
				new Promise((res) => {
					const r = indexedDB.open('paint.svelte', 2);
					r.onupgradeneeded = () => {
						const db = r.result;
						if (db.objectStoreNames.contains('documents')) db.deleteObjectStore('documents');
						db.createObjectStore('documents');
					};
					r.onsuccess = () => {
						// Close so the app's open(DB_VERSION) versionchange that
						// normalises the store is not blocked by this handle.
						r.result.close();
						res();
					};
					r.onerror = () => res();
				});
			openLegacy();
		});
	}
	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(1500);

	// File → New → Create (defaults: 1920x1080 transparent)
	await clickByText(page, '.menubar-btn', 'File');
	await sleep(250);
	await clickByText(page, '.menu-item', 'New…');
	await page.waitForSelector('.dialog', { timeout: 8000 });
	await sleep(120);
	await page.evaluate(() => document.querySelector('.dialog .btn-primary').click());
	await sleep(600);
	const nameBefore = await page.evaluate(() => window.__REGISTRY__.active?.name || '(none)');
	if (paint) {
		await paintStroke(page);
		console.log(`[it${it}] painted; top-layer opaque px:`, (await opaquePixels(page)).count);
	}
	console.log(`[it${it}] created doc: "${nameBefore}"`);

	if (delayMs > 0) await sleep(delayMs);

	const beforeClose = await idbRecords(page);
	console.log(`[it${it}] DB right before close (delay=${delayMs}ms${paint ? ', painted' : ''}):`, JSON.stringify(beforeClose));
	const diag = await page.evaluate(() => window.__SESSION__.state());
	console.log(`[it${it}] pipeline state:`, JSON.stringify(diag));

	await page.close(); // ≈ Ctrl+W
	await sleep(400); // human latency before Ctrl+Shift+T

	const page2 = await browser.newPage();
	await page2.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
	await page2.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(3000);
	const tabs = await page2.evaluate(() => [...document.querySelectorAll('.fltab-name')].map((e) => e.textContent.trim()));
	const allDocs = await page2.evaluate(() => {
		const reg = window.__REGISTRY__;
		return reg.all.map((d) => ({ name: d.name, layers: d.layers.length }));
	});
	const pxRestored = await opaquePixels(page2);
	const postRestore = await idbRecords(page2);
	console.log(`[it${it}] after reopen tabs:`, JSON.stringify(tabs), 'registry:', JSON.stringify(allDocs));
	console.log(`[it${it}] restored top-layer opaque px:`, pxRestored.count, `(${pxRestored.w}×${pxRestored.h})`);
	console.log(`[it${it}] DB after reopen:`, JSON.stringify(postRestore));

	const restored = tabs.length > 0 && allDocs.length > 0 && (paint ? pxRestored.count > 0 : true);
	const recordExisted = beforeClose.length > 0;
	const restorable = recordExisted && restored;
	if (paint && !restorable) {
		console.error(`[it${it}] FAILED: record existed=${recordExisted}, restored-with-pixels=${restored}`);
		process.exitCode = 1;
	} else if (!recordExisted) {
		console.error(`[it${it}] FAILED: no DB record right before close (delay=${delayMs}ms)`);
		process.exitCode = 1;
	}

	await browser.close();
}

async function main() {
	const delays = process.env.DELAYS ? process.env.DELAYS.split(',').map(Number) : [250, 750];
	const paint = process.env.PAINT === '1';
	if (process.env.LEGACY === '1') {
		await run(0, 250, paint);
		return;
	}
	for (let i = 0; i < delays.length; i++) await run(i, delays[i], paint);
}
main().then(
	() => console.log('DONE'),
	(e) => {
		console.error('FAILED', e && e.message ? e.message : e);
		process.exit(1);
	}
);