import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    // Use relative asset URLs so the built `dist/` works when hosted under a sub-path
    // (e.g. Cloudflare Pages with a route prefix) or when `dist/` is uploaded as static files.
    base: './',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
