<script lang="ts">
	// Layer: components. Renders the declarative menu tree; reads command
	// metadata (label/shortcut/enabled) from the CommandRegistry. Every entry
	// shows a small icon.
	import { onMount } from 'svelte';
	import { MENUS } from '../../services/menuService';
	import { commands } from '../../services/commandRegistry';
	import { lastApplied } from '../../state/repeat';
	import { effects, adjustmentEffects } from '../../effects';
	import type { MenuEntry } from '../../services/menuService';
	import BrightnessContrastSvg from '@material-symbols/svg-400/rounded/contrast.svg?raw';

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
		'view.checkerDark': '◑',
		'edit.undo': '↩️',
		'edit.redo': '↪️',
		'edit.selectAll': '⌗',
		'edit.deselect': '✕',
		'edit.invertSelection': '⇄',
		'edit.delete': '⌫',
		'layers.add': '➕',
		'layers.duplicate': '⧉',
		'layers.delete': '🗑️',
		'image.resize': '📐',
		'image.canvasSize': '⬜',
		'adjustments.hueSat': '🌈',
		'adjustments.invertColors': '🔁',
		...Object.fromEntries(effects.map((e) => [`effects.${e.id}`, e.icon ?? '✨'])),
		// The instant (no-param) adjustments run via `adjustments.*` commands
		// rather than `effects.*`, so they need their own icon mapping.
		...Object.fromEntries(
			adjustmentEffects.map((e) => [`adjustments.${e.id}`, e.icon ?? '✨'])
		)
	};
	/** Raw inline SVG markup per command (rendered via {@html}, exact color). */
	const COMMAND_SVG_ICONS: Record<string, string> = {
		'adjustments.brightCont': BrightnessContrastSvg,
		'effects.brightCont': BrightnessContrastSvg
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
		'Blurs': '💧',
		'Photo': '🖼️',
		'Render': '☁️',
		'Stylize': '🟨',
		'Noise': '✨',
		'Object': '🔘',
		'Distort': '⚪️'
	};

	let bar: HTMLDivElement;
	let openMenu = $state<string | null>(null);
	let openSub = $state<string | null>(null);

	function toggle(label: string, enabled: boolean) {
		if (!enabled) return;
		openSub = null;
		openMenu = openMenu === label ? null : label;
	}

	function activate(entry: MenuEntry) {
		if (entry.type === 'command' && commands.isEnabled(entry.commandId)) {
			commands.run(entry.commandId);
		}
		openMenu = null;
		openSub = null;
	}

	function iconOf(entry: MenuEntry): string {
		if (entry.type === 'command')
			return COMMAND_SVG_ICONS[entry.commandId] ?? COMMAND_ICONS[entry.commandId] ?? '';
		if (entry.type === 'disabled') return LABEL_ICONS[entry.label] ?? '';
		return '';
	}

	function isSvgIcon(entry: MenuEntry): boolean {
		return entry.type === 'command' && entry.commandId in COMMAND_SVG_ICONS;
	}

	function labelOf(entry: MenuEntry): {
		text: string;
		shortcut?: string;
		disabled: boolean;
		icon: string;
		checked: boolean;
		checkable: boolean;
	} {
		if (entry.type === 'command') {
			return {
				text: commands.label(entry.commandId),
				shortcut: commands.shortcut(entry.commandId),
				disabled: !commands.isEnabled(entry.commandId),
				icon: iconOf(entry),
				checked: commands.isChecked(entry.commandId),
				checkable: commands.hasCheck(entry.commandId)
			};
		}
		if (entry.type === 'disabled') {
			return {
				text: entry.label,
				shortcut: entry.shortcut,
				disabled: true,
				icon: iconOf(entry),
				checked: false,
				checkable: false
			};
		}
		return { text: '', disabled: true, icon: '', checked: false, checkable: false };
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

	<div bind:this={bar} class="flex h-full items-stretch px-1 select-none">
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
						{:else if entry.type === 'submenu'}
							{@const subKey = menu.label + '/' + entry.label}
							<div
								class="sub-holder"
								role="group"
								onpointerenter={() => (openSub = subKey)}
								onpointerleave={() => (openSub = null)}
							>
								<button
									class="menu-item"
									class:open={openSub === subKey}
									onclick={() => (openSub = openSub === subKey ? null : subKey)}
								>
									<span class="menu-ic">{LABEL_ICONS[entry.label] ?? ''}</span>
									<span class="menu-text">{entry.label}</span>
									<span class="menu-chevron">▸</span>
								</button>
								{#if openSub === subKey}
									<div class="menu-panel sub-panel">
										{#each entry.entries as sub, j (j)}
											{#if sub.type === 'separator'}
												<div class="menu-separator"></div>
											{:else}
												{@const subInfo = labelOf(sub)}
												<button
													class="menu-item"
													class:disabled={subInfo.disabled}
													disabled={subInfo.disabled}
													onclick={() => activate(sub)}
												>
													{#if subInfo.checkable}<span class="menu-check">{subInfo.checked ? '✓' : ''}</span>{/if}
													<span class="menu-ic">
														{#if isSvgIcon(sub)}
															<span class="menu-svg">{@html iconOf(sub)}</span>
														{:else}
															{subInfo.icon || ''}
														{/if}
													</span>
													<span class="menu-text">{subInfo.text}</span>
													{#if subInfo.shortcut}<span class="menu-shortcut">{subInfo.shortcut}</span>{/if}
												</button>
											{/if}
										{/each}
									</div>
								{/if}
							</div>
						{:else}
							{@const info = labelOf(entry)}
							<button
								class="menu-item"
								class:disabled={info.disabled}
								disabled={info.disabled}
								onclick={() => activate(entry)}
							>
								{#if info.checkable}<span class="menu-check">{info.checked ? '✓' : ''}</span>{/if}
								<span class="menu-ic">
									{#if isSvgIcon(entry)}
										<span class="menu-svg">{@html iconOf(entry)}</span>
									{:else}
										{info.icon || ''}
									{/if}
								</span>
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
