<script lang="ts">
	// Layer: components/panels. Layers panel — list, selection, visibility,
	// opacity, add/duplicate/delete/reorder. All ops go through the service
	// (which records undoable history).
	import { onMount } from 'svelte';
	import { documentRegistry, RegistryEvents } from '../../core/document/registry';
	import PdnSlider from '../common/PdnSlider.svelte';
	import {
		addLayer,
		deleteLayer,
		duplicateLayer,
		mergeDown,
		moveLayer,
		reorderLayer,
		selectLayer,
		setLayerOpacityLive,
		commitLayerOpacity,
		setLayerVisibility,
		setLayerBlendMode,
		layerRows,
		BLEND_MODE_OPTIONS,
		type LayerRow
	} from '../../services/layersService';
	import { layerThumbnails } from '../../state/layerThumbnails';

	let rows = $state<LayerRow[]>([]);
	let opacityVal = $state(100);
	let prevActiveId: string | null = null;
	let lastCommittedOpacity = 100;
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

	/** Merge-down needs an active layer that is not the bottom one (rows are
	 * top-most first, so the bottom row is last). */
	function canMergeDown(): boolean {
		if (rows.length <= 1) return false;
		const active = activeRow();
		return !!active && rows[rows.length - 1].id !== active.id;
	}

	function canMoveUp(): boolean {
		const active = activeRow();
		return !!active && rows.length > 1 && rows[0].id !== active.id;
	}

	function canMoveDown(): boolean {
		const active = activeRow();
		return !!active && rows.length > 1 && rows[rows.length - 1].id !== active.id;
	}

	function moveActive(delta: number): void {
		const active = activeRow();
		if (active) moveLayer(active.id, delta);
	}

	// --- drag & drop reorder --------------------------------------------
	// Rows show top-most first; dropping visually before/after a row maps to
	// an absolute stack index (0 = bottom).
	let draggedId: string | null = $state(null);
	let dropTarget: { id: string; before: boolean } | null = $state(null);
	/** True while hovering the empty list area below the rows (drop = bottom). */
	let dropBelow = $state(false);

	function onRowDragStart(e: DragEvent, id: string): void {
		draggedId = id;
		dropTarget = null;
		if (e.dataTransfer) {
			e.dataTransfer.setData('text/plain', id);
			e.dataTransfer.effectAllowed = 'move';
		}
	}

	function onRowDragOver(e: DragEvent, id: string): void {
		if (!draggedId || draggedId === id) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		dropTarget = { id, before: e.clientY < rect.top + rect.height / 2 };
	}

	function onRowDrop(e: DragEvent, id: string): void {
		e.preventDefault();
		e.stopPropagation();
		const dragged = (e.dataTransfer?.getData('text/plain') || draggedId) ?? null;
		const target = dropTarget?.id === id ? dropTarget : null;
		draggedId = null;
		dropTarget = null;
		dropBelow = false;
		if (!dragged || dragged === id) return;
		// Visual order without the dragged row, then re-insert at the drop spot.
		const order = rows.map((r) => r.id).filter((rid) => rid !== dragged);
		let at = order.indexOf(id);
		if (at < 0) return;
		if (target && !target.before) at += 1;
		order.splice(at, 0, dragged);
		// Top-most first → absolute index (0 = bottom).
		const to = order.length - 1 - order.indexOf(dragged);
		reorderLayer(dragged, to);
	}

	function onRowDragEnd(): void {
		draggedId = null;
		dropTarget = null;
		dropBelow = false;
	}

	// --- drop onto the empty list area = move to the very bottom ------------
	function onListDragOver(e: DragEvent): void {
		if (!draggedId) return;
		// Only the empty area itself (not bubbled row hovers).
		dropBelow = e.target === e.currentTarget;
		if (dropBelow) {
			dropTarget = null;
			e.preventDefault();
			if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		}
	}

	function onListDrop(e: DragEvent): void {
		e.preventDefault();
		const dragged = (e.dataTransfer?.getData('text/plain') || draggedId) ?? null;
		const below = dropBelow && e.target === e.currentTarget;
		draggedId = null;
		dropTarget = null;
		dropBelow = false;
		if (!dragged || !below) return;
		reorderLayer(dragged, 0);
	}

	// When the active layer changes, remember its opacity as the baseline for
	// the next commit.
	$effect(() => {
		const active = activeRow();
		if (active && prevActiveId !== active.id) {
			prevActiveId = active.id;
			lastCommittedOpacity = active.opacity;
		}
	});
	// Live preview while dragging (no history entry yet).
	$effect(() => {
		const active = activeRow();
		if (active && Math.abs(active.opacity * 100 - opacityVal) > 0.01) {
			setLayerOpacityLive(active.id, opacityVal / 100);
		}
	});
	// One history entry when the slider is released / +/- pressed.
	function onOpacityCommit() {
		const active = activeRow();
		if (!active) return;
		commitLayerOpacity(active.id, lastCommittedOpacity, opacityVal / 100);
		lastCommittedOpacity = opacityVal / 100;
	}
</script>

<div class="panel-card flex h-full flex-col">
	<div class="flex items-center justify-between">
		<div class="panel-title">Layers</div>
		<div class="flex gap-0.5">
			<button class="mini-btn" title="Add layer" onclick={() => addLayer()}>＋</button>
			<button
				class="mini-btn"
				title="Merge layer down"
				disabled={!canMergeDown()}
				onclick={() => mergeDown()}
			>⇩</button>
			<button
				class="mini-btn"
				title="Duplicate active layer"
				disabled={!activeRow()}
				onclick={() => {
					const active = activeRow();
					if (active) duplicateLayer(active.id);
				}}
			>⧉</button>
			<button
				class="mini-btn"
				title="Move active layer up"
				disabled={!canMoveUp()}
				onclick={() => moveActive(1)}
			>↑</button>
			<button
				class="mini-btn"
				title="Move active layer down"
				disabled={!canMoveDown()}
				onclick={() => moveActive(-1)}
			>↓</button>
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
		<div
			class="layer-list"
			class:drop-below={dropBelow}
			ondragover={onListDragOver}
			ondrop={onListDrop}
		>
			{#each rows as row (row.id)}
				<div
					class="layer-row"
					class:on={row.active}
					class:dim={!row.visible}
					class:dragging={draggedId === row.id}
					class:drop-before={dropTarget?.id === row.id && dropTarget.before}
					class:drop-after={dropTarget?.id === row.id && !dropTarget.before}
					draggable="true"
					onclick={() => selectLayer(row.id)}
					ondragstart={(e) => onRowDragStart(e, row.id)}
					ondragover={(e) => onRowDragOver(e, row.id)}
					ondrop={(e) => onRowDrop(e, row.id)}
					ondragend={onRowDragEnd}
				>
					{#if $layerThumbnails[row.id]}
						<img
							class="layer-thumb"
							src={$layerThumbnails[row.id]}
							alt=""
							draggable="false"
						/>
					{:else}
						<div class="layer-thumb" aria-hidden="true"></div>
					{/if}
					<div class="layer-main">
						<div class="layer-line">
							<button
								class="layer-eye"
								title={row.visible ? 'Hide layer' : 'Show layer'}
								onclick={(e) => {
									e.stopPropagation();
									setLayerVisibility(row.id, !row.visible);
								}}
							>{row.visible ? '👁' : '🚫'}</button>
							<span class="layer-name">{row.name}</span>
						</div>
						<div class="layer-line">
							<select
								class="layer-blend"
								value={row.blendMode}
								title="Blend mode"
								onclick={(e) => e.stopPropagation()}
								onpointerdown={(e) => e.stopPropagation()}
								onchange={(e) => setLayerBlendMode(row.id, (e.currentTarget as HTMLSelectElement).value)}
							>
								{#each BLEND_MODE_OPTIONS as b (b.id)}
									<option value={b.id}>{b.label}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="panel-empty">No layers.</p>
	{/if}

	<div class="layer-opacity">
		<PdnSlider
			label="Opacity"
			min={0}
			max={100}
			step={1}
			unit="%"
			fit
			bind:value={opacityVal}
			onCommit={onOpacityCommit}
		/>
	</div>
</div>
