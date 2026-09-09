<script lang="ts">
	// Layer: components. Dialog for adding / editing a live layer effect.
	// Nearly identical to EffectDialog but updates the layer model instead of
	// swapping the surface, and restores the original settings on Cancel.
	import { onMount } from 'svelte';
	import MovableDialog from '../common/MovableDialog.svelte';
	import FilterSlider from '../common/FilterSlider.svelte';
	import { getEditorRenderer } from '../../render/EditorRenderer';
	import { effectById } from '../../effects';
	import type { EffectSettings } from '../../effects';
	import { closeDialog } from '../../services/dialogService';
	import { getSettings } from '../../services/settingsService';
	import {
		addLayerEffect,
		updateLayerEffectSettings
	} from '../../services/layerEffectsService';
	import { documentRegistry } from '../../core/document/registry';
	import type { LayerEffectDialogPayload } from '../../services/dialogService';

	interface Props {
		payload: LayerEffectDialogPayload;
	}
	let { payload }: Props = $props();

	const def = effectById(payload.effectId);
	const layer = documentRegistry.active?.layers.find((l) => l.id === payload.layerId);
	const existing =
		payload.effectIndex !== undefined
			? layer?.effects?.[payload.effectIndex]
			: undefined;

	// Seed settings: existing > saved defaults > effect defaults.
	let settings = $state<EffectSettings>(
		existing
			? { ...existing.settings }
			: def
				? getSettings<EffectSettings>(`effects.${def.id}`, def.defaults)
				: {}
	);
	let previewOn = $state(true);
	const originalSettings = existing ? { ...existing.settings } : undefined;

	const noop = $derived(!!def && !!def.isNoop && def.isNoop(settings));

	function preview() {
		if (!def || !layer) return;
		const r = getEditorRenderer();
		if (previewOn && !(def.isNoop?.(settings) ?? false)) {
			if (existing) {
				updateLayerEffectSettings(payload.layerId, payload.effectIndex!, settings);
			} else {
				// Temporarily preview by pushing a transient effect.
				if (!layer.effects) layer.effects = [];
				// Remove any previous transient preview effect (same id at end).
				const last = layer.effects[layer.effects.length - 1];
				if (last && last.id === payload.effectId && last.enabled) {
					layer.effects.pop();
				}
				layer.effects.push({ id: payload.effectId, settings: { ...settings }, enabled: true });
				r.refreshLayerEffects(payload.layerId);
				// Remove the transient effect after refresh so it doesn't persist.
				layer.effects.pop();
			}
		} else {
			if (existing && originalSettings) {
				updateLayerEffectSettings(payload.layerId, payload.effectIndex!, originalSettings);
			}
		}
	}

	function togglePreview() {
		preview();
	}

	function apply() {
		if (!def || !layer) return;
		const r = getEditorRenderer();
		if (existing) {
			updateLayerEffectSettings(payload.layerId, payload.effectIndex!, settings);
		} else {
			addLayerEffect(payload.layerId, payload.effectId, settings);
		}
		closeDialog();
	}

	function cancel() {
		if (existing && originalSettings && layer) {
			updateLayerEffectSettings(payload.layerId, payload.effectIndex!, originalSettings);
		}
		closeDialog();
	}

	onMount(() => {
		preview();
		return () => {
			if (existing && originalSettings && layer) {
				updateLayerEffectSettings(payload.layerId, payload.effectIndex!, originalSettings);
			}
		};
	});
</script>

{#if def}
	<MovableDialog title={`${def.label} — Layer Effect`} onClose={cancel} width={380}>
		{#each def.params as param (param.key)}
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
