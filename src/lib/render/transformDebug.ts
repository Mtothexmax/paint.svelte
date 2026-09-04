const STORAGE_KEY = 'paint.transform-debug';
const MAX_ENTRIES = 300;

export type TransformDebugData = Record<string, unknown>;

export function logTransformDebug(event: string, data: TransformDebugData = {}): void {
	if (typeof window === 'undefined') return;
	const entry = { time: new Date().toISOString(), event, ...data };
	const entries = readTransformDebug();
	entries.push(entry);
	const trimmed = entries.slice(-MAX_ENTRIES);
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
	console.debug('[transform]', entry);
}

export function readTransformDebug(): Array<Record<string, unknown>> {
	if (typeof window === 'undefined') return [];
	try {
		const value = window.localStorage.getItem(STORAGE_KEY);
		const parsed = value ? JSON.parse(value) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function clearTransformDebug(): void {
	if (typeof window === 'undefined') return;
	window.localStorage.removeItem(STORAGE_KEY);
}

if (typeof window !== 'undefined') {
	window.paintTransformDebug = {
		read: readTransformDebug,
		clear: clearTransformDebug
	};
}
