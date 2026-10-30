/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {configDefaults, coverageConfigDefaults} from 'vitest/config';

/** src/lib and src/hooks hold the logic, so they keep 80% on their own. */
const LOGIC_THRESHOLD = { lines: 80, functions: 80, branches: 80, statements: 80 };
/**
 * The whole of src, measured at 77.94% lines and statements, 96.74% functions and 96.68% branches, rounded down.
 * The gap is the pages and the news service that no unit test mounts yet. G.13 raises it to 80.
 */
const GLOBAL_THRESHOLD = { lines: 77, functions: 96, branches: 96, statements: 77 };

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: process.env.GITHUB_PAGES === 'true' ? '/portfolio-victornogueira/' : '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Força a injeção da variável ignorando o comportamento padrão do import.meta.env no Vite
      'import.meta.env.VITE_GNEWS_API_KEY': JSON.stringify(env.VITE_GNEWS_API_KEY || process.env.VITE_GNEWS_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'motion-vendor': ['motion']
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
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
        include: ['src/**'],
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
