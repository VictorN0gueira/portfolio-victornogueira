// Every rule below is an error (fix plan G.8): `npm run lint` is `eslint . && tsc --noEmit`, and CI runs it.
// A rule is switched off or tuned only in a narrow block of this file, with the reason written next to it.
import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// .mts covers the generated declaration files next to the scripts (a .d.mts needs the TypeScript parser).
const SOURCE_FILES = ['**/*.{ts,tsx,mts,mjs,js}'];

// Scripts that hand a function to page.evaluate: that function runs in the browser, so it reads window and document.
const BROWSER_SCRIPTS = ['scripts/generate-og-banner.mjs', 'scripts/measure-lcp.mjs', 'scripts/measure-skeletons.mjs'];

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'dist-e2e-*/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'e2e/__shots__/**',
      '.claude/**',
      '.superpowers/**',
    ],
  },
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  ...[js.configs.recommended, ...tseslint.configs.recommended, jsxA11y.flatConfigs.recommended, reactHooks.configs.flat.recommended].map(
    (config) => ({ ...config, files: config.files ?? SOURCE_FILES }),
  ),
  {
    files: SOURCE_FILES,
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // Tailwind preflight removes the list markers, and Safari then drops the list semantics of a ul or ol.
      // role="list" on them is deliberate (see ClientGrid), so the rule does not call it redundant for these two.
      'jsx-a11y/no-redundant-roles': ['error', { ul: ['list'], ol: ['list'] }],
    },
  },
  {
    // Node scripts and config files: process, Buffer, URL, console and fetch are Node globals.
    files: ['scripts/**/*.mjs', 'config/**/*.mjs', '*.config.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: BROWSER_SCRIPTS,
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-refresh': reactRefresh },
    rules: { 'react-refresh/only-export-components': ['error', { allowConstantExport: true }] },
  },
  {
    // Fast refresh only reloads the files of the running app. A test file and the shared test helpers are never part
    // of it, so a helper that exports a component next to a function does not break anything there.
    files: ['src/test/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Protected lead channel file, byte identical to the audited copy: its regex with two spaces cannot be rewritten as {2}.
    files: ['src/lib/phone.ts'],
    rules: { 'no-regex-spaces': 'off' },
  },
];
