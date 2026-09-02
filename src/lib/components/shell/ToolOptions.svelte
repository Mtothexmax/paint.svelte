<script lang="ts">
	// Layer: components. Tool Options strip — this row's space is reserved for the
	// selected tool's settings (Slice 1 has inert tools, so only a label shows).
	import { activeToolId } from '../../state/ui';

	const labels: Record<string, string> = {
		move: 'Move Tool',
		brush: 'Brush Tool',
		pencil: 'Pencil Tool',
		eraser: 'Eraser Tool',
		eyedropper: 'Eyedropper Tool',
		'select-rect': 'Rectangle Select',
		'select-ellipse': 'Ellipse Select',
		lasso: 'Lasso Select',
		wand: 'Magic Wand',
		bucket: 'Paint Bucket',
		shape: 'Shapes',
		text: 'Text Tool',
		gradient: 'Gradient Tool'
	};
</script>

<div class="flex h-full w-full items-center gap-2 px-2 text-xs" style="color:var(--text-dim);">
	<span class="font-semibold" style="color:var(--text);">{labels[$activeToolId] ?? $activeToolId}</span>
	<span class="tooloptions-placeholder">Tool options for the selected tool appear here.</span>
</div>
