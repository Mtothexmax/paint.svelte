// Layer: services. Holds the currently open modal dialog (type + payload).

import { writable } from 'svelte/store';

export type DialogKind = 'newImage' | 'effect' | 'layerEffect' | 'curves' | 'rasterizeConfirm' | 'imageSize' | null;

export interface DialogState {
	kind: DialogKind;
	payload?: unknown;
}

/** Payload for the generic 'effect' dialog: which registered effect to run. */
export interface EffectDialogPayload {
	effectId: string;
}

/** Payload for the layer-effect dialog: adding or editing a live layer effect. */
export interface LayerEffectDialogPayload {
	layerId: string;
	effectId: string;
	/** When present we are editing an existing effect at this index. */
	effectIndex?: number;
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
