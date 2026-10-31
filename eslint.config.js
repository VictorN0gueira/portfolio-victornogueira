// Warn only, on purpose: the findings are fixed in a later batch (G.8), which turns every rule into an error.
// `npm run lint` stays `tsc --noEmit`; this file is run by `npm run lint:eslint`.
import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// .mts covers the generated declaration files next to the scripts (a .d.mts needs the TypeScript parser).
const SOURCE_FILES = ['**/*.{ts,tsx,mts,mjs,js}'];

/** A rule value (a severity, or an array that starts with one) with an error turned into a warning. */
function toWarning(value) {
  if (Array.isArray(value)) return [toWarning(value[0]), ...value.slice(1)];
  return value === 'error' || value === 2 ? 'warn' : value;
}

/** The same config with every rule it switches on at warn level at most. */
function warnOnly(config) {
  if (!config.rules) return config;
  const rules = Object.fromEntries(Object.entries(config.rules).map(([name, value]) => [name, toWarning(value)]));
  return { ...config, rules };
}

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
  { linterOptions: { reportUnusedDisableDirectives: 'warn' } },
  ...[js.configs.recommended, ...tseslint.configs.recommended, jsxA11y.flatConfigs.recommended, reactHooks.configs.flat.recommended]
    .map(warnOnly)
    .map((config) => ({ ...config, files: config.files ?? SOURCE_FILES })),
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-refresh': reactRefresh },
    rules: { 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }] },
  },
];
