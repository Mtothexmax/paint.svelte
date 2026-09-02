// Layer: core (framework-free). Colour model + parsing/serialisation helpers.
// Alpha is stored as a byte 0..255 (matches #rrggbbaa). No DOM / svelte imports.

export interface RGBA {
	r: number;
	g: number;
	b: number;
	a: number; // 0..255
}

const c255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

function byteToHex(n: number): string {
	return c255(n).toString(16).padStart(2, '0');
}

function hexToByte(h: string): number {
	return parseInt(h, 16);
}

const HEX6 = /^([0-9a-f]{6})$/i;
const HEX3 = /^([0-9a-f]{3})$/i;
const HEX8 = /^([0-9a-f]{8})$/i;

/** '#rrggbb' — the alpha is intentionally dropped. */
export function rgbaToHex(c: RGBA): string {
	return '#' + byteToHex(c.r) + byteToHex(c.g) + byteToHex(c.b);
}

/** '#rrggbbaa' (alpha byte appended). */
export function rgbaToHexA(c: RGBA): string {
	return rgbaToHex(c) + byteToHex(c.a);
}

/** css rgba() string for use in style properties. */
export function rgbaToCss(c: RGBA, includeAlpha = true): string {
	return `rgba(${c.r}, ${c.g}, ${c.b}, ${includeAlpha ? c.a / 255 : 1})`;
}

// --- HSV (for the picker surfaces) ----------------------------------------

export interface HSV {
	h: number; // 0..360
	s: number; // 0..1
	v: number; // 0..1
}

/** byte RGB -> HSV */
export function rgbToHsv(r: number, g: number, b: number, prevH = 0): HSV {
	const rr = c255(r) / 255;
	const gg = c255(g) / 255;
	const bb = c255(b) / 255;
	const max = Math.max(rr, gg, bb);
	const min = Math.min(rr, gg, bb);
	const d = max - min;
	const v = max;
	const s = max === 0 ? 0 : d / max;
	let h = prevH;
	if (d !== 0) {
		if (max === rr) h = 60 * (((gg - bb) / d) % 6);
		else if (max === gg) h = 60 * ((bb - rr) / d + 2);
		else h = 60 * ((rr - gg) / d + 4);
		if (h < 0) h += 360;
	}
	return { h, s, v };
}

/** HSV -> byte RGB */
export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
	const hh = (((h % 360) + 360) % 360) / 60;
	const ss = Math.max(0, Math.min(1, s));
	const vv = Math.max(0, Math.min(1, v));
	const i = Math.floor(hh);
	const f = hh - i;
	const p = vv * (1 - ss);
	const q = vv * (1 - f * ss);
	const t = vv * (1 - (1 - f) * ss);
	let rp = 0;
	let gp = 0;
	let bp = 0;
	switch (i) {
		case 0: [rp, gp, bp] = [vv, t, p]; break;
		case 1: [rp, gp, bp] = [q, vv, p]; break;
		case 2: [rp, gp, bp] = [p, vv, t]; break;
		case 3: [rp, gp, bp] = [p, q, vv]; break;
		case 4: [rp, gp, bp] = [t, p, vv]; break;
		default: [rp, gp, bp] = [vv, p, q]; break;
	}
	return { r: Math.round(rp * 255), g: Math.round(gp * 255), b: Math.round(bp * 255) };
}

export function colorToHsv(c: RGBA): HSV {
	return rgbToHsv(c.r, c.g, c.b);
}

export function hsvWithAlpha(h: number, s: number, v: number, a: number): RGBA {
	const rgb = hsvToRgb(h, s, v);
	return { r: rgb.r, g: rgb.g, b: rgb.b, a: c255(a) };
}

export function colorFromBytes(r: number, g: number, b: number, a = 255): RGBA {
	return { r: c255(r), g: c255(g), b: c255(b), a: c255(a) };
}

/** Parses a '#rrggbbaa' / '#aarrggbb' style 8-digit value. */
function parseHex8(hex: string): RGBA {
	const r = hexToByte(hex.slice(0, 2));
	const g = hexToByte(hex.slice(2, 4));
	const b = hexToByte(hex.slice(4, 6));
	const a = hexToByte(hex.slice(6, 8));
	return { r, g, b, a };
}

export interface ParsedColor {
	color: RGBA;
	/** true when the text carried an explicit alpha channel. */
	hasAlpha: boolean;
}

/**
 * Accepts many textual colour forms:
 *   #123567, #12356723, #abc, rgb(1,2,3), rgba(1,2,3,0.5), rgb(1 2 3 / 40%),
 *   a bare 6-digit hex, "1,2,3", ...
 */
export function parseColorText(text: string): ParsedColor | null {
	const raw = (text || '').trim();
	if (!raw) return null;

	// Strip css-ish wrappers / spaces / "rgb"/"rgba"/"#".
	if (/^#[0-9a-f]{8}$/i.test(raw)) {
		const hex = raw.slice(1);
		return { color: parseHex8(hex), hasAlpha: true };
	}
	if (/^#[0-9a-f]{6}$/i.test(raw)) {
		const hex = raw.slice(1);
		return {
			color: { r: hexToByte(hex.slice(0, 2)), g: hexToByte(hex.slice(2, 4)), b: hexToByte(hex.slice(4, 6)), a: 255 },
			hasAlpha: false
		};
	}
	if (/^#[0-9a-f]{3}$/i.test(raw)) {
		const hex = raw.slice(1);
		const rr = hex[0] + hex[0];
		const gg = hex[1] + hex[1];
		const bb = hex[2] + hex[2];
		return {
			color: { r: hexToByte(rr), g: hexToByte(gg), b: hexToByte(bb), a: 255 },
			hasAlpha: false
		};
	}
	// bare hex without '#' (6 or 8 digits)
	const bare = raw.replace(/^#/, '');
	if (HEX6.test(bare)) {
		return {
			color: parseHex8((bare + 'ff')),
			hasAlpha: false
		};
	}
	if (HEX8.test(bare)) {
		return { color: parseHex8(bare), hasAlpha: true };
	}

	// rgb(...) / rgba(...) / "r g b" / "r,g,b"
	const inner = raw
		.replace(/^rgba?\(/i, '')
		.replace(/\)$/, '')
		.replace(/\s*\/\s*/g, ',');
	const parts = inner
		.split(/[,\s]+/)
		.map((p) => p.trim())
		.filter(Boolean);
	if (parts.length < 3) return null;

	const num = parts.map((p) => parseFloat(p));
	if (num.some((n) => Number.isNaN(n))) return null;

	// channels may be percentages
	const pct = (v: number, s: string) => (s.includes('%') ? (v / 100) * 255 : v);
	const r = pct(num[0], parts[0]);
	const g = pct(num[1], parts[1]);
	const b = pct(num[2], parts[2]);

	let a = 255;
	let hasAlpha = false;
	if (parts.length >= 4) {
		hasAlpha = true;
		let av = num[3];
		if (parts[3].includes('%')) av = (av / 100) * 255;
		// CSS rgba alpha uses 0..1; accept both 0..1 and an explicit byte (>1).
		else if (av <= 1) av *= 255;
		a = av;
	}
	return { color: colorFromBytes(r, g, b, a), hasAlpha };
}
