/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    // The deploy workflow passes the GitHub Pages path (see .github/workflows/deploy.yml).
    base: process.env.BASE_PATH ?? '/animations/',
    plugins: [svelte()],
    build: {
        minify: 'terser',
        // One page per visualisation, plus the index.
        rollupOptions: {
            input: {
                index: page('index.html'),
                hashmap: page('hashmap/index.html'),
                inheritance: page('inheritance/index.html'),
            },
        },
    },
    test: {
        // The golden tests compile and run the Java files, which takes a few seconds.
        testTimeout: 120_000,
    },
});
