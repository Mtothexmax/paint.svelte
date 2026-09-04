<script lang="ts">
	// Layer: components. Hue / Saturation / Lightness — movable popup with live
	// preview and persisted last-used configuration.
	import { onMount } from 'svelte';
	import { ColorMatrixFilter } from 'pixi.js';
	import MovableDialog from '../common/MovableDialog.svelte';
	import FilterSlider from '../common/FilterSlider.svelte';
	import { getEditorRenderer } from '../../render/EditorRenderer';
	import { hueSaturationActiveLayer } from '../../render/effects';
	import { closeDialog } from '../../services/dialogService';
	import { getSettings, saveSettings } from '../../services/settingsService';
	import { rememberLastApplied } from '../../state/repeat';

	interface HslPrefs {
		hue: number;
		sat: number;
		light: number;
	}
	const prefs = $state<HslPrefs>(getSettings<HslPrefs>('filters.hueSat', { hue: 0, sat: 100, light: 100 }));

	let previewOn = $state(true);
	const renderer = () => getEditorRenderer();

	/** Hue track: full hue spectrum from red (0°) back to red (360°). */
	const hueGradient =
		'linear-gradient(90deg, hsl(0,100%,50%) 0%, hsl(60,100%,50%) 16.67%, hsl(120,100%,50%) 33.33%, hsl(180,100%,50%) 50%, hsl(240,100%,50%) 66.67%, hsl(300,100%,50%) 83.33%, hsl(360,100%,50%) 100%)';

	/** Saturation track: desaturated on the left (same hue, 0% saturation) →
	 *  fully saturated on the right. Uses the hue gradient but fades it to
	 *  grey on the left. */
	const satGradient = $derived(() => {
		const stops = [0, 60, 120, 180, 240, 300, 360];
		const left = stops.map((h, i) => `hsl(${h},0%,50%) ${(i / 6 * 100).toFixed(1)}%`).join(', ');
		const right = stops.map((h, i) => `hsl(${h},100%,50%) ${(i / 6 * 100).toFixed(1)}%`).join(', ');
		return `linear-gradient(90deg, ${left}, ${right})`;
	});

	/** Lightness track: black → white. */
	const lightGradient = 'linear-gradient(90deg, #000 0%, #fff 100%)';

	function makeFilter() {
		const cm = new ColorMatrixFilter();
		cm.saturate(Math.max(0, prefs.sat) / 100, true);
		cm.hue(prefs.hue, true);
		cm.brightness(Math.max(0, prefs.light) / 100, true);
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
		saveSettings('filters.hueSat', { hue: prefs.hue, sat: prefs.sat, light: prefs.light })
	);

	function apply() {
		const r = renderer();
		r.setActiveLayerFilterPreview(null);
		const { hue, sat, light } = prefs;
		if (hueSaturationActiveLayer(r, { hue, sat, light })) {
			rememberLastApplied({
				menu: 'adjustments',
				name: 'Hue/Saturation',
				apply: () => hueSaturationActiveLayer(getEditorRenderer(), { hue, sat, light })
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

<MovableDialog title="Hue / Saturation" onClose={cancel} width={400}>
	<FilterSlider label="Hue" min={-180} max={180} step={1} default={0} bind:value={prefs.hue} oninput={preview} gradient={hueGradient} />
	<FilterSlider label="Saturation" min={0} max={200} step={1} default={100} bind:value={prefs.sat} oninput={preview} gradient={satGradient()} />
	<FilterSlider label="Lightness" min={0} max={200} step={1} default={100} bind:value={prefs.light} oninput={preview} gradient={lightGradient} />
	<label class="radio">
		<input type="checkbox" bind:checked={previewOn} onchange={togglePreview} />
		Preview
	</label>

	{#snippet actions()}
		<button class="btn-secondary" onclick={cancel}>Cancel</button>
		<button class="btn-primary" onclick={apply}>Apply</button>
	{/snippet}
</MovableDialog>
