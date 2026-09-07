// Layer: components -> keyboard handling for the canvas. Pure functions over a
// caller-supplied API object (the component provides closures over its reactive
// state). The shortcuts are a data-driven table; guards encode priority.
import { get } from 'svelte/store';
import { documentRegistry } from '../../core/document/registry';
import { commands } from '../../services/commandRegistry';
import { dialog } from '../../services/dialogService';
import { foregroundColor } from '../../state/ui';
import {
	copySelection,
	cutSelection,
	hasClipboardImage,
	pasteAsNewLayer
} from '../../services/clipboardService';
import {
	deleteSelection,
	deselect,
	fillSelection,
	invertSelection,
	selectAll
} from '../../services/selectionService';

/** State + action surface the key handlers run against (the component supplies
 * closures over its reactive state). */
export interface KeyApi {
	// gesture flags
	gradientDraft(): boolean;
	gradientDrawing(): boolean;
	lineDraft(): boolean;
	lineDrawing(): boolean;
	shapeDraft(): boolean;
	polyBuilding(): boolean;
	selecting(): boolean;
	moveFloating(): boolean;
	moveSelDragging(): boolean;
	spaceHeld(): boolean;
	setSpaceHeld(v: boolean): void;
	// actions
	cancelGradientDraft(): void;
	cancelLineDraft(): void;
	cancelShapeDraft(): void;
	cancelPolygon(): void;
	cancelSelectDrag(): void;
	dropMove(): void;
	cancelMove(): void;
	cancelMoveSelection(): void;
	finishPolygon(): void;
	finishLineDraft(): void;
	finishGradientDraft(): void;
	syncTransformUi(): void;
}

export function isTextTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.tagName === 'TEXTAREA') return true;
	if (target.tagName === 'INPUT') {
		const t = (target as HTMLInputElement).type;
		return ['text', 'search', 'number', 'email', 'url', 'password', 'tel'].includes(t);
	}
	return target.isContentEditable;
}

/** Escape cancels an in-progress selection drag AND clears an active selection
 * (Paint.NET behaviour). Order matters: gradient -> line -> shape -> polygon ->
 * selection drag, then the floating-selection move, then the drop. */
function escapeKey(a: KeyApi): void {
	if (a.gradientDraft()) {
		a.cancelGradientDraft();
		return;
	}
	if (a.lineDraft()) {
		a.cancelLineDraft();
		return;
	}
	if (a.shapeDraft()) {
		a.cancelShapeDraft();
		return;
	}
	if (a.polyBuilding()) {
		a.cancelPolygon();
		return;
	}
	if (a.selecting()) a.cancelSelectDrag();
	// Escape always ends with NO selection: a floating move is first cancelled
	// (content returns to its source), then the selection — if any — is dropped.
	if (a.moveFloating()) a.cancelMove();
	// A move-selection drag is also interrupted: the selection reverts to its
	// original position before the selection itself is dropped.
	if (a.moveSelDragging()) a.cancelMoveSelection();
	if (documentRegistry.active?.selection.active) deselect();
}

const CTRL_SHORTCUTS: Record<string, (e: KeyboardEvent, a: KeyApi) => boolean> = {
	z: (e) => {
		const doc = documentRegistry.active!;
		if (e.shiftKey) doc.history.redo();
		else doc.history.undo();
		documentRegistry.notifyChange(doc);
		return true;
	},
	y: () => {
		const doc = documentRegistry.active!;
		doc.history.redo();
		documentRegistry.notifyChange(doc);
		return true;
	},
	a: (_e, a) => {
		selectAll();
		a.syncTransformUi();
		return true;
	},
	d: () => {
		deselect();
		return true;
	},
	i: (e) => {
		if (e.shiftKey) commands.run('adjustments.invertColors');
		else invertSelection();
		return true;
	},
	c: (e) => (e.shiftKey ? false : (copySelection(), true)),
	x: (e) => (e.shiftKey ? false : (cutSelection(), true)),
	v: () => (hasClipboardImage() ? (pasteAsNewLayer(), true) : false)
};

export function handleKeyDown(e: KeyboardEvent, a: KeyApi): void {
	const typing = isTextTarget(e.target);
	const modal = !!get(dialog).kind;
	// Escape cancels an in-progress selection drag AND clears an active
	// selection (Paint.NET behaviour). Guarded against typing inputs and open
	// modal dialogs so it never steals Escape from them.
	if (e.key === 'Escape' && !typing && !modal) {
		escapeKey(a);
		return;
	}
	// While a floating selection exists the document is in a transient state —
	// no other keyboard action may interleave. Escape cancels and Enter drops;
	// everything else waits until the selection is dropped.
	if (a.moveFloating()) {
		if (e.key === 'Enter' && !typing && !modal) {
			e.preventDefault();
			a.dropMove();
		}
		return;
	}
	// Enter finishes an in-progress polygon-lasso selection.
	if (a.polyBuilding() && e.key === 'Enter' && !typing && !modal) {
		e.preventDefault();
		a.finishPolygon();
		return;
	}
	// Enter commits an editable line draft (not while still drawing it).
	if (a.lineDraft() && !a.lineDrawing() && e.key === 'Enter' && !typing && !modal) {
		e.preventDefault();
		a.finishLineDraft();
		return;
	}
	// Enter commits a finished gradient line (not while still drawing it).
	if (a.gradientDraft() && !a.gradientDrawing() && e.key === 'Enter' && !typing && !modal) {
		e.preventDefault();
		a.finishGradientDraft();
		return;
	}
	// Undo / Redo and the selection commands — handled here directly
	// (layout-robust on every keyboard) so a brush stroke can always be
	// reverted with Ctrl+Z / Ctrl+Y and selections via Ctrl+A/D/I. The
	// stopPropagation below is required: the commands also carry shortcut
	// strings for the menu, and without it the global shortcut service would
	// run them a second time.
	if (!typing && (e.ctrlKey || e.metaKey) && !e.altKey && !modal && documentRegistry.active) {
		const handled = CTRL_SHORTCUTS[e.key.toLowerCase()]?.(e, a);
		if (handled) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
	}
	// Delete erases the selection content on the active layer (no modifiers;
	// guarded against typing in inputs and open dialogs).
	if (!typing && !modal && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === 'Delete') {
		if (documentRegistry.active?.selection.active) {
			e.preventDefault();
			e.stopPropagation();
			deleteSelection();
			return;
		}
	}
	// Backspace fills the active layer (or the current selection, when one
	// exists) with the foreground colour.
	if (!typing && !modal && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === 'Backspace') {
		e.preventDefault();
		e.stopPropagation();
		fillSelection(get(foregroundColor));
		return;
	}
	if (e.code === 'Space' && !typing) {
		a.setSpaceHeld(true);
		e.preventDefault();
	}
}

export function handleKeyUp(e: KeyboardEvent, a: KeyApi): void {
	if (e.code === 'Space') a.setSpaceHeld(false);
}