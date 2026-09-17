// Screenshot the two colour surfaces I am about to change:
//  - the fg/bg swatch stack + swap/reset buttons in the status strip
//  - the toolbar colour picker (hue/sat area + brightness slider)
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';
const TAG = process.argv[3] ?? 'before';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 3 });
const errors = [];
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

const clip = async (sel, name, pad = 6) => {
	const box = await page.evaluate((s) => {
		const el = document.querySelector(s);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: r.x, y: r.y, width: r.width, height: r.height };
	}, sel);
	if (!box) {
		console.log(`MISSING ${sel}`);
		return null;
	}
	await page.screenshot({
		path: `${OUT}${TAG}-${name}.png`,
		clip: {
			x: Math.max(0, Math.round(box.x - pad)),
			y: Math.max(0, Math.round(box.y - pad)),
			width: Math.round(box.width + pad * 2),
			height: Math.round(box.height + pad * 2)
		}
	});
	console.log(`${name.padEnd(14)} ${Math.round(box.width)}x${Math.round(box.height)} at ${Math.round(box.x)},${Math.round(box.y)}`);
	return box;
};

// status strip: the whole left section holding ColorBar
await clip('.status-strip > div:first-child', 'colorbar', 10);
await clip('.color-stack', 'stack', 8);
// toolbar colour picker (bottom of the left tool column)
await clip('.fg-picker', 'fg-picker', 8);

// report the DOM so I know exactly what buttons exist today
const dom = await page.evaluate(() => {
	const bar = document.querySelector('.status-strip > div:first-child');
	return {
		barHTML: bar?.innerHTML.replace(/\s+/g, ' ').slice(0, 500),
		miniBtns: [...(bar?.querySelectorAll('button') ?? [])].map((b) => ({
			cls: b.className,
			title: b.getAttribute('title'),
			text: (b.textContent ?? '').trim()
		})),
		sliders: [...document.querySelectorAll('.fg-picker input')].map((i) => ({
			type: i.type,
			cls: i.className,
			label: i.getAttribute('aria-label'),
			min: i.min,
			max: i.max,
			value: i.value
		}))
	};
});
console.log(JSON.stringify(dom, null, 1));
console.log('errors :', errors.length ? errors.join(' | ') : 'none');
await browser.close();
