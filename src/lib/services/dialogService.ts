// Layer: services. Holds the currently open modal dialog (type + payload).

import { writable } from 'svelte/store';

export type DialogKind = 'newImage' | null;

export interface DialogState {
	kind: DialogKind;
	payload?: unknown;
}

export const dialog = writable<DialogState>({ kind: null });

export function openDialog(kind: NonNullable<DialogKind>, payload?: unknown): void {
	dialog.set({ kind, payload });
}

export function closeDialog(): void {
	dialog.set({ kind: null });
}
