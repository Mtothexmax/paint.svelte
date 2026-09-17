import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 8 });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
const clickByText = async (t) => {
  await page.evaluate((x) => {
    const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
    b?.click();
  }, t);
  await new Promise((r) => setTimeout(r, 450));
};
await clickByText('New…'); await clickByText('SVGA'); await clickByText('Create');
await new Promise((r) => setTimeout(r, 1600));

// vivid red: click the area at hue 0 (top), saturation 100% (right)
const a = await page.evaluate(() => {
  const b = document.querySelector('.fg-picker-area').getBoundingClientRect();
  return { x: b.x, y: b.y, w: b.width, h: b.height };
});
await page.mouse.move(a.x + a.w - 3, a.y + 3);
await page.mouse.down(); await page.mouse.up();
await new Promise((r) => setTimeout(r, 250));
// brightness 50
await page.evaluate(() => {
  const el = document.querySelector('.fg-bright-slider');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '50');
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
// alpha 60%
await page.evaluate(() => {
  const el = document.querySelector('.fg-alpha-slider');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '40');
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 300));
console.log('fg =', await page.evaluate(() => getComputedStyle(document.querySelector('.cs-fg .cs-fill')).backgroundColor));
const f = await page.evaluate(() => {
  const b = document.querySelector('.fg-picker').getBoundingClientRect();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
});
await page.screenshot({ path: OUT + 'zoom-picker-red.png', clip: { x: f.x, y: f.y + f.height - 60, width: f.width, height: 60 } });
const c = await page.evaluate(() => {
  const b = document.querySelector('.color-stack').parentElement.getBoundingClientRect();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
});
await page.screenshot({ path: OUT + 'zoom-colorbar-red.png', clip: { x: Math.max(0, c.x - 2), y: c.y - 3, width: c.width + 4, height: c.height + 6 } });
await browser.close();
console.log('ok');
