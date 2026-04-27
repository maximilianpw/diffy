import { resolve } from 'node:path';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [viteReact()],
	resolve: {
		alias: {
			'#': resolve(__dirname, './src'),
		},
	},
	test: {
		environment: 'jsdom',
		globals: false,
		include: ['src/**/*.test.{ts,tsx}'],
		setupFiles: ['./vitest.setup.ts'],
	},
});
