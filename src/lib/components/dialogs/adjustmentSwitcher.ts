// Layer: components. Shared adjustment-switcher logic for adjustment dialogs.
//
// Mirrors the filter switcher in FilterPopup.svelte (▾ menu that REPLACES the
// current window plus ‹ › steppers that cycle), but scoped to adjustments that
// actually open a dialog. Instant-apply adjustments (Auto-Level, Black and
// White, Sepia, Invert Alpha) have no window to replace and are excluded.
import { getEditorRenderer } from '../../render/EditorRenderer';
import { adjustmentEffects, effectById } from '../../effects';
import type { ResolvedEffect } from '../../effects';
import { openDialog } from '../../services/dialogService';
import type { DialogKind } from '../../services/dialogService';
import { anchorDialogRight } from '../common/dialogPosition';

/** Adjustments that open a dialog, label-sorted like the Adjustments menu. */
export const adjustmentDialogs: ResolvedEffect[] = adjustmentEffects.filter(
	(e) => e.params.length > 0 || e.dialog
);

/** Switcher/stepper order (stable ids). Wraps around both ends. */
export const adjustmentDialogOrder: string[] = adjustmentDialogs.map((e) => e.id);

function step(id: string, delta: 1 | -1): string {
	const i = adjustmentDialogOrder.indexOf(id);
	if (i < 0) return id;
	const n = adjustmentDialogOrder.length;
	return adjustmentDialogOrder[(i + delta + n) % n];
}

/** Id of the previous dialog-based adjustment (‹ stepper). */
export function prevAdjustmentId(id: string): string {
	return step(id, -1);
}

/** Id of the next dialog-based adjustment (› stepper). */
export function nextAdjustmentId(id: string): string {
	return step(id, 1);
}

/** Replace the current adjustment dialog with the target's dialog: clear the
 * current preview, then open the picked adjustment's dialog. Honours custom
 * `dialog` overrides (e.g. Curves, Levels) exactly like the command routing
 * in services/commands.ts — the DialogHost remounts on kind/effect change,
 * and MovableDialog restores the saved position. The current window's RIGHT
 * edge is anchored first, so the remount keeps the top-right corner (with
 * the ‹ › steppers) fixed instead of the top-left. */
export function switchAdjustment(id: string): void {
	const target = effectById(id);
	if (!target) return;
	// Viewport x of the outgoing window's right edge (NaN-guarded by the
	// anchor consumer). Queried BEFORE openDialog unmounts this window.
	const right =
		typeof document !== 'undefined'
			? document.querySelector('.m-dialog')?.getBoundingClientRect().right ?? null
			: null;
	getEditorRenderer().setActiveLayerFilterPreview(null);
	if (right !== null) anchorDialogRight(right);
	openDialog(
		(target.dialog ?? 'effect') as NonNullable<DialogKind>,
		target.dialog ? undefined : { effectId: id }
	);
}

/** Dismiss behaviour for the ▾ switcher menu, shared by all adjustment
 * dialogs: the first Escape closes the menu (capture runs before
 * MovableDialog's bubble handler, which would close the dialog), and
 * clicking anywhere outside the menu closes it. Returns the onMount
 * cleanup. Preview lifecycle stays with the owning dialog. */
export function attachSwitcherDismiss(isOpen: () => boolean, close: () => void): () => void {
	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && isOpen()) {
			e.stopPropagation();
			close();
		}
	};
	// Clicking anywhere outside the switcher closes it (the click itself
	// still goes through — no stopPropagation here).
	const onPointerDown = (e: MouseEvent) => {
		if (isOpen() && !(e.target as HTMLElement | null)?.closest('.filter-switcher')) close();
	};
	window.addEventListener('keydown', onKey, true);
	document.addEventListener('mousedown', onPointerDown, true);
	return () => {
		window.removeEventListener('keydown', onKey, true);
		document.removeEventListener('mousedown', onPointerDown, true);
	};
}
