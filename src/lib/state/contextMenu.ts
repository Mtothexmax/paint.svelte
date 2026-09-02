// Layer: state (Svelte adapter). A single app-wide context-menu store. Any
// component can open it with `openMenu(items, x, y)`; one ContextMenu host
// (mounted once in App) renders whatever is open. This keeps the context menu
// reusable across many future call sites.

import { writable } from 'svelte/store';

export type ContextItem =
	| { type: 'action'; label: string; shortcut?: string; disabled?: boolean; action: () => void }
	| { type: 'separator' }
	| {
			type: 'slider';
			label: string;
			min: number;
			max: number;
			step?: number;
			value: number;
			oninput: (v: number) => void;
	  };

export interface ContextMenuState {
	x: number;
	y: number;
	items: ContextItem[];
}

export const contextMenu = writable<ContextMenuState | null>(null);

/** Opens the menu at viewport coordinates (px). */
export function openMenu(x: number, y: number, items: ContextItem[]): void {
	contextMenu.set({ x, y, items });
}

export function closeMenu(): void {
	contextMenu.set(null);
}

/** Builds the common Copy/Paste/… item shapes from a clipboard-safe helper. */
export function separatorItem(): ContextItem {
	return { type: 'separator' };
}

export function sliderItem(
	label: string,
	min: number,
	max: number,
	value: number,
	oninput: (v: number) => void,
	step?: number
): ContextItem {
	return { type: 'slider', label, min, max, step, value, oninput };
}
