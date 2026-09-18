// Layer: state (Svelte adapter). Remembers the last applied effect/adjustment
// so the menus can offer "Repeat <Name>".

import { writable, get } from 'svelte/store';

export interface LastApplied {
	/** 'effects' or 'adjustments' — which menu the repeat entry appears in */
	menu: 'effects' | 'adjustments';
	name: string;
	apply: () => void;
	/** Effect id for 'effects' entries: the browser repeat row re-opens the
	 * filter DIALOG (last settings are restored from persisted defaults)
	 * instead of instantly re-applying. */
	effectId?: string;
}

export const lastApplied = writable<LastApplied | null>(null);

/** Called after an effect/adjustment has been applied. */
export function rememberLastApplied(item: LastApplied): void {
	lastApplied.set(item);
}

/** Runs the last applied effect again (if any). */
export function repeatLastApplied(): void {
	get(lastApplied)?.apply();
}
