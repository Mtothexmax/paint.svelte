<script lang="ts">
	// Layer: components. A checkbox row for effect UIs whose param has
	// kind === 'checkbox': stores 1/0 in the numeric setting. Changes flow up
	// through `oninput` (live preview) / `onCommit` (persistence).
	interface Props {
		label: string;
		/** 0/1 */
		value: number;
		oninput?: () => void;
		onCommit?: () => void;
	}
	let { label, value = $bindable(), oninput, onCommit }: Props = $props();

	function onChange(e: Event): void {
		value = (e.currentTarget as HTMLInputElement).checked ? 1 : 0;
		oninput?.();
		onCommit?.();
	}
</script>

<label class="radio">
	<input type="checkbox" checked={value !== 0} onchange={onChange} />
	{label}
</label>