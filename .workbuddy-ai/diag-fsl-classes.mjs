// Diagnostic: what is actually inside an effect dialog? My probes all drive
// `.m-dialog .fsl-range`, but that class does not appear anywhere in src/ —
// so either it exists at runtime or those probes were no-ops. Settle it.
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
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 2000));
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

await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Adjustments')?.click();
});
await sleep(300);
await page.evaluate(() => {
	[...document.querySelectorAll('.menu-panel .menu-item')].find((x) => x.textContent.includes('Highlights / Shadows'))?.click();
});
for (let i = 0; i < 20; i++) {
	if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) break;
	await sleep(150);
}
await sleep(700);

const dump = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	if (!d) return { error: 'no dialog' };
	const els = [...d.querySelectorAll('*')];
	const classes = {};
	for (const e of els) {
		for (const c of e.classList) classes[c] = (classes[c] ?? 0) + 1;
	}
	const inputs = [...d.querySelectorAll('input')].map((i) => ({
		type: i.type,
		cls: i.className,
		value: i.value,
		disabled: i.disabled
	}));
	return {
		classNames: Object.keys(classes).sort(),
		inputs,
		rangeCount: d.querySelectorAll('.fsl-range').length,
		trackCount: d.querySelectorAll('.fsl-track').length,
		inputCount: d.querySelectorAll('.fsl-input').length,
		dotCount: d.querySelectorAll('.fsl-tick-center').length
	};
});

console.log('classes in .m-dialog:');
console.log('  ' + dump.classNames.join(' '));
console.log('\ninputs:');
for (const i of dump.inputs) console.log(`  type=${i.type} class="${i.cls}" value="${i.value}"`);
console.log(
	`\n.fsl-range=${dump.rangeCount}  .fsl-track=${dump.trackCount}  .fsl-input=${dump.inputCount}  .fsl-tick-center=${dump.dotCount}`
);

await browser.close();
process.exit(0);
