// Layer: services. Holds the currently open modal dialog (type + payload).

import { writable } from 'svelte/store';

export type DialogKind = 'newImage' | 'blur' | 'hueSat' | 'brightCont' | 'rasterizeConfirm' | null;

export interface DialogState {
	kind: DialogKind;
	payload?: unknown;
}

/** Payload for the 'rasterizeConfirm' dialog: invoked when the user confirms. */
export interface RasterizeConfirmPayload {
	onConfirm: () => void;
}

export const dialog = writable<DialogState>({ kind: null });

export function openDialog(kind: NonNullable<DialogKind>, payload?: unknown): void {
	dialog.set({ kind, payload });
}

export function closeDialog(): void {
	dialog.set({ kind: null });
}
