// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The pages were rebuilt, so what only the old pages used must not come back: the range slider rules of the old ROI
// calculator, the first 404 glitch (the new one lives in styles/motion.css as vn-glitch-*), the old reveal helper,
// the dark tone of the scroll bar, the text animation of the old FAQ and the compact placeholder of the old pages.

const ROOT = resolve(__dirname, '../..');
const SRC = join(ROOT, 'src');
const TEST_FILE = /\.test\.tsx?$/;

function* walk(folder: string): Generator<string> {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const sourceFiles = [...walk(SRC)].filter((file) => /\.(tsx?|css)$/.test(file) && !TEST_FILE.test(file));
const read = (file: string) => readFileSync(file, 'utf8');
const where = (pattern: RegExp) =>
  sourceFiles.filter((file) => pattern.test(read(file))).map((file) => relative(ROOT, file).replace(/\\/g, '/'));

describe('index.css carries no rule only a removed page used', () => {
  const css = read(join(SRC, 'index.css'));

  it.each(['.roi-slider', '--roi-slider', 'glitch-1', 'glitch-2'])('has no %s', (needle) => {
    expect(css).not.toContain(needle);
  });

  it('keeps what the two frozen legal pages still use', () => {
    expect(css).toContain('--color-brand-white');
    expect(css).toContain('@custom-variant dark');
  });
});

describe('the helpers of the old pages are gone', () => {
  it('has no importer of lib/reveal, and no file for it', () => {
    expect(where(/lib\/reveal['"]|from ['"]\.\/reveal['"]/)).toEqual([]);
    expect(existsSync(join(SRC, 'lib/reveal.ts'))).toBe(false);
  });

  it('has no AnimatedText', () => {
    expect(existsSync(join(SRC, 'components/AnimatedText.tsx'))).toBe(false);
    expect(existsSync(join(SRC, 'components/AnimatedText.test.tsx'))).toBe(false);
  });

  it('has no dark tone of the scroll bar', () => {
    const bar = read(join(SRC, 'components/layout/ScrollProgress.tsx'));

    expect(bar).not.toMatch(/tone|bg-white\/80/);
  });

  it('draws the skeleton only as a band of a given height, never the compact placeholder', () => {
    const skeleton = read(join(SRC, 'components/ui/SectionSkeleton.tsx'));

    expect(skeleton).not.toMatch(/compact|legacy|heightClassName\?/i);
  });

  it('no longer ships the old founder photo, whose sizes live in public/founder', () => {
    expect(existsSync(join(ROOT, 'public/victor-photo.webp'))).toBe(false);
    expect(existsSync(join(ROOT, 'public/founder/victor-480.webp'))).toBe(true);
  });
});
