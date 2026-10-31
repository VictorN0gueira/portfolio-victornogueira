import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * React 19 hoists the title, meta and link elements a component renders into the document head by itself, so
 * react-helmet-async (about 5.6 kB gzip on the critical path, measured) is not needed: SEO.tsx renders them directly.
 */
const ROOT = resolve(__dirname, '../..');
const SRC_DIR = resolve(ROOT, 'src');
const HELMET_PACKAGE = 'react-helmet-async';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && entry.name !== 'noHelmet.test.ts' ? [path] : [];
  });
}

describe('no react-helmet-async', () => {
  it('no file of src imports it', () => {
    const offenders = sourceFiles(SRC_DIR)
      .filter((file) => readFileSync(file, 'utf8').includes(`from '${HELMET_PACKAGE}'`))
      .map((file) => relative(SRC_DIR, file).replace(/\\/g, '/'));

    expect(offenders).toEqual([]);
  });

  it('is not a dependency of the project', () => {
    const manifest = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };

    expect(Object.keys(manifest.dependencies ?? {})).not.toContain(HELMET_PACKAGE);
  });
});
