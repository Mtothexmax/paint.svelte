// Layer: services. Holds the currently open modal dialog (type + payload).

import { writable } from 'svelte/store';

export type DialogKind = 'newImage' | 'blur' | 'hueSat' | 'brightCont' | 'rasterizeConfirm' | 'imageSize' | null;

export interface DialogState {
	kind: DialogKind;
	payload?: unknown;
}

/** Payload for the 'rasterizeConfirm' dialog: invoked when the user confirms. */
export interface RasterizeConfirmPayload {
	onConfirm: () => void;
}

/** Payload for the 'imageSize' dialog: which tab to start on. */
export interface ImageSizeDialogPayload {
	mode?: 'resize' | 'canvas';
}

export const dialog = writable<DialogState>({ kind: null });

export function openDialog(kind: NonNullable<DialogKind>, payload?: unknown): void {
	dialog.set({ kind, payload });
}

export function closeDialog(): void {
	dialog.set({ kind: null });
}
