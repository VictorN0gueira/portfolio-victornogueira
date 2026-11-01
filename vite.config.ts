import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type {Plugin} from 'vite';
import {configDefaults, coverageConfigDefaults, defineConfig} from 'vitest/config';
import {manualChunks} from './config/manualChunks.mjs';
import {SECURITY_HEADERS, injectCspMeta} from './config/securityHeaders.mjs';

/** The floor for src as a whole. Measured on the integrated branch: 94.5% lines and statements, 97% functions and branches. */
const GLOBAL_THRESHOLD = { lines: 80, functions: 80, branches: 80, statements: 80 };
/** src/lib and src/hooks hold the logic, so they also keep 80% on their own. */
const LOGIC_THRESHOLD = GLOBAL_THRESHOLD;

const IS_PAGES_BUILD = process.env.GITHUB_PAGES === 'true';

/**
 * GitHub Pages cannot send response headers, so its build carries the policy as a meta tag (without frame-ancestors,
 * which only works as a header). The Docker image sends the real headers from nginx/security-headers.conf.
 */
function pagesCspMeta(): Plugin {
  return {
    name: 'pages-csp-meta',
    transformIndexHtml: (html) => injectCspMeta(html),
  };
}

export default defineConfig(({command}) => {
  return {
    base: IS_PAGES_BUILD ? '/portfolio-victornogueira/' : '/',
    plugins: [react(), tailwindcss(), ...(IS_PAGES_BUILD && command === 'build' ? [pagesCspMeta()] : [])],
    build: {
      rollupOptions: {
        output: {manualChunks},
      },
    },
    // `vite preview` is what every Playwright run serves, so the specs run under the same policy as production.
    // The dev server stays without a CSP: Vite's own client and HMR need inline scripts and a websocket.
    preview: {
      headers: SECURITY_HEADERS,
    },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: './src/test/setup.ts',
      css: true,
      testTimeout: 15000,
      hookTimeout: 15000,
      maxWorkers: 4,
      // Other worktrees live under .claude/worktrees, and each one carries a full copy of src with its own tests.
      exclude: [...configDefaults.exclude, '.claude/**', '.superpowers/**', 'e2e/**', 'dist/**'],
      coverage: {
        provider: 'v8',
        // The code of src. vitest 5 also tries to parse the uncovered files it finds and warns about every stylesheet.
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          ...coverageConfigDefaults.exclude,
          'src/test/**',
          '**/*.test.*',
          '**/*.d.ts',
          'src/main.tsx',
          'e2e/**',
        ],
        thresholds: {
          lines: GLOBAL_THRESHOLD.lines,
          functions: GLOBAL_THRESHOLD.functions,
          branches: GLOBAL_THRESHOLD.branches,
          statements: GLOBAL_THRESHOLD.statements,
          'src/lib/**': LOGIC_THRESHOLD,
          'src/hooks/**': LOGIC_THRESHOLD,
        },
      },
    },
  };
});
