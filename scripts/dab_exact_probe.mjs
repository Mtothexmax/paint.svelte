// Exactness probe: single soft dab of (9,255,0) and (223,204,32).
// For paint color C at stored alpha A, PURE 8-bit premultiplied quantization
// predicts un-premult = round(round(C*A/255)*255/A) — exact-0.5 cases are
// impossible (2*C*A odd vs even), so GL round-to-even vs JS half-up can never
// diverge here. Any measured deviation from the prediction is a SYSTEMATIC
// bug; zero deviation means the pipeline is exact and residuals are inherent.
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

	await clickTool(page, 'brush');
	await page.evaluate(async () => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const ui = await import(u('/src/lib/state/ui.ts'));
		ui.brushSize.set(80);
		ui.brushHardness.set(0);
		ui.brushOpacity.set(100);
		await new Promise((r) => setTimeout(r, 300));
	});

	const rect = await page.evaluate(() => {
		const canvas = document.querySelector('canvas');
		const h = canvas.parentElement.getBoundingClientRect();
		return { x: h.x, y: h.y, w: h.width, h: h.height };
	});
	// canvas pixel scale: doc is 1920 wide; map image coords -> screen
	const view = await page.evaluate(() => {
		const doc = window.__REGISTRY__.active;
		return { w: doc.width, h: doc.height };
	});
	const imgToScreen = async (ix, iy) =>
		page.evaluate(([x, y]) => {
			const canvas = document.querySelector('canvas');
			const bb = canvas.getBoundingClientRect();
			const doc = window.__REGISTRY__.active;
			const v = doc.view;
			return { x: bb.x + v.panX + x * v.zoom, y: bb.y + v.panY + y * v.zoom };
		}, [ix, iy]);

	const COLORS = [
		{ c: [9, 255, 0], at: [330, 540] },
		{ c: [223, 204, 32], at: [760, 540] },
		{ c: [25, 230, 70], at: [1190, 540] }
	];
	for (const { c, at } of COLORS) {
		await page.evaluate(async (cc) => {
			const entries = performance.getEntriesByType('resource').map((r) => r.name);
			const u = (p) => {
				const hit = entries.find((x) => x.includes(p));
				return hit ? new URL(hit).pathname + new URL(hit).search : p;
			};
			const ui = await import(u('/src/lib/state/ui.ts'));
			ui.foregroundColor.set({ r: cc[0], g: cc[1], b: cc[2], a: 255 });
			await new Promise((r) => setTimeout(r, 200));
		}, c);
		const p = await imgToScreen(at[0], at[1]);
		console.log('dab', JSON.stringify(c), 'screen:', JSON.stringify({ x: Math.round(p.x), y: Math.round(p.y) }));
		await page.mouse.move(p.x, p.y);
		await sleep(80);
		await page.mouse.down();
		await sleep(80);
		await page.mouse.up();
		await sleep(700);
		const painted = await page.evaluate(async (bbox) => {
			const entries = performance.getEntriesByType('resource').map((r) => r.name);
			const u = (pp) => {
				const hit = entries.find((x) => x.includes(pp));
				return hit ? new URL(hit).pathname + new URL(hit).search : pp;
			};
			const { getEditorRenderer } = await import(u('/src/lib/render/EditorRenderer.ts'));
			const { extractSurfaceBytes } = await import(u('/src/lib/render/readback.ts'));
			const renderer = getEditorRenderer();
			const doc = window.__REGISTRY__.active;
			const { pixels } = extractSurfaceBytes(renderer, doc.activeLayer.surfaceId);
			let n = 0;
			for (let y = bbox[1]; y < bbox[3]; y++)
				for (let x = bbox[0]; x < bbox[2]; x++) {
					if (pixels[(y * doc.width + x) * 4 + 3] > 0) n++;
				}
			return n;
		}, [at[0] - 60, at[1] - 60, at[0] + 60, at[1] + 60]);
		console.log('painted px in bbox:', painted);
	}

	const report = await page.evaluate(async (regions) => {
		const entries = performance.getEntriesByType('resource').map((r) => r.name);
		const u = (p) => {
			const hit = entries.find((x) => x.includes(p));
			return hit ? new URL(hit).pathname + new URL(hit).search : p;
		};
		const { getEditorRenderer } = await import(u('/src/lib/render/EditorRenderer.ts'));
		const { extractSurfaceBytes } = await import(u('/src/lib/render/readback.ts'));
		const renderer = getEditorRenderer();
		const doc = window.__REGISTRY__.active;
		const { pixels } = extractSurfaceBytes(renderer, doc.activeLayer.surfaceId);
		const W = doc.width;
		const out = [];
		for (const { c, at } of regions) {
			let n = 0;
			let bad = 0;
			let maxDev = 0;
			const examples = [];
			for (let y = Math.max(0, at[1] - 60); y < Math.min(doc.height, at[1] + 60); y++) {
				for (let x = Math.max(0, at[0] - 60); x < Math.min(doc.width, at[0] + 60); x++) {
					const i = (y * W + x) * 4;
					const A = pixels[i + 3];
					if (A < 8 || A > 250) continue;
					n++;
					// Readback is STRAIGHT-alpha bytes now: the shader divides
					// in float precision before the single U8 quantize, so a
					// pure-color dab must read back as the paint color ±1
					// (float divide + U8 double-rounding at most).
					const meas = [pixels[i], pixels[i + 1], pixels[i + 2]];
					const exp = [c[0], c[1], c[2]];
					const dev = Math.max(Math.abs(meas[0] - exp[0]), Math.abs(meas[1] - exp[1]), Math.abs(meas[2] - exp[2]));
					if (dev > maxDev) maxDev = dev;
					if (dev > 1) {
						bad++;
						if (examples.length < 6) examples.push({ x, y, a: A, meas, exp });
					}
				}
			}
			out.push({ color: c, n, bad, maxDev, examples });
		}
		return out;
	}, COLORS);
	console.log(JSON.stringify(report, null, 1));
	await browser.close();
	// Every sampled edge pixel must read back as the paint color ±1 (float
	// divide + U8 double-rounding). Larger deviations are systematic bugs.
	const worst = Math.max(...report.map((r) => r.maxDev));
	const total = report.reduce((t, r) => t + r.n, 0);
	if (total < 1000) throw new Error(`too few edge pixels sampled (n=${total})`);
	if (worst > 1) throw new Error(`systematic deviation detected (maxDev=${worst})`);
	console.log(`EXACTNESS-OK: n=${total} edge pixels, all within ±1 of paint color`);
}
main().then(
	() => console.log('DONE'),
	(e) => {
		console.error('FAILED', e && e.message ? e.message : e);
		process.exit(1);
	}
);



