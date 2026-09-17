// Verify the colour-bar / toolbar-picker changes:
//  1. a transparency slider exists BELOW the brightness slider
//  2. double-left on the brightness slider -> dark
//  3. double-right on the brightness slider -> bright
//  4. double-left on the transparency slider -> alpha 100 (opaque)
//  5. double-right on the transparency slider -> alpha 0 (invisible)
//  6. the swap button sits geometrically BETWEEN the fg and bg swatches
//  7. the reset button previews black + white
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const clickByText = async (t) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await new Promise((r) => setTimeout(r, 450));
};
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1600));

// --- helpers ---------------------------------------------------------------
const rectOf = (sel) =>
	page.evaluate((s) => {
		const el = document.querySelector(s);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
	}, sel);

/** The foreground colour as the app itself renders it (ColorBar swatch). */
const fgCss = () =>
	page.evaluate(() => getComputedStyle(document.querySelector('.cs-fg .cs-fill')).backgroundColor);

const parse = (css) => {
	const n = css.match(/[\d.]+/g)?.map(Number) ?? [];
	return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? Math.round(n[3] * 255) : 255 };
};

/** Two quick clicks with the same button on the same point. */
const doubleClick = async (x, y, button) => {
	await page.mouse.move(x, y);
	for (let i = 0; i < 2; i++) {
		await page.mouse.down({ button });
		await page.mouse.up({ button });
	}
	await new Promise((r) => setTimeout(r, 250));
};

const sliderState = () =>
	page.evaluate(() =>
		[...document.querySelectorAll('.fg-picker input[type=range]')].map((i) => ({
			cls: i.className.replace(/ svelte-\w+/, ''),
			label: i.getAttribute('aria-label'),
			title: i.getAttribute('title'),
			value: Number(i.value),
			top: Math.round(i.getBoundingClientRect().top)
		}))
	);

// --- 1. transparency slider below the brightness slider -------------------
const sliders = await sliderState();
const bright = sliders.find((s) => /brightness/i.test(s.label ?? ''));
const alpha = sliders.find((s) => /transparency/i.test(s.label ?? ''));

// --- 6. swap button between the swatches ----------------------------------
const geo = await page.evaluate(() => {
	const r = (s) => {
		const el = document.querySelector(s);
		if (!el) return null;
		const b = el.getBoundingClientRect();
		return { l: Math.round(b.left), r: Math.round(b.right), cx: Math.round(b.left + b.width / 2) };
	};
	return { fg: r('.cs-fg'), swap: r('.cs-swap'), bg: r('.cs-bg'), reset: r('.cs-reset') };
});

// --- 7. reset chip previews black + white ---------------------------------
const resetColors = await page.evaluate(() => {
	const fg = document.querySelector('.cs-reset-fg');
	const bg = document.querySelector('.cs-reset-bg');
	if (!fg || !bg) return null;
	return {
		fg: getComputedStyle(fg).backgroundColor,
		bg: getComputedStyle(bg).backgroundColor,
		fgBox: fg.getBoundingClientRect().width,
		bgBox: bg.getBoundingClientRect().width
	};
});

// --- 2/3. brightness slider double clicks ---------------------------------
const brightBox = await rectOf('.fg-bright-slider');
const alphaBox = await rectOf('.fg-alpha-slider');

// put the colour somewhere mid first, so the assertions are not vacuous
await page.evaluate(() => {
	const el = document.querySelector('.fg-bright-slider');
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '60');
	el.dispatchEvent(new Event('input', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 200));
const brightMid = parse(await fgCss());

const bx = brightBox.x + brightBox.w * 0.55;
await doubleClick(bx, brightBox.cy, 'left');
const brightAfterLeft = { slider: (await sliderState()).find((s) => /brightness/i.test(s.label))?.value, css: parse(await fgCss()) };

await doubleClick(bx, brightBox.cy, 'right');
const brightAfterRight = { slider: (await sliderState()).find((s) => /brightness/i.test(s.label))?.value, css: parse(await fgCss()) };

// --- 4/5. transparency slider double clicks -------------------------------
const ax = alphaBox.x + alphaBox.w * 0.5;
await doubleClick(ax, alphaBox.cy, 'right');
const alphaAfterRight = { slider: (await sliderState()).find((s) => /transparency/i.test(s.label))?.value, css: parse(await fgCss()) };

await doubleClick(ax, alphaBox.cy, 'left');
const alphaAfterLeft = { slider: (await sliderState()).find((s) => /transparency/i.test(s.label))?.value, css: parse(await fgCss()) };

// a single left click should still scrub (not be treated as a reset)
const scrubX = alphaBox.x + alphaBox.w * 0.35;
await page.mouse.move(scrubX, alphaBox.cy);
await page.mouse.down();
await page.mouse.up();
await new Promise((r) => setTimeout(r, 250));
const alphaScrubbed = { slider: (await sliderState()).find((s) => /transparency/i.test(s.label))?.value, css: parse(await fgCss()) };

await page.screenshot({ path: `${OUT}after-colorbar.png`, clip: { x: 0, y: 860, width: 260, height: 40 } });
await page.screenshot({ path: `${OUT}after-fg-picker.png`, clip: { x: 0, y: 500, width: 100, height: 400 } });

await browser.close();

console.log('sliders (in DOM order):', JSON.stringify(sliders, null, 1));
console.log('\nbrightness mid            :', brightMid);
console.log('brightness dbl-LEFT       :', brightAfterLeft);
console.log('brightness dbl-RIGHT      :', brightAfterRight);
console.log('transparency dbl-RIGHT    :', alphaAfterRight);
console.log('transparency dbl-LEFT     :', alphaAfterLeft);
console.log('transparency single click :', alphaScrubbed);
console.log('\ngeometry  fg/swap/bg      :', JSON.stringify(geo));
console.log('reset chip colours        :', JSON.stringify(resetColors));

const checks = [
	['brightness slider present', !!bright],
	['transparency slider present', !!alpha],
	['transparency slider is BELOW brightness', !!alpha && !!bright && alpha.top > bright.top],
	['dbl-left on brightness -> dark', brightAfterLeft.slider === 0 && brightAfterLeft.css.r === 0 && brightAfterLeft.css.g === 0 && brightAfterLeft.css.b === 0],
	['dbl-right on brightness -> bright', brightAfterRight.slider === 100 && brightAfterRight.css.r === 255 && brightAfterRight.css.g === 255 && brightAfterRight.css.b === 255],
	['dbl-left on transparency -> alpha 100', alphaAfterLeft.slider === 0 && alphaAfterLeft.css.a === 255],
	['dbl-right on transparency -> alpha 0', alphaAfterRight.slider === 100 && alphaAfterRight.css.a === 0],
	['single click still scrubs alpha', alphaScrubbed.slider > 5 && alphaScrubbed.slider < 95 && alphaScrubbed.css.a > 10 && alphaScrubbed.css.a < 250],
	['swap button between fg and bg', !!geo.fg && !!geo.swap && !!geo.bg && geo.swap.cx >= geo.fg.r - 2 && geo.swap.cx <= geo.bg.l + 2],
	['fg is left of bg', !!geo.fg && !!geo.bg && geo.fg.l < geo.bg.l],
	['reset chip = black + white', !!resetColors && resetColors.fg === 'rgb(0, 0, 0)' && resetColors.bg === 'rgb(255, 255, 255)']
];
console.log('');
for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
console.log(`\nerrors : ${errors.length ? errors.join(' | ') : 'none'}`);
