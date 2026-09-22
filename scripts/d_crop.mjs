// (D) tight crops + computed-style assertions for the three restyled
// surfaces: the resize dialog's fields, the Colour view's fields, the
// bottom-right zoom slider.
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

	await clickText('.menubar-btn', 'File');
	await sleep(250);
	await clickText('.menu-item', 'New');
	await sleep(400);
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
	if (!ready) throw new Error('editor never mounted');

	// ---- D1: resize dialog, crop the field column ------------------------
	await clickText('.menubar-btn', 'Image');
	await sleep(250);
	await clickText('.menu-item', 'Resize');
	await sleep(500);
	const d1 = await page.evaluate(() => {
		const box = document.querySelector('.m-dialog');
		if (!box) return null;
		const inputs = [...box.querySelectorAll('.field input')];
		const rects = inputs.map((i) => i.getBoundingClientRect());
		const x = Math.min(...rects.map((r) => r.left));
		const y = Math.min(...rects.map((r) => r.top));
		const x2 = Math.max(...rects.map((r) => r.right));
		const y2 = Math.max(...rects.map((r) => r.bottom));
		const cs = getComputedStyle(inputs[0]);
		return {
			clip: { x: x - 6, y: y - 6, width: x2 - x + 12, height: y2 - y + 12 },
			style: {
				background: cs.backgroundImage.slice(0, 90),
				border: cs.borderTopWidth + ' ' + cs.borderTopStyle,
				radius: cs.borderRadius,
				shadow: cs.boxShadow
			},
			grip: !!document.querySelector('.m-grip'),
			// plate colour right next to the field, for contrast
			plate: getComputedStyle(box.querySelector('.m-body')).backgroundColor
		};
	});
	log('[D1]', JSON.stringify(d1, null, 1));
	await page.screenshot({ path: 'd1-fields.png', clip: d1.clip });
	log('[D1] shot -> d1-fields.png');

	// blurred variant (no focus ring) for a fair read of the resting state
	await page.evaluate(() => document.querySelector('.m-dialog .m-body')?.click());
	await sleep(250);
	await page.screenshot({ path: 'd1-fields-rest.png', clip: d1.clip });
	log('[D1] shot -> d1-fields-rest.png');
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(300);

	// ---- D2: colour view --------------------------------------------------
	await (await page.$('.cs-fg'))?.click();
	await sleep(600);
	const d2 = await page.evaluate(() => {
		const f = document.querySelector('.cp-fields');
		const sv = document.querySelector('.cp-sv');
		const strip = document.querySelector('.cp-strip');
		const sw = document.querySelector('.cp-preview-swatch');
		if (!f) return null;
		const r = f.getBoundingClientRect();
		const pick = (el) => {
			if (!el) return null;
			const cs = getComputedStyle(el);
			return { border: cs.borderTopWidth, shadow: cs.boxShadow.slice(0, 70), radius: cs.borderRadius };
		};
		const num = document.querySelector('.cp-num input');
		return {
			clip: { x: r.x - 8, y: r.y - 8, width: r.width + 16, height: r.height + 16 },
			numInput: num
				? { bg: getComputedStyle(num).backgroundImage.slice(0, 80), border: getComputedStyle(num).borderTopWidth, shadow: getComputedStyle(num).boxShadow.slice(0, 70) }
				: null,
			sv: pick(sv), strip: pick(strip), swatch: pick(sw),
			head: (() => {
				const h = document.querySelector('.color-mode-head');
				const cs = getComputedStyle(h);
				return { borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomColor, shadow: cs.boxShadow.slice(0, 60), bg: cs.backgroundColor };
			})()
		};
	});
	log('[D2]', JSON.stringify(d2, null, 1));
	await page.screenshot({ path: 'd2-fields.png', clip: d2.clip });
	log('[D2] shot -> d2-fields.png');
	await page.keyboard.press('Escape');
	await sleep(300);

	// ---- D4: zoom slider, zoomed ----------------------------------------
	const d4 = await page.evaluate(() => {
		const sl = document.querySelector('.zb-slider');
		if (!sl) return null;
		const r = sl.getBoundingClientRect();
		const cs = getComputedStyle(sl);
		return {
			clip: { x: r.x - 10, y: r.y - 12, width: r.width + 20, height: r.height + 24 },
			appearance: cs.appearance,
			accent: cs.accentColor,
			fill: sl.getAttribute('style'),
			trackBg: getComputedStyle(sl, '::-webkit-slider-runnable-track').backgroundImage.slice(0, 120),
			trackSize: getComputedStyle(sl, '::-webkit-slider-runnable-track').backgroundSize,
			trackShadow: getComputedStyle(sl, '::-webkit-slider-runnable-track').boxShadow.slice(0, 80)
		};
	});
	log('[D4]', JSON.stringify(d4, null, 1));
	await page.screenshot({ path: 'd4-zoom-tight.png', clip: d4.clip });
	log('[D4] shot -> d4-zoom-tight.png');

	// zoomed-to-1% variant: proves the fill edge sits under the thumb at the
	// left extreme (the case the TRACK_W/THUMB_W compensation exists for)
	await page.evaluate(() => document.querySelector('.zb-pct')?.click());
	await sleep(200);
	await page.evaluate(() => {
		const sl = document.querySelector('.zb-slider');
		sl.value = '0';
		sl.dispatchEvent(new Event('input', { bubbles: true }));
	});
	await sleep(400);
	const min = await page.evaluate(() => document.querySelector('.zb-slider')?.getAttribute('style'));
	log('[D4] at 1%:', min);
	await page.screenshot({ path: 'd4-zoom-min.png', clip: d4.clip });

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
