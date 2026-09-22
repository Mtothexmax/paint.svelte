// Layer: components/common. Pending right-edge anchor for dialog mounts.
//
// Set when a dialog REPLACES another one (‹ › steppers / ▾ switcher in the
// filter and adjustment windows) so the TOP-RIGHT corner — where the
// steppers live — stays fixed instead of the top-left. Dialogs have
// different widths (Levels 680, Curves 420, generic popup 380); without
// this the arrows jump away from the cursor on every step. Consumed
// (cleared) by MovableDialog on the next mount; fresh opens from the menu
// never set it and keep the classic top-left restore behaviour.
let pendingRight: number | null = null;

/** Pin the next-mounted dialog's right edge to this viewport x. */
export function anchorDialogRight(right: number): void {
	pendingRight = right;
}

/** Take (and clear) the pending anchor, if any. */
export function takeDialogRightAnchor(): number | null {
	const right = pendingRight;
	pendingRight = null;
	return right;
}
