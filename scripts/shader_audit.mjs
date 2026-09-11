// Audits EVERY registered custom effect: builds its Filter and links the
// processed GLSL (vertex=defaultFilterVert, fragment=effect). Reports any that
// fail to compile or link, with the driver log — the definitive "which effects
// silently go transparent" list.
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function main() {
	const browser = await puppeteer.launch({
		executablePath: CHROME,
		headless: 'new',
		args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
	});
	const page = await browser.newPage();
	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await sleep(2000);

	const results = await page.evaluate(async () => {
		const { makeGlFilter } = await import('/src/lib/effects/shaders.ts');
		const { effects } = await import('/src/lib/effects/index.ts');
		const gl2 = document.createElement('canvas').getContext('webgl2');
		const link = (vertexSrc, fragSrc) => {
			const prog = gl2.createProgram();
			const vs = gl2.createShader(gl2.VERTEX_SHADER);
			const fs = gl2.createShader(gl2.FRAGMENT_SHADER);
			gl2.shaderSource(vs, vertexSrc); gl2.compileShader(vs);
			gl2.shaderSource(fs, fragSrc); gl2.compileShader(fs);
			const vsOk = gl2.getShaderParameter(vs, gl2.COMPILE_STATUS);
			const fsOk = gl2.getShaderParameter(fs, gl2.COMPILE_STATUS);
			const vsLog = gl2.getShaderInfoLog(vs) || '';
			const fsLog = gl2.getShaderInfoLog(fs) || '';
			gl2.attachShader(prog, vs); gl2.attachShader(prog, fs);
			gl2.linkProgram(prog);
			const linkOk = gl2.getProgramParameter(prog, gl2.LINK_STATUS);
			const log = gl2.getProgramInfoLog(prog) || '';
			gl2.deleteProgram(prog);
			return { vsOk, fsOk, linkOk, logs: [vsLog, fsLog, log].filter(Boolean) };
		};
		const out = [];
		for (const e of effects) {
			// skip effects with no custom shader (they still build a Filter iff filter() exists)
			let f;
			try { f = e.filter(e.defaults); } catch (err) { out.push([e.id, 'THROW', e.message || String(err)]); continue; }
			// Chain-returning filters (median, gaussianBlur, …) yield an array —
			// link every pass, not just the first.
			const chain = Array.isArray(f) ? f : [f];
			if (!chain.length) { out.push([e.id, 'NO-FILTER']); continue; }
			for (const pass of chain) {
				const prog = pass['glProgram'];
				try { pass.destroy(); } catch { /* ignore */ }
				if (!prog || !prog.fragment) { out.push([e.id, 'NO-FILTER']); continue; }
				const res = link(prog.vertex, prog.fragment);
				const status = res.vsOk && res.fsOk && res.linkOk ? 'OK' : 'FAIL';
				if (status === 'FAIL') out.push([e.id, status, res.logs.join(' | ')]);
			}
		}
		return out;
	});
	console.log('failures:', JSON.stringify(results, null, 1));
	if (results.length) {
		console.log('TOTAL FAILURES:', results.length);
	} else {
		console.log('ALL EFFECT SHADERS OK');
	}
	await browser.close();
}

main().then(
	() => process.exit(0),
	(e) => {
		console.error('FAILED', e && e.message ? e.message : e);
		process.exit(1);
	}
);