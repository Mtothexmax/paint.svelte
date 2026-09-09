// Layer: state (Svelte adapter). Eyedropper settings. The only persistent
// option today is "copy the sampled colour to the system clipboard as a hex
// string" (off by default — Paint.NET-style silent copy would surprise users).

import { writable, get } from 'svelte/store';

export const eyedropperCopyHex = writable<boolean>(false);

const KEY = 'paint.svelte.eyedropperSettings.v1';

interface SavedEyedropper {
	copyHex: boolean;
}

if (typeof window !== 'undefined') {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const p = JSON.parse(raw) as Partial<SavedEyedropper>;
			if (typeof p.copyHex === 'boolean') eyedropperCopyHex.set(p.copyHex);
		}
	} catch {
		/* storage unavailable — ignore */
	}
	eyedropperCopyHex.subscribe((v) => {
		try {
			localStorage.setItem(KEY, JSON.stringify({ copyHex: v }));
		} catch {
			/* ignore */
		}
	});
}
