<script lang="ts">
	// Layer: components. Foreground/background swatches. Clicking a swatch opens
	// the full color-picker mode (the canvas/panels are replaced by the picker).
	// Right-click shows a small Copy/Paste menu.
	import { get } from 'svelte/store';
	import { rgbaToCss, rgbaToHex, parseColorText, type RGBA } from '../../core/color';
	import {
		foregroundColor,
		backgroundColor,
		swapColors,
		resetColors,
		showNotice,
		toggleColorPicker,
		type ColorTarget
	} from '../../state/ui';
	import { openMenu } from '../../state/contextMenu';

	const storeOf = (slot: ColorTarget) => (slot === 'fg' ? foregroundColor : backgroundColor);
	const labelOf = (slot: ColorTarget) => (slot === 'fg' ? 'Foreground colour' : 'Background colour');

	// --- right-click Copy / Paste ---
	function copyColor(slot: ColorTarget) {
		const hex = rgbaToHex(get(storeOf(slot)));
		navigator.clipboard
			.writeText(hex)
			.then(() => showNotice(`Copied ${hex}`))
			.catch(() => showNotice('Could not copy to clipboard.', 'error'));
	}
	async function pasteColor(slot: ColorTarget) {
		let text: string;
		try {
			text = await navigator.clipboard.readText();
		} catch {
			showNotice('Clipboard is not accessible.', 'error');
			return;
		}
		const parsed = parseColorText(text);
		if (!parsed) {
			showNotice(`Could not parse “${text.slice(0, 30)}” as a colour.`, 'error');
			return;
		}
		storeOf(slot).update((cur) => (parsed.hasAlpha ? { ...parsed.color } : { ...parsed.color, a: cur.a }));
		showNotice(`Pasted ${rgbaToHex(parsed.color)}`);
	}
	function openFor(e: MouseEvent, slot: ColorTarget) {
		e.preventDefault();
		e.stopPropagation();
		openMenu(e.clientX, e.clientY, [
			{ type: 'action', label: 'Copy', shortcut: 'hex', action: () => copyColor(slot) },
			{ type: 'action', label: 'Paste', action: () => void pasteColor(slot) }
		]);
	}
</script>

	<div class="flex h-full items-center gap-2 pl-0 pr-2 select-none">
	<div class="color-stack">
		<button
			class="cs cs-bg"
			title="Background colour — click to edit, right-click for copy/paste"
			onclick={() => toggleColorPicker('bg')}
			oncontextmenu={(e) => openFor(e, 'bg')}
		>
			<span class="cs-fill" style="background-color:{rgbaToCss($backgroundColor)};"></span>
		</button>
		<button
			class="cs cs-fg"
			title="Foreground colour — click to edit, right-click for copy/paste"
			onclick={() => toggleColorPicker('fg')}
			oncontextmenu={(e) => openFor(e, 'fg')}
		>
			<span class="cs-fill" style="background-color:{rgbaToCss($foregroundColor)};"></span>
		</button>
	</div>
	<button class="mini-btn" title="Swap colours (X)" onclick={swapColors}>⇄</button>
	<button class="mini-btn" title="Reset (D)" onclick={resetColors}>↺</button>
</div>
