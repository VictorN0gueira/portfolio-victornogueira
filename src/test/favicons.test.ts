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
