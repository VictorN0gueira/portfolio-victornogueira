// @vitest-environment node
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { founderPhotoPlan } from '../../../scripts/process-founder-photo.mjs';
import { FOUNDER_PHOTO } from './founderPhotoSource';

const ROOT = resolve(__dirname, '../../..');
const SOURCE_WIDTH = 982;
const SOURCE_HEIGHT = 1024;
// AVIF and WebP of one size are both measured against the ceiling of that size.
const MAX_BYTES: Record<number, number> = { 480: 45 * 1024, 960: 140 * 1024 };
const FORMAT_OF: Record<string, string> = { avif: 'heif', webp: 'webp' };

const plan = founderPhotoPlan();

describe('founder photo files', () => {
  it('plans exactly the four files: AVIF and WebP at 480 and 960 wide', () => {
    expect(plan.map((item) => item.file).sort()).toEqual([
      'public/founder/victor-480.avif',
      'public/founder/victor-480.webp',
      'public/founder/victor-960.avif',
      'public/founder/victor-960.webp',
    ]);
  });

  it.each(plan)(
    'writes $file at $width wide in the right format, in proportion, under its weight ceiling',
    async ({ file, width, format }) => {
      const path = resolve(ROOT, file);
      const { width: realWidth, height, format: realFormat } = await sharp(path).metadata();

      expect(realWidth).toBe(width);
      expect(Math.abs((height ?? 0) - (width * SOURCE_HEIGHT) / SOURCE_WIDTH)).toBeLessThanOrEqual(1);
      expect(realFormat).toBe(FORMAT_OF[format]);
      expect(statSync(path).size).toBeLessThanOrEqual(MAX_BYTES[width]);
    },
  );

  it('never enlarges the source: both sizes are narrower than the 982px original', () => {
    expect(Math.max(...plan.map((item) => item.width))).toBeLessThan(SOURCE_WIDTH);
  });

  it('describes the 960 file by its real size, and lists both widths in the source sets', async () => {
    const { width, height } = await sharp(resolve(ROOT, 'public/founder/victor-960.webp')).metadata();

    expect({ width, height }).toEqual({ width: FOUNDER_PHOTO.width, height: FOUNDER_PHOTO.height });
    for (const size of FOUNDER_PHOTO.sizes) {
      expect(FOUNDER_PHOTO.avifSrcSet).toContain(`/founder/victor-${size}.avif ${size}w`);
      expect(FOUNDER_PHOTO.webpSrcSet).toContain(`/founder/victor-${size}.webp ${size}w`);
    }
    expect(FOUNDER_PHOTO.fallbackSrc).toMatch(/\/founder\/victor-960\.webp$/);
  });
});
