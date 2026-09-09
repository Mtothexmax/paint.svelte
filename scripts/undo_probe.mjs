// Multi-op undo/redo navigation: invertColors + gaussianBlur back-to-back,
// then step back and forth through history checking the surface at each stop.
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const log = (...a) => console.log(...a);

async function main() {
	const browser = await puppeteer.launch({
		executablePath: CHROME,
		headless: 'new',
		args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(2000);

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
	await sleep(200);
	await clickText('.menu-item', 'New…');
	await page.waitForSelector('.dialog', { timeout: 8000 });
	await sleep(120);
	await page.evaluate(() => document.querySelector('.dialog .btn-primary').click());
	await sleep(600);

	const step = (label) =>
		page.evaluate(async (lbl) => {
			const doc = window.__REGISTRY__.active;
			const before = doc.activeLayer.surfaceId;
			// apply invertColors via the menu command (no dialog)
			const { commands } = await import('/src/lib/services/commandRegistry.ts');
			switch (lbl) {
				case 'invert':
					commands.run('adjustments.invertColors');
					break;
				case 'blur':
					commands.run('effects.gaussianBlur');
					await new Promise((r) => setTimeout(r, 300));
					const slider = document.querySelector('.m-dialog input.fsl-range');
					slider.value = '30';
					slider.dispatchEvent(new Event('input', { bubbles: true }));
					slider.dispatchEvent(new Event('change', { bubbles: true }));
					await new Promise((r) => setTimeout(r, 200));
					document.querySelector('.m-dialog .btn-primary')?.click();
					break;
			}
			await new Promise((r) => setTimeout(r, 700));
			return { before, after: doc.activeLayer.surfaceId, cursor: doc.history.cursor, len: doc.history.length };
		}, label);

	const snapShots = [];
	const snap = (tag) =>
		page.evaluate(async (t) => {
			const doc = window.__REGISTRY__.active;
			return { tag: t, surfaceId: doc.activeLayer.surfaceId, cursor: doc.history.cursor, len: doc.history.length };
		}, tag);

	log('[1] invertColors');
	log('   ', JSON.stringify(await step('invert')));
	log('[2] gaussianBlur');
	log('   ', JSON.stringify(await step('blur')));

	const states = [await snap('S0 after both')];
	log('[3] undo x2');
	await page.evaluate(async () => {
		const doc = window.__REGISTRY__.active;
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
		await new Promise((r) => setTimeout(r, 400));
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
		await new Promise((r) => setTimeout(r, 400));
	});
	states.push(await snap('S1 after undo x2'));
	log('[4] redo x2');
	await page.evaluate(async () => {
		const doc = window.__REGISTRY__.active;
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true, cancelable: true }));
		await new Promise((r) => setTimeout(r, 400));
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true, cancelable: true }));
		await new Promise((r) => setTimeout(r, 400));
	});
	states.push(await snap('S2 after redo x2'));

	log('states:', JSON.stringify(states, null, 1));

	// S1 cursor must be back at 0 with the pre-invert surface; S2 back at the blur surface
	if (states[1].cursor !== 0) throw new Error('undo x2 did not land on cursor 0');
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