// Layer: state (Svelte adapter). Eyedropper settings, persisted in
// localStorage (all off / merged by default):
// - copyHex: also copy the sampled colour to the system clipboard as hex
//   (Paint.NET-style silent copy would surprise users).
// - includeAlpha: the sampled hex carries the alpha byte (#RRGGBBAA);
//   otherwise alpha is dropped (#RRGGBB).
// - sampleMode: 'merged' samples the composite pixel under the pointer
//   (WYSIWYG — what you see); 'layer' samples the active layer alone at
//   that position.

import { writable, get } from 'svelte/store';

export const eyedropperCopyHex = writable<boolean>(false);
export const eyedropperIncludeAlpha = writable<boolean>(false);
export type EyedropperSampleMode = 'merged' | 'layer';
export const eyedropperSampleMode = writable<EyedropperSampleMode>('merged');

const KEY = 'paint.svelte.eyedropperSettings.v1';

interface SavedEyedropper {
	copyHex: boolean;
	includeAlpha: boolean;
	sampleMode: EyedropperSampleMode;
}

function save(): void {
	try {
		localStorage.setItem(
			KEY,
			JSON.stringify({
				copyHex: get(eyedropperCopyHex),
				includeAlpha: get(eyedropperIncludeAlpha),
				sampleMode: get(eyedropperSampleMode)
			})
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
			if (p.sampleMode === 'merged' || p.sampleMode === 'layer')
				eyedropperSampleMode.set(p.sampleMode);
		}
	} catch {
		/* storage unavailable — ignore */
	}
	eyedropperCopyHex.subscribe(() => save());
	eyedropperIncludeAlpha.subscribe(() => save());
	eyedropperSampleMode.subscribe(() => save());
}
