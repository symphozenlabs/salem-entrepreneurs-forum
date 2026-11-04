import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// gsap ships ES modules as plain .js without "type": "module"; Node < 22 can't import
	// gsap/ScrollTrigger from the server bundle (500 on Vercel), so bundle it instead.
	ssr: { noExternal: ['gsap', 'lenis'] },
	// Pre-bundle the icon set at dev-server start. Otherwise Vite discovers it on the first
	// admin/member page, re-bundles and reloads mid-hydration, leaving a blank page.
	optimizeDeps: { include: ['@lucide/svelte'] },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});
