<script lang="ts">
	// Layer: components. Brightness / Contrast — movable popup with live preview
	// and persisted last-used configuration.
	import { onMount } from 'svelte';
	import { ColorMatrixFilter } from 'pixi.js';
	import MovableDialog from '../common/MovableDialog.svelte';
	import FilterSlider from '../common/FilterSlider.svelte';
	import { getEditorRenderer } from '../../render/EditorRenderer';
	import { brightnessContrastActiveLayer } from '../../render/effects';
	import { closeDialog } from '../../services/dialogService';
	import { getSettings, saveSettings } from '../../services/settingsService';
	import { rememberLastApplied } from '../../state/repeat';

	interface Prefs {
		brightness: number;
		contrast: number;
	}
	const prefs = $state<Prefs>(getSettings<Prefs>('filters.brightCont', { brightness: 0, contrast: 0 }));

	let previewOn = $state(true);
	const renderer = () => getEditorRenderer();

	/** Brightness track: black → white (like the Lightness slider). */
	const brightnessGradient = 'linear-gradient(90deg, #000 0%, #fff 100%)';

	/** Contrast track: soft greys on the left → hard black/white stripes on
	 *  the right (from the user's reference CSS). */
	const contrastGradient =
		'linear-gradient(90deg, #808080 0%, #505050 15%, #b0b0b0 30%, #202020 45%, #e0e0e0 60%, #000000 70%, #000000 76%, #ffffff 76%, #ffffff 82%, #000000 82%, #000000 88%, #ffffff 88%, #ffffff 94%, #000000 94%, #000000 100%)';

	/** Approximate preview using ColorMatrixFilter (the exact Pinta pixel
	 *  algorithm only runs on Apply — too slow for interactive dragging). */
	function makeFilter() {
		const cm = new ColorMatrixFilter();
		cm.brightness((100 + prefs.brightness) / 100, true);
		// Approximate Pinta contrast: at contrast=100 the Pinta algorithm
		// thresholds to black/white; we approximate with a high linear factor.
		const c = prefs.contrast;
		const factor = c < 0 ? (100 + c) / 100 : c === 0 ? 1 : c >= 100 ? 100 : 1 + c * c / (100 * (100 - c));
		cm.contrast(Math.max(0, factor), true);
		return cm;
	}
	function preview() {
		if (previewOn) renderer().setActiveLayerFilterPreview(makeFilter());
		else renderer().setActiveLayerFilterPreview(null);
	}
	function togglePreview() {
		preview();
	}

	$effect(() =>
		saveSettings('filters.brightCont', { brightness: prefs.brightness, contrast: prefs.contrast })
	);

	function apply() {
		const r = renderer();
		r.setActiveLayerFilterPreview(null);
		const { brightness, contrast } = prefs;
		if (brightnessContrastActiveLayer(r, { brightness, contrast })) {
			rememberLastApplied({
				menu: 'adjustments',
				name: 'Brightness / Contrast',
				apply: () => brightnessContrastActiveLayer(getEditorRenderer(), { brightness, contrast })
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

<MovableDialog title="Brightness / Contrast" onClose={cancel} width={400}>
	<FilterSlider label="Brightness" min={-100} max={100} step={1} default={0} bind:value={prefs.brightness} oninput={preview} gradient={brightnessGradient} />
	<FilterSlider label="Contrast" min={-100} max={100} step={1} default={0} bind:value={prefs.contrast} oninput={preview} gradient={contrastGradient} />
	<label class="radio">
		<input type="checkbox" bind:checked={previewOn} onchange={togglePreview} />
		Preview
	</label>

	{#snippet actions()}
		<button class="btn-secondary" onclick={cancel}>Cancel</button>
		<button class="btn-primary" onclick={apply}>Apply</button>
	{/snippet}
</MovableDialog>
