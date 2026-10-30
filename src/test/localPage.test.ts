// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { abortForeignOrigins, assertLocalPage } from '../../scripts/local-page.mjs';

// scripts/measure-lcp.mjs used to open any url given on the command line, with no network guard: pointed at the real
// site it would load it and its third party hosts. It now shares this guard with the other measuring scripts.

describe('assertLocalPage', () => {
  it.each(['http://localhost:4241/', 'http://127.0.0.1:4173/blog'])('accepts %s', (url) => {
    expect(() => assertLocalPage(url)).not.toThrow();
  });

  it.each(['https://vnone.com.br/', 'http://example.com:4173/', 'http://localhost.evil.com/', 'https://n8n.vnone.com.br/webhook/x'])('refuses %s', (url) => {
    expect(() => assertLocalPage(url)).toThrow(/only a page on this machine/);
  });

  it('refuses the dev server on port 3000', () => {
    expect(() => assertLocalPage('http://localhost:3000/')).toThrow(/port 3000/);
  });

  it('refuses a value that is not a url', () => {
    expect(() => assertLocalPage('not a url')).toThrow();
  });
});

describe('abortForeignOrigins', () => {
  const route = (url: string) => ({
    request: () => ({ url: () => url }),
    continue: vi.fn(() => Promise.resolve()),
    abort: vi.fn(() => Promise.resolve()),
  });

  it('lets the page own origin through', async () => {
    const own = route('http://localhost:4241/assets/index.js');
    await abortForeignOrigins('http://localhost:4241/')(own);
    expect(own.continue).toHaveBeenCalled();
    expect(own.abort).not.toHaveBeenCalled();
  });

  it.each(['https://n8n.vnone.com.br/webhook/portfolio-vn-email', 'https://dev.to/api/articles', 'http://localhost:4999/x'])('aborts %s', async (url) => {
    const foreign = route(url);
    await abortForeignOrigins('http://localhost:4241/')(foreign);
    expect(foreign.abort).toHaveBeenCalled();
    expect(foreign.continue).not.toHaveBeenCalled();
  });
});

describe('measure-lcp', () => {
  const source = readFileSync(resolve(__dirname, '../../scripts/measure-lcp.mjs'), 'utf8');

  it('refuses a page that is not local and aborts foreign origins in every context it opens', () => {
    expect(source).toContain("from './local-page.mjs'");
    expect(source).toMatch(/assertLocalPage\(url\)/);
    expect(source).toMatch(/context\.route\('\*\*\/\*', abortForeignOrigins\(url\)\)/);
  });
});
