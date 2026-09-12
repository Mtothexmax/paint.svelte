// Layer: state (Svelte adapter). Eyedropper settings, persisted in
// localStorage (both off by default):
// - copyHex: also copy the sampled colour to the system clipboard as hex
//   (Paint.NET-style silent copy would surprise users).
// - includeAlpha: the sampled hex carries the alpha byte (#RRGGBBAA);
//   otherwise alpha is dropped (#RRGGBB).

import { writable, get } from 'svelte/store';

export const eyedropperCopyHex = writable<boolean>(false);
export const eyedropperIncludeAlpha = writable<boolean>(false);

const KEY = 'paint.svelte.eyedropperSettings.v1';

interface SavedEyedropper {
	copyHex: boolean;
	includeAlpha: boolean;
}

function save(): void {
	try {
		localStorage.setItem(
			KEY,
			JSON.stringify({ copyHex: get(eyedropperCopyHex), includeAlpha: get(eyedropperIncludeAlpha) })
		);
	} catch {
		/* ignore */
	}
}

if (typeof window !== 'undefined') {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const p = JSON.parse(raw) as Partial<SavedEyedropper>;
			if (typeof p.copyHex === 'boolean') eyedropperCopyHex.set(p.copyHex);
			if (typeof p.includeAlpha === 'boolean') eyedropperIncludeAlpha.set(p.includeAlpha);
		}
	} catch {
		/* storage unavailable — ignore */
	}
	eyedropperCopyHex.subscribe(() => save());
	eyedropperIncludeAlpha.subscribe(() => save());
}
