// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const DASH_PATTERN = new RegExp(`[${EM_DASH}${EN_DASH}]`);

const files = [
  ...readdirSync(__dirname)
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => resolve(__dirname, name)),
  resolve(__dirname, '../App.tsx'),
];

// Every <SEO ... /> element in the route files, with the file it came from.
const seoBlocks = files.flatMap((file) =>
  [...readFileSync(file, 'utf8').matchAll(/<SEO\b[\s\S]*?\/>/g)].map((match) => ({
    file: basename(file),
    block: match[0],
  })),
);

describe('SEO copy in the route files', () => {
  it('finds the SEO elements it is supposed to check', () => {
    expect(seoBlocks.length).toBeGreaterThanOrEqual(10);
  });

  it('has no em or en dash in any SEO prop', () => {
    const offenders = seoBlocks.filter(({ block }) => DASH_PATTERN.test(block)).map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it('has no ampersand in any SEO prop', () => {
    const offenders = seoBlocks.filter(({ block }) => block.includes('&')).map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});
