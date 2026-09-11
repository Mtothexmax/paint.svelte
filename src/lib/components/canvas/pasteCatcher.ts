// Layer: components -> hidden paste target.
//
// Chrome only emits a real 'paste' event for IMAGE clipboard content when an
// EDITABLE element holds focus. With <body> or a plain <div> focused, Ctrl+V
// with an image on the OS clipboard fires NOTHING at all — which is why
// pasting a screenshot out of Paint.NET used to silently do nothing here.
// (Text-only clipboard content does fire, which is what makes this so
// confusing: pasting text worked, pasting an image never even reached us.)
//
// The fix is an offscreen <textarea> that owns the focus whenever no real
// input does, so the browser always has an editable node to paste into. We
// read the image off the event and wipe the textarea again immediately.

let el: HTMLTextAreaElement | null = null;

/** Called by the component that renders the catcher. */
export function registerPasteCatcher(node: HTMLTextAreaElement | null): void {
	el = node;
}

export function isPasteCatcher(target: EventTarget | null): boolean {
	return !!el && target === el;
}

function isEditableField(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (isPasteCatcher(target)) return false;
	const tag = target.tagName;
	if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return true;
	return target.isContentEditable;
}

/** Elements we must not steal focus from: real text entry, plus the controls
 * the user may still be operating with the keyboard (buttons, links, …). */
function keepsFocus(node: Element | null): boolean {
	if (!(node instanceof HTMLElement)) return false;
	if (isEditableField(node)) return true;
	const tag = node.tagName;
	if (tag === 'BUTTON' || tag === 'A' || tag === 'SELECT' || tag === 'SUMMARY') return true;
	// Anything the page deliberately made tabbable is meant to hold focus.
	return node.hasAttribute('tabindex');
}

/** Hands focus to the catcher so the browser has somewhere to paste into.
 * Never steals focus from a real form field (text tool, dialog inputs, …). */
export function focusPasteCatcher(): void {
	if (!el) return;
	const active = document.activeElement;
	if (active === el) return;
	if (active && active !== document.body && keepsFocus(active)) return;
	el.focus({ preventScroll: true });
}

/** Wipes anything that ended up in the catcher (stray typed keys, text
 * pastes). Cheap no-op when it is already empty. */
export function clearPasteCatcher(): void {
	if (el && el.value !== '') el.value = '';
}
