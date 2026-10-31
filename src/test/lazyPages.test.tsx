import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FINAL_CTA_POSITION, warmUpRender } from './lazyPages';

const SRC = resolve(__dirname, '..');
const LAZY_IMPORT = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

const read = (path: string) => readFileSync(resolve(SRC, path), 'utf8');
const importedModules = (source: string) => [...source.matchAll(LAZY_IMPORT)].map((match) => match[1].split('/').slice(-1)[0]);

// The preload list repeats the lazy imports of the pages. A section added to HomePage and left out of the list would not be
// preloaded, and the first test of every home suite would wait for its module again and time out under load.
describe('the preload lists follow the lazy sections of the pages', () => {
  it('preloads exactly the lazy sections of HomePage, in the same order', () => {
    const page = importedModules(read('pages/HomePage.tsx'));
    const preloaded = importedModules(read('test/lazyPages.ts').split('export async function preloadAboutSections')[0]);

    expect(page.length).toBeGreaterThan(0);
    expect(preloaded).toEqual(page);
  });

  it('preloads the lazy chunk of AboutPage', () => {
    const page = importedModules(read('pages/AboutPage.tsx'));
    const preloaded = importedModules(read('test/lazyPages.ts').split('export async function preloadAboutSections')[1]);

    expect(page.length).toBeGreaterThan(0);
    expect(preloaded).toEqual(page);
  });

  it('knows that the form is the last section of the home', () => {
    const page = importedModules(read('pages/HomePage.tsx'));

    expect(page[FINAL_CTA_POSITION]).toBe('FinalCta');
  });
});

describe('warmUpRender', () => {
  it('unmounts what it rendered when the page never gets ready, so nothing is left in the document', async () => {
    const attempt = warmUpRender(<p>warm up probe</p>, () => expect(document.querySelector('h9')).not.toBeNull(), 60);

    await expect(attempt).rejects.toThrow();

    expect(document.body.textContent).not.toContain('warm up probe');
  });

  it('unmounts it when the page is ready too', async () => {
    await warmUpRender(<p>ready probe</p>, () => expect(document.body.textContent).toContain('ready probe'));

    expect(document.body.textContent).not.toContain('ready probe');
  });
});
