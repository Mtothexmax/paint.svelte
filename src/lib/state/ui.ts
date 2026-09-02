// Layer: state (Svelte adapter). Presentational UI state: active tool, colors,
// transient notices and the status bar read-out. No services imported here.

import { writable } from 'svelte/store';
import { clamp } from '../core/geometry';

export const activeToolId = writable<string>('brush');

export const foregroundColor = writable<string>('#000000');
export const backgroundColor = writable<string>('#ffffff');

export const statusBar = writable<{
	zoomPct: number | null;
	imageW: number | null;
	imageH: number | null;
	cursorX: number | null;
	cursorY: number | null;
}>({ zoomPct: null, imageW: null, imageH: null, cursorX: null, cursorY: null });

export type NoticeKind = 'info' | 'error';

// --- transient notices (shown in the status bar) -------------------------

export const notice = writable<{ text: string; kind: NoticeKind } | null>(null);

let noticeTimer: ReturnType<typeof setTimeout> | null = null;

export function showNotice(text: string, kind: NoticeKind = 'info'): void {
	notice.set({ text, kind });
	if (noticeTimer) clearTimeout(noticeTimer);
	noticeTimer = setTimeout(() => notice.set(null), 4000);
}

// --- brush defaults (reserved; used by Slice 2+) --------------------------

export const brushSize = writable(24);
export function cycleBrushSize(delta: number): void {
	brushSize.update((v) => clamp(Math.round(v + delta), 1, 400));
}
