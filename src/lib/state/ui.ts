// Layer: state (Svelte adapter). Presentational UI state: active tool, colors,
// transient notices and the status bar read-out. No services imported here.

import { writable, get } from 'svelte/store';
import { clamp } from '../core/geometry';
import type { RGBA } from '../core/color';

export const activeToolId = writable<string>('brush');

/** Foreground/background colours with alpha (0..255). */
export const foregroundColor = writable<RGBA>({ r: 0, g: 0, b: 0, a: 255 });
export const backgroundColor = writable<RGBA>({ r: 255, g: 255, b: 255, a: 255 });

export function swapColors(): void {
	const fg = get(foregroundColor);
	const bg = get(backgroundColor);
	foregroundColor.set(bg);
	backgroundColor.set(fg);
}
export function resetColors(): void {
	foregroundColor.set({ r: 0, g: 0, b: 0, a: 255 });
	backgroundColor.set({ r: 255, g: 255, b: 255, a: 255 });
}

/** "Colour picker mode": when open, the main area shows the picker instead of
 * the canvas/panels. `target` is the colour slot being edited. */
export type ColorTarget = 'fg' | 'bg';
export const colorPicker = writable<{ target: ColorTarget } | null>(null);

export function openColorPicker(target: ColorTarget): void {
	colorPicker.set({ target });
}
/** Toggles the picker for `target` (clicking the active swatch closes it). */
export function toggleColorPicker(target: ColorTarget): void {
	const cur = get(colorPicker);
	if (cur && cur.target === target) colorPicker.set(null);
	else colorPicker.set({ target });
}
export function closeColorPicker(): void {
	colorPicker.set(null);
}

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

// --- brush defaults (used by Slice 2 paint tools) --------------------------

export const brushSize = writable(24);
export const brushOpacity = writable(100); // percent 0..100
export const brushHardness = writable(60); // percent 0..100
export const brushSpacing = writable(15); // percent of brush size (Paint.NET style)

/** Brush edge anti-aliasing: 'smooth' (soft, anti-aliased edges — hardness
 * applies) vs 'pixel' (hard, pixel-crisp edges at the full brush size). */
export const antiAliasMode = writable<'pixel' | 'smooth'>('smooth');

export function cycleBrushSize(delta: number): void {
	brushSize.update((v) => clamp(Math.round(v + delta), 1, 400));
}

// --- brush settings persistence (localStorage) -------------------------------
// The tool options chosen for the paint tools (size, opacity, hardness,
// spacing, anti-alias) survive a reload. Stored in one namespaced key; loaded
// synchronously at startup so the first stroke already uses the saved values.

const BRUSH_KEY = 'paint.svelte.brushSettings.v1';

interface BrushSettings {
	size: number;
	opacity: number; // 0..100
	hardness: number; // 0..100
	spacing: number; // 1..300 percent of brush size
	antiAlias: 'pixel' | 'smooth';
}

function clampInt(value: unknown, lo: number, hi: number, fallback: number): number {
	const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
	return clamp(n, lo, hi);
}

function brushDefaults(): BrushSettings {
	return {
		size: get(brushSize),
		opacity: get(brushOpacity),
		hardness: get(brushHardness),
		spacing: get(brushSpacing),
		antiAlias: get(antiAliasMode)
	};
}

function readBrushSettings(): BrushSettings | null {
	try {
		const raw = localStorage.getItem(BRUSH_KEY);
		if (!raw) return null;
		const p = JSON.parse(raw) as Partial<BrushSettings>;
		if (!p || typeof p !== 'object') return null;
		const d = brushDefaults();
		return {
			size: clampInt(p.size, 1, 400, d.size),
			opacity: clampInt(p.opacity, 0, 100, d.opacity),
			hardness: clampInt(p.hardness, 0, 100, d.hardness),
			spacing: clampInt(p.spacing, 1, 300, d.spacing),
			antiAlias: p.antiAlias === 'pixel' || p.antiAlias === 'smooth' ? p.antiAlias : d.antiAlias
		};
	} catch {
		return null;
	}
}

function writeBrushSettings(): void {
	try {
		localStorage.setItem(
			BRUSH_KEY,
			JSON.stringify({
				size: get(brushSize),
				opacity: get(brushOpacity),
				hardness: get(brushHardness),
				spacing: get(brushSpacing),
				antiAlias: get(antiAliasMode)
			})
		);
	} catch {
		/* storage unavailable — ignore */
	}
}

if (typeof window !== 'undefined') {
	// Restore the saved values once (before any subscription writes back), then
	// persist every later change.
	const saved = readBrushSettings();
	if (saved) {
		brushSize.set(saved.size);
		brushOpacity.set(saved.opacity);
		brushHardness.set(saved.hardness);
		brushSpacing.set(saved.spacing);
		antiAliasMode.set(saved.antiAlias);
	}
	for (const store of [brushSize, brushOpacity, brushHardness, brushSpacing, antiAliasMode]) {
		store.subscribe(() => writeBrushSettings());
	}
}
