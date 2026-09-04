<script lang="ts">
	// Layer: components. Floating document switcher: one small cell per open
	// image showing a thumbnail + a tiny filename. Horizontally scrollable.
	import { documents } from '../../state/documents';
	import { thumbnails } from '../../state/thumbnails';
	import { switchToDocument, closeDocument } from '../../services/fileService';
</script>

	<div class="fltab-tray select-none">
	{#each $documents.docs as doc (doc.id)}
		<button
			class="fltab"
			class:active={doc.id === $documents.activeId}
			title={doc.name}
			onclick={() => switchToDocument(doc.id)}
			onauxclick={(e) => e.button === 1 && closeDocument(doc.id)}
		>
			<span class="fltab-thumb">
				{#if $thumbnails[doc.id]}
					<img src={$thumbnails[doc.id]} alt="" draggable="false" />
				{:else}
					<span class="fltab-noimg">🖼️</span>
				{/if}
			</span>
			<span class="fltab-name">{doc.name}{doc.dirty ? '*' : ''}</span>
			<span
				class="fltab-close"
				role="button"
				aria-label="Close {doc.name}"
				tabindex="-1"
				onclick={(e) => {
					e.stopPropagation();
					closeDocument(doc.id);
				}}
			>×</span>
		</button>
	{/each}
</div>
