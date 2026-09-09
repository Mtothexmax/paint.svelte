// Decisive restore probe: white-bg doc + BLACK stroke only → ASCII maps.
// Checks: (1) stroke visible pre-reload, (2) restored pixels visible post-reload,
// (3) new strokes paint post-reload, (4) IDB record content.
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

// ASCII luminance map of a region; '_' = near-black(<25), chars = scaled lum.
function lumMap(png, x, y, w, h) {
	const chars = ' .:-=+*#%@';
	let out = '';
	for (let yy = y; yy < y + h; yy++) {
		let row = '';
		for (let xx = x; xx < x + w; xx++) {
			const i = (yy * png.width + xx) * 4;
			const lum = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
			row += lum < 25 ? '_' : chars[Math.min(chars.length - 1, Math.floor((lum / 255) * chars.length))];
		}
		out += row + '\n';
	}
	return out;
}

async function newWhiteDoc(page) {
	await clickByText(page, '.menubar-btn', 'File');
	await sleep(250);
	await clickByText(page, '.menu-item', 'New…');
	await page.waitForSelector('.dialog', { timeout: 8000 });
	await sleep(120);
	// Choose the White background radio, then Create
	await page.evaluate(() => {
		const radios = [...document.querySelectorAll('.dialog input[type=radio]')];
		const white = radios.find((r) => r.value === 'white');
		white && white.click();
	});
	await page.evaluate(() => document.querySelector('.dialog .btn-primary').click());
	await sleep(600);
}

async function canvasBox(page) {
	return page.evaluate(() => {
		const bb = document.querySelector('canvas').getBoundingClientRect();
		return { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
	});
}

async function paintStroke(page, x, y, len) {
	await page.mouse.move(x, y);
	await page.mouse.down();
	for (let i = 1; i <= 20; i++) await page.mouse.move(x + Math.round((len * i) / 20), y, { steps: 2 });
	await page.mouse.up();
	await sleep(1200);
}

async function idbSnapshot() {
	// returns compact info about what's stored
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
	await sleep(1200);

	// 1) White-bg doc + black stroke on FIRST load
	await newWhiteDoc(page);
	let bb = await canvasBox(page);
	// paint at fixed viewport coords; expect band top ≈ bb.y+300
	await paintStroke(page, Math.round(bb.x + 150), Math.round(bb.y + 300), 420);
	const name = await page.evaluate(() => window.__REGISTRY__.active?.name);
	console.log('doc:', name, 'canvas box:', JSON.stringify({ x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(bb.w), h: Math.round(bb.h) }));

	let shot = PNG.sync.read(await page.screenshot());
	const strokeScreenY = Math.round(bb.y + 300);
	console.log('--- PRE-RELOAD stroke region (expect solid "_" band inside "@@@" white) ---');
	console.log(lumMap(shot, Math.round(bb.x + 100), strokeScreenY - 40, 60, 90));

	// 2) wait for the session write to land, then inspect stored PNG
	await sleep(1200);
	const stored = await page.evaluate(async () => {
		const db = await new Promise((res, rej) => {
			const r = indexedDB.open('paint.svelte', 2);
			r.onsuccess = () => res(r.result);
			r.onerror = () => rej(r.error);
		});
		const tx = db.transaction('documents', 'readonly');
		const req = tx.objectStore('documents').getAll();
		const records = await new Promise((res) => {
			req.onsuccess = () => res(req.result);
		});
		db.close();
		return records.map((rec) => ({ name: rec.name, w: rec.width, h: rec.height, dirty: rec.dirty, active: rec.active, layers: rec.layers.length, pngBytes: rec.layers.map((l) => l.png.size) }));
	});
	console.log('stored records:', JSON.stringify(stored));

	// 3) reload → restore
	await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
	await sleep(4000);
	const tabsAfter = await page.evaluate(() => [...document.querySelectorAll('.fltab-name')].map((e) => e.textContent.trim()));
	console.log('after reload tabs:', JSON.stringify(tabsAfter));
	bb = await canvasBox(page);
	shot = PNG.sync.read(await page.screenshot());
	console.log('--- POST-RELOAD restored region at same coords (expect identical band) ---');
	console.log(lumMap(shot, Math.round(bb.x + 100), strokeScreenY - 40, 60, 90));

	// 4) paint a new black stroke on the restored doc (different x)
	await paintStroke(page, Math.round(bb.x + 700), Math.round(bb.y + 300), 420);
	shot = PNG.sync.read(await page.screenshot());
	console.log('--- POST-RELOAD new stroke region (expect band at x≈700+) ---');
	console.log(lumMap(shot, Math.round(bb.x + 650), strokeScreenY - 40, 60, 90));

	// 5) erase a hole through the bigger stroke? (eraser preview check)
	// select eraser via toolbar
	await page.evaluate(() => {
		const btn = [...document.querySelectorAll('.tool-btn')].find((b) => (b.getAttribute('aria-label') || '').toLowerCase().includes('eraser'));
		btn && btn.click();
	});
	await sleep(200);
	await paintStroke(page, Math.round(bb.x + 700) + 150, Math.round(bb.y + 300), 2); // click-erase (dot) in the middle of the big stroke
	shot = PNG.sync.read(await page.screenshot());
	console.log('--- ERASER preview region (hole should show checker/white, NOT opaque checker rect) ---');
	console.log(lumMap(shot, Math.round(bb.x + 650), strokeScreenY - 40, 60, 90));

	await browser.close();
}
main().then(
	() => console.log('DONE'),
	(e) => {
		console.error('FAILED', e && e.message ? e.message : e);
		process.exit(1);
	}
);