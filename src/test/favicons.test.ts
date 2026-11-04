// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Google shows a site icon only when it is a multiple of 48 px (or an SVG), square, declared in the head of the home
// and reachable. These tests read the generated files of public/ (scripts/build-favicons.mjs) and pin their format.

const PUBLIC = resolve(__dirname, '../../public');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IHDR_WIDTH_OFFSET = 16;
const IHDR_HEIGHT_OFFSET = 20;
const MAX_ICON_BYTES = 60 * 1024;

const GOOGLE_PNGS = [48, 96, 192, 512] as const;
const ICO_SIZES = [16, 32, 48] as const;

const read = (relativePath: string) => readFileSync(resolve(PUBLIC, relativePath));

function pngSize(file: Buffer): { width: number; height: number } {
  expect(file.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)).toBe(true);
  return { width: file.readUInt32BE(IHDR_WIDTH_OFFSET), height: file.readUInt32BE(IHDR_HEIGHT_OFFSET) };
}

interface IcoEntry {
  width: number;
  height: number;
  size: number;
  offset: number;
}

const ICO_HEADER_BYTES = 6;
const ICO_ENTRY_BYTES = 16;

function icoEntries(file: Buffer): IcoEntry[] {
  const count = file.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const at = ICO_HEADER_BYTES + index * ICO_ENTRY_BYTES;
    return {
      // 0 means 256 in the ICO directory.
      width: file[at] || 256,
      height: file[at + 1] || 256,
      size: file.readUInt32LE(at + 8),
      offset: file.readUInt32LE(at + 12),
    };
  });
}

describe('favicon.ico', () => {
  const ico = read('favicon.ico');

  it('starts with the ICO signature and holds the 16, 32 and 48 px images', () => {
    expect([...ico.subarray(0, 4)]).toEqual([0, 0, 1, 0]);
    expect(icoEntries(ico).map((entry) => entry.width)).toEqual([...ICO_SIZES]);
  });

  it('embeds a real square PNG of the declared size in every entry', () => {
    for (const entry of icoEntries(ico)) {
      const png = ico.subarray(entry.offset, entry.offset + entry.size);
      expect(pngSize(png)).toEqual({ width: entry.width, height: entry.width });
    }
  });

  it('has no byte after the last image', () => {
    const last = icoEntries(ico).at(-1)!;
    expect(last.offset + last.size).toBe(ico.length);
  });
});

describe('the PNG set', () => {
  for (const size of GOOGLE_PNGS) {
    it(`brand/favicon-${size}.png is exactly ${size}x${size} and under 60 kB`, () => {
      const file = read(`brand/favicon-${size}.png`);
      expect(pngSize(file)).toEqual({ width: size, height: size });
      expect(file.length).toBeLessThan(MAX_ICON_BYTES);
    });
  }

  it('keeps the 48 px icon apart from the old 32 px one', () => {
    expect(read('brand/favicon-48.png').equals(read('brand/favicon-32.png'))).toBe(false);
  });
});

// The head of the home declares the set. The order matters: the first declared icons are the ones a crawler reads first.
const ROOT = resolve(__dirname, '../..');
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const faviconBlock = html.slice(html.indexOf('<!-- Favicon -->'), html.indexOf('<!-- Open Graph -->'));

const EXPECTED_LINKS = [
  '<link rel="icon" href="/favicon.ico" sizes="any" />',
  '<link rel="icon" type="image/png" sizes="48x48" href="/brand/favicon-48.png" />',
  '<link rel="icon" type="image/png" sizes="96x96" href="/brand/favicon-96.png" />',
  '<link rel="icon" type="image/png" sizes="192x192" href="/brand/favicon-192.png" />',
  '<link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png" />',
  '<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />',
  '<link rel="manifest" href="/site.webmanifest" />',
];

describe('the favicon block of index.html', () => {
  it('declares the icons, the touch icon and the manifest in this order', () => {
    const declared = faviconBlock.match(/<link [^>]*>/g) ?? [];
    expect(declared).toEqual(EXPECTED_LINKS);
  });

  it('points every href to a file of public/', () => {
    const hrefs = [...faviconBlock.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs).toHaveLength(EXPECTED_LINKS.length);
    for (const href of hrefs) {
      expect(() => read(href.slice(1)), href).not.toThrow();
    }
  });

  it('declares sizes that match the real dimensions of each PNG', () => {
    const pngLinks = [...faviconBlock.matchAll(/<link rel="icon" type="image\/png" sizes="(\d+)x(\d+)" href="([^"]+)"/g)];
    expect(pngLinks).toHaveLength(4);
    for (const [, width, height, href] of pngLinks) {
      expect(pngSize(read(href.slice(1))), href).toEqual({ width: Number(width), height: Number(height) });
    }
  });
});

describe('site.webmanifest', () => {
  const manifest = JSON.parse(read('site.webmanifest').toString('utf8')) as {
    name: string;
    short_name: string;
    lang: string;
    start_url: string;
    display: string;
    theme_color: string;
    background_color: string;
    icons: { src: string; sizes: string; type: string; purpose: string }[];
  };

  it('names the site and keeps it a plain browser page', () => {
    expect(manifest).toMatchObject({
      name: 'VN One',
      short_name: 'VN One',
      lang: 'pt-BR',
      start_url: '/',
      display: 'browser',
      theme_color: '#0A0A0A',
      background_color: '#0A0A0A',
    });
  });

  it('lists the 192 and 512 px icons, and each file has the declared size', () => {
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512']);
    for (const icon of manifest.icons) {
      const [width, height] = icon.sizes.split('x').map(Number);
      expect(icon.type).toBe('image/png');
      expect(icon.purpose).toBe('any');
      expect(pngSize(read(icon.src.slice(1))), icon.src).toEqual({ width, height });
    }
  });
});

describe('robots.txt', () => {
  const disallowed = read('robots.txt')
    .toString('utf8')
    .split(/\r?\n/)
    .filter((line) => /^disallow:/i.test(line))
    .map((line) => line.slice('disallow:'.length).trim())
    .filter((rule) => rule !== '');

  it('does not block the icons, the brand folder or the manifest', () => {
    for (const path of ['/favicon.ico', '/brand/favicon-48.png', '/site.webmanifest']) {
      expect(
        disallowed.filter((rule) => path.startsWith(rule)),
        path,
      ).toEqual([]);
    }
  });
});
