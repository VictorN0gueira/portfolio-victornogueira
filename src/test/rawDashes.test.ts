// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The copy rules test (copy-rules.test.ts) skips test files on purpose: their strings are not site copy. A regex that
// holds a raw en dash or em dash is still a dash in the source, so the test files of the layout, ui and sections
// folders are scanned here. A test that must detect the dashes writes them as escape sequences of the code points (U+2013 and U+2014).

const ROOT = resolve(__dirname, '../..');
const DASH_PATTERN = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const SCANNED_DIRECTORIES = ['src/components/layout', 'src/components/ui', 'src/sections'];
const TEST_FILE_PATTERN = /\.test\.[^.]+$/;

function collectTestFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((name) => {
    const fullPath = join(directory, name);
    if (statSync(fullPath).isDirectory()) return collectTestFiles(fullPath);
    return TEST_FILE_PATTERN.test(name) ? [fullPath] : [];
  });
}

describe('raw dashes in test files', () => {
  it('has no raw em dash or en dash in the test files of layout, ui and sections (regexes use escapes)', () => {
    const files = SCANNED_DIRECTORIES.flatMap((directory) => collectTestFiles(resolve(ROOT, directory)));
    const offending = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .flatMap((line, index) => (DASH_PATTERN.test(line) ? [`${file.slice(ROOT.length + 1)}:${index + 1}`] : [])),
    );

    expect(files.length).toBeGreaterThan(0);
    expect(offending).toEqual([]);
  });
});
