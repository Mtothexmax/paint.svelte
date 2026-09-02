// Layer: state (Svelte adapter). Tiny request channel used by the polygon-lasso
// tool's options strip to tell the canvas controller to finish/cancel the
// polygon that is currently being built (EditorCanvas performs the action and
// clears the request).

import { writable } from 'svelte/store';

export const polygonAction = writable<null | 'finish' | 'cancel'>(null);

/** Requests the in-progress polygon to be committed as a selection. */
export function requestPolygonFinish(): void {
	polygonAction.set('finish');
}

/** Requests the in-progress polygon to be cancelled (keeps committed selection). */
export function requestPolygonCancel(): void {
	polygonAction.set('cancel');
}
