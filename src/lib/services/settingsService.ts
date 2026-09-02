// Layer: services. Tiny settings persistence (localStorage, namespaced).
// Used e.g. to remember the last-used configuration of each filter dialog.

const KEY = 'paint.svelte.settings.v1';

interface SettingsStore {
	[key: string]: unknown;
}

function readAll(): SettingsStore {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as SettingsStore) : {};
	} catch {
		return {};
	}
}

function writeAll(store: SettingsStore): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(store));
	} catch {
		/* storage unavailable — ignore */
	}
}

/** Reads a namespaced settings block (e.g. `filters.blur`). */
export function getSettings<T>(namespace: string, defaults: T): T {
	const store = readAll();
	const value = store[namespace];
	if (value && typeof value === 'object') {
		return { ...defaults, ...(value as object) } as T;
	}
	return defaults;
}

/** Saves a namespaced settings block. */
export function saveSettings<T extends object>(namespace: string, value: T): void {
	const store = readAll();
	store[namespace] = { ...value };
	writeAll(store);
}
