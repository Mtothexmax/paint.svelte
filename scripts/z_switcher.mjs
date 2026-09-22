// Regression guard for the MovableDialog stacking change.
//
// Removing `z-index: 1` from `.m-dialog > *` (and `z-index: 2` from
// `.m-title`) removed the per-child stacking contexts. The colour picker
// (.fcol-color-pop, z 1300, inside .m-body) needed that. But the OTHER popup
// in a dialog — the filter switcher's effect browser, opened from the title
// bar's `.filter-switcher` button with placement="down" → `.fx-add-menu.down`,
// z-index 62 — used to be shielded by `.m-title`'s z-index:2 context.
// Now it competes directly against body content. This probe proves it still
// paints above the body it drops down over.
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

	// Effects menu → a blur, which opens the generic FilterPopup (it has the
	// title-bar `.filter-switcher` ▾ button).
	await clickText('.menubar-btn', 'Effects');
	await page.waitForSelector('.fx-add-menu', { timeout: 8000 });
	await sleep(400);
	const picked = await page.evaluate(() => {
		const b = [...document.querySelectorAll('.fx-add-item')].find((e) => {
			const lbl = e.querySelector('.fx-add-item-label');
			return /^Gaussian Blur/.test((lbl?.textContent || '').trim());
		});
		if (!b) return false;
		b.click();
		return true;
	});
	log('gaussian blur clicked:', picked);
	await page.waitForSelector('.m-dialog .filter-switcher', { timeout: 8000 });
	await sleep(700);

	// Open the switcher menu.
	await page.click('.m-dialog .filter-switcher .m-menu-btn');
	await page.waitForSelector('.fx-add-menu.down', { timeout: 8000 });
	await sleep(600);

	const geom = await page.evaluate(() => {
		const menu = document.querySelector('.fx-add-menu.down');
		const body = document.querySelector('.m-dialog .m-body');
		const title = document.querySelector('.m-dialog .m-title');
		if (!menu || !body) return { open: false };
		const m = menu.getBoundingClientRect();
		const b = body.getBoundingClientRect();
		const cs = getComputedStyle(menu);
		// How far the menu hangs over the body.
		const oy = Math.max(0, Math.min(m.bottom, b.bottom) - Math.max(m.top, b.top));
		const ox = Math.max(0, Math.min(m.right, b.right) - Math.max(m.left, b.left));
		// Probe a point inside that overlap but near the menu's BOTTOM edge —
		// furthest from the title bar, so any shielding from the title would
		// already have run out.
		let hit = null;
		if (ox > 0 && oy > 0) {
			const cx = Math.max(m.left, b.left) + Math.min(ox / 2, m.width / 2);
			const cy = Math.max(m.top, b.top) + oy * 0.85;
			const el = document.elementFromPoint(cx, cy);
			hit = {
				cx: Math.round(cx),
				cy: Math.round(cy),
				tag: el?.tagName,
				cls: (el?.className || '').toString().slice(0, 60),
				inMenu: !!el?.closest('.fx-add-menu'),
				inBody: !!el?.closest('.m-body')
			};
		}
		return {
			open: true,
			menu: { x: Math.round(m.x), y: Math.round(m.y), w: Math.round(m.width), h: Math.round(m.height) },
			body: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) },
			overlap: { w: Math.round(ox), h: Math.round(oy) },
			menuZ: cs.zIndex,
			titleZ: getComputedStyle(title).zIndex,
			bodyZ: getComputedStyle(body).zIndex,
			hit
		};
	});
	log('[REG] geometry:', JSON.stringify(geom, null, 1));

	const ok = !!(geom.hit && geom.hit.inMenu);
	const occluded = !!(geom.hit && !geom.hit.inMenu && geom.hit.inBody);
	log('[REG] switcher menu paints above the dialog body:', ok);
	log('[REG] switcher menu occluded by dialog body:', occluded);

	const shot = `z-switcher-${process.argv[2] || 'after'}.png`;
	await page.screenshot({ path: shot });
	log('shot -> ' + shot);
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
