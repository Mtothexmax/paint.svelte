// Verifies the auto-registered effect system end-to-end in a real (headless)
// Chrome with SwiftShader WebGL:
//   1. import.meta.glob discovered exactly the expected effects.
//   2. Every effect's custom shader COMPILES (live preview renders without
//      shader/program console errors or uncaught exceptions).
//   3. Applying an effect swaps the layer surface through the undoable pipe.
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

	const errors = [];
	page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
	page.on('console', (m) => {
		const t = m.text();
		const benign =
			/Failed to load resource/.test(t) ||
			/GPU stall due to ReadPixels/.test(t) ||
			/\[vite\]/.test(t);
		if (m.type() === 'error') {
			if (!benign) errors.push('console.error: ' + t);
		} else if (m.type() === 'warning') {
			// Shader compilation diagnostics arrive as warnings with the GLSL
			// info log; those are the real signal for a broken effect.
			if (/shader|program|uniform|glGet|WebGL/i.test(t) && !/GPU stall/.test(t))
				errors.push('console.warn: ' + t);
		}
	});

	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(2000);

	// --- Step 1: registry discovery ---------------------------------------
	const discovery = await page.evaluate(async () => {
		const mod = await import('/src/lib/effects/index.ts');
		return {
			effects: mod.effects.map((e) => ({ id: e.id, label: e.label, menu: e.menu, hasParams: e.params.length > 0 })),
			menus: mod.effectMenusWithEntries.map((m) => ({ label: m.label, count: m.effects.length }))
		};
	});
	log('[1] discovered ids:', JSON.stringify(discovery.effects.map((e) => e.id)));
	log('    menus:', JSON.stringify(discovery.menus));
	const EXPECTED = [
		'gaussianBlur', 'motionBlur', 'radialBlur', 'rotaryBlur', 'smartBlur',
		'surfaceBlur', 'unfocus', 'zoomBlur', 'frostedGlass',
		'bulge', 'crystalize', 'pixelate', 'polarInversion', 'smudge',
		'tileReflection', 'twist', 'warp',
		'addNoise', 'median', 'reduceNoise',
		'glow', 'redEyeRemoval', 'sharpen', 'softenPortrait',
		'clouds', 'flames', 'juliaFractal', 'mandelbrotFractal', 'turbulence',
		'edgeDetect', 'emboss', 'outline', 'relief',
		'bevel', 'feather', 'shadow',
		'autoLevel', 'blackAndWhite', 'brightCont', 'curves', 'exposure',
		'highlightsShadows', 'hueSat', 'invertAlpha', 'levels', 'posterize',
		'sepia', 'threshold'
	];
	const missing = EXPECTED.filter((id) => !discovery.effects.some((e) => e.id === id));
	if (missing.length) throw new Error('registry missing: ' + missing.join(','));

	// --- Step 2: create a document so effects have a target ----------------
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
	const docName = await page.evaluate(() => window.__REGISTRY__.active?.name || '(none)');
	log('[2] created doc:', docName);

	// --- Step 3: open every effect dialog (forces shader compile) ----------
	async function openEffect(menuLabel, effectLabel, hasParams, direct) {
		// Adjustments lives in its own top-level menu; everything else nests in
		// submenus under Effects.
		await page.evaluate((topMenu) =>
			[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === topMenu)?.click(),
			direct ? 'Adjustments' : 'Effects'
		);
		await sleep(250);
		if (direct) {
			const itemText = hasParams ? effectLabel + '…' : effectLabel;
			const clicked = await page.evaluate(
				(lbl) => {
					const b = [...document.querySelectorAll('.menu-panel .menu-item .menu-text')]
						.find((s) => (s.textContent || '').trim() === lbl)?.closest('.menu-item');
					if (!b) return false;
					b.click();
					return true;
				},
				itemText
			);
			if (!clicked) throw new Error('adjustment menu item not found: ' + itemText);
			await page.waitForSelector('.m-dialog', { timeout: 8000 });
			await sleep(900);
			const title = await page.evaluate(() => {
				const d = document.querySelector('.m-dialog');
				return d ? (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) : '';
			});
			await page.evaluate(() => {
				const btn = document.querySelector('.m-dialog .btn-secondary');
				if (btn) btn.click();
				else document.querySelector('.m-dialog')?.remove();
			});
			await sleep(250);
			return title;
		}
		const subOpen = await page.evaluate((lbl) => {
			const b = [...document.querySelectorAll('.menu-item .menu-text')]
				.find((s) => s.textContent.trim() === lbl)?.closest('.sub-holder');
			if (!b) return false;
			b.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
			return true;
		}, menuLabel);
		if (!subOpen) throw new Error('submenu not found: ' + menuLabel);
		await sleep(250);
		const itemText = hasParams ? effectLabel + '…' : effectLabel;
		const clicked = await page.evaluate(
			(lbl) => {
				const b = [...document.querySelectorAll('.menu-panel.sub-panel .menu-item .menu-text')]
					.find((s) => (s.textContent || '').trim() === lbl)?.closest('.menu-item');
				if (!b) return false;
				b.click();
				return true;
			},
			itemText
		);
		if (!clicked) throw new Error('effect menu item not found: ' + itemText);
		await page.waitForSelector('.m-dialog', { timeout: 8000 });
		await sleep(900); // give the preview render + shader compile time
		const title = await page.evaluate(() => {
			const d = document.querySelector('.m-dialog');
			return d ? (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) : '';
		});
		await page.evaluate(() => {
			const btn = document.querySelector('.m-dialog .btn-secondary');
			if (btn) btn.click();
			else document.querySelector('.m-dialog')?.remove();
		});
		await sleep(250);
		return title;
	}

	for (const e of discovery.effects) {
		const beforeErr = errors.length;
		const direct = e.menu === 'Adjustments';
		const title = await openEffect(e.menu, e.label, e.hasParams, direct);
		const newErrs = errors.slice(beforeErr);
		log(`[3] ${e.id} (${e.menu}): dialog=${JSON.stringify(title)} shaderErrors=${newErrs.length ? JSON.stringify(newErrs) : 0}`);
	}

	// --- Step 4: apply Gaussian Blur and verify the surface swap -----------
	const applied = await page.evaluate(async () => {
		const { commands } = await import('/src/lib/services/commandRegistry.ts');
		const { effectById } = await import('/src/lib/effects/index.ts');
		const { openDialog } = await import('/src/lib/services/dialogService.ts');
		const def = effectById('gaussianBlur');
		const doc = window.__REGISTRY__.active;
		const beforeId = doc.activeLayer.surfaceId;
		const histBefore = doc.history.length;
		commands.run('effects.gaussianBlur');
		await new Promise((r) => setTimeout(r, 400));
		const slider = document.querySelector('.m-dialog input.fsl-range');
		if (!slider) return { ok: false, reason: 'no fsl-range' };
		slider.value = '30';
		slider.dispatchEvent(new Event('input', { bubbles: true }));
		slider.dispatchEvent(new Event('change', { bubbles: true }));
		await new Promise((r) => setTimeout(r, 300));
		document.querySelector('.m-dialog .btn-primary')?.click();
		await new Promise((r) => setTimeout(r, 800));
		return {
			surfaceChanged: doc.activeLayer.surfaceId !== beforeId,
			historyGrew: doc.history.length > histBefore,
			beforeId,
			afterId: doc.activeLayer.surfaceId
		};
	});
	log('[4] apply gaussianBlur:', JSON.stringify(applied));
	if (!applied.ok && applied.reason) throw new Error('apply block failed: ' + applied.reason);
	if (!applied.surfaceChanged || !applied.historyGrew) {
		throw new Error('apply pipeline did not swap surface / record history: ' + JSON.stringify(applied));
	}

	// --- Summary -----------------------------------------------------------
	const shaderish = errors.filter((e) => /shader|program|uniform|compile|location|invalid|webgl/i.test(e)).slice(0, 8);
	log('[5] total captured errors:', errors.length, shaderish.length ? JSON.stringify(shaderish) : 'none');
	if (errors.length) log('    all errors:', JSON.stringify(errors.slice(0, 20)));
	if (errors.length) throw new Error('page errors during effect preview/apply: ' + JSON.stringify(shaderish));

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