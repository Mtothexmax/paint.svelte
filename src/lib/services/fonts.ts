// Layer: services. System font enumeration + activation via the Local Font
// Access API (`window.queryLocalFonts` — Chromium only: Chrome/Edge).
// Everywhere else (Firefox/Safari) the call is unavailable and callers fall
// back to the built-in list.
//
// Important: enumerating families is NOT enough to render them. A listed
// family must be activated from its font data (`blob()` → `FontFace` →
// `document.fonts.add`) before CSS/canvas can actually use it — otherwise the
// name shows up but everything silently falls back. `ensureSystemFontLoaded`
// does exactly that (cached per session, on demand).

export interface LocalFontData {
	family: string;
	fullName: string;
	postscriptName: string;
	style: string;
	blob(): Promise<Blob>;
}

declare global {
	interface Window {
		queryLocalFonts?: (options?: { postscriptNames?: string[] }) => Promise<LocalFontData[]>;
	}
}

let facesCache: LocalFontData[] | null = null;
let facesInflight: Promise<LocalFontData[]> | null = null;
/** Lower-cased families already usable (native or activated). */
const usableFamilies = new Set<string>();

export function isSystemFontQuerySupported(): boolean {
	return typeof window !== 'undefined' && typeof window.queryLocalFonts === 'function';
}

function cssQuoted(family: string): string {
	return `"${family.replace(/\\/g, '\\\\').replace(/"/g, '')}"`;
}

/**
 * Ground truth for "does this family really render?" — measures the advance
 * width of a sample in the family vs. the fallback. `document.fonts.check()`
 * only reports availability, which lies for some fonts (e.g. symbol fonts
 * like Wingdings: check() passes, shaping still falls back).
 */
export function rendersInFamily(family: string, text = 'The quick brown fox jumps over the lazy dog'): boolean {
	return rendersSampleDistinct(family, text);
}

function rendersSampleDistinct(family: string, text: string): boolean {
	try {
		const ctx = document.createElement('canvas').getContext('2d');
		if (!ctx) return true;
		const size = 40;
		ctx.font = `${size}px ${cssQuoted(family)}, sans-serif`;
		const wTest = ctx.measureText(text).width;
		ctx.font = `${size}px sans-serif`;
		const wRef = ctx.measureText(text).width;
		return Math.abs(wTest - wRef) > 0.5;
	} catch {
		return true;
	}
}

/** Preview candidates across scripts — symbol/historic fonts often cover no
 * Latin, so the first sample that renders distinctly wins. */
const PREVIEW_SAMPLES: string[] = [
	'The quick brown fox jumps over the lazy dog',
	'ΑαΒβΓγΔδ ΕεΖζΗηΘθ ΙιΚκΛλΜμ ΝνΞξΟο',
	'АаБбВвГг ДдЕеЁёЖж ЗзИиЙйКк',
	'←↑→↓↔↕ ★☆ ♠♣♥♦ ●○■□',
	'𐌀𐌁𐌂 𐌰𐌱 𐐀𐐁 ᚠᚱ'
];

/** First natively rendering preview sample, or null when nothing differs
 * from the fallback. No font data is fetched here. */
export function findRenderableSample(family: string): string | null {
	if (typeof document === 'undefined') return null;
	for (const sample of PREVIEW_SAMPLES) {
		try {
			if (rendersSampleDistinct(family, sample)) return sample;
		} catch {
			/* try the next script */
		}
	}
	return null;
}

/** True when the family is among the enumerated (installed) font data. */
export async function isInstalledFamily(family: string): Promise<boolean> {
	const key = (family || '').trim().toLowerCase();
	if (!key) return false;
	const same = (s: string | undefined) => (s || '').trim().toLowerCase() === key;
	const faces = await queryFaces();
	return faces.some((f) => same(f.family) || same(f.fullName) || same(f.postscriptName));
}

async function queryFaces(): Promise<LocalFontData[]> {
	if (facesCache) return facesCache;
	if (facesInflight) return facesInflight;
	if (!isSystemFontQuerySupported()) return [];
	facesInflight = (async () => {
		try {
			const permission = await navigator.permissions.query({ name: 'local-fonts' as PermissionName });
			if (permission.state === 'denied') {
				facesCache = [];
				return facesCache;
			}
		} catch {
			/* Permissions API may not know 'local-fonts' — try anyway */
		}
		try {
			facesCache = await window.queryLocalFonts!();
		} catch {
			facesCache = [];
		}
		return facesCache;
	})();
	try {
		return await facesInflight;
	} finally {
		facesInflight = null;
	}
}

function dedupeSorted(families: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of families) {
		const name = (raw || '').trim();
		if (!name || name.startsWith('.')) continue; // skip internal entries (e.g. ".AppleSystemUIFont")
		const key = name.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(name);
	}
	out.sort((a, b) => a.localeCompare(b));
	return out;
}

/**
 * Returns the installed OS font families (deduplicated, sorted). Resolves to
 * an empty array when the API is unavailable or permission is denied — the
 * first call may trigger the browser's permission prompt.
 */
export async function querySystemFontFamilies(): Promise<string[]> {
	const faces = await queryFaces();
	return dedupeSorted(faces.map((f) => f.family));
}

/** Picks the face of a family that best matches the requested styles. */
function pickBestFace(
	candidates: LocalFontData[],
	wantBold: boolean,
	wantItalic: boolean
): LocalFontData {
	let best = candidates[0];
	let bestScore = -1;
	for (const face of candidates) {
		const n = `${face.fullName} ${face.postscriptName} ${face.style}`.toLowerCase();
		const isBold = n.includes('bold') || n.includes('black') || n.includes('heavy') || n.includes('semibold');
		const isItalic = n.includes('italic') || n.includes('oblique');
		let score = 0;
		if (isBold === wantBold) score += 2;
		if (isItalic === wantItalic) score += 2;
		if (face.style.toLowerCase() === 'normal') score += 1;
		if (score > bestScore) {
			bestScore = score;
			best = face;
		}
	}
	return best;
}

function descriptorsOf(face: LocalFontData): { weight: string; style: string } {
	const n = `${face.fullName} ${face.postscriptName}`.toLowerCase();
	const weight = n.includes('bold') || n.includes('black') || n.includes('heavy') ? '700' : '400';
	const style = n.includes('italic') || n.includes('oblique') ? 'italic' : 'normal';
	return { weight, style };
}

/**
 * Makes `family` actually renderable: returns true when CSS/canvas can use it
 * (natively installed, or activated from its font data just now). Resolves
 * false when unavailable — callers then fall back silently.
 */
export async function ensureSystemFontLoaded(
	family: string,
	opts: { bold?: boolean; italic?: boolean } = {}
): Promise<boolean> {
	const raw = (family || '').trim();
	const key = raw.toLowerCase();
	if (!key) return false;
	if (usableFamilies.has(key)) return true;
	if (typeof document === 'undefined' || !('fonts' in document)) return false;
	const log = (...args: unknown[]) => console.info('[fonts]', `"${raw}"`, ...args);
	// Native path: only counts when the family REALLY renders (measured, not
	// just check() — the check passes for symbol fonts that still fall back).
	try {
		log(`native check=${document.fonts.check(`16px ${cssQuoted(raw)}`)}`);
	} catch {
		/* ignore */
	}
	if (rendersInFamily(raw)) {
		log('renders natively');
		usableFamilies.add(key);
		return true;
	}
	log('native fallback — trying font-data activation');
	try {
		const faces = await queryFaces();
		const same = (s: string | undefined) => (s || '').trim().toLowerCase() === key;
		// Match by family AND by full/postscript name: enumerated family
		// strings don't always equal the CSS-usable name (localized names,
		// odd spellings).
		const candidates = faces.filter((f) => same(f.family) || same(f.fullName) || same(f.postscriptName));
		log(`faces=${faces.length} candidates=${candidates.length}`);
		if (!candidates.length) {
			// Name mismatch diagnostics: show installed names containing the
			// key (or vice versa) so a spelling/localization gap is visible.
			const similar = faces
				.map((f) => f.family)
				.filter((n) => {
					const l = n.toLowerCase();
					return l.includes(key) || key.includes(l);
				})
				.slice(0, 8);
			log('no font data for this name', similar.length ? { similar } : '(no similar installed names)');
			return false;
		}
		const pick = pickBestFace(candidates, !!opts.bold, !!opts.italic);
		log(`best face: fullName="${pick.fullName}" style="${pick.style}"`);
		const buffer = await pick.blob().then((b) => b.arrayBuffer());
		log(`blob bytes=${buffer.byteLength}`);
		const { weight, style } = descriptorsOf(pick);
		// Register under every known name so CSS matches however it spells it.
		// First pass without descriptors (matches any request), second pass
		// with descriptors (correct bold/italic selection).
		const names = [pick.family, pick.fullName, pick.postscriptName, raw];
		let registered = 0;
		for (const pass of [false, true]) {
			for (const name of names) {
				if (!name || !name.trim()) continue;
				try {
					const face = pass
						? new FontFace(name.trim(), buffer.slice(0), { weight, style })
						: new FontFace(name.trim(), buffer.slice(0));
					await face.load();
					document.fonts.add(face);
					registered++;
				} catch (err) {
					log(`register "${name}" failed`, err);
				}
			}
		}
		log(`registered=${registered}`);
		if (!registered) return false;
		try {
			await document.fonts.load(`16px ${cssQuoted(raw)}`, 'The quick brown fox jumps over the lazy dog');
		} catch {
			/* fall through to the measurement below */
		}
		const rendered = rendersInFamily(raw);
		log(`rendered after activation=${rendered}`);
		if (!rendered) return false;
		usableFamilies.add(key);
		return true;
	} catch (err) {
		log('activation failed', err);
		return false;
	}
}

/** Races a promise against a timeout (resolves `fallback` on timeout). */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
	return new Promise<T>((resolve) => {
		const timer = setTimeout(() => resolve(fallback), ms);
		promise.then(
			(v) => {
				clearTimeout(timer);
				resolve(v);
			},
			() => {
				clearTimeout(timer);
				resolve(fallback);
			}
		);
	});
}

// Console diagnostics (F12): `await __paintFonts.ensureSystemFontLoaded("…")`
// Exercising a family here prints the whole activation chain ([fonts] lines).
if (typeof window !== 'undefined') {
	(window as unknown as Record<string, unknown>).__paintFonts = {
		ensureSystemFontLoaded,
		querySystemFontFamilies
	};
}
