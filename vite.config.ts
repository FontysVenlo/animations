/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
    // The deploy workflow passes the GitHub Pages path (see .github/workflows/deploy.yml).
    base: process.env.BASE_PATH ?? '/java-hashmap/',
    plugins: [svelte()],
    build: {
        minify: 'terser',
    },
    test: {
        // The golden test compiles and runs the Java files, which takes a few seconds.
        testTimeout: 120_000,
    },
});
