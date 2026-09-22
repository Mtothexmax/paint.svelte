// Re-verify the Highlights/Shadows direction fix on the CURRENT app.
//
// Two things the old probe got wrong, both discovered by inspection:
//   1. FilterSlider has no input[type=range] any more — `.fsl-range` matches
//      nothing, so `setSlider` was a silent no-op. Drive `.fsl-input` instead.
//   2. The Effects menu is now <EffectBrowserMenu> with different markup, so
//      building the base via Effects > Render > Clouds did nothing. Build the
//      base with the Paint Bucket instead (toolbar, not a menu).
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickByText = async (t) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await sleep(450);
};
// --- the two fixed drivers -------------------------------------------------
const setSlider = async (i, v) => {
	const ok = await page.evaluate(
		(arg) => {
			const el = [...document.querySelectorAll('.m-dialog .fsl-input')][arg.i];
			if (!el) return false;
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(arg.v));
			el.dispatchEvent(new Event('input', { bubbles: true }));
			return true;
		},
		{ i, v }
	);
	await sleep(600);
	return ok;
};
const readSliders = async () =>
	page.evaluate(() =>
		[...document.querySelectorAll('.m-dialog .fsl-track')].map((t) => Number(t.getAttribute('aria-valuenow')))
	);
const openAdjustment = async (leaf) => {
	await page.evaluate(() => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Adjustments')?.click();
	});
	await sleep(300);
	await page.evaluate((l) => {
		[...document.querySelectorAll('.menu-panel .menu-item')].find((x) => x.textContent.includes(l))?.click();
	}, leaf);
	for (let i = 0; i < 20; i++) {
		if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) {
			await sleep(500);
			return true;
		}
		await sleep(150);
	}
	return false;
};
const applyDialog = async () => {
	const clicked = await page.evaluate(() => {
		const b = [...document.querySelectorAll('.m-footer button')].find((x) => x.textContent.includes('Apply'));
		if (b && !b.disabled) {
			b.click();
			return true;
		}
		return false;
	});
	await sleep(1100);
	return clicked;
};
const escape = async () => {
	await page.keyboard.press('Escape');
	await sleep(250);
};
const undo = async () => {
	await page.keyboard.down('Control');
	await page.keyboard.press('z');
	await page.keyboard.up('Control');
	await sleep(800);
};

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1900);
const host = await page.evaluate(() => {
	const r = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
});
const clip = host;
const cx = host.x + Math.round(host.width / 2);
const cy = host.y + Math.round(host.height / 2);

// --- build a bright, uniform base without the Effects menu ----------------
const colours = await page.evaluate(() => {
	const read = (s) => {
		const e = document.querySelector(s);
		return e ? getComputedStyle(e).backgroundColor : null;
	};
	return { fg: read('.cs-fg .cs-fill'), bg: read('.cs-bg .cs-fill') };
});
console.log(`colours: fg=${colours.fg} bg=${colours.bg}`);

// Swap so the foreground takes the (normally white) background colour.
await page.keyboard.press('x');
await sleep(350);
const swapped = await page.evaluate(() => {
	const read = (s) => {
		const e = document.querySelector(s);
		return e ? getComputedStyle(e).backgroundColor : null;
	};
	return { fg: read('.cs-fg .cs-fill'), bg: read('.cs-bg .cs-fill') };
});
console.log(`after X:  fg=${swapped.fg} bg=${swapped.bg}`);

await page.evaluate(() => document.querySelector('button[aria-label="Paint Bucket"]')?.click());
await sleep(400);
await page.mouse.click(cx, cy);
await sleep(900);

// The bucket fills with the foreground, which is black — and on a black base
// the highlight mask (pow(luma,3)) is legitimately zero, so Highlights would
// look dead. Lift it to a BRIGHT tone first, via the Adjustments menu (which
// still uses .menu-panel — only Effects moved to EffectBrowserMenu). Two
// passes, because brightness maxes out around +100 and one pass off black
// only reaches ~56.
for (let pass = 0; pass < 2; pass++) {
	const opened = await openAdjustment('Brightness / Contrast');
	const set = await setSlider(0, 100);
	const applied = await applyDialog();
	await escape();
	console.log(`brighten pass ${pass + 1}: opened=${opened} setBrightness=${set} applied=${applied}`);
	await sleep(400);
}

const shot = async () => (await page.screenshot({ clip })).toString('base64');
const stats = async (ref, cur) =>
	page.evaluate(
		async (arg) => {
			const load = async (b64) => {
				const img = new Image();
				img.src = 'data:image/png;base64,' + b64;
				await img.decode();
				const c = document.createElement('canvas');
				c.width = img.width;
				c.height = img.height;
				const ctx = c.getContext('2d');
				ctx.drawImage(img, 0, 0);
				return { d: ctx.getImageData(0, 0, c.width, c.height).data };
			};
			const A = await load(arg.a);
			const B = await load(arg.b);
			let n = 0;
			let sa = 0;
			let sb = 0;
			for (let i = 0; i < A.d.length; i += 4) {
				const la = (A.d[i] + A.d[i + 1] + A.d[i + 2]) / 3;
				const lb = (B.d[i] + B.d[i + 1] + B.d[i + 2]) / 3;
				sa += la;
				sb += lb;
				if (Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]) > 24) n++;
			}
			const px = A.d.length / 4;
			return { n, meanA: sa / px, meanB: sb / px };
		},
		{ a: ref, b: cur }
	);

const base = await shot();
const bs = await stats(base, base);
console.log(`base mean luminance ${bs.meanA.toFixed(1)}\n`);

if (bs.meanA < 100) {
	console.log('WARN: base is not bright — the highlight mask will be weak. Check the fill colour.');
}

// Guard against a stale driver (the failure mode that wasted the last run).
{
	await openAdjustment('Highlights / Shadows');
	const n = (await readSliders()).length;
	await escape();
	if (n !== 2) {
		console.log(`FAIL  driver found ${n} sliders, expected 2 — probe is stale`);
		await browser.close();
		process.exit(1);
	}
	console.log(`driver OK: ${n} sliders found\n`);
}

const CASES = [
	[90, 0, 'Highlights +90', 'up'],
	[-90, 0, 'Highlights -90', 'down'],
	[0, 90, 'Shadows +90', 'up'],
	[0, -90, 'Shadows -90', 'down']
];
let pass = 0;
let fail = 0;
const means = {};
for (const [hl, sh, label, dir] of CASES) {
	await openAdjustment('Highlights / Shadows');
	await setSlider(0, hl);
	await setSlider(1, sh);
	const read = await readSliders();
	const clicked = await applyDialog();
	const s = await stats(base, await shot());
	await escape();
	await undo();
	means[label] = s.meanB;
	const moved = s.meanB - s.meanA;
	// Both sliders are masked by the base's own luminance:
	//   Highlights acts on pow(luma, 3), Shadows on pow(1 - luma, 3).
	// On a bright base the shadow mask is ~0.03, so "Shadows +90" is
	// legitimately a near no-op — requiring it to move would be a wrong
	// expectation, not a bug (on a BLACK base the same case moves the mean by
	// ~200). Only demand movement when the relevant mask is actually awake.
	const luma = bs.meanA / 255;
	const mask = label.startsWith('Highlights') ? Math.pow(luma, 3) : Math.pow(1 - luma, 3);
	const awake = mask > 0.05;
	const rightWay = dir === 'up' ? moved > 0.3 : moved < -0.3;
	const ok = clicked && (!awake || rightWay);
	ok ? pass++ : fail++;
	const note = awake ? '' : `  [mask ${mask.toFixed(3)} — near no-op expected here]`;
	console.log(
		`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(15)} set=${JSON.stringify(read)} apply=${String(clicked).padEnd(5)} diff=${String(s.n).padStart(6)}  mean ${s.meanA.toFixed(1)} -> ${s.meanB.toFixed(1)}  (want ${dir}, moved ${moved >= 0 ? '+' : ''}${moved.toFixed(1)})${note}`
	);
}
const hl2 = means['Highlights +90'] > means['Highlights -90'];
hl2 ? pass++ : fail++;
console.log(`\n${hl2 ? 'PASS' : 'FAIL'}  Highlights +90 brighter than -90  (+90 ${means['Highlights +90'].toFixed(1)} vs -90 ${means['Highlights -90'].toFixed(1)})`);

await browser.close();
console.log(`\n${pass}/${pass + fail} PASS`);
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
process.exit(fail ? 1 : 0);
