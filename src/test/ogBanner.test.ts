// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SITE } from '../lib/site';

// WhatsApp, LinkedIn and Facebook keep the share card per URL. A new banner under the same URL shows nothing new,
// so the `?v=` of the URL has to move whenever the file changes. These tests keep the file, SITE.ogImage and the
// static head of index.html from drifting apart.

const ROOT = resolve(__dirname, '../..');
const bannerBytes = readFileSync(resolve(ROOT, 'public/og-banner.png'));
const indexHtml = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const generatorSource = readFileSync(resolve(ROOT, 'scripts/generate-og-banner.mjs'), 'utf8');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IHDR_WIDTH_OFFSET = 16;
const IHDR_HEIGHT_OFFSET = 20;
const BANNER_WIDTH = 1200;
const BANNER_HEIGHT = 630;
const MAX_BANNER_BYTES = 300 * 1024;

// The sha256 of the banner file for each `?v=` that went live. Regenerating the banner (npm run og) changes the hash:
// bump `?v=` in src/lib/site.ts and in index.html, then add the new pair here.
const BANNER_SHA256_BY_VERSION: Readonly<Record<number, string>> = {
  3: 'b78517de4eab72e6c9f950c7b7e68ef2d39a592e407c011122552473d98c1bd3',
};

function versionOf(url: string): number {
  const match = /^https:\/\/vnone\.com\.br\/og-banner\.png\?v=(\d+)$/.exec(url);
  if (!match) throw new Error(`not a versioned banner url: ${url}`);
  return Number(match[1]);
}

function metaContent(attribute: 'property' | 'name', key: string): string {
  const match = new RegExp(`<meta ${attribute}="${key}" content="([^"]*)"`).exec(indexHtml);
  if (!match) throw new Error(`index.html has no ${key}`);
  return match[1];
}

describe('public/og-banner.png', () => {
  it('is a 1200x630 PNG under 300 kB', () => {
    expect(bannerBytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)).toBe(true);
    expect(bannerBytes.readUInt32BE(IHDR_WIDTH_OFFSET)).toBe(BANNER_WIDTH);
    expect(bannerBytes.readUInt32BE(IHDR_HEIGHT_OFFSET)).toBe(BANNER_HEIGHT);
    expect(bannerBytes.length).toBeLessThan(MAX_BANNER_BYTES);
  });

  it('is generated with a central square as tall as the banner, the part WhatsApp shows', () => {
    const safeSize = Number(/const SAFE_SIZE = (\d+);/.exec(generatorSource)?.[1]);
    expect(safeSize).toBe(BANNER_HEIGHT);
    expect(generatorSource).toContain('const SAFE_LEFT = (WIDTH - SAFE_SIZE) / 2;');
  });
});

describe('the banner url', () => {
  it('ends with ?v=<n> in SITE.ogImage', () => {
    expect(versionOf(SITE.ogImage)).toBeGreaterThan(0);
  });

  it('is the same in og:image and twitter:image of index.html as in SITE.ogImage', () => {
    expect(metaContent('property', 'og:image')).toBe(SITE.ogImage);
    expect(metaContent('name', 'twitter:image')).toBe(SITE.ogImage);
  });

  it('moves its version whenever the file changes', () => {
    const version = versionOf(SITE.ogImage);
    const actual = createHash('sha256').update(bannerBytes).digest('hex');
    const registered = BANNER_SHA256_BY_VERSION[version];
    expect(
      registered,
      `v=${version} has no registered hash: add "${version}: '${actual}'" to BANNER_SHA256_BY_VERSION`,
    ).toBeDefined();
    expect(
      actual,
      'og-banner.png changed under the same ?v=: bump ?v= in src/lib/site.ts and index.html, then register the new hash',
    ).toBe(registered);
  });

  it('never reuses a version for two different files', () => {
    const hashes = Object.values(BANNER_SHA256_BY_VERSION);
    expect(new Set(hashes).size).toBe(hashes.length);
  });
});
