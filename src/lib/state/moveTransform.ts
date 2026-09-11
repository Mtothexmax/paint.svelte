// Layer: state (Svelte adapter). The Move Selected Pixels transform session:
// one store publishes whether pixels are currently lifted (so the options
// strip can enable its Apply / Cancel buttons) and another carries the
// request back to the canvas, which owns the engine and clears it again.
//
// Same request-channel pattern as state/polygon.ts and state/text.ts — the
// options strip never touches the render engine directly.

import { get, writable } from 'svelte/store';

/** True while a lifted (floating) selection has an uncommitted transform. */
export const moveTransformFloating = writable(false);

export type MoveTransformAction = 'apply' | 'cancel';

/** Pending request from the options strip; the canvas performs it and resets. */
export const moveTransformAction = writable<MoveTransformAction | null>(null);

/** Commit the floating transform into the layer. */
export function requestMoveTransformApply(): void {
	moveTransformAction.set('apply');
}

/** Discard the floating transform (the pixels return to where they came from). */
export function requestMoveTransformCancel(): void {
	moveTransformAction.set('cancel');
}

/** Reset rule: only Apply (button / Enter) and the place-on-click-away drop
 * keep a floating transform — every other doc/selection/layer mutation
 * first discards it, otherwise it would operate on the erased-hole layer or
 * stale selection underneath. Menu paths bypass the keyboard guard (which
 * already blocks them while floating), so the services call this
 * themselves. Synchronous: the canvas performs the cancel before this
 * returns. No-op when nothing floats. */
export function cancelFloatingMove(): void {
	if (get(moveTransformFloating)) requestMoveTransformCancel();
}
