import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// In Tailwind v4 `outline-none` sets the outline style to none and `outline-2` only sets the width: on one element the
// 2px ring never draws (the hero listbox lost its focus ring that way). jsdom cannot see it, so the source is scanned:
// a file that uses both words is a file to look at. Programmatic focus containers use `outline-none` alone, which is fine.
const SRC = join(__dirname, '..');
const SOURCE_FILE = /\.(tsx?|css)$/;
const TEST_FILE = /\.test\.tsx?$/;
// These put `outline-none` on a panel that only takes programmatic focus and the 2px ring on other elements inside it.
const OUTLINE_NONE_ON_ANOTHER_ELEMENT = ['layout/MobileMenu.tsx', 'home/TestimonialDialog.tsx'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [path] : [];
  });
}

describe('outline classes', () => {
  it('no source file mixes outline-none with an outline width', () => {
    const offenders = sourceFiles(SRC).filter((path) => {
      if (OUTLINE_NONE_ON_ANOTHER_ELEMENT.some((tail) => path.replaceAll('\\', '/').endsWith(tail))) return false;
      const text = readFileSync(path, 'utf8');
      return /\boutline-none\b/.test(text) && /\boutline-(1|2|4|8)\b/.test(text);
    });

    expect(offenders).toEqual([]);
  });
});
