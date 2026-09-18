<script lang="ts">
	import './FilterPopup.css';
	// Layer: components. Reusable applied-filter popup (FL-Studio style):
	// param controls per registered effect, live preview, Preview checkbox
	// on the LEFT of Cancel/Apply, and a ▾ triangle button at the top-left
	// of the title bar that opens the filter menu to REPLACE the current
	// filter, plus ‹ › steppers at the top-right. Generic over any effect
	// id — used for every applied filter (see DialogHost).
	import { onMount } from 'svelte';
	import MovableDialog from '../common/MovableDialog.svelte';
	import EffectBrowserMenu from '../common/EffectBrowserMenu.svelte';
	import SwitchIcon from '@material-symbols/svg-400/rounded/arrow_drop_down.svg';
	import PrevIcon from '@material-symbols/svg-400/rounded/chevron_left.svg';
	import NextIcon from '@material-symbols/svg-400/rounded/chevron_right.svg';
	import FilterSlider from '../common/FilterSlider.svelte';
	import EffectColorRow from '../common/EffectColorRow.svelte';
	import EffectCheckbox from '../common/EffectCheckbox.svelte';
	import EffectSelect from '../common/EffectSelect.svelte';
	import XYPicker from '../common/XYPicker.svelte';
	import AnglePicker from '../common/AnglePicker.svelte';
	import XyParam from '../common/XyParam.svelte';
	import { getEditorRenderer } from '../../render/EditorRenderer';
	import { applyEffect, effectById, effectMenusWithEntries } from '../../effects';
	import type { EffectSettings } from '../../effects';
	import { closeDialog, openDialog } from '../../services/dialogService';
	import type { DialogKind } from '../../services/dialogService';
	import { getSettings, saveSettings } from '../../services/settingsService';
	import { rememberLastApplied } from '../../state/repeat';

	interface Props {
		effectId: string;
	}
	let { effectId }: Props = $props();

	const def = effectById(effectId);

	let settings = $state<EffectSettings>(
		def ? getSettings<EffectSettings>(`effects.${def.id}`, def.defaults) : {}
	);
	let previewOn = $state(true);
	let switcherOpen = $state(false);

	const noop = $derived(!!def && !!def.isNoop && def.isNoop(settings));

	// Whole filter list in browser-menu order for the ‹ › steppers.
	// Wraps around both ends.
	const filterOrder: string[] = effectMenusWithEntries.flatMap((g) =>
		g.effects.map((e) => e.id)
	);
	const orderIndex = filterOrder.indexOf(effectId);
	const prevId =
		orderIndex >= 0
			? filterOrder[(orderIndex - 1 + filterOrder.length) % filterOrder.length]
			: effectId;
	const nextId =
		orderIndex >= 0 ? filterOrder[(orderIndex + 1) % filterOrder.length] : effectId;
	const prevDef = effectById(prevId);
	const nextDef = effectById(nextId);

	function preview() {
		if (!def) return;
		const r = getEditorRenderer();
		if (previewOn && !(def.isNoop?.(settings) ?? false))
			r.setActiveLayerFilterPreview(def.filter(settings));
		else r.setActiveLayerFilterPreview(null);
	}
	function togglePreview() {
		preview();
	}

	$effect(() => {
		if (def) saveSettings(`effects.${def.id}`, settings);
	});

	function apply() {
		if (!def) return;
		const r = getEditorRenderer();
		r.setActiveLayerFilterPreview(null);
		if (applyEffect(r, def, settings)) {
			rememberLastApplied({
				menu: 'effects',
				name: def.label,
				apply: () => applyEffect(getEditorRenderer(), def, settings)
			});
			closeDialog();
		}
	}
	function cancel() {
		getEditorRenderer().setActiveLayerFilterPreview(null);
		closeDialog();
	}

	/** Replace the current filter: clear its preview and open the picked
	 * filter's dialog (DialogHost remounts by effect id). Mirrors the
	 * command routing in services/commands.ts — effects with a custom
	 * `dialog` override (e.g. Curves) open their dedicated dialog instead
	 * of the generic popup. */
	function switchFilter(id: string) {
		switcherOpen = false;
		if (id === effectId) return;
		getEditorRenderer().setActiveLayerFilterPreview(null);
		const target = effectById(id);
		openDialog(
			(target?.dialog ?? 'effect') as NonNullable<DialogKind>,
			target?.dialog ? undefined : { effectId: id }
		);
	}

	onMount(() => {
		preview();
		// First Escape closes the switcher menu (capture runs before
		// MovableDialog's bubble handler, which would close the dialog).
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && switcherOpen) {
				e.stopPropagation();
				switcherOpen = false;
			}
		};
		// Clicking anywhere outside the switcher closes it (the click itself
		// still goes through — no stopPropagation here).
		const onPointerDown = (e: MouseEvent) => {
			if (switcherOpen && !(e.target as HTMLElement | null)?.closest('.filter-switcher'))
				switcherOpen = false;
		};
		window.addEventListener('keydown', onKey, true);
		document.addEventListener('mousedown', onPointerDown, true);
		return () => {
			window.removeEventListener('keydown', onKey, true);
			document.removeEventListener('mousedown', onPointerDown, true);
			getEditorRenderer().setActiveLayerFilterPreview(null);
		};
	});
</script>

{#if def}
	<MovableDialog title={def.label} onClose={cancel} width={380}>
		{#snippet titleLeft()}
			<span class="filter-switcher">
				<button
					class="m-menu-btn"
					title="Change filter"
					aria-label="Change filter"
					aria-expanded={switcherOpen}
					onclick={() => (switcherOpen = !switcherOpen)}
				><img src={SwitchIcon} class="m-btn-ic" alt="" draggable="false" /></button>
				{#if switcherOpen}
					<EffectBrowserMenu
						placement="down"
						ariaLabel="Replace filter"
						isEnabled={() => true}
						onPick={switchFilter}
					/>
				{/if}
			</span>
		{/snippet}

		{#snippet titleRight()}
			{#if orderIndex >= 0 && prevDef && nextDef}
				<button
					class="m-menu-btn"
					title={prevDef.label}
					aria-label="Previous filter: {prevDef.label}"
					onclick={() => switchFilter(prevId)}
				><img src={PrevIcon} class="m-btn-ic" alt="" draggable="false" /></button>
				<button
					class="m-menu-btn"
					title={nextDef.label}
					aria-label="Next filter: {nextDef.label}"
					onclick={() => switchFilter(nextId)}
				><img src={NextIcon} class="m-btn-ic" alt="" draggable="false" /></button>
			{/if}
		{/snippet}

		{#each def.params as param (param.key)}
			{#if param.kind === 'color'}
				<EffectColorRow
					label={param.label}
					bind:value={settings[param.key]}
					oninput={preview}
				/>
			{:else if param.kind === 'checkbox'}
				<EffectCheckbox label={param.label} bind:value={settings[param.key]} oninput={preview} />
			{:else if param.kind === 'select'}
				<EffectSelect
					label={param.label}
					bind:value={settings[param.key]}
					options={param.options ?? []}
					default={param.default}
					oninput={preview}
				/>
			{:else if param.kind === 'xy'}
				<XyParam {param} {settings} onChange={preview} />
			{:else if param.kind === 'angle'}
				<AnglePicker
					bind:value={settings[param.key]}
					min={param.min ?? 0}
					max={param.max ?? 360}
					step={param.step ?? 1}
					default={param.default}
					label={param.label}
					oninput={preview}
					onCommit={preview}
				/>
			{:else}
				<FilterSlider
					label={param.label}
					min={param.min ?? 0}
					max={param.max ?? 100}
					step={param.step ?? 1}
					default={param.default}
					bind:value={settings[param.key]}
					oninput={preview}
					gradient={param.gradient}
				/>
			{/if}
		{/each}

		{#snippet footerLeft()}
			<label class="radio">
				<input type="checkbox" bind:checked={previewOn} onchange={togglePreview} />
				Preview
			</label>
		{/snippet}

		{#snippet actions()}
			<button class="btn-secondary" onclick={cancel}>Cancel</button>
			<button class="btn-primary" disabled={noop} onclick={apply}>Apply</button>
		{/snippet}
	</MovableDialog>
{/if}
