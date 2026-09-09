<script lang="ts">
	import './EffectPanel.css';
	// Layer: components/panels. Docked layer-effects panel (bottom dock, like the
	// Flash/Macromedia effects strip): left icon toolbar (add / remove / copy /
	// paste the whole effect chain across layers), middle checkbox list of the
	// active layer's effects, right hand the settings of the selected effect.
	import { onMount } from 'svelte';
	import { documentRegistry, RegistryEvents } from '../../core/document/registry';
	import type { LayerEffect } from '../../core/layers/Layer';
	import { effectById, effectMenusWithEntries } from '../../effects';
	import type { EffectSettings } from '../../effects';
	import { getSettings, saveSettings } from '../../services/settingsService';
	import FilterSlider from '../common/FilterSlider.svelte';
	import EffectColorRow from '../common/EffectColorRow.svelte';
	import EffectCheckbox from '../common/EffectCheckbox.svelte';

	import AddIcon from '@material-symbols/svg-400/rounded/add.svg';
	import RemoveIcon from '@material-symbols/svg-400/rounded/remove.svg';
	import CopyIcon from '@material-symbols/svg-400/rounded/content_copy.svg';
	import PasteIcon from '@material-symbols/svg-400/rounded/content_paste.svg';
	import CloseIcon from '@material-symbols/svg-400/rounded/close.svg';

	import { closeLayerEffectsPanel } from '../../state/ui';

	import {
		addLayerEffect,
		removeLayerEffect,
		toggleLayerEffect,
		reorderLayerEffect,
		updateLayerEffectSettings,
		copyLayerEffects,
		pasteLayerEffects,
		hasCopiedEffects
	} from '../../services/layerEffectsService';

	let layerId: string | null = $state(null);
	let layerName = $state('');
	let effects: LayerEffect[] = $state([]);
	let selectedIndex: number | null = $state(null);
	let addOpen = $state(false);
	let canPaste = $state(hasCopiedEffects());
	let unsubHist: (() => void) | null = null;

	// --- resizable panel height (drag the corner grip, persisted) ---------
	const FX_HEIGHT_KEY = 'paint.svelte.fxPanelHeight.v1';
	const FX_HEIGHT_MIN = 84;
	const FX_HEIGHT_MAX = 480;
	const FX_HEIGHT_DEFAULT = 152;

	function loadHeight(): number {
		if (typeof window === 'undefined' || typeof localStorage === 'undefined')
			return FX_HEIGHT_DEFAULT;
		try {
			const raw = localStorage.getItem(FX_HEIGHT_KEY);
			const n = raw ? parseInt(raw, 10) : NaN;
			if (Number.isFinite(n)) return Math.min(FX_HEIGHT_MAX, Math.max(FX_HEIGHT_MIN, n));
		} catch {
			/* storage unavailable — ignore */
		}
		return FX_HEIGHT_DEFAULT;
	}

	let panelHeight = $state(FX_HEIGHT_DEFAULT);
	let dragState: { startY: number; startH: number } | null = null;

	function onGripDown(e: PointerEvent) {
		// The whole header bar is the drag area — but interactive children
		// (the close button) keep their own behavior.
		if ((e.target as HTMLElement).closest('button, input, a, select')) return;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		dragState = { startY: e.clientY, startH: panelHeight };
	}
	function onGripMove(e: PointerEvent) {
		if (!dragState) return;
		panelHeight = Math.min(
			FX_HEIGHT_MAX,
			Math.max(FX_HEIGHT_MIN, Math.round(dragState.startH + (dragState.startY - e.clientY)))
		);
	}
	function onGripUp() {
		if (!dragState) return;
		dragState = null;
		try {
			localStorage.setItem(FX_HEIGHT_KEY, String(panelHeight));
		} catch {
			/* storage unavailable — ignore */
		}
	}

	function refresh() {
		const doc = documentRegistry.active;
		const layer = doc?.activeLayer ?? null;
		const newId = layer?.id ?? null;
		if (newId !== layerId) {
			layerId = newId;
			selectedIndex = null;
		}
		layerName = layer?.name ?? '';
		effects = layer?.effects ? [...layer.effects] : [];
		if (effects.length === 0) selectedIndex = null;
		else if (selectedIndex === null) selectedIndex = 0;
		else if (selectedIndex > effects.length - 1) selectedIndex = effects.length - 1;
	}

	function attach() {
		unsubHist?.();
		const doc = documentRegistry.active;
		if (doc) unsubHist = doc.history.subscribe(() => refresh());
		else unsubHist = null;
		refresh();
	}

	onMount(() => {
		panelHeight = loadHeight();
		const unsubs = [
			documentRegistry.events.on(RegistryEvents.opened, attach),
			documentRegistry.events.on(RegistryEvents.closed, attach),
			documentRegistry.events.on(RegistryEvents.active, attach),
			documentRegistry.events.on(RegistryEvents.changed, attach)
		];
		attach();
		return () => {
			unsubs.forEach((u) => u());
			unsubHist?.();
		};
	});

	const selectedEff = $derived(selectedIndex === null ? undefined : effects[selectedIndex]);
	const selectedDef = $derived(selectedEff ? effectById(selectedEff.id) : undefined);

	function selectEntry(i: number) {
		selectedIndex = i;
	}

	function toggleEntry(i: number) {
		if (!layerId) return;
		toggleLayerEffect(layerId, i);
	}

	// --- drag & drop reorder (mirrors the Layers panel pattern) -----------
	let draggedIdx: number | null = $state(null);
	let dropTarget: { index: number; before: boolean } | null = $state(null);

	function onFxDragStart(e: DragEvent, i: number) {
		draggedIdx = i;
		dropTarget = null;
		if (e.dataTransfer) {
			e.dataTransfer.setData('text/plain', String(i));
			e.dataTransfer.effectAllowed = 'move';
		}
	}

	function onFxDragOver(e: DragEvent, i: number) {
		if (draggedIdx === null || draggedIdx === i) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		dropTarget = { index: i, before: e.clientY < rect.top + rect.height / 2 };
	}

	function onFxDrop(e: DragEvent, i: number) {
		e.preventDefault();
		e.stopPropagation();
		const from = draggedIdx;
		const target = dropTarget?.index === i ? dropTarget : null;
		draggedIdx = null;
		dropTarget = null;
		if (from === null || from === i || !layerId) return;
		// Insertion index in the post-removal array.
		let to = target && !target.before ? i + 1 : i;
		if (from < to) to -= 1;
		if (from === to) return;
		if (reorderLayerEffect(layerId, from, to)) selectedIndex = to;
	}

	function onFxDragEnd() {
		draggedIdx = null;
		dropTarget = null;
	}

	/** Dropping onto the empty list area moves the effect to the end. */
	function onFxListDragOver(e: DragEvent) {
		if (draggedIdx === null || e.target !== e.currentTarget) return;
		dropTarget = null;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}

	function onFxListDrop(e: DragEvent) {
		e.preventDefault();
		const from = draggedIdx;
		draggedIdx = null;
		dropTarget = null;
		if (from === null || !layerId) return;
		if (reorderLayerEffect(layerId, from, effects.length - 1)) selectedIndex = effects.length - 1;
	}

	function addEffect(effectId: string) {
		if (!layerId) return;
		const def = effectById(effectId);
		if (!def) return;
		const settings = getSettings<EffectSettings>(`effects.${def.id}`, def.defaults);
		addLayerEffect(layerId, effectId, settings);
		addOpen = false;
		selectedIndex = effects.length > 0 ? effects.length - 1 : 0;
	}

	function removeSelected() {
		if (!layerId || selectedIndex === null) return;
		removeLayerEffect(layerId, selectedIndex);
	}

	function doCopy() {
		if (!layerId) return;
		if (copyLayerEffects(layerId)) canPaste = true;
	}

	function doPaste() {
		if (!layerId || !canPaste) return;
		if (pasteLayerEffects(layerId)) {
			selectedIndex = effects.length > 0 ? effects.length - 1 : null;
		}
	}

	function pushSettings() {
		if (!layerId || selectedIndex === null || !selectedEff) return;
		updateLayerEffectSettings(layerId, selectedIndex, { ...selectedEff.settings });
	}

	/** Persists the current settings (e.g. a picked color) as the defaults
	 * for the next added effect of the same kind. */
	function commitSettings() {
		if (!selectedEff || !selectedDef) return;
		saveSettings(`effects.${selectedDef.id}`, { ...selectedEff.settings });
	}
</script>

<div class="fx-panel" style="height:{panelHeight}px" oncontextmenu={(e) => e.preventDefault()}>
	<div
		class="fx-head"
		title="Drag to resize the panel"
		onpointerdown={onGripDown}
		onpointermove={onGripMove}
		onpointerup={onGripUp}
		onpointercancel={onGripUp}
	>
		<span class="fx-title">Layer Effects</span>
		{#if layerName}<span class="fx-layer">· {layerName}</span>{/if}
		<span class="fx-grip" aria-hidden="true">⇕</span>
		<button class="fx-close" title="Close layer-effects panel" onclick={closeLayerEffectsPanel}>
			<img src={CloseIcon} class="fx-ic" alt="Close" draggable="false" />
		</button>
	</div>

	<div class="fx-body">
		<div class="fx-tools">
			<div class="fx-add">
				<button class="fx-btn" title="Add effect" onclick={() => (addOpen = !addOpen)}>
					<img src={AddIcon} class="fx-ic" alt="Add" draggable="false" />
				</button>
				{#if addOpen}
					<div class="fx-add-backdrop" onclick={() => (addOpen = false)}></div>
					<div class="fx-add-menu">
						{#each effectMenusWithEntries as group, gi}
							{#if gi > 0}<div class="fx-add-sep"></div>{/if}
							<div class="fx-add-head">{group.label}</div>
							{#each group.effects as eff (eff.id)}
								<button class="fx-add-item" onclick={() => addEffect(eff.id)}>
									<span class="fx-add-ic">{eff.icon ?? ''}</span>
									<span>{eff.label}</span>
								</button>
							{/each}
						{/each}
					</div>
				{/if}
			</div>
			<button class="fx-btn" title="Remove selected effect" disabled={selectedIndex === null} onclick={removeSelected}>
				<img src={RemoveIcon} class="fx-ic" alt="Remove" draggable="false" />
			</button>
			<button class="fx-btn" title="Copy all effects" disabled={layerId === null} onclick={doCopy}>
				<img src={CopyIcon} class="fx-ic" alt="Copy" draggable="false" />
			</button>
			<button class="fx-btn" title="Paste copied effects" disabled={!canPaste || layerId === null} onclick={doPaste}>
				<img src={PasteIcon} class="fx-ic" alt="Paste" draggable="false" />
			</button>
		</div>

		<div class="fx-list" ondragover={onFxListDragOver} ondrop={onFxListDrop}>
			{#each effects as eff, i (i)}
				<div
					class="fx-item"
					class:on={selectedIndex === i}
					class:dragging={draggedIdx === i}
					class:drop-before={dropTarget?.index === i && dropTarget.before}
					class:drop-after={dropTarget?.index === i && !dropTarget.before}
					draggable="true"
					onclick={() => selectEntry(i)}
					ondragstart={(e) => onFxDragStart(e, i)}
					ondragover={(e) => onFxDragOver(e, i)}
					ondrop={(e) => onFxDrop(e, i)}
					ondragend={onFxDragEnd}
				>
					<input
						type="checkbox"
						title={eff.enabled ? 'Disable effect' : 'Enable effect'}
						checked={eff.enabled}
						onclick={(e) => {
							e.stopPropagation();
							toggleEntry(i);
						}}
					/>
					<span class="fx-item-ic">{effectById(eff.id)?.icon ?? ''}</span>
					<span class="fx-item-name">{effectById(eff.id)?.label ?? eff.id}</span>
				</div>
			{:else}
				<p class="fx-empty">No effects. Press ＋ to add one.</p>
			{/each}
		</div>

		<div class="fx-props">
			{#if selectedEff && selectedDef}
				{#each selectedDef.params as param (param.key)}
					{#if param.kind === 'color'}
						<EffectColorRow
							label={param.label}
							bind:value={selectedEff.settings[param.key]}
							oninput={pushSettings}
							onCommit={commitSettings}
						/>
					{:else if param.kind === 'checkbox'}
						<EffectCheckbox
							label={param.label}
							bind:value={selectedEff.settings[param.key]}
							oninput={pushSettings}
							onCommit={commitSettings}
						/>
					{:else}
						<FilterSlider
							label={param.label}
							min={param.min ?? 0}
							max={param.max ?? 100}
							step={param.step ?? 1}
							default={param.default}
							bind:value={selectedEff.settings[param.key]}
							oninput={pushSettings}
							gradient={param.gradient}
						/>
					{/if}
				{/each}
			{:else}
				<p class="fx-empty">Select an effect to edit its settings.</p>
			{/if}
		</div>
	</div>
</div>