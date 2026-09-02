<script lang="ts">
	// Layer: components. Renders the declarative menu tree; reads command
	// metadata (label/shortcut/enabled) from the CommandRegistry.
	import { onMount } from 'svelte';
	import { MENUS } from '../../services/menuService';
	import { commands } from '../../services/commandRegistry';
	import type { MenuEntry } from '../../services/menuService';

	let bar: HTMLDivElement;
	let openMenu = $state<string | null>(null);

	function toggle(label: string, enabled: boolean) {
		if (!enabled) return;
		openMenu = openMenu === label ? null : label;
	}

	function activate(entry: MenuEntry) {
		if (entry.type === 'command' && commands.isEnabled(entry.commandId)) {
			commands.run(entry.commandId);
		}
		openMenu = null;
	}

	function labelOf(entry: MenuEntry): { text: string; shortcut?: string; disabled: boolean } {
		if (entry.type === 'command') {
			return {
				text: commands.label(entry.commandId),
				shortcut: commands.shortcut(entry.commandId),
				disabled: !commands.isEnabled(entry.commandId)
			};
		}
		if (entry.type === 'disabled') {
			return { text: entry.label, shortcut: entry.shortcut, disabled: true };
		}
		return { text: '', disabled: true };
	}

	function onGlobalMouseDown(e: MouseEvent) {
		if (!openMenu) return;
		if (bar && !bar.contains(e.target as Node)) openMenu = null;
	}
	function onGlobalKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && openMenu) openMenu = null;
	}

	onMount(() => {
		document.addEventListener('mousedown', onGlobalMouseDown);
		document.addEventListener('keydown', onGlobalKeyDown);
		return () => {
			document.removeEventListener('mousedown', onGlobalMouseDown);
			document.removeEventListener('keydown', onGlobalKeyDown);
		};
	});
</script>

<div bind:this={bar} class="flex h-full items-stretch px-1">
	{#each MENUS as menu (menu.label)}
		<div class="relative">
			<button
				class="menubar-btn"
				class:open={openMenu === menu.label}
				onclick={() => toggle(menu.label, menu.enabled)}
				onmouseenter={() => openMenu && menu.enabled && (openMenu = menu.label)}
			>
				{menu.label}
			</button>
			{#if openMenu === menu.label}
				<div class="menu-panel">
					{#each menu.entries as entry, i (i)}
						{#if entry.type === 'separator'}
							<div class="menu-separator"></div>
						{:else}
							{@const info = labelOf(entry)}
							<button
								class="menu-item"
								class:disabled={info.disabled}
								disabled={info.disabled}
								onclick={() => activate(entry)}
							>
								<span>{info.text}</span>
								{#if info.shortcut}<span class="menu-shortcut">{info.shortcut}</span>{/if}
							</button>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
