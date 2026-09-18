// Audit EVERY effect dialog: list its controls, and flag anything that still
// looks like a leftover — a slider pair acting as an X/Y coordinate, or a
// slider whose label is an angle.
//
// The dialogs are discovered from the menu itself, so this cannot drift from
// the registry: it enumerates the submenus under Effects (hover-driven) and the
// flat entries under Adjustments, then opens each leaf.
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
// Wait for the app shell, then absorb any full-reload Vite has queued from
// recent source edits. Without the explicit reload those land mid-run and kill
// the execution context ("Execution context was destroyed ... navigation"),
// which here showed up as "discovered 0 candidate entries".
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
	await sleep(420);
};
const openMenu = async (label) => {
	await page.evaluate((l) => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === l)?.click();
	}, label);
	await sleep(260);
};
const closeMenu = async () => {
	await page.keyboard.press('Escape');
	await sleep(200);
};

/** Every effect dialog, as `{ group, leaf }`. */
const discover = async () => {
	const out = [];
	await openMenu('Effects');
	// top-level items of the Effects menu are the submenu headers
	const headers = await page.evaluate(() =>
		[...document.querySelectorAll('.menu-panel .menu-item')].map((b) =>
			b.textContent.replace(/\s+/g, ' ').trim()
		)
	);
	for (const h of headers) {
		const name = h.replace(/^[^\p{L}]+/u, '').replace(/[▸\s]+$/, '').trim();
		// clicking a header opens its submenu (never closes it)
		await page.evaluate((t) => {
			[...document.querySelectorAll('.menu-panel .menu-item')]
				.find((b) => b.textContent.includes(t))
				?.click();
		}, name);
		await sleep(260);
		const leaves = await page.evaluate(() =>
			[...document.querySelectorAll('.sub-panel .menu-item')].map((b) =>
				b.textContent.replace(/\s+/g, ' ').trim()
			)
		);
		for (const l of leaves) out.push({ group: name, leaf: l.replace(/^[^\p{L}]+/u, '').replace(/…$/, '').trim() });
	}
	await closeMenu();
	await openMenu('Adjustments');
	const flat = await page.evaluate(() =>
		[...document.querySelectorAll('.menu-panel .menu-item')].map((b) =>
			b.textContent.replace(/\s+/g, ' ').trim()
		)
	);
	await closeMenu();
	for (const f of flat)
		out.push({ group: 'Adjustments', leaf: f.replace(/^[^\p{L}]+/u, '').replace(/…$/, '').trim() });
	return out;
};

const shape = () =>
	page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		if (!d) return null;
		return {
			title: d.querySelector('.m-title-text')?.textContent?.trim() ?? null,
			pad: !!d.querySelector('.xyp-pad'),
			dial: !!d.querySelector('.ang-svg'),
			padLabel: d.querySelector('.xyp-label')?.textContent?.trim() ?? null,
			sliders: [...d.querySelectorAll('.fsl-label')].map((s) => s.textContent.trim()),
			colors: [...d.querySelectorAll('.fcol-label')].map((s) => s.textContent.trim()),
			checks: d.querySelectorAll('input[type=checkbox]').length
		};
	});

/** Open a leaf via the menu (Effects ▸ sub ▸ leaf, or a flat Adjustments item). */
const openLeaf = async (group, leaf) => {
	await openMenu(group === 'Adjustments' ? 'Adjustments' : 'Effects');
	if (group !== 'Adjustments') {
		await page.evaluate((t) => {
			[...document.querySelectorAll('.menu-panel .menu-item')]
				.find((b) => b.textContent.includes(t))
				?.click();
		}, group);
		await sleep(240);
		const sel = group === 'Adjustments' ? '.menu-panel .menu-item' : '.sub-panel .menu-item';
		await page.evaluate(
			(arg) => {
				[...document.querySelectorAll(arg.sel)].find((x) => x.textContent.includes(arg.leaf))?.click();
			},
			{ sel, leaf }
		);
	} else {
		await page.evaluate((t) => {
			[...document.querySelectorAll('.menu-panel .menu-item')].find((b) => b.textContent.includes(t))?.click();
		}, leaf);
	}
	// Poll for the dialog rather than a fixed sleep: the effect bundle is lazy
	// and the menu can need a beat after a previous dialog just closed. The
	// extra settle matters — returning the instant `.m-dialog` exists made the
	// caller close each dialog mid-mount and broke the open/close cadence, so
	// every later entry reported "no dialog appeared".
	for (let i = 0; i < 20; i++) {
		if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) {
			await sleep(600);
			return;
		}
		await sleep(150);
	}
	console.log(`  (no dialog appeared for ${group} ▸ ${leaf})`);
};

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);

const targets = await discover();
console.log(`discovered ${targets.length} candidate entries`);

const rows = [];
for (const t of targets) {
	await openLeaf(t.group, t.leaf);
	const s = await shape();
	rows.push({ ...t, shape: s });
	// dismiss without applying
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(320);
}

// ---- Polar Inversion: the newly added centre pad must actually drive it ----
const clip = await page.evaluate(() => {
	const r = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
});
const signature = async () => {
	const buf = await page.screenshot({ clip });
	return page.evaluate(async (arg) => {
		const img = new Image();
		img.src = 'data:image/png;base64,' + arg.data;
		await img.decode();
		const c = document.createElement('canvas');
		c.width = img.width;
		c.height = img.height;
		const ctx = c.getContext('2d');
		ctx.drawImage(img, 0, 0);
		const px = ctx.getImageData(0, 0, c.width, c.height).data;
		let s = 0;
		for (let i = 0; i < px.length; i += 4) s += px[i] + px[i + 1] + px[i + 2];
		return Math.round(s / (px.length / 4) / 3);
	}, { data: buf.toString('base64') });
};
const paintSomething = async () => {
	// something asymmetric to invert
	await page.evaluate(() => document.querySelector('button[aria-label="Paintbrush"]')?.click());
	await sleep(250);
	await page.mouse.move(300, 200);
	await page.mouse.down();
	await page.mouse.move(560, 420, { steps: 14 });
	await page.mouse.up();
	await sleep(500);
};
await paintSomething();

let polar = { opened: null, pad: false, xy: [], defaultChanged: false, movedChanged: false, uniformLive: false };
await openLeaf('Distort', 'Polar Inversion');
{
	const s = await shape();
	polar.opened = s?.title ?? null;
	polar.pad = !!s?.pad;
	polar.xy = await page.evaluate(() =>
		[...document.querySelectorAll('.m-dialog .xyp-num')].map((i) => Number(i.value))
	);
	const before = await signature();
	await page.evaluate(() => {
		[...document.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'))?.click();
	});
	await sleep(1100);
	polar.defaultChanged = (await signature()) !== before;

	// now move the centre and re-apply on the result
	await openLeaf('Distort', 'Polar Inversion');
	/** The pad's box, re-opening the dialog once if it has not rendered yet. */
	const padBox = async () => {
		for (let attempt = 0; attempt < 2; attempt++) {
			const box = await page.evaluate(() => {
				const el = document.querySelector('.xyp-pad');
				if (!el) return null;
				const b = el.getBoundingClientRect();
				return { x: b.x, y: b.y, w: b.width, h: b.height };
			});
			if (box) return box;
			await openLeaf('Distort', 'Polar Inversion');
		}
		return null;
	};
	const pad = await padBox();
	await page.mouse.move(pad.x + 3, pad.y + 3);
	await page.mouse.down();
	await page.mouse.move(pad.x + 3, pad.y + 3, { steps: 4 });
	await page.mouse.up();
	await sleep(400);
	polar.movedTo = await page.evaluate(() =>
		[...document.querySelectorAll('.m-dialog .xyp-num')].map((i) => Number(i.value))
	);
	const beforeMoved = await signature();
	await page.evaluate(() => {
		[...document.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'))?.click();
	});
	await sleep(1100);
	const afterMoved = await signature();
	polar.uniformLive = afterMoved !== beforeMoved;
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(300);
}

await browser.close();

// ---- report --------------------------------------------------------------
const withDialog = rows.filter((r) => r.shape);
console.log(`\n${withDialog.length} of ${rows.length} entries opened a dialog\n`);
const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('group', 13)}${pad('effect', 22)}pad   dial  colors  controls`);
for (const r of withDialog) {
	const s = r.shape;
	const extra = [...s.sliders.map((l) => `slider:${l}`), ...(s.pad ? [`pad:${s.padLabel}`] : [])];
	if (s.dial) extra.push('dial');
	if (s.colors.length) extra.push(`color:${s.colors.join('/')}`);
	console.log(
		`${pad(r.group, 13)}${pad(s.title ?? r.leaf, 22)}${pad(s.pad, 6)}${pad(s.dial, 6)}${pad(s.colors.length, 8)}${extra.join(', ')}`
	);
}

// A leftover is a slider whose label is a coordinate or an angle.
const COORD = /^(Center|Offset|Position|Focal)?\s*[XY]$/i;
const ANGLE = /\b(angle|rotation|direction|azimuth)\b/i;
const leftovers = [];
for (const r of withDialog) {
	const s = r.shape;
	const bad = s.sliders.filter((l) => COORD.test(l) || ANGLE.test(l));
	if (bad.length) leftovers.push(`${s.title}: ${bad.join(', ')}`);
	// two sliders that are a coordinate pair by name (Horizontal/Vertical, Left/Top…)
	const pairish = s.sliders.filter((l) => /horizontal|vertical|left|top/i.test(l));
	if (pairish.length >= 2) leftovers.push(`${s.title}: possible pair ${pairish.join(' + ')}`);
}

console.log(`\nentries that opened no dialog (instant effects, expected): ${rows.length - withDialog.length}`);
console.log(`\nleftover sliders: ${leftovers.length ? '\n  ' + leftovers.join('\n  ') : 'none'}`);

console.log(
	`\nPolar Inversion: opened=${polar.opened} pad=${polar.pad} defaultXY=[${polar.xy}] ` +
		`movedTo=[${polar.movedTo}] default-apply-changed=${polar.defaultChanged} move-changes-render=${polar.uniformLive}`
);

const checks = [
	['every enumerated entry opened a dialog or is instant', withDialog.length === rows.length - 5],
	['no leftover coordinate/angle slider anywhere', leftovers.length === 0],
	['Polar Inversion now has a Centre pad', polar.pad === true],
	['Polar Inversion defaults to the frame centre (50, 50)', polar.xy[0] === 50 && polar.xy[1] === 50],
	['applying Polar Inversion changes the canvas', polar.defaultChanged],
	['Polar Inversion pad top-left reaches (0, 0)  [Y down]', polar.movedTo?.[0] <= 5 && polar.movedTo?.[1] <= 5],
	['moving the Polar Inversion centre changes the render', polar.uniformLive]
];
console.log('');
for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
console.log(`errors : ${errors.length ? errors.join(' | ') : 'none'}`);
