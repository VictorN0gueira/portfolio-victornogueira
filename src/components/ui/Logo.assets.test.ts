// @vitest-environment node
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { LOGO_HEIGHT, LOGO_WIDTH } from './Logo';

const brandDir = resolve(__dirname, '../../../public/brand');

describe('Logo intrinsic size', () => {
  it.each(['vn-one-logo-dark.webp', 'vn-one-logo-chrome.webp'])(
    'matches the real dimensions of %s',
    async (file) => {
      const { width, height } = await sharp(resolve(brandDir, file)).metadata();

      expect({ width, height }).toEqual({ width: LOGO_WIDTH, height: LOGO_HEIGHT });
    },
  );
});
