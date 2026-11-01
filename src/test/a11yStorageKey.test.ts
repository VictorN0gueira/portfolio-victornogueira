// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { A11Y_STORAGE_KEY } from '../contexts/AccessibilityContext';

// Q-28: the key of the accessibility preferences was copied into 17 places. A test that types the string keeps passing
// when the key is renamed in the context, while the real persistence breaks. The unit tests import the constant; the
// two places that cannot import it (the Playwright helper, which runs in its own project, and the plain node script
// that measures the skeletons) each hold ONE copy, and this file checks both against the context.

const ROOT = resolve(__dirname, '../..');
// The literal is built here so this file does not match its own scan.
const LITERAL = ['a11y', 'preferences'].join('-');
const SCANNED_FOLDERS = ['src', 'e2e', 'scripts'];
const SOURCE_FILE = /\.(?:ts|tsx|mjs)$/;

// The context defines the key, the pin test asserts its value on purpose, the two others are the single copies.
const ALLOWED = new Set([
  'src/contexts/AccessibilityContext.tsx',
  'src/contexts/AccessibilityContext.test.tsx',
  'e2e/homeSupport.ts',
  'scripts/measure-skeletons.mjs',
]);

function* walk(folder: string): Generator<string> {
  for (const entry of readdirSync(folder)) {
    if (entry === '__shots__') continue;
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (SOURCE_FILE.test(entry)) yield path;
  }
}

const sources = SCANNED_FOLDERS.flatMap((folder) => [...walk(join(ROOT, folder))]).filter((file) => !file.endsWith('a11yStorageKey.test.ts'));
const relativePath = (file: string) => relative(ROOT, file).replace(/\\/g, '/');
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');
const declaredKey = (file: string) => new RegExp(`const A11Y_STORAGE_KEY = '([^']+)'`).exec(read(file))?.[1];

describe('the key of the accessibility preferences', () => {
  it('is typed as a string in the context, the pin test and the two single copies only', () => {
    const offenders = sources.filter((file) => readFileSync(file, 'utf8').includes(LITERAL)).map(relativePath).filter((file) => !ALLOWED.has(file));
    expect(offenders).toEqual([]);
  });

  it('is the same in the Playwright helper as in the context', () => {
    expect(declaredKey('e2e/homeSupport.ts')).toBe(A11Y_STORAGE_KEY);
  });

  it('is the same in the skeleton measuring script as in the context', () => {
    expect(declaredKey('scripts/measure-skeletons.mjs')).toBe(A11Y_STORAGE_KEY);
  });

  it('is written to localStorage by one helper in each e2e spec that needs it, taken from homeSupport', () => {
    const specs = sources.map(relativePath).filter((file) => file.startsWith('e2e/') && file.endsWith('.spec.ts'));
    const own = specs.filter((file) => /const A11Y_STORAGE_KEY|function enableLargeFont/.test(read(file)));
    expect(own).toEqual([]);
  });
});
