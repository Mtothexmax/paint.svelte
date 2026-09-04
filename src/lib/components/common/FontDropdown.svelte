<script lang="ts">
	// Layer: components/common. Font-family dropdown for the text tool: each
	// row shows the family name in the standard UI font, then (after a tab)
	// a pangram rendered in that family. Web/system fonts resolve
	// asynchronously via document.fonts.load — rows render immediately with
	// the fallback and upgrade once their family is ready.
	import { TEXT_FONTS } from '../../state/text';
	import {
		querySystemFontFamilies,
		ensureSystemFontLoaded,
		findRenderableSample,
		isInstalledFamily
	} from '../../services/fonts';

	interface Props {
		value: string;
	}

	let { value = $bindable() }: Props = $props();

	const PANGRAM = 'The quick brown fox jumps over the lazy dog';

	let open = $state(false);
	/** Families whose preview font has finished loading. */
	let ready = $state<Record<string, boolean>>({});
	/** Built-ins first, then the enumerated OS fonts (async, Chromium only). */
	let families = $state<string[]>([...TEXT_FONTS]);
	let systemCount = $state(0);
	/** Live filter text; reset on every open. */
	let filter = $state('');
	let searchEl: HTMLInputElement | undefined = $state();
	let popEl: HTMLDivElement | undefined = $state();
	/** families.length at the last auto-scroll (one-shot per list state). */
	let scrolledCount = $state(-1);

	const visible = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		if (!q) return families;
		return families.filter((f) => f.toLowerCase().includes(q));
	});

	function cssFamily(family: string): string {
		const safe = family.replace(/\\/g, '\\\\').replace(/"/g, '');
		return `"${safe}"`;
	}

	function cssOf(family: string): string {
		return `${cssFamily(family)}, sans-serif`;
	}

	/** Marks a family as preview-ready only when the browser confirms it can
	 * actually render the preview in that family (activated from its font
	 * data first — a listed name alone renders nothing). The preview shows
	 * the first renderable sample (Latin, Greek, Cyrillic, symbols or
	 * historic — symbol fonts often cover no Latin). As a last resort, an
	 * installed family whose metrics are identical to the fallback (e.g.
	 * Arial) still gets the pangram: it renders correctly either way. */
	let previewText = $state<Record<string, string>>({});
	async function confirmFamily(family: string): Promise<void> {
		if (ready[family]) return;
		if (typeof document === 'undefined' || !('fonts' in document)) return;
		try {
			let sample = findRenderableSample(family);
			if (!sample) {
				await ensureSystemFontLoaded(family);
				sample = findRenderableSample(family);
			}
			if (!sample) {
				const installed = await isInstalledFamily(family);
				let available = false;
				try {
					available = document.fonts.check(`16px ${cssFamily(family)}`);
				} catch {
					/* ignore */
				}
				if (installed && available) sample = PANGRAM;
			}
			console.info('[fonts]', `"${family}"`, `preview sample=${sample ? 'yes' : 'no'}`);
			if (sample) {
				previewText[family] = sample;
				ready[family] = true;
			}
		} catch {
			/* not usable — the preview stays hidden, only the name shows */
		}
	}

	/** Lazy per-row activation: fonts (and their data) load only when their
	 * row scrolls into view, so opening the menu never fetches megabytes. */
	function lazyConfirm(node: HTMLElement, family: string) {
		if (ready[family]) return;
		const io = new IntersectionObserver(
			(entries, obs) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						obs.disconnect();
						void confirmFamily(family);
					}
				}
			},
			{ root: popEl ?? undefined }
		);
		io.observe(node);
		return {
			destroy() {
				io.disconnect();
			}
		};
	}

	function ensureLoaded(): void {
		// Enumerate the installed OS fonts (async; no-op where unsupported).
		// Built-ins stay pinned on top, system families append alphabetically.
		// Previews activate lazily per visible row (see lazyConfirm).
		void querySystemFontFamilies().then((system) => {
			if (!system.length) return;
			const known = new Set(families.map((f) => f.toLowerCase()));
			const extra = system.filter((f) => !known.has(f.toLowerCase()));
			if (!extra.length) return;
			systemCount = extra.length;
			families = [...families, ...extra];
		});
	}

	function toggle(): void {
		open = !open;
		if (open) {
			filter = '';
			scrolledCount = -1;
			ensureLoaded();
		}
	}

	// Focus the filter and bring the selected row (e.g. Webdings) into view
	// whenever the menu opens or new families arrive (system fonts load
	// async). Retriggering on families.length never fights manual scrolling —
	// only the list itself resets the one-shot.
	$effect(() => {
		const count = families.length;
		if (open) searchEl?.focus();
		if (open && popEl && scrolledCount !== count) {
			scrolledCount = count;
			requestAnimationFrame(() => {
				popEl?.querySelector('.fontdrop-row.on')?.scrollIntoView({ block: 'nearest' });
			});
		}
	});

	function pick(family: string): void {
		value = family;
		open = false;
		// Activate in the background so the editor + raster pick it up; the
		// CSS/canvas re-render automatically once the FontFace lands.
		void ensureSystemFontLoaded(family);
	}

	function onKey(e: KeyboardEvent): void {
		if (e.key === 'Escape') open = false;
	}
</script>

<div class="fontdrop">
	<button type="button" class="fsl-select fontdrop-btn" title="Font family" onclick={toggle} onkeydown={onKey}>
		<span class="fontdrop-current">{value}</span>
		<span class="fontdrop-arrow">▾</span>
	</button>
	{#if open}
		<div class="fontdrop-backdrop" onclick={() => (open = false)} onkeydown={onKey} role="presentation"></div>
		<div class="fontdrop-pop" bind:this={popEl} role="listbox" aria-label="Font family">
			<input
				bind:this={searchEl}
				bind:value={filter}
				class="fontdrop-search"
				type="text"
				placeholder="Filter fonts…"
				autocomplete="off"
				spellcheck={false}
				aria-label="Filter fonts"
				oninput={() => {
					if (popEl) popEl.scrollTop = 0;
				}}
				onkeydown={(e) => {
					if (e.key === 'Escape') {
						e.stopPropagation();
						open = false;
					}
				}}
			/>
			{#each visible as family (family)}
				<button
					type="button"
					role="option"
					aria-selected={family === value}
					class="fontdrop-row"
					class:on={family === value}
					use:lazyConfirm={family}
					onclick={() => pick(family)}
				>
					<span class="fontdrop-name">{family}</span>
					{#if ready[family]}
						<span class="fontdrop-tab"></span>
						<span class="fontdrop-pangram" style="font-family:{cssOf(family)};">{previewText[family] ?? PANGRAM}</span>
					{/if}
				</button>
			{/each}
			{#if !visible.length}
				<div class="fontdrop-foot">No fonts match “{filter.trim()}”.</div>
			{:else if filter.trim()}
				<div class="fontdrop-foot">{visible.length} of {families.length}</div>
			{:else if systemCount > 0}
				<div class="fontdrop-foot">{systemCount} system fonts</div>
			{/if}
		</div>
	{/if}
</div>
