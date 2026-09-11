<script lang="ts">
	// Layer: components. Paint.NET's "the image you are pasting is larger than
	// the canvas" question. Shown ONLY when the pasted image does not fit —
	// smaller images are pasted straight at the top-left without asking.
	//
	// Layout mirrors Paint.NET: a small preview of the image at the top with
	// the explanatory text right under it, then three big stacked buttons
	// (Expand Canvas / Keep Canvas Size / Cancel).
	import MovableDialog from '../common/MovableDialog.svelte';
	import { dialog, closeDialog, type PasteDialogPayload } from '../../services/dialogService';
	// Full-colour Fluent emoji, like the toolbar tools: a blue arrow for
	// growing the canvas, a framed picture for keeping it, a RED cross for
	// cancelling.
	import ExpandIcon from '@fluentui-emoji/svg/icons/flat/up-right-arrow.svg';
	import KeepIcon from '@fluentui-emoji/svg/icons/flat/framed-picture.svg';
	import CancelIcon from '@fluentui-emoji/svg/icons/flat/cross-mark.svg';

	const payload = $dialog.payload as PasteDialogPayload | undefined;

	const imgW = $derived(payload?.imageWidth ?? 0);
	const imgH = $derived(payload?.imageHeight ?? 0);
	const canW = $derived(payload?.canvasWidth ?? 0);
	const canH = $derived(payload?.canvasHeight ?? 0);

	// Where each choice leaves the canvas.
	const expandW = $derived(Math.max(canW, imgW));
	const expandH = $derived(Math.max(canH, imgH));

	function choose(choice: 'expand' | 'keep' | 'cancel'): void {
		try {
			payload?.onChoose?.(choice);
		} finally {
			closeDialog();
		}
	}
</script>

<MovableDialog title="Paste" onClose={() => choose('cancel')} width={360}>
	<!-- preview + text, above the buttons -->
	<div class="pd-head">
		<div class="pd-preview" title="Image being pasted">
			{#if payload?.previewUrl}
				<img src={payload.previewUrl} alt="Paste preview" />
			{:else}
				<span class="pd-nopreview">no preview</span>
			{/if}
		</div>
		<div class="pd-text">
			<p class="pd-lead">
				The image you are pasting (<strong>{imgW} × {imgH}</strong>) is larger than the canvas
				(<strong>{canW} × {canH}</strong>).
			</p>
			<p class="pd-question">What would you like to do?</p>
		</div>
	</div>

	<!-- three big buttons, Paint.NET style -->
	<div class="pd-choices">
		<button class="pd-choice primary" type="button" onclick={() => choose('expand')}>
			<img class="pd-icon" src={ExpandIcon} alt="" draggable="false" />
			<span class="pd-choice-body">
				<span class="pd-choice-title">Expand Canvas</span>
				<span class="pd-choice-hint">Grow the canvas to {expandW} × {expandH} so the whole image fits.</span>
			</span>
		</button>
		<button class="pd-choice" type="button" onclick={() => choose('keep')}>
			<img class="pd-icon" src={KeepIcon} alt="" draggable="false" />
			<span class="pd-choice-body">
				<span class="pd-choice-title">Keep Canvas Size</span>
				<span class="pd-choice-hint">
					Paste at the top-left; the part outside {canW} × {canH} is cut off.
				</span>
			</span>
		</button>
		<button class="pd-choice danger" type="button" onclick={() => choose('cancel')}>
			<img class="pd-icon" src={CancelIcon} alt="" draggable="false" />
			<span class="pd-choice-body">
				<span class="pd-choice-title">Cancel</span>
				<span class="pd-choice-hint">Don't paste anything.</span>
			</span>
		</button>
	</div>
</MovableDialog>

<style>
	.pd-head {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}

	/* Checkerboard so transparent PNG previews read correctly. */
	.pd-preview {
		flex: 0 0 auto;
		width: 104px;
		height: 104px;
		border: 1px solid var(--border);
		border-radius: 4px;
		background-color: #2f2f2f;
		background-image:
			linear-gradient(45deg, #3d3d3d 25%, transparent 25%, transparent 75%, #3d3d3d 75%),
			linear-gradient(45deg, #3d3d3d 25%, transparent 25%, transparent 75%, #3d3d3d 75%);
		background-size: 12px 12px;
		background-position: 0 0, 6px 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
	.pd-preview img {
		max-width: 100%;
		max-height: 100%;
		image-rendering: auto;
		display: block;
	}
	.pd-nopreview {
		font-size: 11px;
		color: var(--text-dim);
	}

	.pd-text {
		flex: 1 1 auto;
		min-width: 0;
	}
	.pd-lead {
		margin: 0;
		font-size: 12px;
		line-height: 1.45;
		color: var(--text);
	}
	.pd-lead strong {
		color: #fff;
		font-weight: 600;
	}
	.pd-question {
		margin: 8px 0 0;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-dim);
	}

	.pd-choices {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.pd-choice {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 11px;
		padding: 10px 12px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: #333;
		color: var(--text);
		cursor: pointer;
		text-align: left;
		font: inherit;
		transition:
			background 0.12s ease,
			border-color 0.12s ease;
	}
	.pd-choice:hover {
		background: #3c3c3c;
		border-color: #4d4d4d;
	}
	.pd-choice.primary {
		background: var(--accent-soft);
		border-color: var(--accent);
	}
	.pd-choice.primary:hover {
		background: rgba(59, 130, 246, 0.26);
	}
	/* Cancel: a faint red wash so the red cross reads as "don't". */
	.pd-choice.danger {
		border-color: rgba(249, 47, 96, 0.45);
	}
	.pd-choice.danger:hover {
		background: rgba(249, 47, 96, 0.16);
		border-color: rgba(249, 47, 96, 0.7);
	}
	.pd-icon {
		flex: 0 0 auto;
		width: 24px;
		height: 24px;
		display: block;
		/* The emoji sit on dark chrome; a soft shadow keeps them from
		   bleeding into the button background. */
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55));
	}
	.pd-choice-body {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 3px;
		min-width: 0;
	}
	.pd-choice-title {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
	}
	.pd-choice-hint {
		font-size: 11px;
		line-height: 1.35;
		color: var(--text-dim);
	}
</style>
