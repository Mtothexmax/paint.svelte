// Layer: services. Holds the currently open modal dialog (type + payload).

import { writable } from 'svelte/store';

export type DialogKind =
	| 'newImage'
	| 'effect'
	| 'layerEffect'
	| 'curves'
	| 'levels'
	| 'rasterizeConfirm'
	| 'imageSize'
	| 'selectionSize'
	| 'paste'
	| null;

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

/** How an oversized paste should be handled (Paint.NET's "larger than the
 * canvas" question). 'cancel' aborts the paste entirely. */
export type PasteOversizeChoice = 'expand' | 'keep' | 'cancel';

/** Payload for the 'paste' dialog: shown when the pasted image does not fit
 * on the canvas. `onChoose` is called exactly once with the user's answer. */
export interface PasteDialogPayload {
	/** Small PNG data URL of the image being pasted (for the preview). */
	previewUrl: string;
	/** Size of the image being pasted, in pixels. */
	imageWidth: number;
	imageHeight: number;
	/** Current canvas size, in pixels. */
	canvasWidth: number;
	canvasHeight: number;
	onChoose: (choice: PasteOversizeChoice) => void;
}

export const dialog = writable<DialogState>({ kind: null });

export function openDialog(kind: NonNullable<DialogKind>, payload?: unknown): void {
	dialog.set({ kind, payload });
}

export function closeDialog(): void {
	dialog.set({ kind: null });
}
