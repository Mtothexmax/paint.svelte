// Tight crop + computed styles of the Colour view's header (.color-mode-head),
// to compare it against the dialog chrome bar (.m-title) it should match.
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
	await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 });
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

	// Reference: a dialog title bar for comparison.
	await clickText('.menubar-btn', 'Image');
	await sleep(300);
	await clickText('.menu-item', 'Resize');
	await sleep(600);
	const mtitle = await page.evaluate(() => {
		const t = document.querySelector('.m-dialog .m-title');
		if (!t) return null;
		const cs = getComputedStyle(t);
		const r = t.getBoundingClientRect();
		return {
			bg: cs.backgroundImage.slice(0, 70),
			bgColor: cs.backgroundColor,
			pad: cs.padding,
			font: cs.fontSize + ' / ' + cs.fontWeight,
			rule: cs.borderBottomWidth + ' ' + cs.borderBottomColor,
			inset: cs.boxShadow.slice(0, 50),
			rect: { x: r.x, y: r.y, w: r.width, h: r.height }
		};
	});
	log('[ref] .m-title:', JSON.stringify(mtitle, null, 1));
	if (mtitle) {
		await page.screenshot({
			path: 'ref-mtitle.png',
			clip: { x: mtitle.rect.x, y: mtitle.rect.y, width: mtitle.rect.w, height: mtitle.rect.h }
		});
	}
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(300);

	// The Colour view header.
	await (await page.$('.cs-fg')).click();
	await page.waitForSelector('.cp-body', { timeout: 8000 });
	await sleep(600);

	const head = await page.evaluate(() => {
		const h = document.querySelector('.color-mode-head');
		if (!h) return null;
		const cs = getComputedStyle(h);
		const r = h.getBoundingClientRect();
		const part = (sel) => {
			const el = h.querySelector(sel);
			if (!el) return null;
			const c = getComputedStyle(el);
			const b = el.getBoundingClientRect();
			return {
				text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20),
				bg: c.backgroundImage === 'none' ? c.backgroundColor : c.backgroundImage.slice(0, 50),
				border: c.borderTopWidth + ' ' + c.borderTopColor,
				radius: c.borderRadius,
				color: c.color,
				shadow: c.boxShadow.slice(0, 60),
				font: c.fontSize + '/' + c.fontWeight,
				pad: c.padding,
				rect: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
			};
		};
		return {
			head: {
				bg: cs.backgroundImage === 'none' ? cs.backgroundColor : cs.backgroundImage.slice(0, 60),
				bgColor: cs.backgroundColor,
				pad: cs.padding,
				rule: cs.borderBottomWidth + ' ' + cs.borderBottomColor,
				inset: cs.boxShadow.slice(0, 50),
				gap: cs.gap,
				rect: { x: r.x, y: r.y, w: r.width, h: r.height }
			},
			title: part('.color-mode-title'),
			seg: part('.seg'),
			segBtn: part('.seg-btn'),
			copy: part('.mini-btn'),
			done: part('.color-mode-done')
		};
	});
	log('[D2] .color-mode-head:', JSON.stringify(head, null, 1));

	await page.screenshot({
		path: 'd2-head.png',
		clip: { x: head.head.rect.x, y: head.head.rect.y - 4, width: head.head.rect.w, height: head.head.rect.h + 8 }
	});
	log('[D2] shot -> d2-head.png');

	// Hover states compete with the global `.btn-primary:hover:not(:disabled)`
	// (specificity 0,3,0) — confirm the scoped rules actually win.
	const hover = await page.evaluate(async () => {
		const read = (sel) => {
			const el = document.querySelector(sel);
			const c = getComputedStyle(el);
			return { bg: c.backgroundImage === 'none' ? c.backgroundColor : c.backgroundImage.slice(0, 46), filter: c.filter, color: c.color };
		};
		const out = { doneRest: read('.color-mode-done'), copyRest: read('.color-mode-head .mini-btn') };
		return out;
	});
	log('[hover] rest:', JSON.stringify(hover, null, 1));

	await page.hover('.color-mode-done');
	await sleep(300);
	const doneHover = await page.evaluate(() => {
		const c = getComputedStyle(document.querySelector('.color-mode-done'));
		return { bg: c.backgroundImage.slice(0, 46), filter: c.filter };
	});
	log('[hover] done:', JSON.stringify(doneHover));

	await page.hover('.color-mode-head .mini-btn');
	await sleep(700);
	const copyHover = await page.evaluate(() => {
		const el = document.querySelector('.color-mode-head .mini-btn');
		const c = getComputedStyle(el);
		return { isHover: el.matches(':hover'), bg: c.backgroundImage.slice(0, 46), filter: c.filter };
	});
	log('[hover] copy:', JSON.stringify(copyHover));
	const hoverOk =
		doneHover.bg.includes('44, 58, 88') &&
		doneHover.filter === 'none' &&
		copyHover.filter.includes('1.18');
	log('[hover] OK:', hoverOk);

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
