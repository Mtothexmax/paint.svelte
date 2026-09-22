import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries.
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
			},
			// GitHub Pages project site -> app lives under the repo base path.
			paths: { base: '/paint.svelte' },
			// `fallback` is optional in adapter-static 3.x (`fallback?: string`);
			// passing `null` fails the type check. Omitting it means the same
			// thing — no SPA fallback page is generated.
			adapter: adapter({ pages: 'build', assets: 'build', precompress: false, strict: false })
		})
	]
});








