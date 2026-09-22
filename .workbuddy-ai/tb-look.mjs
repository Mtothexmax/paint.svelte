// Captures the Tool Options strip for a given tool and dumps the computed
// style of its key parts, so a restyle can be compared before/after with
// numbers instead of eyeballing. Usage: node tb-look.mjs <tag> [toolLabel]
import puppeteer from 'puppeteer-core';

const TAG = process.argv[2] ?? 'now';
const TOOL = process.argv[3] ?? 'Rectangle Select';
const URL = 'http://localhost:5173/';
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

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1800);

// Pick the tool by its aria-label.
await page.evaluate((label) => {
	document.querySelector(`.tool-btn[aria-label="${label}"]`)?.click();
}, TOOL);
await sleep(600);

// Optional: drag a selection so the primary action ("Crop to Selection")
// appears — it is hidden until something is selected.
if (process.argv[4] === 'sel') {
	const c = await page.evaluate(() => {
		const el = document.querySelector('div[style*="touch-action"]');
		const r = el.getBoundingClientRect();
		return { x: r.x, y: r.y, w: r.width, h: r.height };
	});
	await page.mouse.move(c.x + c.w * 0.3, c.y + c.h * 0.3);
	await page.mouse.down();
	await page.mouse.move(c.x + c.w * 0.6, c.y + c.h * 0.6, { steps: 12 });
	await page.mouse.up();
	await sleep(700);
}

const style = (sel) =>
	page.evaluate((s) => {
		const el = document.querySelector(s);
		if (!el) return null;
		const c = getComputedStyle(el);
		return {
			text: (el.textContent ?? '').trim().slice(0, 28),
			bg: c.backgroundImage !== 'none' ? c.backgroundImage.slice(0, 90) : c.backgroundColor,
			color: c.color,
			radius: c.borderRadius,
			shadow: c.boxShadow.slice(0, 90),
			border: c.border,
			font: `${c.fontSize}/${c.fontWeight}`,
			pad: c.padding,
			height: el.getBoundingClientRect().height.toFixed(1)
		};
	}, sel);

const parts = [
	['strip', '.options-strip'],
	['well', '.options-strip .seg'],
	['seg-on', '.options-strip .seg-btn.on'],
	['seg-off', '.options-strip .seg-btn:not(.on)'],
	['label', '.options-strip .aa-label'],
	['hint', '.options-strip .hint'],
	['divider', '.options-strip .tb-divider'],
	['split', '.options-strip .isp'],
	['num', '.options-strip .fsl-num'],
	['btn', '.options-strip .tb-btn:not(.primary)'],
	['primary', '.options-strip .tb-btn.primary']
];
console.log(`=== ${TAG} · tool "${TOOL}" ===`);
for (const [name, sel] of parts) {
	const s = await style(sel);
	console.log(
		s
			? `${name.padEnd(9)} h=${s.height.padStart(5)} r=${s.radius.padEnd(7)} ${s.font.padEnd(9)} color=${s.color.padEnd(20)} bg=${s.bg}`
			: `${name.padEnd(9)} (absent)`
	);
	if (s) console.log(`${' '.repeat(10)}shadow=${s.shadow}`);
}

// Screenshot just the strip.
const clip = await page.evaluate(() => {
	const r = document.querySelector('.options-strip').getBoundingClientRect();
	return { x: 0, y: Math.round(r.y) - 4, width: window.innerWidth, height: Math.round(r.height) + 8 };
});
await page.screenshot({ path: `${OUT}tb-${TAG}.png`, clip });
await page.screenshot({ path: `${OUT}tb-${TAG}-full.png` });

// Zoomed halves, so edges, gradients and hairlines can actually be judged.
const zoom = (x, w, name) =>
	page.screenshot({
		path: `${OUT}tb-${TAG}-${name}.png`,
		clip: { x, y: clip.y, width: w, height: clip.height }
	});
await zoom(0, 700, 'zleft');
await zoom(700, 700, 'zright');
console.log(`saved tb-${TAG}.png + zleft/zright`);
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);

await browser.close();
