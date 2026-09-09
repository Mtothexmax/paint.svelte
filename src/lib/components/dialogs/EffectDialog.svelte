<script lang="ts">
	// Layer: components. Generic single-sheet effect dialog: renders one slider
	// per param of the registered effect, with live preview, persisted
	// last-used settings and the standard repeat-after-apply integration.
	import { onMount } from 'svelte';
	import MovableDialog from '../common/MovableDialog.svelte';
	import FilterSlider from '../common/FilterSlider.svelte';
	import EffectColorRow from '../common/EffectColorRow.svelte';
	import EffectCheckbox from '../common/EffectCheckbox.svelte';
	import { getEditorRenderer } from '../../render/EditorRenderer';
	import { applyEffect, effectById } from '../../effects';
	import type { EffectSettings } from '../../effects';
	import { closeDialog } from '../../services/dialogService';
	import { getSettings, saveSettings } from '../../services/settingsService';
	import { rememberLastApplied } from '../../state/repeat';
	import type { EffectDialogPayload } from '../../services/dialogService';

	interface Props {
		payload: EffectDialogPayload;
	}
	let { payload }: Props = $props();

	const def = effectById(payload.effectId);

	let settings = $state<EffectSettings>(
		def ? getSettings<EffectSettings>(`effects.${def.id}`, def.defaults) : {}
	);
	let previewOn = $state(true);

	const noop = $derived(!!def && !!def.isNoop && def.isNoop(settings));

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

	onMount(() => {
		preview();
		return () => getEditorRenderer().setActiveLayerFilterPreview(null);
	});
</script>

{#if def}
	<MovableDialog title={def.label} onClose={cancel} width={380}>
		{#each def.params as param (param.key)}
			{#if param.kind === 'color'}
				<EffectColorRow
					label={param.label}
					bind:value={settings[param.key]}
					oninput={preview}
				/>
			{:else if param.kind === 'checkbox'}
				<EffectCheckbox label={param.label} bind:value={settings[param.key]} oninput={preview} />
			{:else}
				<FilterSlider
					label={param.label}
					min={param.min}
					max={param.max}
					step={param.step ?? 1}
					default={param.default}
					bind:value={settings[param.key]}
					oninput={preview}
					gradient={param.gradient}
				/>
			{/if}
		{/each}
		<label class="radio">
			<input type="checkbox" bind:checked={previewOn} onchange={togglePreview} />
			Preview
		</label>

		{#snippet actions()}
			<button class="btn-secondary" onclick={cancel}>Cancel</button>
			<button class="btn-primary" disabled={noop} onclick={apply}>Apply</button>
		{/snippet}
	</MovableDialog>
{/if}