<script lang="ts">
	// Generic split button without text: [ icon | ▾ ]
	// - Clicking the icon part cycles through the options.
	// - Clicking ▾ opens a menu listing every option (icon, title, description).
	interface Option {
		id: string;
		icon: string;
		label: string;
		description: string;
	}
	interface Props {
		options: Option[];
		value: string;
		title?: string;
	}
	let { options, value = $bindable(), title = '' }: Props = $props();

	let btn: HTMLButtonElement;
	let menuEl = $state<HTMLDivElement>();
	let open = $state(false);
	let menuPos = $state({ x: 0, y: 0 });

	const current = $derived(options.find((o) => o.id === value) ?? options[0]);

	function cycle() {
		const idx = options.findIndex((o) => o.id === value);
		const next = options[(idx + 1) % options.length];
		value = next.id;
	}

	function toggleMenu() {
		if (open) {
			open = false;
			return;
		}
		const r = btn.getBoundingClientRect();
		menuPos.x = r.left;
		menuPos.y = r.bottom + 4;
		open = true;
	}

	function select(id: string) {
		value = id;
		open = false;
	}

	function onDocDown(e: MouseEvent) {
		if (open && btn && !btn.contains(e.target as Node) && menuEl && !menuEl.contains(e.target as Node)) open = false;
	}
	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('mousedown', onDocDown);
		window.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocDown);
			window.removeEventListener('keydown', onKey);
		};
	});
</script>

<button
	bind:this={btn}
	class="isp"
	class:open={open}
	title={title || (current?.label ?? '')}
>
	<span class="isp-icon" onclick={cycle}>{current?.icon ?? ''}</span>
	<span class="isp-arrow" onclick={toggleMenu}>▾</span>
</button>

{#if open}
	<div class="isp-menu" bind:this={menuEl} style="left:{menuPos.x}px; top:{menuPos.y}px;">
		{#each options as opt (opt.id)}
			<button class="isp-item" class:on={opt.id === value} onclick={() => select(opt.id)}>
				<span class="isp-item-icon">{opt.icon}</span>
				<span class="isp-item-texts">
					<span class="isp-item-label">{opt.label}</span>
					<span class="isp-item-desc">{opt.description}</span>
				</span>
				{#if opt.id === value}<span class="isp-check">✓</span>{/if}
			</button>
		{/each}
	</div>
{/if}
