// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Q:T-04: the test helpers below were copied from file to file. They live in src/test now, and a test file that
// declares one of them again fails here, so the copies cannot drift apart again.

const SRC = resolve(__dirname, '..');
const TEST_FILE = /\.test\.tsx?$/;

const SHARED = [
  { name: 'itemOf', home: 'src/test/revealItem.ts', declaration: /(?:const|function) itemOf\b/ },
  { name: 'stubRect', home: 'src/test/rect.ts', declaration: /(?:const|function) stubRect\b/ },
  { name: 'setVisibility', home: 'src/test/visibility.ts', declaration: /(?:const|function) setVisibility\b/ },
  { name: 'tokensOf', home: 'src/test/dom.ts', declaration: /(?:const|function) tokensOf\b/ },
  { name: 'togglePill', home: 'src/test/contactForm.tsx', declaration: /(?:const|function) togglePill\b/ },
  { name: 'messageField', home: 'src/test/contactForm.tsx', declaration: /(?:const|function) messageField\b/ },
  { name: 'jsonResponse', home: 'src/test/news.ts', declaration: /(?:const|function) jsonResponse\b/ },
  { name: 'stubPublicFeeds', home: 'src/test/news.ts', declaration: /(?:const|function) stubPublicFeeds\b/ },
  { name: 'displayOfDigits', home: 'src/test/phoneInputs.ts', declaration: /(?:const|function) displayOfDigits\b/ },
  { name: 'numberIndexOfCaret', home: 'src/test/phoneInputs.ts', declaration: /(?:const|function) numberIndexOfCaret\b/ },
  { name: 'isRealNumber', home: 'src/test/phoneInputs.ts', declaration: /(?:const|function) isRealNumber\b/ },
  { name: 'isRefused', home: 'src/test/phoneInputs.ts', declaration: /(?:const|function) isRefused\b/ },
  { name: 'whatsappError', home: 'src/test/phoneInputs.ts', declaration: /(?:const|function) whatsappError\b/ },
  // The scrollIntoView stub: tests call the helpers of src/test/scroll.ts instead of patching Element.prototype by hand.
  { name: 'scrollIntoView stub', home: 'src/test/scroll.ts', declaration: /defineProperty\(Element\.prototype, 'scrollIntoView'/ },
] as const;

function* walk(folder: string): Generator<string> {
  for (const entry of readdirSync(folder)) {
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

const files = [...walk(SRC)].map((file) => relative(resolve(SRC, '..'), file).replace(/\\/g, '/'));
const testFiles = files.filter((file) => TEST_FILE.test(file) && !file.endsWith('sharedHelpers.test.ts'));
const source = (file: string) => readFileSync(resolve(SRC, '..', file), 'utf8');

describe('the shared test helpers', () => {
  it.each(SHARED)('$name is declared only in $home', ({ declaration, home }) => {
    const copies = [...testFiles, ...files.filter((file) => file.startsWith('src/test/') && !TEST_FILE.test(file))]
      .filter((file) => file !== home)
      .filter((file) => declaration.test(source(file)));

    expect(copies).toEqual([]);
  });

  it.each(SHARED)('$name still exists in $home', ({ declaration, home }) => {
    expect(declaration.test(source(home))).toBe(true);
  });
});
