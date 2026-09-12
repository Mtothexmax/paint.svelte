// Diagnostic: soft-brush color constancy + PNG save/restore roundtrip.
// Paints one soft orange stroke, then samples a vertical slice through it:
// for each pixel with meaningful alpha it un-premultiplies and reports RGB.
// Healthy: RGB constant (== paint color) at every alpha. Then it runs the
// exact session save/restore pixel path (surfaceToPngBlob -> createImageBitmap
// -> createFromBitmap) and reports the same slice again.
//
// NOTE (dev-server HMR): the app pins modules as /src/....ts?t=<hash>; a bare
// import() from evaluate would resolve a VIRGIN second instance (fresh
// singletons!). All in-page imports go through the pinned URLs discovered
// from performance entries.
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

async function clickTool(page, label) {
	await page.evaluate((lbl) => {
		const btn = [...document.querySelectorAll('.tool-btn')].find((b) => (b.getAttribute('aria-label') || '').toLowerCase().includes(lbl));
		if (!btn) throw new Error('tool not found ' + lbl);
		btn.click();
	}, label);
	await sleep(200);
}

/** Import app modules using the exact URLs the app graph loaded (?t= pinned). */
async function appImport(page, path) {
	return page.evaluate(async (p) => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const hit = entries.find((u) => u.includes(p));
		const url = hit ? new URL(hit).pathname + new URL(hit).search : p;
		return import(url);
	}, path);
}

async function main() {
	const browser = await puppeteer.launch({
		executablePath: CHROME,
		headless: 'new',
		args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
	page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
	page.on('console', (m) => {
		if (m.type() === 'error') console.log('PAGE console.error:', m.text());
	});
	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(1500);

	await clickByText(page, '.menubar-btn', 'File');
	await sleep(250);
	await clickByText(page, '.menu-item', 'New…');
	await page.waitForSelector('.dialog', { timeout: 8000 });
	await sleep(120);
	await page.evaluate(() => document.querySelector('.dialog .btn-primary').click());
	let ready = false;
	for (let i = 0; i < 60; i++) {
		ready = await page.evaluate(async () => {
			const entries = performance.getEntriesByType('resource').map((r) => r.name);
			const hit = entries.find((u) => u.includes('/render/EditorRenderer.ts'));
			const url = hit ? new URL(hit).pathname + new URL(hit).search : '/src/lib/render/EditorRenderer.ts';
			const { hasEditorRenderer } = await import(url);
			return hasEditorRenderer();
		});
		if (ready) break;
		await sleep(250);
	}
	await sleep(800);
	if (!ready) throw new Error('editor never mounted');

	// brush: soft orange, big, full opacity
	await clickTool(page, 'brush');
	await page.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const ui = await import(u('/src/lib/state/ui.ts'));
		ui.foregroundColor.set({ r: 255, g: 140, b: 0, a: 255 });
		ui.brushSize.set(120);
		ui.brushHardness.set(0);
		ui.brushOpacity.set(100);
		await new Promise((r) => setTimeout(r, 300));
	});

	const rect = await page.evaluate(() => {
		const canvas = document.querySelector('canvas');
		const h = canvas.parentElement.getBoundingClientRect();
		return { x: h.x, y: h.y, w: h.width, h: h.height };
	});
	const x0 = rect.x + rect.w * 0.35;
	const y0 = rect.y + rect.h * 0.5;
	const x1 = rect.x + rect.w * 0.65;
	await page.mouse.move(x0, y0);
	await sleep(50);
	await page.mouse.down();
	await sleep(50);
	for (let i = 1; i <= 10; i++) {
		await page.mouse.move(x0 + ((x1 - x0) * i) / 10, y0, { steps: 2 });
		await sleep(20);
	}
	await page.mouse.up();
	await sleep(900); // commit

	const report = await page.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const { getEditorRenderer } = await import(u('/src/lib/render/EditorRenderer.ts'));
		const { extractSurfaceBytes } = await import(u('/src/lib/render/readback.ts'));
		const { surfaceToPngBlob } = await import(u('/src/lib/render/export.ts'));
		const renderer = getEditorRenderer();
		const doc = window.__REGISTRY__.active;
		const layer = doc.activeLayer;
		const W = doc.width, H = doc.height;

		function sliceOf(surfaceId) {
			const { pixels } = extractSurfaceBytes(renderer, surfaceId);
			// vertical slice through the stroke middle
			const sx = Math.floor(W / 2);
			const rows = [];
			for (let y = 0; y < H; y++) {
				const i = (y * W + sx) * 4;
				const R = pixels[i], G = pixels[i + 1], B = pixels[i + 2], A = pixels[i + 3];
				if (A < 8) continue;
				// readback is STRAIGHT-alpha bytes (float-precision
				// un-premultiply before the U8 quantize) — no CPU divide.
				rows.push({ y, a: A, r: R, g: G, b: B, raw: [R, G, B] });
			}
			return rows;
		}

		const out = {};
		out.committedRows = sliceOf(layer.surfaceId);

		// exact session save/restore pixel path
		const blob = await surfaceToPngBlob(renderer, layer.surfaceId, W, H);
		out.pngBytes = blob.size;
		const bmp = await createImageBitmap(blob);
		const c = document.createElement('canvas');
		c.width = bmp.width; c.height = bmp.height;
		const ctx = c.getContext('2d');
		ctx.drawImage(bmp, 0, 0);
		const d = ctx.getImageData(0, 0, c.width, c.height).data;
		// PNG-decoded slice (canvas 2d gives straight alpha)
		{
			const sx = Math.floor(W / 2);
			const rows = [];
			for (let y = 0; y < H; y++) {
				const i = (y * W + sx) * 4;
				const A = d[i + 3];
				if (A < 8) continue;
				rows.push({ y, a: A, r: d[i], g: d[i + 1], b: d[i + 2] });
			}
			out.pngDecodedRows = rows;
		}
		const restoredId = renderer.surfaces.createFromBitmap(bmp);
		bmp.close();
		out.restoredRows = sliceOf(restoredId);

		// summarize: group by alpha bins, report mean unpremult RGB per bin
		function summarize(rows) {
			const bins = {};
			for (const r of rows) {
				const key = r.a < 32 ? 'a<32' : r.a < 96 ? 'a<96' : r.a < 200 ? 'a<200' : 'a>=200';
				(bins[key] = bins[key] || []).push(r);
			}
			const res = {};
			for (const [k, rs] of Object.entries(bins)) {
				const n = rs.length;
				const mr = rs.reduce((t, r) => t + r.r, 0) / n;
				const mg = rs.reduce((t, r) => t + r.g, 0) / n;
				const mb = rs.reduce((t, r) => t + r.b, 0) / n;
				res[k] = `n=${n} rgb=(${mr.toFixed(1)},${mg.toFixed(1)},${mb.toFixed(1)})`;
			}
			return res;
		}
		return {
			paintColor: [255, 140, 0],
			pngBytes: out.pngBytes,
			committed: summarize(out.committedRows),
			pngDecoded: summarize(out.pngDecodedRows),
			restored: summarize(out.restoredRows)
		};
	});
	console.log(JSON.stringify(report, null, 1));
	await browser.close();
	// The PNG encode must carry straight alpha: decoded bins must match the
	// committed surface bins (premultiplied-as-straight would read far darker).
	// Bound is alpha-aware: the PNG path round-trips through premultiplied
	// 2D canvases (putImageData premultiplies, toBlob un-premultiplies, decode
	// premultiplies again, getImageData un-premultiplies). Each canvas
	// round-trip contributes at most half a U8 step of premultiplied error,
	// magnified by 255/a on un-premultiply — a pre-existing, format-independent
	// canvas floor (~260/a for the two round-trips), NOT surface quantization:
	// the committed surface itself reads exactly paint at every alpha.
	// Premult-baking (the regression this guards) shifts by ~C*(1-a/255),
	// far above the bound at every alpha.
	const parse = (s) => {
		const m = /rgb=\(([0-9.]+),([0-9.]+),([0-9.]+)\)/.exec(s);
		return m ? [+m[1], +m[2], +m[3]] : null;
	};
	const alphaOf = (bin) => (bin === 'a<32' ? 8 : bin === 'a<96' ? 32 : bin === 'a<200' ? 96 : 200);
	for (const bin of Object.keys(report.committed)) {
		const a = parse(report.committed[bin]);
		const b = parse(report.pngDecoded[bin]);
		if (!a || !b) throw new Error(`missing bin ${bin}`);
		const dev = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
		const bound = Math.max(1.5, 260 / alphaOf(bin));
		if (dev > bound) throw new Error(`PNG encode shifted ${bin}: ${report.committed[bin]} vs ${report.pngDecoded[bin]} (bound ${bound.toFixed(1)})`);
	}
	console.log('PNG-STRAIGHT-OK: decoded PNG matches committed surface');
}
main().then(
	() => console.log('DONE'),
	(e) => {
		console.error('FAILED', e && e.message ? e.message : e);
		process.exit(1);
	}
);



