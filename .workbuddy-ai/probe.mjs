import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('docs');
const port = 4322;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
	let url = decodeURIComponent((req.url ?? '/').split('?')[0]);
	if (url.startsWith('/paint.svelte')) url = url.slice('/paint.svelte'.length) || '/';
	let file = path.join(root, url);
	if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
	if (!fs.existsSync(file)) { res.writeHead(404).end('nf'); return; }
	res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
	fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(port, '127.0.0.1', r));

const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({
	executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	headless: 'new',
	args: ['--no-sandbox', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
	const orig = Object.entries;
	Object.entries = function (o) {
		const r = orig(o);
		try {
			for (const [k, v] of r) {
				if (v === undefined) console.warn('UNDEF_ENTRY::' + String(k) + '::' + new Error().stack);
			}
		} catch (e) {}
		return r;
	};
});
const logs = [];
page.on('console', (m) => {
	logs.push(`[${m.type()}] ${m.text()}`);
	const st = m.stackTrace?.() ?? [];
	for (const f of st) logs.push(`    at ${f.url ?? ''}:${f.lineNumber}:${f.columnNumber} ${f.functionName ?? ''}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`));
await page.goto(`http://127.0.0.1:${port}/paint.svelte/`, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2000));
console.log(logs.join('\n'));
await browser.close();
server.close();
