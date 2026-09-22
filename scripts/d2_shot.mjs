// Robust capture of the full-screen Colour view (the "D2" surface).
// The generic survey probe raced document creation and could screenshot the
// app without the Colour view open; this one waits for the toolbar swatch
// before clicking, and for .cp-body before shooting.
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
	await sleep(2500);

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

	// Create a document, then WAIT for the colour bar to prove it exists.
	let haveBar = false;
	for (let attempt = 0; attempt < 3 && !haveBar; attempt++) {
		await clickText('.menubar-btn', 'File');
		await sleep(300);
		await clickText('.menu-item', 'New');
		await sleep(500);
		await page.evaluate(() => document.querySelector('.m-dialog .btn-primary')?.click());
		try {
			await page.waitForSelector('.cs-fg', { timeout: 12000 });
			haveBar = true;
		} catch {
			log(`  attempt ${attempt + 1}: .cs-fg never appeared, retrying`);
		}
	}
	if (!haveBar) throw new Error('colour bar never rendered — no document');
	await sleep(700);

	// Open the Colour view.
	await (await page.$('.cs-fg')).click();
	await page.waitForSelector('.cp-body', { timeout: 8000 });
	await sleep(700);

	const info = await page.evaluate(() => {
		const head = document.querySelector('.color-mode-head');
		const sv = document.querySelector('.cp-sv');
		const num = document.querySelector('.cp-num input');
		const cs = (el) => (el ? getComputedStyle(el) : null);
		return {
			title: head?.querySelector('.color-mode-title')?.textContent?.trim() ?? null,
			headBg: cs(head)?.backgroundColor ?? null,
			headRule: cs(head) ? cs(head).borderBottomWidth + ' ' + cs(head).borderBottomColor : null,
			svBorder: cs(sv)?.borderTopWidth ?? null,
			svShadow: cs(sv)?.boxShadow?.slice(0, 60) ?? null,
			numBg: cs(num)?.backgroundImage?.slice(0, 60) ?? null,
			numBorder: cs(num)?.borderTopWidth ?? null,
			chips: document.querySelectorAll('.cp-chip').length
		};
	});
	log('[D2] colour view:', JSON.stringify(info, null, 1));

	await page.screenshot({ path: 'd2-color-final.png' });
	log('[D2] shot -> d2-color-final.png');

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
