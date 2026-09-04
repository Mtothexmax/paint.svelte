<script lang="ts">
	// Layer: components. Gaussian Blur — movable popup with live preview and
	// persisted last-used configuration.
	import { onMount } from 'svelte';
	import { BlurFilter } from 'pixi.js';
	import MovableDialog from '../common/MovableDialog.svelte';
	import FilterSlider from '../common/FilterSlider.svelte';
	import { getEditorRenderer } from '../../render/EditorRenderer';
	import { gaussianBlurActiveLayer } from '../../render/effects';
	import { closeDialog } from '../../services/dialogService';
	import { getSettings, saveSettings } from '../../services/settingsService';
	import { rememberLastApplied } from '../../state/repeat';

	interface BlurPrefs {
		strength: number;
	}
	const prefs = $state<BlurPrefs>(getSettings<BlurPrefs>('filters.blur', { strength: 8 }));

	let previewOn = $state(true);
	const renderer = () => getEditorRenderer();

	const blurGradient =
		'repeating-linear-gradient(90deg, #2A7B9B 0 10px, #57C785 10px 20px)';

	function preview() {
		if (previewOn && prefs.strength > 0)
			renderer().setActiveLayerFilterPreview(new BlurFilter({ strength: prefs.strength, resolution: 1 }));
		else renderer().setActiveLayerFilterPreview(null);
	}
	function togglePreview() {
		preview();
	}

	$effect(() => saveSettings('filters.blur', { strength: prefs.strength }));

	function apply() {
		const r = renderer();
		r.setActiveLayerFilterPreview(null);
		const strength = prefs.strength;
		if (gaussianBlurActiveLayer(r, strength)) {
			rememberLastApplied({
				menu: 'effects',
				name: 'Gaussian Blur',
				apply: () => gaussianBlurActiveLayer(getEditorRenderer(), strength)
			});
			closeDialog();
		}
	}
	function cancel() {
		renderer().setActiveLayerFilterPreview(null);
		closeDialog();
	}

	onMount(() => {
		preview();
		return () => renderer().setActiveLayerFilterPreview(null);
	});
</script>

<MovableDialog title="Gaussian Blur" onClose={cancel} width={380}>
		<FilterSlider
			label="Blur strength"
			min={0}
			max={50}
			step={1}
			default={8}
			bind:value={prefs.strength}
			oninput={preview}
			gradient={blurGradient}
			gradientClass="fsl-gradient-fade"
		/>
	<label class="radio">
		<input type="checkbox" bind:checked={previewOn} onchange={togglePreview} />
		Preview
	</label>

	{#snippet actions()}
		<button class="btn-secondary" onclick={cancel}>Cancel</button>
		<button class="btn-primary" disabled={prefs.strength <= 0} onclick={apply}>Apply</button>
	{/snippet}
</MovableDialog>
