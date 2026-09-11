// Throwaway harness: how much room does the new distort safety clamp leave?
// Mirrors src/lib/render/move/distortLogic.ts (kept in sync by hand).
const QUAD_ORDER = ['nw', 'ne', 'se', 'sw'];

function computeHomography(src, dst) {
	const a = [];
	const y = [];
	for (let i = 0; i < 4; i++) {
		const s = src[QUAD_ORDER[i]];
		const d = dst[QUAD_ORDER[i]];
		a.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y]);
		y.push(d.x);
		a.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y]);
		y.push(d.y);
	}
	const m = a.map((row, i) => [...row, y[i]]);
	for (let col = 0; col < 8; col++) {
		let pivot = col;
		for (let r = col + 1; r < 8; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
		if (Math.abs(m[pivot][col]) < 1e-12) return null;
		[m[col], m[pivot]] = [m[pivot], m[col]];
		const inv = 1 / m[col][col];
		for (let c = col; c < 9; c++) m[col][c] *= inv;
		for (let r = 0; r < 8; r++) {
			if (r === col) continue;
			const f = m[r][col];
			if (f === 0) continue;
			for (let c = col; c < 9; c++) m[r][c] -= f * m[col][c];
		}
	}
	const h = m.map((row) => row[8]);
	return { h: [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1] };
}

function quadPoints(q) {
	return [q.nw, q.ne, q.se, q.sw];
}
function quadArea(q) {
	const p = quadPoints(q);
	let a = 0;
	for (let i = 0; i < 4; i++) a += p[i].x * p[(i + 1) % 4].y - p[(i + 1) % 4].x * p[i].y;
	return a / 2;
}
const crossZ = (a, b, c) => (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
function isConvexQuad(q) {
	const p = quadPoints(q);
	let sign = 0;
	for (let i = 0; i < 4; i++) {
		const c = crossZ(p[i], p[(i + 1) % 4], p[(i + 2) % 4]);
		if (!Number.isFinite(c) || Math.abs(c) < 1e-9) return false;
		const s = c > 0 ? 1 : -1;
		if (sign === 0) sign = s;
		else if (s !== sign) return false;
	}
	return sign > 0;
}
function homographyKeepsRectFinite(h, w, hh, eps = 1e-4) {
	const m = h.h;
	for (const [x, y] of [[0, 0], [w, 0], [w, hh], [0, hh]]) {
		const den = m[6] * x + m[7] * y + m[8];
		if (!Number.isFinite(den) || den <= eps) return false;
	}
	return true;
}
const quadFromBounds = (b) => ({
	nw: { x: b.x, y: b.y },
	ne: { x: b.x + b.width, y: b.y },
	se: { x: b.x + b.width, y: b.y + b.height },
	sw: { x: b.x, y: b.y + b.height }
});

function safe(bounds, q, doc) {
	if (!isConvexQuad(q)) return 'concave';
	if (Math.abs(quadArea(q)) < 4) return 'area';
	const h = computeHomography(quadFromBounds(bounds), q);
	if (!h) return 'nohomo';
	return 'ok';
}

const doc = { width: 800, height: 600 };
const bounds = { x: 100, y: 100, width: 200, height: 200 };
const base = quadFromBounds(bounds);

function report(label, mk, steps = 40) {
	let last = null;
	let firstBad = null;
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const q = mk(t);
		const r = safe(bounds, q, doc);
		if (r !== 'ok' && firstBad === null) firstBad = { t, r };
		if (r === 'ok') last = t;
	}
	console.log(`${label.padEnd(34)} usable up to t=${last === null ? '0' : last.toFixed(3)}  firstBlock=${firstBad ? firstBad.r + '@' + firstBad.t.toFixed(3) : 'none'}`);
}

// 1. pull NW straight toward the SE corner (the classic "inward" drag)
report('nw -> se (inward)', (t) => ({
	...base,
	nw: { x: 100 + 200 * t, y: 100 + 200 * t }
}));
// 2. pull NW past the centre and beyond
report('nw -> far past centre', (t) => ({
	...base,
	nw: { x: 100 + 320 * t, y: 100 + 320 * t }
}));
// 3. keystone: squeeze the bottom edge inward
report('bottom edge keystone', (t) => ({
	...base,
	se: { x: 300 - 100 * t, y: 300 },
	sw: { x: 100 + 100 * t, y: 300 }
}));
// 4. rotate the whole quad (should stay OK the whole way round)
report('rotate quad 360deg', (t) => {
	const a = (t * Math.PI * 2);
	const cx = 200;
	const cy = 200;
	const rot = (p) => ({
		x: cx + (p.x - cx) * Math.cos(a) - (p.y - cy) * Math.sin(a),
		y: cy + (p.x - cx) * Math.sin(a) + (p.y - cy) * Math.cos(a)
	});
	return { nw: rot(base.nw), ne: rot(base.ne), se: rot(base.se), sw: rot(base.sw) };
});
// 5. translate the quad far outside the canvas
report('translate far away', (t) => ({
	nw: { x: 100 + 4000 * t, y: 100 },
	ne: { x: 300 + 4000 * t, y: 100 },
	se: { x: 300 + 4000 * t, y: 300 },
	sw: { x: 100 + 4000 * t, y: 300 }
}));
// 6. selection the size of the whole document, corner pulled inward
{
	const b2 = { x: 0, y: 0, width: 800, height: 600 };
	const base2 = quadFromBounds(b2);
	let last = null;
	let firstBad = null;
	for (let i = 0; i <= 40; i++) {
		const t = i / 40;
		const q = { ...base2, nw: { x: 800 * t, y: 600 * t } };
		const r = safe(b2, q, doc);
		if (r !== 'ok' && firstBad === null) firstBad = { t, r };
		if (r === 'ok') last = t;
	}
	console.log(`${'full-doc sel, nw -> se'.padEnd(34)} usable up to t=${last === null ? '0' : last.toFixed(3)}  firstBlock=${firstBad ? firstBad.r + '@' + firstBad.t.toFixed(3) : 'none'}`);
}
