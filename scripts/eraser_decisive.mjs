// Decisive ERASER probe. Two solid layers: bottom=BLACK (default fg), top=RED.
// While the eraser stroke is held (pointer still down) sample the erased hole:
//   - FIXED behavior: the active layer sprite shows "top minus stroke", so the
//     hole reveals the BLACK layer below it.
//   - OLD behavior: a checker+layer composite drawn in the floating overlay hid
//     the sibling layer, so the hole would show the bright checker instead.
// Same assertion after release (commit), plus a sanity pixel away from the dot.
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';

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

async function canvasBox(page) {
	return page.evaluate(() => {
		const bb = document.querySelector('canvas').getBoundingClientRect();
		return { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
	});
}

function sample(png, x, y) {
	let r = 0, g = 0, b = 0, n = 0;
	for (let yy = Math.max(0, y - 3); yy <= Math.min(png.height - 1, y + 3); yy++) {
		for (let xx = Math.max(0, x - 3); xx <= Math.min(png.width - 1, x + 3); xx++) {
			const i = (yy * png.width + xx) * 4;
			r += png.data[i];
			g += png.data[i + 1];
			b += png.data[i + 2];
			n++;
		}
	}
	return n ? { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) } : null;
}
const desc = (c) => (c ? `${c.r},${c.g},${c.b}` : 'null');

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

	// New doc (1920x1080, transparent bg)
	await clickByText(page, '.menubar-btn', 'File');
	await sleep(250);
	await clickByText(page, '.menu-item', 'New…');
	await page.waitForSelector('.dialog', { timeout: 8000 });
	await sleep(120);
	await page.evaluate(() => document.querySelector('.dialog .btn-primary').click());
	await sleep(700);

	const bb = await canvasBox(page);
	const cx = Math.round(bb.x + bb.w / 2);
	const cy = Math.round(bb.y + bb.h / 2);
	console.log('canvas box:', JSON.stringify({ x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(bb.w), h: Math.round(bb.h) }), 'center:', cx, cy);

	// 1) Fill BOTTOM layer solid black (default fg = black)
	await clickTool(page, 'paint bucket');
	await page.mouse.click(cx, cy);
	await sleep(800);

	// 2) Add layer 2 (auto-active)
	await page.evaluate(() => document.querySelector('.mini-btn[title="Add layer"]').click());
	await sleep(400);

	// 3) Set foreground to RED: brightness slider → 50, then hue/sat area → (hue 0, sat 100)
	const slBox = await (await page.$('.fg-bright-slider')).boundingBox();
	await page.mouse.click(slBox.x + slBox.width / 2, slBox.y + slBox.height / 2);
	await sleep(150);
	const ab = await (await page.$('.fg-picker-area')).boundingBox();
	await page.mouse.click(ab.x + ab.width - 2, ab.y + 2);
	await sleep(150);

	// 4) Fill TOP layer red
	await page.mouse.click(cx, cy);
	await sleep(900);

	let shot = PNG.sync.read(await page.screenshot());
	console.log('after fills (TOP red / should be ~255,0,0):', desc(sample(shot, cx, cy)));

	// 5) Eraser: press and HOLD → mid-stroke preview sample
	await clickTool(page, 'eraser');
	await page.mouse.move(cx, cy);
	await page.mouse.down();
	await sleep(600);
	shot = PNG.sync.read(await page.screenshot());
	console.log('MID-STROKE erase dot (expect ~0,0,0 = black below):', desc(sample(shot, cx, cy)));
	console.log('MID-STROKE away from dot (expect RED):', desc(sample(shot, cx + 60, cy)));
	console.log('MID-STROKE away y+60 (expect RED):', desc(sample(shot, cx, cy + 60)));

	// 6) Release → committed result
	await page.mouse.up();
	await sleep(1200);
	shot = PNG.sync.read(await page.screenshot());
	console.log('POST-COMMIT erase dot (expect ~0,0,0):', desc(sample(shot, cx, cy)));
	console.log('POST-COMMIT away (expect RED):', desc(sample(shot, cx + 60, cy)));

	// ASCII map of a 90x90 window around the dot
	const chars = ' .:-=+*#%@';
	let map = '';
	for (let yy = cy - 45; yy < cy + 45; yy++) {
		let row = '';
		for (let xx = cx - 45; xx < cx + 45; xx++) {
			const i = (yy * shot.width + xx) * 4;
			const lum = 0.299 * shot.data[i] + 0.587 * shot.data[i + 1] + 0.114 * shot.data[i + 2];
			row += lum < 25 ? '_' : chars[Math.min(chars.length - 1, Math.floor((lum / 255) * chars.length))];
		}
		map += row + '\n';
	}
	console.log('--- 90x90 map around erase dot (dense "_" centre = hole) ---');
	console.log(map);

	await browser.close();
}
main().then(
	() => console.log('DONE'),
	(e) => {
		console.error('FAILED', e && e.message ? e.message : e);
		process.exit(1);
	}
);