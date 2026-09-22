// (D) survey: screenshot the three surfaces named in the request —
//   D1 the Resize Image dialog's text field
//   D2 whatever opens when a colour is clicked
//   D4 the bottom-right zoom slider
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'http://localhost:5173/paint.svelte/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const log = (...a) => console.log(...a);

async function main() {
	const browser = await puppeteer.launch({
		executablePath: CHROME,
		headless: 'new',
		args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
	const errors = [];
	page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(2200);

	const clickText = (sel, text) =>
		page.evaluate(
			(s, t) => {
				const el = [...document.querySelectorAll(s)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t));
				if (!el) return false;
				el.click();
				return true;
			},
			sel,
			text
		);

	// new document
	await clickText('.menubar-btn', 'File');
	await sleep(250);
	const fileItems = await page.evaluate(() =>
		[...document.querySelectorAll('.menu-panel .menu-item')].map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim())
	);
	log('FILE MENU:', JSON.stringify(fileItems));
	await clickText('.menu-item', 'New');
	await sleep(400);
	const newDlg = await page.evaluate(() => {
		const p = document.querySelector('.m-dialog .btn-primary');
		return { has: !!p, text: p?.textContent?.trim() ?? null };
	});
	log('NEW DIALOG primary:', JSON.stringify(newDlg));
	await page.evaluate(() => document.querySelector('.m-dialog .btn-primary')?.click());

	let ready = false;
	for (let i = 0; i < 60; i++) {
		ready = await page.evaluate(async () => {
			const { hasEditorRenderer } = await import('/paint.svelte/src/lib/render/EditorRenderer.ts');
			return hasEditorRenderer();
		});
		if (ready) break;
		await sleep(250);
	}
	await sleep(900);
	log('renderer ready:', ready);

	// ---- D1: the Image menu, then the resize dialog ----------------------
	await clickText('.menubar-btn', 'Image');
	await sleep(250);
	const imgItems = await page.evaluate(() =>
		[...document.querySelectorAll('.menu-panel .menu-item')].map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim())
	);
	log('IMAGE MENU:', JSON.stringify(imgItems));
	await clickText('.menu-item', 'Resize');
	await sleep(500);

	const d1 = await page.evaluate(() => {
		const box = document.querySelector('.m-dialog');
		if (!box) return { has: false };
		const inputs = [...box.querySelectorAll('input')].map((i) => {
			const cs = getComputedStyle(i);
			const r = i.getBoundingClientRect();
			return {
				type: i.type, value: i.value, cls: i.className,
				bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 60),
				border: cs.border, shadow: cs.boxShadow.slice(0, 80),
				radius: cs.borderRadius, color: cs.color,
				rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
			};
		});
		const r = box.getBoundingClientRect();
		return {
			has: true,
			title: box.querySelector('.m-title-text')?.textContent?.trim(),
			rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
			inputs,
			fields: [...box.querySelectorAll('.field')].length
		};
	});
	log('[D1] resize dialog:', JSON.stringify(d1, null, 1));
	if (d1.has) {
		await page.screenshot({
			path: 'd1-resize.png',
			clip: { x: d1.rect.x - 8, y: d1.rect.y - 8, width: d1.rect.w + 16, height: d1.rect.h + 16 }
		});
		log('[D1] shot -> d1-resize.png');
	}
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(300);

	// ---- D2: click a colour ----------------------------------------------
	const swatches = await page.evaluate(() => {
		const out = [];
		for (const sel of ['.cs-fg', '.cs-bg', '.cs-swap', '.color-swatch', '[class*="swatch"]']) {
			for (const el of document.querySelectorAll(sel)) {
				const r = el.getBoundingClientRect();
				out.push({ sel, cls: el.className, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } });
			}
		}
		return out;
	});
	log('[D2] candidate swatches:', JSON.stringify(swatches, null, 1));

	const fg = await page.$('.cs-fg');
	if (fg) {
		await fg.click();
		await sleep(500);
	}
	const d2 = await page.evaluate(() => {
		const panel = document.querySelector('.cp-panel') || document.querySelector('[class*="cp-"]')?.closest('div');
		const all = [...document.querySelectorAll('body > div, body > *')].map((e) => e.className).filter(Boolean);
		return {
			hasPanel: !!document.querySelector('.cp-panel'),
			panelCls: panel?.className ?? null,
			topLevel: all,
			// what did the click actually produce?
			dialogs: [...document.querySelectorAll('.m-dialog')].map((d) => d.querySelector('.m-title-text')?.textContent?.trim()),
			html: (document.querySelector('.cp-panel')?.outerHTML ?? '').slice(0, 400)
		};
	});
	log('[D2] after colour click:', JSON.stringify(d2, null, 1));
	await page.screenshot({ path: 'd2-color-full.png' });
	log('[D2] shot -> d2-color-full.png');

	// ---- D4: zoom bar ----------------------------------------------------
	await page.keyboard.press('Escape');
	await sleep(200);
	const z = await page.evaluate(() => {
		const bar = document.querySelector('.zoombar');
		const sl = document.querySelector('.zb-slider');
		if (!bar) return { has: false };
		const r = bar.getBoundingClientRect();
		const cs = sl ? getComputedStyle(sl) : null;
		return {
			has: true,
			rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
			slider: cs ? { accent: cs.accentColor, h: cs.height, w: cs.width, bg: cs.backgroundColor } : null,
			sliderBox: sl ? (() => { const b = sl.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; })() : null
		};
	});
	log('[D4] zoom bar:', JSON.stringify(z, null, 1));
	if (z.has) {
		await page.screenshot({
			path: 'd4-zoom.png',
			clip: { x: Math.max(0, z.rect.x - 6), y: Math.max(0, z.rect.y - 6), width: z.rect.w + 12, height: z.rect.h + 12 }
		});
		log('[D4] shot -> d4-zoom.png');
	}

	log('errors:', errors.length ? JSON.stringify(errors.slice(0, 5)) : 'none');
	await browser.close();
	log('DONE');
}

main().then(
	() => process.exit(0),
	(e) => {
		console.error('FAILED', e && e.message ? e.message : e);
		process.exit(1);
	}
);
