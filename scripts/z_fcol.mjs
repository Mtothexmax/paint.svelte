// Reproduces the reported bug: the effect colour picker (.fcol-color-pop,
// position:fixed; z-index:1300) painting BELOW a filter dialog's header.
//
// The popup is rendered inside .m-body. `.m-dialog > * { z-index: 1 }` gives
// .m-body its own stacking context, so the popup's 1300 is trapped inside a
// z-index:1 box — and `.m-dialog > .m-title { z-index: 2 }` puts the header
// above it. `position: fixed` escapes overflow/clipping, NOT stacking contexts.
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
	await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
	const errors = [];
	page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(2400);

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

	await clickText('.menubar-btn', 'File');
	await sleep(300);
	await clickText('.menu-item', 'New');
	await sleep(500);
	await page.evaluate(() => document.querySelector('.m-dialog .btn-primary')?.click());
	await page.waitForSelector('.cs-fg', { timeout: 15000 });
	await sleep(700);

	// Effects menu is the shared EffectBrowserMenu (flat, searchable) — NOT the
	// generic `.menu-panel` that Image/Adjustments use.
	await clickText('.menubar-btn', 'Effects');
	await page.waitForSelector('.fx-add-menu', { timeout: 8000 });
	await sleep(400);
	const browser_ = await page.evaluate(() => ({
		heads: [...document.querySelectorAll('.fx-add-head-label')].map((e) => e.textContent.trim()),
		items: [...document.querySelectorAll('.fx-add-item-label')].map((e) => e.textContent.trim()).slice(0, 60)
	}));
	log('effect browser heads:', JSON.stringify(browser_.heads));
	log('effect browser items:', JSON.stringify(browser_.items));

	const picked = await page.evaluate(() => {
		// Match the LABEL, not the whole item: `includes('Outline')` also hits
		// "Ink Outline…", which has no kind:'color' param at all.
		const b = [...document.querySelectorAll('.fx-add-item')].find((e) => {
			const lbl = e.querySelector('.fx-add-item-label');
			return /^Outline/.test((lbl?.textContent || '').trim());
		});
		if (!b) return false;
		b.click();
		return true;
	});
	log('outline clicked:', picked);
	await page.waitForSelector('.m-dialog', { timeout: 8000 });
	await sleep(700);

	const dump = await page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		return {
			title: d.querySelector('.m-title-text')?.textContent?.trim(),
			bodyText: (d.querySelector('.m-body')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
			classes: [...d.querySelectorAll('*')].map((e) => (e.className || '').toString()).filter((c) => c && !c.includes('svelte-')).slice(0, 40)
		};
	});
	log('dialog dump:', JSON.stringify(dump, null, 1));

	// Drag the dialog DOWN so the colour row sits near the viewport bottom —
	// that makes clampPopup() flip the popup ABOVE the swatch, into the header.
	const tb = await (await page.$('.m-dialog .m-title')).boundingBox();
	await page.mouse.move(tb.x + 60, tb.y + 10);
	await page.mouse.down();
	await page.mouse.move(tb.x + 60, tb.y + 10 + 380, { steps: 12 });
	await page.mouse.up();
	await sleep(400);

	const dlgBox = await page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		const r = d.getBoundingClientRect();
		const t = d.querySelector('.m-title').getBoundingClientRect();
		return {
			dialog: { x: r.x, y: r.y, w: r.width, h: r.height },
			title: { x: t.x, y: t.y, w: t.width, h: t.height },
			titleZ: getComputedStyle(d.querySelector('.m-title')).zIndex,
			bodyZ: getComputedStyle(d.querySelector('.m-body')).zIndex
		};
	});
	log('dialog:', JSON.stringify(dlgBox));

	// Open the custom-colour popup.
	await page.click('.fcol-stored');
	await sleep(700);

	const geom = await page.evaluate(() => {
		const pop = document.querySelector('.fcol-color-pop');
		const title = document.querySelector('.m-dialog .m-title');
		if (!pop) return { open: false };
		const p = pop.getBoundingClientRect();
		const t = title.getBoundingClientRect();
		const popCs = getComputedStyle(pop);
		// overlap of popup and title bar
		const ox = Math.max(0, Math.min(p.right, t.right) - Math.max(p.left, t.left));
		const oy = Math.max(0, Math.min(p.bottom, t.bottom) - Math.max(p.top, t.top));
		let hit = null;
		if (ox > 0 && oy > 0) {
			const cx = Math.max(p.left, t.left) + ox / 2;
			const cy = Math.max(p.top, t.top) + oy / 2;
			const el = document.elementFromPoint(cx, cy);
			hit = {
				cx: Math.round(cx),
				cy: Math.round(cy),
				tag: el?.tagName,
				cls: (el?.className || '').toString().slice(0, 60),
				inPopup: !!el?.closest('.fcol-color-pop'),
				inTitle: !!el?.closest('.m-title')
			};
		}
		return {
			open: true,
			popup: { x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.width), h: Math.round(p.height) },
			title: { x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height) },
			overlap: { w: Math.round(ox), h: Math.round(oy) },
			hit,
			popZ: popCs.zIndex,
			popBg: popCs.backgroundColor,
			popBorder: popCs.borderTopColor,
			// which ancestor creates the trapping stacking context?
			chain: (() => {
				const out = [];
				let el = pop.parentElement;
				while (el && el !== document.body) {
					const cs = getComputedStyle(el);
					if (cs.zIndex !== 'auto' || cs.transform !== 'none' || cs.filter !== 'none' || cs.isolation === 'isolate')
						out.push({ cls: (el.className || '').toString().slice(0, 40), z: cs.zIndex, pos: cs.position });
					el = el.parentElement;
				}
				return out;
			})()
		};
	});
	log('[BUG] geometry:', JSON.stringify(geom, null, 1));
	const occluded = !!(geom.hit && !geom.hit.inPopup && geom.hit.inTitle);
	log('[BUG] popup occluded by header in the overlap region:', occluded);

	// Pass a suffix to label the run: `node scripts/z_fcol.mjs after`
	const suffix = process.argv[2] || 'before';
	const shot = `z-fcol-${suffix}.png`;
	await page.screenshot({ path: shot });
	log('shot -> ' + shot);

	// Tight crop of the popup ∩ title-bar band — the region that was broken.
	if (geom.open) {
		const x = Math.max(0, Math.min(geom.popup.x, geom.title.x) - 20);
		const y = Math.max(0, geom.title.y - 40);
		const w = Math.min(1280 - x, Math.max(geom.popup.w, geom.title.w) + 40);
		const h = Math.min(800 - y, geom.title.h + 80);
		const crop = `z-fcol-${suffix}-crop.png`;
		await page.screenshot({ path: crop, clip: { x, y, width: w, height: h } });
		log('shot -> ' + crop);
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
