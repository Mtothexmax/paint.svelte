// Isolate four suspicious results from the smoke test:
//   - Highlights / Shadows : Apply enabled + clicked, but diff 0
//   - Posterize            : same
//   - Median / Reduce Noise: reported "no dialog", yet the canvas changed
//
// Each is opened on a fresh colourful base with a STRONG parameter value, so a
// "no change" cannot be blamed on a subtle default. Median and Reduce Noise are
// also opened as the very first action after the document is created, to see
// whether the dialog opens at all in isolation.
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
const openMenu = async (label) => {
	await page.evaluate((l) => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === l)?.click();
	}, label);
	await sleep(260);
};
const escape = async () => {
	await page.keyboard.press('Escape');
	await sleep(200);
};
/** Hover the submenu header (the menu opens on pointerenter) then click the leaf. */
const openLeaf = async (group, leaf) => {
	await openMenu(group === 'Adjustments' ? 'Adjustments' : 'Effects');
	if (group !== 'Adjustments') {
		await page.evaluate((t) => {
			[...document.querySelectorAll('.menu-panel .menu-item')].find((b) => b.textContent.includes(t))?.click();
		}, group);
		await sleep(300);
	}
	const sel = group === 'Adjustments' ? '.menu-panel .menu-item' : '.sub-panel .menu-item';
	const seen = await page.evaluate(
		(arg) => [...document.querySelectorAll(arg.sel)].map((x) => x.textContent.replace(/\s+/g, ' ').trim()),
		{ sel }
	);
	await page.evaluate(
		(arg) => {
			[...document.querySelectorAll(arg.sel)].find((x) => x.textContent.includes(arg.leaf))?.click();
		},
		{ sel, leaf }
	);
	for (let i = 0; i < 20; i++) {
		if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) {
			await sleep(500);
			return { dialog: true, seen };
		}
		await sleep(150);
	}
	return { dialog: false, seen };
};
const dialogInfo = () =>
	page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		if (!d) return null;
		return {
			title: d.querySelector('.m-title-text')?.textContent?.trim() ?? null,
			sliders: [...d.querySelectorAll('.fsl-label')].map((s) => s.textContent.trim()),
			ranges: [...d.querySelectorAll('.fsl-range')].map((r) => ({ min: Number(r.min), max: Number(r.max), v: Number(r.value) })),
			applyDisabled: [...d.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'))?.disabled ?? null
		};
	});
/** Set slider `i` to `v`, then settle so the derived noop flushes. */
const setSlider = async (i, v) => {
	await page.evaluate(
		(arg) => {
			const el = [...document.querySelectorAll('.m-dialog .fsl-range')][arg.i];
			if (!el) return;
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(arg.v));
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		},
		{ i, v }
	);
	await sleep(600);
};
const applyDialog = async () => {
	const clicked = await page.evaluate(() => {
		const btn = [...document.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'));
		if (btn && !btn.disabled) {
			btn.click();
			return true;
		}
		return false;
	});
	await sleep(1200);
	return clicked;
};
const undo = async () => {
	await page.keyboard.down('Control');
	await page.keyboard.press('z');
	await page.keyboard.up('Control');
	await sleep(800);
};
const shot = async () => (await page.screenshot({ clip })).toString('base64');
const diffCount = async (ref, cur) =>
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
				return ctx.getImageData(0, 0, c.width, c.height).data;
			};
			const A = await load(arg.a);
			const B = await load(arg.b);
			let n = 0;
			for (let i = 0; i < A.length; i += 4) {
				const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
				if (d > 24) n++;
			}
			return n;
		},
		{ a: ref, b: cur }
	);

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);
const clip = await page.evaluate(() => {
	const b = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
});

// ---- 1. Median / Reduce Noise: do they open a dialog at all? --------------
console.log('=== dialog opening, as the FIRST action after New ===');
for (const leaf of ['Median', 'Reduce Noise', 'Add Noise']) {
	const r = await openLeaf('Noise', leaf);
	const info = r.dialog ? await dialogInfo() : null;
	console.log(
		`${leaf.padEnd(13)} dialog=${r.dialog}  title=${info?.title}  sliders=[${info?.sliders?.join(', ')}]  applyDisabled=${info?.applyDisabled}`
	);
	console.log(`   submenu items seen: [${r.seen.join(' | ')}]`);
	await escape();
	await undo();
}

// ---- 2. colourful base ----------------------------------------------------
await openLeaf('Render', 'Julia Fractal');
await applyDialog();
await sleep(900);
const baseline = await shot();
console.log(`\n=== strong-value tests on a Julia base ===`);

const CASES = [
	['Adjustments', 'Highlights / Shadows', 0, 90],
	['Adjustments', 'Highlights / Shadows', 1, 90],
	['Adjustments', 'Posterize', 0, 2],
	['Adjustments', 'Threshold', 0, 128],
	['Adjustments', 'Hue / Saturation', 1, 100]
];
for (const [group, leaf, idx, val] of CASES) {
	const r = await openLeaf(group, leaf);
	if (!r.dialog) {
		console.log(`UNCHANGED ${leaf} — no dialog`);
		await escape();
		continue;
	}
	const info = await dialogInfo();
	await setSlider(idx, val);
	const clicked = await applyDialog();
	const n = await diffCount(baseline, await shot());
	await escape();
	await undo();
	const restored = await diffCount(baseline, await shot());
	console.log(
		`${n > 200 ? 'CHANGED  ' : 'UNCHANGED'} ${leaf.padEnd(22)} slider[${idx}]=${val} apply=${clicked} diff=${n}` +
			`  ranges=[${info.ranges.map((x) => `${x.min}..${x.max}`).join(', ')}]` +
			(restored > 200 ? `  [undo left ${restored}px]` : '')
	);
}

await browser.close();
console.log(`\nerrors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
process.exit(0);
