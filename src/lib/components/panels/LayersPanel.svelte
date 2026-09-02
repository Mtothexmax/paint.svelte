<script lang="ts">
	// Layer: components/panels. Layers panel — list, selection, visibility,
	// opacity, add/duplicate/delete/reorder. All ops go through the service
	// (which records undoable history).
	import { onMount } from 'svelte';
	import { documentRegistry, RegistryEvents } from '../../core/document/registry';
	import {
		addLayer,
		deleteLayer,
		duplicateLayer,
		moveLayer,
		selectLayer,
		setLayerOpacityLive,
		commitLayerOpacity,
		setLayerVisibility,
		layerRows,
		type LayerRow
	} from '../../services/layersService';

	let rows = $state<LayerRow[]>([]);
	let opacityVal = $state(100);
	let opacityStart = 0;
	let unsubHist: (() => void) | null = null;

	function refresh() {
		const doc = documentRegistry.active;
		rows = doc ? layerRows(doc) : [];
		const active = doc?.activeLayer;
		opacityVal = active ? Math.round(active.opacity * 100) : 100;
	}
	function attach() {
		unsubHist?.();
		const doc = documentRegistry.active;
		if (doc) unsubHist = doc.history.subscribe(() => refresh());
		else unsubHist = null;
		refresh();
	}

	onMount(() => {
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

	function activeRow() {
		return rows.find((r) => r.active);
	}

	// Live preview while dragging (no history entry yet).
	function onOpacityInput(e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value);
		opacityVal = v;
		const active = activeRow();
		if (active) setLayerOpacityLive(active.id, v / 100);
	}
	// Capture the value at the start of the drag gesture.
	function onOpacityStart() {
		opacityStart = activeRow()?.opacity ?? 1;
	}
	// One history entry when the drag is released.
	function onOpacityCommit(e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value);
		opacityVal = v;
		const active = activeRow();
		if (active) commitLayerOpacity(active.id, opacityStart, v / 100);
	}
</script>

<div class="panel-card flex h-full flex-col">
	<div class="flex items-center justify-between">
		<div class="panel-title">Layers</div>
		<div class="flex gap-0.5">
			<button class="mini-btn" title="Add layer" onclick={() => addLayer()}>＋</button>
			<button
				class="mini-btn"
				title="Delete layer"
				disabled={rows.length <= 1}
				onclick={() => {
					const active = rows.find((r) => r.active);
					if (active) deleteLayer(active.id);
				}}
			>🗑</button>
		</div>
	</div>

	{#if rows.length > 0}
		<div class="layer-list">
			{#each rows as row (row.id)}
				<div
					class="layer-row"
					class:on={row.active}
					class:dim={!row.visible}
					onclick={() => selectLayer(row.id)}
				>
					<button
						class="layer-eye"
						title={row.visible ? 'Hide layer' : 'Show layer'}
						onclick={(e) => {
							e.stopPropagation();
							setLayerVisibility(row.id, !row.visible);
						}}
					>{row.visible ? '👁' : '🚫'}</button>
					<span class="layer-name">{row.name}</span>
					<span class="layer-op">{Math.round(row.opacity * 100)}%</span>
					<div class="layer-actions">
						<button
							class="mini-btn"
							title="Duplicate layer"
							onclick={(e) => {
								e.stopPropagation();
								duplicateLayer(row.id);
							}}
						>⧉</button>
						<button
							class="mini-btn"
							title="Move up"
							onclick={(e) => {
								e.stopPropagation();
								moveLayer(row.id, 1);
							}}
						>↑</button>
						<button
							class="mini-btn"
							title="Move down"
							onclick={(e) => {
								e.stopPropagation();
								moveLayer(row.id, -1);
							}}
						>↓</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="panel-empty">No layers.</p>
	{/if}

	<div class="layer-opacity">
		<span class="panel-title">Opacity</span>
		<input
			type="range"
			min="0"
			max="100"
			step="1"
			bind:value={opacityVal}
			onpointerdown={onOpacityStart}
			oninput={onOpacityInput}
			onchange={onOpacityCommit}
		/>
		<span class="layer-op">{opacityVal}%</span>
	</div>
</div>
