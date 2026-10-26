// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const DASH_PATTERN = new RegExp(`[${EM_DASH}${EN_DASH}]`);
// A string literal that uses " / " as a separator, for example 'Landing Page / Site'.
const SLASH_SEPARATOR_PATTERN = /['"`][^'"`]* \/ [^'"`]*['"`]/;

const SCANNED_DIRECTORIES = [
  'src/data',
  'src/sections',
  'src/components/ui',
  'src/components/layout',
  'src/hooks',
  'src/lib',
];
const SCANNED_FILES = ['index.html', 'src/components/SEO.tsx'];
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json']);
const TEST_FILE_PATTERN = /\.test\.[^.]+$/;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot);
}

// Directories that do not exist yet (sections, layout) are skipped without failing.
function collectFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((name) => {
    const fullPath = join(directory, name);
    if (statSync(fullPath).isDirectory()) return collectFiles(fullPath);
    if (TEST_FILE_PATTERN.test(name) || !SCANNED_EXTENSIONS.has(extensionOf(name))) return [];
    return [fullPath];
  });
}

const scannedFiles = [
  ...SCANNED_DIRECTORIES.flatMap((directory) => collectFiles(resolve(ROOT, directory))),
  ...SCANNED_FILES.map((file) => resolve(ROOT, file)).filter((file) => existsSync(file)),
];

function toPosix(path: string): string {
  return relative(ROOT, path).split('\\').join('/');
}

function findOffendingLines(files: string[], pattern: RegExp): string[] {
  return files.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .flatMap((line, index) => (pattern.test(line) ? [`${toPosix(file)}:${index + 1}  ${line.trim()}`] : [])),
  );
}

describe('copy rules', () => {
  it('scans the files it is supposed to guard', () => {
    const scanned = scannedFiles.map(toPosix);

    expect(scanned).toContain('index.html');
    expect(scanned).toContain('src/components/SEO.tsx');
    expect(scanned).toContain('src/data/services.ts');
    expect(scanned).toContain('src/lib/constants.ts');
  });

  it('never scans test files', () => {
    expect(scannedFiles.filter((file) => TEST_FILE_PATTERN.test(file))).toEqual([]);
  });

  it('has no em dash or en dash in any scanned file', () => {
    expect(findOffendingLines(scannedFiles, DASH_PATTERN)).toEqual([]);
  });

  it('has no " / " separator inside a string literal in src/data', () => {
    const dataFiles = scannedFiles.filter((file) => toPosix(file).startsWith('src/data/'));

    expect(findOffendingLines(dataFiles, SLASH_SEPARATOR_PATTERN)).toEqual([]);
  });
});
