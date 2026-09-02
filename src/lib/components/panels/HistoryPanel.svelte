<script lang="ts">
	// Layer: components/panels. History panel — undoable step list with
	// click-to-travel (Paint.NET behaviour).
	import { onMount } from 'svelte';
	import { documentRegistry, RegistryEvents } from '../../core/document/registry';

	let labels = $state<string[]>([]);
	let cursor = $state(-1);
	let unsubHist: (() => void) | null = null;

	function refresh() {
		const doc = documentRegistry.active;
		labels = doc ? doc.history.labels() : [];
		cursor = doc ? doc.history.cursor : -1;
	}
	function attach() {
		unsubHist?.();
		const doc = documentRegistry.active;
		if (doc) unsubHist = doc.history.subscribe(() => refresh());
		else unsubHist = null;
		refresh();
	}

	function travel(i: number) {
		const doc = documentRegistry.active;
		if (!doc) return;
		const h = doc.history;
		while (h.cursor > i) h.undo();
		while (h.cursor < i) h.redo();
		documentRegistry.notifyChange(doc);
	}

	onMount(() => {
		const unsubs = [
			documentRegistry.events.on(RegistryEvents.opened, attach),
			documentRegistry.events.on(RegistryEvents.closed, attach),
			documentRegistry.events.on(RegistryEvents.active, attach)
		];
		attach();
		return () => {
			unsubs.forEach((u) => u());
			unsubHist?.();
		};
	});
</script>

<div class="panel-card flex h-full flex-col">
	<div class="panel-title">History</div>
	{#if labels.length > 0}
		<div class="history-list">
			<button class="history-row history-baseline" class:on={cursor === -1} onclick={() => travel(-1)}>
				Initial
			</button>
			{#each labels as label, i (i)}
				<button class="history-row" class:on={i === cursor} onclick={() => travel(i)}>
					{label}
				</button>
			{/each}
		</div>
	{:else}
		<p class="panel-empty">Nothing to undo yet.</p>
	{/if}
</div>
