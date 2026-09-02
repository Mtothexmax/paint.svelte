// Layer: services. Global keyboard → command routing (plan A9). Ignores typing
// in editable targets and avoids hijacking while a modal dialog is open.

import { commands } from './commandRegistry';
import { dialog } from './dialogService';
import { get } from 'svelte/store';

function isEditable(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const el = target;
	if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
	return el.isContentEditable;
}

function keyToken(key: string): string {
	if (key.length === 1) return key.toLowerCase();
	// Normalise a handful of common named keys for matching against display strings.
	const map: Record<string, string> = {
		' ': 'space',
		'=': '=',
		'+': '+',
		'-': '-',
		'0': '0',
		'1': '1',
		Escape: 'escape',
		Delete: 'delete',
		Backspace: 'backspace'
	};
	return map[key] ?? key.toLowerCase();
}

function comboFromEvent(e: KeyboardEvent): string {
	const parts: string[] = [];
	if (e.ctrlKey || e.metaKey) parts.push('ctrl');
	if (e.altKey) parts.push('alt');
	if (e.shiftKey) parts.push('shift');
	if (e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift' && e.key !== 'Meta') {
		parts.push(keyToken(e.key));
	}
	return parts.join('+');
}

function comboFromShortcut(shortcut: string): string {
	return shortcut
		.split('+')
		.map((p) => p.trim())
		.map((p) => {
			const lower = p.toLowerCase();
			if (lower === 'ctrl' || lower === 'meta') return 'ctrl';
			if (lower === 'alt') return 'alt';
			if (lower === 'shift') return 'shift';
			return keyToken(p);
		})
		.join('+');
}

let started = false;

/** Starts the global keydown handler. Safe to call once. Returns a cleanup. */
export function startShortcutService(): () => void {
	if (started) return () => {};
	started = true;

	const handler = (e: KeyboardEvent) => {
		// Never fire while a modal dialog is open.
		if (get(dialog).kind) return;
		if (isEditable(e.target)) return;
		const combo = comboFromEvent(e);
		const match = commands.all().find((def) => def.shortcut && comboFromShortcut(def.shortcut) === combo);
		if (!match) return;
		e.preventDefault();
		if (commands.isEnabled(match.id)) {
			void commands.run(match.id);
		}
	};
	window.addEventListener('keydown', handler);
	return () => {
		window.removeEventListener('keydown', handler);
	};
}
