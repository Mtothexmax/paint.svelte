<script lang="ts">
	// Layer: components. Full color-picker mode — the shared ColorPicker
	// wired to the foreground/background slot stores, plus the mode chrome
	// (fg/bg segment, copy, Done, Esc).
	import { get } from 'svelte/store';
	import { rgbaToHex, type RGBA } from '../../core/color';
	import ColorPicker from '../common/ColorPicker.svelte';
	import {
		colorPicker,
		foregroundColor,
		backgroundColor,
		openColorPicker,
		closeColorPicker,
		type ColorTarget
	} from '../../state/ui';
	import { showNotice } from '../../state/ui';

	const slotOf = (s: ColorTarget) => (s === 'fg' ? foregroundColor : backgroundColor);
	const labelOf = (s: ColorTarget) => (s === 'fg' ? 'Foreground' : 'Background');

	// Local mirror of the active slot. Synced from the slot (guarded compare
	// so our own pushes can't ping-pong); pushed back on every pick.
	let color = $state<RGBA>({ r: 0, g: 0, b: 0, a: 255 });

	$effect(() => {
		const target = $colorPicker?.target;
		if (!target) return;
		const c = get(slotOf(target));
		if (c.r !== color.r || c.g !== color.g || c.b !== color.b || c.a !== color.a)
			color = { ...c };
	});

	function pushToSlot(c: RGBA) {
		const target = $colorPicker?.target;
		if (target) slotOf(target).set({ ...c });
	}

	function copyCurrent() {
		const hex = rgbaToHex(color);
		navigator.clipboard
			.writeText(hex)
			.then(() => showNotice(`Copied ${hex}`))
			.catch(() => showNotice('Could not copy to clipboard.', 'error'));
	}

	// Esc closes
	$effect(() => {
		if (!$colorPicker) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeColorPicker();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<div class="color-mode" oncontextmenu={(e) => e.preventDefault()}>
	<div class="color-mode-head">
		<span class="color-mode-title">Colour</span>
		<div class="seg">
			<button class="seg-btn" class:on={$colorPicker?.target === 'fg'} onclick={() => openColorPicker('fg')}>
				{labelOf('fg')}
			</button>
			<button class="seg-btn" class:on={$colorPicker?.target === 'bg'} onclick={() => openColorPicker('bg')}>
				{labelOf('bg')}
			</button>
		</div>
		<button class="mini-btn" title="Copy colour" onclick={copyCurrent}>⧉ Copy</button>
		<button class="btn-primary color-mode-done" onclick={() => closeColorPicker()}>Done</button>
	</div>

	{#if $colorPicker}
		<ColorPicker bind:value={color} oninput={pushToSlot} />
	{/if}
</div>
