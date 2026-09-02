<script lang="ts">
	// Layer: components/common. Reusable, app-wide context-menu host. Renders
	// whatever is open in the contextMenu store. Mount once (in App) — any code
	// can open it via openMenu() from state/contextMenu.
	import { onMount } from 'svelte';
	import { contextMenu, closeMenu, type ContextItem } from '../../state/contextMenu';
	import ContextSlider from './ContextSlider.svelte';

	let root: HTMLDivElement;

	function reposition() {
		const m = $contextMenu;
		if (!m || !root) return;
		requestAnimationFrame(() => {
			if (!root || !$contextMenu) return;
			const r = root.getBoundingClientRect();
			const px = Math.min(m.x, window.innerWidth - r.width - 6);
			const py = Math.min(m.y, window.innerHeight - r.height - 6);
			root.style.left = `${Math.max(4, px)}px`;
			root.style.top = `${Math.max(4, py)}px`;
		});
	}

	$effect(() => {
		reposition();
	});

	function activate(item: ContextItem) {
		if (item.type === 'action' && !item.disabled) {
			item.action();
		}
		closeMenu();
	}

	onMount(() => {
		const onDocMouseDown = (e: MouseEvent) => {
			if (root && !root.contains(e.target as Node)) closeMenu();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeMenu();
		};
		document.addEventListener('mousedown', onDocMouseDown, true);
		window.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocMouseDown, true);
			window.removeEventListener('keydown', onKey);
		};
	});
</script>

{#if $contextMenu}
	{@const m = $contextMenu}
	<div
		bind:this={root}
		class="ctx-menu"
		style="left:{m.x}px; top:{m.y}px;"
		oncontextmenu={(e) => e.preventDefault()}
	>
		{#each m.items as item, i (i)}
			{#if item.type === 'separator'}
				<div class="ctx-sep"></div>
			{:else if item.type === 'slider'}
				<ContextSlider
					label={item.label}
					min={item.min}
					max={item.max}
					step={item.step}
					value={item.value}
					oninput={item.oninput}
				/>
			{:else}
				<button
					class="ctx-item"
					class:disabled={item.disabled}
					disabled={item.disabled}
					onclick={() => activate(item)}
				>
					<span>{item.label}</span>
					{#if item.shortcut}<span class="ctx-shortcut">{item.shortcut}</span>{/if}
				</button>
			{/if}
		{/each}
	</div>
{/if}
