// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BUDGET_KB, criticalPathAssets, measureBudget } from '../../scripts/check-bundle-budget.mjs';

// The critical path is what the browser must download before the home can run: the entry module plus every
// modulepreload of dist/index.html, gzipped. The budget (150 kB for a landing page, rules/web/performance) is only
// enforced by `npm run budget -- --enforce`; this tests the measuring itself on a fixture dist.

const SCRIPT = resolve(__dirname, '../../scripts/check-bundle-budget.mjs');
let dist = '';

/** Text that does not compress to nothing: a seeded pseudo random string. */
function noise(length: number, seed: number): string {
  let state = seed;
  let text = '';
  for (let index = 0; index < length; index += 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    text += String.fromCharCode(97 + (state % 26));
  }
  return text;
}

function writeAsset(name: string, body: string): number {
  mkdirSync(join(dist, 'assets'), { recursive: true });
  writeFileSync(join(dist, 'assets', name), body);
  return gzipSync(body, { level: 9 }).length;
}

function writeIndex(head: string): void {
  writeFileSync(join(dist, 'index.html'), `<!doctype html><html><head>${head}</head><body><div id="root"></div></body></html>`);
}

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'budget-'));
});

afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
});

describe('which files are on the critical path', () => {
  it('takes the entry module and every modulepreload, in page order, and not the stylesheet or the lazy chunks', () => {
    const html = `
      <script type="module" crossorigin src="/assets/index-AAA.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/react-vendor-BBB.js">
      <link rel="stylesheet" crossorigin href="/assets/index-DDD.css">`;
    expect(criticalPathAssets(html)).toEqual(['assets/index-AAA.js', 'assets/react-vendor-BBB.js']);
  });

  it('finds the files under a base path, as the GitHub Pages build has', () => {
    const html = '<script type="module" src="/portfolio-victornogueira/assets/index-AAA.js"></script>';
    expect(criticalPathAssets(html)).toEqual(['assets/index-AAA.js']);
  });

  it('ignores an inline script and a modulepreload of something that is not under assets', () => {
    const html = '<script type="module">window.x = 1</script><link rel="modulepreload" href="/vendor/x.js">';
    expect(criticalPathAssets(html)).toEqual([]);
  });
});

describe('the measurement', () => {
  it('gzips each file at level 9 and sums them', () => {
    const entry = writeAsset('index-AAA.js', noise(40_000, 1));
    const vendor = writeAsset('react-vendor-BBB.js', noise(25_000, 2));
    writeIndex('<script type="module" src="/assets/index-AAA.js"></script><link rel="modulepreload" href="/assets/react-vendor-BBB.js">');

    const result = measureBudget(dist);

    expect(result.rows.map((row) => [row.file, row.gzipBytes])).toEqual([
      ['assets/index-AAA.js', entry],
      ['assets/react-vendor-BBB.js', vendor],
    ]);
    expect(result.totalBytes).toBe(entry + vendor);
    expect(result.limitBytes).toBe(BUDGET_KB * 1000);
  });

  it('fails clearly when a file the page asks for is not in dist', () => {
    writeIndex('<script type="module" src="/assets/index-GONE.js"></script>');
    expect(() => measureBudget(dist)).toThrow(/index-GONE\.js/);
  });

  it('fails clearly when dist has no index.html (the build did not run)', () => {
    expect(() => measureBudget(dist)).toThrow(/npm run build/);
  });
});

describe('the command line', () => {
  function runCli(args: string[]) {
    return spawnSync(process.execPath, [SCRIPT, `--dist=${dist}`, ...args], { encoding: 'utf8' });
  }

  function writeSizedPage(): void {
    writeAsset('index-AAA.js', noise(30_000, 3));
    writeIndex('<script type="module" src="/assets/index-AAA.js"></script>');
  }

  it('only reports without --enforce, even above the limit, and prints the table and the sum', () => {
    writeSizedPage();
    const result = runCli(['--limit=1']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('assets/index-AAA.js');
    expect(result.stdout).toMatch(/total/i);
    expect(result.stdout).toMatch(/over the budget/i);
  });

  it('fails with --enforce above the limit', () => {
    writeSizedPage();
    const result = runCli(['--limit=1', '--enforce']);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/over the budget/i);
  });

  it('passes with --enforce under the limit', () => {
    writeSizedPage();
    const result = runCli(['--limit=500', '--enforce']);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/within the budget/i);
  });

  it('refuses a limit that is not a positive number', () => {
    writeSizedPage();
    expect(runCli(['--limit=abc']).status).toBe(2);
  });
});
