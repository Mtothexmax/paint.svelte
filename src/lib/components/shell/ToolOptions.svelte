<script lang="ts">
	// Layer: components. Tool Options strip — shows settings for the active tool.
	// Brush tools: Paint.NET-style sliders + anti-alias toggle. Selection tools:
	// a Replace/Add/Subtract mode switch; the lasso family additionally exposes a
	// Freehand/Polygon mode switch and a Finish action while drawing a polygon.
	import {
		activeToolId,
		brushSize,
		brushOpacity,
		brushHardness,
		brushSpacing,
		antiAliasMode,
		selectionMode,
		selectionRatio,
		selectionFixedRatio,
		selectionFixedSize
	} from '../../state/ui';
	import {
		textFontFamily,
		textFontSize,
		textBold,
		textItalic,
		textUnderline,
		textStrike,
		textAlign,
		setTextFontSize,
		requestTextCommit,
		requestTextCancel,
		type TextAlign
	} from '../../state/text';
	import { get } from 'svelte/store';
	import { requestPolygonFinish } from '../../state/polygon';
	import PdnSlider from '../common/PdnSlider.svelte';
	import IconSplitButton from '../common/IconSplitButton.svelte';
	import FontDropdown from '../common/FontDropdown.svelte';
	import AlignLeftIcon from '../../assets/FormatAlignLeft.svg';
	import AlignCenterIcon from '../../assets/FormatAlignCenter.svg';
	import AlignRightIcon from '../../assets/FormatAlignRight.svg';

	const paintTools = new Set(['brush', 'pencil', 'eraser']);
	const isPaint = $derived(paintTools.has($activeToolId));
	const isPencil = $derived($activeToolId === 'pencil');

	const selectionTools = new Set(['select-rect', 'select-ellipse', 'lasso', 'select-poly']);
	const isSelection = $derived(selectionTools.has($activeToolId));

	// Lasso family: Freehand lasso ('lasso') or Polygon lasso ('select-poly').
	const lassoTools = new Set(['lasso', 'select-poly']);
	const isLasso = $derived(lassoTools.has($activeToolId));

	const isText = $derived($activeToolId === 'text');

	function setAlign(a: TextAlign): void {
		textAlign.set(a);
	}

	const AA_OPTIONS = [
		{
			id: 'pixel',
			icon: '🔲',
			label: 'Pixel-Perfect',
			description: 'Hard pixel edges — no anti-aliasing when painting'
		},
		{
			id: 'smooth',
			icon: '◐',
			label: 'Smooth',
			description: 'Soft anti-aliased edges (uses hardness)'
		}
	];

	const RATIO_OPTIONS = [
		{
			id: 'normal',
			icon: '⛶',
			label: 'Free Ratio',
			description: 'Unconstrained rectangle size'
		},
		{
			id: 'fixedRatio',
			icon: '⬚',
			label: 'Fixed Ratio',
			description: 'Keep a fixed width-to-height ratio'
		},
		{
			id: 'fixedSize',
			icon: '▣',
			label: 'Fixed Size',
			description: 'Always select the same size'
		}
	];

	let aa = $state<string>('pixel');
	$effect(() => {
		aa = get(antiAliasMode);
	});
	$effect(() => {
		antiAliasMode.set(aa as 'pixel' | 'smooth');
	});

	let ratio = $state<string>('normal');
	$effect(() => {
		ratio = get(selectionRatio);
	});
	$effect(() => {
		selectionRatio.set(ratio as 'normal' | 'fixedRatio' | 'fixedSize');
	});

	function setSizeField(
		store: 'ratio' | 'size',
		key: 'width' | 'height',
		raw: string
	): void {
		const n = Math.max(1, Math.round(parseFloat(raw) || 0));
		if (store === 'ratio') selectionFixedRatio.update((o) => ({ ...o, [key]: n }));
		else selectionFixedSize.update((o) => ({ ...o, [key]: n }));
	}
</script>

	<div class="flex h-full w-full items-center gap-4 px-2 text-xs select-none" style="color:var(--text-dim);">
	{#if isPaint && !isPencil}
		<PdnSlider label="Size" min={1} max={300} step={1} bind:value={$brushSize} />
		<PdnSlider label="Opacity" min={0} max={100} step={1} unit="%" bind:value={$brushOpacity} />
		<PdnSlider label="Hardness" min={0} max={100} step={1} unit="%" bind:value={$brushHardness} />
		<PdnSlider label="Spacing" min={1} max={300} step={1} unit="%" bind:value={$brushSpacing} />
		<span class="aa-label">Anti-alias:</span>
		<IconSplitButton options={AA_OPTIONS} bind:value={aa} title="Anti-aliased rendering" />
	{:else if isPencil}
		<span class="tooloptions-placeholder">Pencil — 1 px, hard-edged, foreground color only.</span>
	{:else if isSelection}
		<span class="aa-label">Mode:</span>
		<div class="seg">
			<button
				class="seg-btn"
				class:on={$selectionMode === 'replace'}
				title="Replace the selection"
				onclick={() => selectionMode.set('replace')}
			>
				⛶ Replace
			</button>
			<button
				class="seg-btn"
				class:on={$selectionMode === 'add'}
				title="Add to the selection"
				onclick={() => selectionMode.set('add')}
			>
				+ Add
			</button>
			<button
				class="seg-btn"
				class:on={$selectionMode === 'subtract'}
				title="Subtract from the selection"
				onclick={() => selectionMode.set('subtract')}
			>
				− Subtract
			</button>
		</div>
		{#if $activeToolId === 'select-rect'}
			<span class="aa-label">Ratio:</span>
			<IconSplitButton
				options={RATIO_OPTIONS}
				titleInButton
				bind:value={ratio}
				title="Rectangle aspect ratio"
			/>
			{#if ratio === 'fixedRatio'}
				<span class="aa-label">W:</span>
				<input
					class="fsl-num"
					type="number"
					min="1"
					step="1"
					value={$selectionFixedRatio.width}
					onchange={(e) => setSizeField('ratio', 'width', (e.currentTarget as HTMLInputElement).value)}
				/>
				<span class="aa-label">H:</span>
				<input
					class="fsl-num"
					type="number"
					min="1"
					step="1"
					value={$selectionFixedRatio.height}
					onchange={(e) => setSizeField('ratio', 'height', (e.currentTarget as HTMLInputElement).value)}
				/>
			{:else if ratio === 'fixedSize'}
				<span class="aa-label">W:</span>
				<input
					class="fsl-num"
					type="number"
					min="1"
					step="1"
					value={$selectionFixedSize.width}
					onchange={(e) => setSizeField('size', 'width', (e.currentTarget as HTMLInputElement).value)}
				/>
				<span class="aa-label">H:</span>
				<input
					class="fsl-num"
					type="number"
					min="1"
					step="1"
					value={$selectionFixedSize.height}
					onchange={(e) => setSizeField('size', 'height', (e.currentTarget as HTMLInputElement).value)}
				/>
			{/if}
		{/if}
		{#if isLasso}
			<span class="aa-label">Tool:</span>
			<div class="seg">
				<button
					class="seg-btn"
					class:on={$activeToolId === 'lasso'}
					onclick={() => activeToolId.set('lasso')}
				>
					Freehand
				</button>
				<button
					class="seg-btn"
					class:on={$activeToolId === 'select-poly'}
					onclick={() => activeToolId.set('select-poly')}
				>
					Polygon
				</button>
			</div>
			{#if $activeToolId === 'select-poly'}
				<button class="mini-btn" onclick={requestPolygonFinish} title="Finish the polygon selection">
					✓ Finish
				</button>
			{/if}
		{/if}
	{:else if isText}
		<span class="aa-label">Font:</span>
		<FontDropdown bind:value={$textFontFamily} />
		<span class="aa-label">Size:</span>
		<input
			class="fsl-num"
			type="number"
			min="8"
			max="200"
			step="1"
			value={$textFontSize}
			onchange={(e) => setTextFontSize(parseFloat((e.currentTarget as HTMLInputElement).value))}
			title="Font size in pixels"
		/>
		<div class="seg" role="group" aria-label="Weight and decorations">
			<button
				class="seg-btn"
				class:on={$textBold}
				style="font-weight:bold;"
				title="Bold"
				onclick={() => textBold.update((v) => !v)}
			>
				B
			</button>
			<button
				class="seg-btn"
				class:on={$textItalic}
				style="font-style:italic;"
				title="Italic"
				onclick={() => textItalic.update((v) => !v)}
			>
				I
			</button>
			<button
				class="seg-btn"
				class:on={$textUnderline}
				style="text-decoration:underline;"
				title="Underline"
				onclick={() => textUnderline.update((v) => !v)}
			>
				U
			</button>
			<button
				class="seg-btn"
				class:on={$textStrike}
				style="text-decoration:line-through;"
				title="Strikethrough"
				onclick={() => textStrike.update((v) => !v)}
			>
				S
			</button>
		</div>
		<div class="seg" role="group" aria-label="Text alignment">
			<button
				class="seg-btn"
				class:on={$textAlign === 'left'}
				title="Align left"
				aria-label="Align left"
				onclick={() => setAlign('left')}
			>
				<img src={AlignLeftIcon} alt="" class="h-4 w-4" draggable="false" />
			</button>
			<button
				class="seg-btn"
				class:on={$textAlign === 'center'}
				title="Align center"
				aria-label="Align center"
				onclick={() => setAlign('center')}
			>
				<img src={AlignCenterIcon} alt="" class="h-4 w-4" draggable="false" />
			</button>
			<button
				class="seg-btn"
				class:on={$textAlign === 'right'}
				title="Align right"
				aria-label="Align right"
				onclick={() => setAlign('right')}
			>
				<img src={AlignRightIcon} alt="" class="h-4 w-4" draggable="false" />
			</button>
		</div>
		<button class="mini-btn" onclick={requestTextCommit} title="Render the text into the layer"> ✓ Finish </button>
		<button class="mini-btn" onclick={requestTextCancel} title="Discard the text draft"> ✕ </button>
	{:else}
		<span class="tooloptions-placeholder">No tool options for the selected tool yet.</span>
	{/if}
</div>
