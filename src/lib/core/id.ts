// Layer: core (framework-free). No svelte / pixi imports.

/**
 * Generates a fresh unique id. Uses crypto.randomUUID when available and
 * falls back to a time+random scheme otherwise (e.g. non-secure contexts).
 */
export function newId(prefix = ''): string {
	let raw: string;
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		raw = crypto.randomUUID();
	} else {
		raw = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
	}
	return prefix ? `${prefix}-${raw}` : raw;
}
