// Layer: state (Svelte adapter). Text-tool settings + a tiny action channel
// (commit/cancel) used by the options strip to drive the canvas text draft.
// The draft text itself lives in EditorCanvas; committed text is rasterised
// into the active layer (no live text objects — Paint.NET behaviour).

import { writable, get } from 'svelte/store';
import { clamp } from '../core/geometry';

export type TextAlign = 'left' | 'center' | 'right';

/** Web-safe font stack used by the family dropdown. */
export const TEXT_FONTS = [
	'Arial',
	'Verdana',
	'Tahoma',
	'Trebuchet MS',
	'Georgia',
	'Times New Roman',
	'Courier New',
	'Comic Sans MS',
	'Impact',
	'Palatino Linotype',
	'Lucida Console',
	'Segoe UI'
] as const;

export const textFontFamily = writable<string>('Arial');
export const textFontSize = writable<number>(24); // px at 100% zoom
export const textBold = writable<boolean>(false);
export const textItalic = writable<boolean>(false);
export const textUnderline = writable<boolean>(false);
export const textStrike = writable<boolean>(false);
export const textAlign = writable<TextAlign>('left');

export function setTextFontSize(n: number): void {
	textFontSize.set(clamp(Math.round(n) || 8, 8, 200));
}

/** Options-strip → canvas request channel (mirrors state/polygon.ts). */
export const textAction = writable<null | 'commit' | 'cancel'>(null);

export function requestTextCommit(): void {
	textAction.set('commit');
}

export function requestTextCancel(): void {
	textAction.set('cancel');
}

// --- persistence (localStorage, same pattern as brush settings) --------------

const TEXT_KEY = 'paint.svelte.textSettings.v1';

interface SavedText {
	family: string;
	size: number;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	strike: boolean;
	align: TextAlign;
}

if (typeof window !== 'undefined') {
	try {
		const raw = localStorage.getItem(TEXT_KEY);
		if (raw) {
			const p = JSON.parse(raw) as Partial<SavedText>;
			if (typeof p.family === 'string' && p.family) textFontFamily.set(p.family);
			if (typeof p.size === 'number' && Number.isFinite(p.size)) setTextFontSize(p.size);
			if (typeof p.bold === 'boolean') textBold.set(p.bold);
			if (typeof p.italic === 'boolean') textItalic.set(p.italic);
			if (typeof p.underline === 'boolean') textUnderline.set(p.underline);
			if (typeof p.strike === 'boolean') textStrike.set(p.strike);
			if (p.align === 'left' || p.align === 'center' || p.align === 'right') textAlign.set(p.align);
		}
	} catch {
		/* storage unavailable — ignore */
	}
	const write = () => {
		try {
			const saved: SavedText = {
				family: get(textFontFamily),
				size: get(textFontSize),
				bold: get(textBold),
				italic: get(textItalic),
				underline: get(textUnderline),
				strike: get(textStrike),
				align: get(textAlign)
			};
			localStorage.setItem(TEXT_KEY, JSON.stringify(saved));
		} catch {
			/* ignore */
		}
	};
	for (const store of [textFontFamily, textFontSize, textBold, textItalic, textUnderline, textStrike, textAlign]) {
		store.subscribe(write);
	}
}
