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
const r = await page.evaluate(() => {
  const b = document.querySelector('.color-stack').parentElement.getBoundingClientRect();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
});
await page.screenshot({ path: OUT + 'zoom-colorbar.png', clip: { x: Math.max(0, r.x - 2), y: r.y - 3, width: r.width + 4, height: r.height + 6 } });
const f = await page.evaluate(() => {
  const b = document.querySelector('.fg-picker').getBoundingClientRect();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
});
await page.screenshot({ path: OUT + 'zoom-picker.png', clip: { x: f.x, y: f.y + f.height - 60, width: f.width, height: 60 } });
await browser.close();
console.log('ok');
