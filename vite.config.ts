import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function tryGetGitSha(): string {
    try {
        return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim();
    } catch {
        return 'nogit';
    }
}

export default defineConfig({
    // Use relative asset URLs so the built `dist/` works when hosted under a sub-path
    // (e.g. Cloudflare Pages with a route prefix) or when `dist/` is uploaded as static files.
    base: './',
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
        __GIT_SHA__: JSON.stringify(tryGetGitSha()),
        __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
