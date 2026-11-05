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

// The head of every route comes from src/seo (routeMeta and structuredData), so the page and the static HTML of the build
// cannot say different things. A page passes its path, and what the metadata cannot know: noindex on a 404, the meta of a
// project. These are the only files that keep their own props: the two frozen legal pages, and the 404 titles.
const OWN_PROPS_FILES = new Set(['PrivacyPage.tsx', 'LgpdPage.tsx']);
const OWN_JSON_LD_FILES = new Set(['HomePage.tsx']);

describe('SEO elements take their head from the route metadata', () => {
  const checked = seoBlocks.filter(({ file }) => !OWN_PROPS_FILES.has(file));

  it('checks the elements of the pages and of the router', () => {
    expect(checked.length).toBeGreaterThanOrEqual(8);
    expect(checked.map(({ file }) => file)).toEqual(expect.arrayContaining(['ServicesPage.tsx', 'AboutPage.tsx', 'ContactPage.tsx', 'ProjectsPage.tsx', 'ProjectDetailPage.tsx', 'App.tsx']));
  });

  it('passes no description prop', () => {
    expect(checked.filter(({ block }) => /\sdescription=/.test(block)).map(({ file }) => file)).toEqual([]);
  });

  it('passes a title prop only on a page that is out of the index (the 404s)', () => {
    const offenders = checked.filter(({ block }) => /\stitle=/.test(block) && !/\snoindex\b/.test(block));

    expect(offenders.map(({ file }) => file)).toEqual([]);
  });

  it('passes no image prop and no JSON-LD of its own, except the home that keeps its list', () => {
    expect(checked.filter(({ block }) => /\simage\w*=/.test(block)).map(({ file }) => file)).toEqual([]);
    expect(checked.filter(({ file, block }) => /\sjsonLd=/.test(block) && !OWN_JSON_LD_FILES.has(file)).map(({ file }) => file)).toEqual([]);
  });

  it('keeps the frozen legal pages with their own props, as the metadata equals them (routeMeta.test.ts)', () => {
    const legal = seoBlocks.filter(({ file }) => OWN_PROPS_FILES.has(file));

    expect(legal.map(({ file }) => file).sort()).toEqual(['LgpdPage.tsx', 'PrivacyPage.tsx']);
    for (const { block } of legal) expect(block).toMatch(/\sdescription=/);
  });
});

