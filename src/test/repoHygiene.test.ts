// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Leftovers that were removed on purpose and must not come back: the AI Studio template config, the GNews key in
// the build, files nothing references (they ship in dist, in the Docker image and in the Pages artifact), and the
// stray screenshots of the repo root. Words are written in pieces so this file does not match its own scan.

const ROOT = resolve(__dirname, '../..');
const SKIPPED_FOLDERS = new Set(['node_modules', '.git', '.claude', '.superpowers', 'docs', 'coverage', 'test-results', 'playwright-report', '__shots__']);
const TEXT_FILE = /\.(?:ts|tsx|mjs|d\.mts|js|json|html|css|md|yml|yaml|conf|example)$|^Dockerfile$|^\.dockerignore$/;

function* walk(folder: string): Generator<string> {
  for (const entry of readdirSync(folder)) {
    if (SKIPPED_FOLDERS.has(entry) || entry === 'dist' || entry.startsWith('dist-e2e-')) continue;
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

const textFiles = [...walk(ROOT)].filter((file) => TEXT_FILE.test(file.split(/[\\/]/).pop() ?? '')).filter((file) => !file.endsWith('repoHygiene.test.ts'));
const hits = (pattern: RegExp, files = textFiles) =>
  files.filter((file) => pattern.test(readFileSync(file, 'utf8'))).map((file) => relative(ROOT, file).replace(/\\/g, '/'));

describe('the AI Studio template is gone', () => {
  it('leaves no Gemini API key, HMR switch or ai.studio link anywhere but the docs', () => {
    expect(hits(new RegExp(`${'GEMINI'}_API_KEY|${'DISABLE'}_HMR|ai\\.${'studio'}`, 'i'))).toEqual([]);
  });

  it('has no metadata.json (the AI Studio manifest)', () => {
    expect(existsSync(join(ROOT, 'metadata.json'))).toBe(false);
  });

  it('does not expose the dev server to the network', () => {
    expect(readFileSync(join(ROOT, 'package.json'), 'utf8')).not.toContain('--host');
  });
});

describe('the GNews key is not part of the build', () => {
  it('has no define, workflow variable or example for it', () => {
    const files = ['vite.config.ts', '.env.example', '.github/workflows/deploy.yml', '.github/workflows/ci.yml'].map((file) => join(ROOT, file)).filter(existsSync);
    expect(hits(new RegExp(`VITE_${'GNEWS'}_API_KEY`), files)).toEqual([]);
  });

  it('has no "@" alias pointing at the project root', () => {
    expect(readFileSync(join(ROOT, 'vite.config.ts'), 'utf8')).not.toMatch(/alias/);
    expect(readFileSync(join(ROOT, 'tsconfig.json'), 'utf8')).not.toMatch(/"@\/\*"/);
  });
});

describe('files nothing references are not in the repo', () => {
  it.each([
    'blog_page_preview.png',
    'homepage_with_blog_nav.png',
    'public/victor-photo.jpg',
    'public/victor-photo.webp',
    'public/brand/vn-one-logo-chrome.png',
    'public/projects/screenshots',
  ])('has no %s', (path) => {
    expect(existsSync(join(ROOT, path))).toBe(false);
  });

  it('keeps the logo source for the OG banner next to the scripts, out of public', () => {
    expect(existsSync(join(ROOT, 'scripts/assets/vn-one-logo-chrome.png'))).toBe(true);
    const generator = readFileSync(join(ROOT, 'scripts/generate-og-banner.mjs'), 'utf8');
    expect(generator).toContain('scripts/assets/vn-one-logo-chrome.png');
    expect(generator).not.toContain('public/brand/vn-one-logo-chrome.png');
  });

  it('writes the chrome PNG for the banner next to the scripts, not into public/brand', () => {
    const builder = readFileSync(join(ROOT, 'scripts/build-brand-assets.mjs'), 'utf8');
    expect(builder).toMatch(/vn-one-logo-chrome\.png', BANNER_PNG_HEIGHT, 'png', bannerSourceDir/);
  });

  it('references no file of public/ that does not exist (the built pages need no 404)', () => {
    const referenced = [...new Set(hits(/\/(?:brand|fonts|clients|cv)\/[A-Za-z0-9._-]+\.(?:webp|png|woff2|pdf)/, textFiles.filter((file) => file.includes(`${join(ROOT, 'src')}`) && !/\.test\./.test(file))))];
    expect(referenced.length).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const file of referenced) {
      for (const match of readFileSync(join(ROOT, file), 'utf8').matchAll(/\/(?:brand|fonts|clients|cv)\/[A-Za-z0-9._-]+\.(?:webp|png|woff2|pdf)/g)) {
        if (!existsSync(join(ROOT, 'public', match[0]))) missing.push(`${file}: ${match[0]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('the scrollbar skin that was removed does not come back', () => {
  // The class was a custom scrollbar skin: the CSS and the pin on the page are gone, and nothing may name it again.
  it('has no custom scrollbar class left in src, e2e, public or the root pages', () => {
    expect(hits(new RegExp(`custom-${'scrollbar'}`))).toEqual([]);
  });
});

describe('the mobile menu button name lives in one place', () => {
  // The e2e specs find the trigger with menuButton() of e2e/homeSupport.ts, which reads MENU_BUTTON_NAME from the code.
  it('keeps no spec of e2e with a name regex or a literal for the trigger of its own', () => {
    const specs = textFiles.filter((file) => file.includes(join(ROOT, 'e2e')) && !file.endsWith('homeSupport.ts'));
    expect(specs.length).toBeGreaterThan(0);
    expect(hits(/Abrir menu|name: \/\^\(\?:/, specs)).toEqual([]);
  });
});
