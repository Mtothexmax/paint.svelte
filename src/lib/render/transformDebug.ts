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

export function downloadTransformDebug(): void {
	if (typeof window === 'undefined') return;
	const blob = new Blob([JSON.stringify(readTransformDebug(), null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `paint-transform-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
	link.click();
	URL.revokeObjectURL(url);
}

if (typeof window !== 'undefined') {
	window.paintTransformDebug = {
		read: readTransformDebug,
		clear: clearTransformDebug,
		download: downloadTransformDebug
	};
}
