<script lang="ts">
	// Layer: components. Renders the declarative menu tree; reads command
	// metadata (label/shortcut/enabled) from the CommandRegistry. Every entry
	// shows a small icon.
	import { onMount } from 'svelte';
	import { MENUS } from '../../services/menuService';
	import { commands } from '../../services/commandRegistry';
	import { lastApplied } from '../../state/repeat';
	import type { MenuEntry } from '../../services/menuService';

	const CATEGORY: Record<string, 'effects' | 'adjustments'> = {
		Effects: 'effects',
		Adjustments: 'adjustments'
	};

	const COMMAND_ICONS: Record<string, string> = {
		'file.new': '🖼️',
		'file.open': '📂',
		'file.save': '💾',
		'file.close': '✖️',
		'view.zoomIn': '🔍',
		'view.zoomOut': '🔎',
		'view.actualSize': '⛶',
		'view.fitWindow': '⤢',
		'edit.undo': '↩️',
		'edit.redo': '↪️',
		'edit.selectAll': '⌗',
		'edit.deselect': '✕',
		'edit.invertSelection': '⇄',
		'edit.delete': '⌫',
		'layers.add': '➕',
		'layers.duplicate': '⧉',
		'layers.delete': '🗑️',
		'adjustments.hueSat': '🌈',
		'adjustments.invertColors': '🔁',
		'effects.blur': '💧'
	};
	const LABEL_ICONS: Record<string, string> = {
		'Cut': '✂️',
		'Copy': '📄',
		'Paste': '📋',
		'Resize…': '📐',
		'Canvas Size…': '⬜',
		'Rotate 90°': '🔄',
		'Crop to Selection': '✂️',
		'Merge Down': '⇩',
		'Brightness…': '☀️',
		'Contrast…': '◑',
		'Sharpen…': '✨'
	};

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

	function iconOf(entry: MenuEntry): string {
		if (entry.type === 'command') return COMMAND_ICONS[entry.commandId] ?? '';
		if (entry.type === 'disabled') return LABEL_ICONS[entry.label] ?? '';
		return '';
	}

	function labelOf(entry: MenuEntry): { text: string; shortcut?: string; disabled: boolean; icon: string } {
		if (entry.type === 'command') {
			return {
				text: commands.label(entry.commandId),
				shortcut: commands.shortcut(entry.commandId),
				disabled: !commands.isEnabled(entry.commandId),
				icon: iconOf(entry)
			};
		}
		if (entry.type === 'disabled') {
			return { text: entry.label, shortcut: entry.shortcut, disabled: true, icon: iconOf(entry) };
		}
		return { text: '', disabled: true, icon: '' };
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
					{#if CATEGORY[menu.label] && $lastApplied?.menu === CATEGORY[menu.label]}
						<button
							class="menu-item"
							onclick={() => {
								$lastApplied?.apply();
								openMenu = null;
							}}
						>
							<span class="menu-ic">🔄</span>
							<span class="menu-text">Repeat {$lastApplied!.name}</span>
						</button>
						<div class="menu-separator"></div>
					{/if}
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
								<span class="menu-ic">{info.icon || ''}</span>
								<span class="menu-text">{info.text}</span>
								{#if info.shortcut}<span class="menu-shortcut">{info.shortcut}</span>{/if}
							</button>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
