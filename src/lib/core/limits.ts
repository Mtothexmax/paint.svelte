// Layer: core (framework-free). Central size / budget constants.

/** Hard cap on any single image dimension (pixels). */
export const MAX_DIMENSION = 16384;

/** Total pixel budget per document. 2^26 ≈ 67.1 MP. */
export const MAX_PIXELS = 2 ** 26;

/** Zoom limits (as scale factors). 1% .. 3200%. */
export const ZOOM_MIN = 0.01;
export const ZOOM_MAX = 32;

/** Bytes for one RGBA8 surface of the given dimensions. */
export function surfaceBytes(width: number, height: number): number {
	return 4 * width * height;
}

export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes)) return '—';
	const units = ['B', 'KB', 'MB', 'GB'];
	let value = bytes;
	let u = 0;
	while (value >= 1024 && u < units.length - 1) {
		value /= 1024;
		u++;
	}
	return `${value.toFixed(value >= 10 || u === 0 ? 0 : 1)} ${units[u]}`;
}

export interface SizeValidation {
	ok: boolean;
	error?: string;
}

/** Validates a requested canvas size against the fixed limits. */
export function validateSize(width: number, height: number, deviceMaxTexture?: number): SizeValidation {
	if (!Number.isInteger(width) || !Number.isInteger(height)) {
		return { ok: false, error: 'Width and height must be whole numbers.' };
	}
	if (width < 1 || height < 1) {
		return { ok: false, error: 'Width and height must be at least 1 px.' };
	}
	if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
		return { ok: false, error: `Dimensions may not exceed ${MAX_DIMENSION} px per side.` };
	}
	const device = deviceMaxTexture ? Math.min(deviceMaxTexture, MAX_DIMENSION) : MAX_DIMENSION;
	if (width > device || height > device) {
		return {
			ok: false,
			error: `This GPU only supports textures up to ${device} px per side (device limit).`
		};
	}
	if (width * height > MAX_PIXELS) {
		return { ok: false, error: `Too many pixels (max ${MAX_PIXELS.toLocaleString()}). Reduce the size.` };
	}
	return { ok: true };
}
