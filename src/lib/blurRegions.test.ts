// @vitest-environment node
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
// The blur step lives in the build scripts; these tests run it on synthetic images (no screenshot is needed).
import { applyBlurRegions, regionBounds, regionReach } from '../../scripts/blur-regions.mjs';
import { BLUR_DEFAULTS, BLUR_SOURCES, regionsFor } from '../../scripts/project-blur-regions.mjs';

const WIDTH = 480;
const HEIGHT = 240;
const BACKGROUND = 10;
const CELL = 2;
const MIN_ENERGY_DROP = 0.9;

interface Gray {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
}

/** Deterministic pseudo random bits, so a failing run can be reproduced. */
function makeRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** A dark image with a block of high contrast "text like" cells (random black or white 2 px squares). */
function noisyImage(blocks: ReadonlyArray<{ x: number; y: number; w: number; h: number }>): Buffer {
  const random = makeRandom(7);
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3, BACKGROUND);
  for (const block of blocks) {
    for (let cellY = block.y; cellY < block.y + block.h; cellY += CELL) {
      for (let cellX = block.x; cellX < block.x + block.w; cellX += CELL) {
        const value = random() > 0.5 ? 240 : 20;
        for (let dy = 0; dy < CELL; dy += 1) {
          for (let dx = 0; dx < CELL; dx += 1) {
            const offset = ((cellY + dy) * WIDTH + cellX + dx) * 3;
            pixels.fill(value, offset, offset + 3);
          }
        }
      }
    }
  }
  return pixels;
}

async function encode(pixels: Buffer): Promise<Buffer> {
  return sharp(pixels, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } }).png().toBuffer();
}

async function toGray(encoded: Buffer): Promise<Gray> {
  const { data, info } = await sharp(encoded).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Mean absolute horizontal plus vertical gradient inside a box: what text and faces are made of. */
function edgeEnergy(image: Gray, box: { x: number; y: number; w: number; h: number }): number {
  let total = 0;
  let count = 0;
  for (let y = box.y; y < box.y + box.h - 1; y += 1) {
    for (let x = box.x; x < box.x + box.w - 1; x += 1) {
      const here = image.data[y * image.width + x];
      total += Math.abs(here - image.data[y * image.width + x + 1]) + Math.abs(here - image.data[(y + 1) * image.width + x]);
      count += 1;
    }
  }
  return total / count;
}

const PILL = { shape: 'rect', x: 100, y: 80, w: 200, h: 24, radius: 12 } as const;
const DISC = { shape: 'circle', cx: 380, cy: 150, r: 34 } as const;
const ELSEWHERE = { x: 20, y: 20, w: 60, h: 40 };

describe('applyBlurRegions on a synthetic text like fixture', () => {
  it('removes at least 90 percent of the edge energy inside a rounded rectangle', async () => {
    const original = await encode(noisyImage([PILL, ELSEWHERE]));
    const blurred = await applyBlurRegions(original, [PILL], BLUR_DEFAULTS);
    const inner = { x: PILL.x + PILL.radius, y: PILL.y + 4, w: PILL.w - PILL.radius * 2, h: PILL.h - 8 };

    const before = edgeEnergy(await toGray(original), inner);
    const after = edgeEnergy(await toGray(blurred), inner);

    expect(before).toBeGreaterThan(50);
    expect(after).toBeLessThan(before * (1 - MIN_ENERGY_DROP));
  });

  it('removes at least 90 percent of the edge energy inside a circle', async () => {
    const square = { x: DISC.cx - DISC.r, y: DISC.cy - DISC.r, w: DISC.r * 2, h: DISC.r * 2 };
    const original = await encode(noisyImage([square]));
    const blurred = await applyBlurRegions(original, [DISC], BLUR_DEFAULTS);
    const inner = { x: DISC.cx - 22, y: DISC.cy - 22, w: 44, h: 44 };

    const before = edgeEnergy(await toGray(original), inner);
    const after = edgeEnergy(await toGray(blurred), inner);

    expect(after).toBeLessThan(before * (1 - MIN_ENERGY_DROP));
  });

  it('leaves every pixel outside the region and its reach exactly as it was', async () => {
    const original = await encode(noisyImage([PILL, ELSEWHERE]));
    const blurred = await applyBlurRegions(original, [PILL], BLUR_DEFAULTS);
    const reach = regionReach(PILL, BLUR_DEFAULTS) + 1;
    const bounds = regionBounds(PILL);
    const before = await toGray(original);
    const after = await toGray(blurred);

    let changedOutside = 0;
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        const isInside = x >= bounds.left - reach && x < bounds.left + bounds.width + reach && y >= bounds.top - reach && y < bounds.top + bounds.height + reach;
        if (!isInside && before.data[y * WIDTH + x] !== after.data[y * WIDTH + x]) changedOutside += 1;
      }
    }

    expect(changedOutside).toBe(0);
    expect(edgeEnergy(after, ELSEWHERE)).toBeCloseTo(edgeEnergy(before, ELSEWHERE), 6);
  });

  it('fades out softly: no pixel next to the region jumps by more than a hard rectangle would', async () => {
    const original = await encode(noisyImage([{ x: 60, y: 70, w: 280, h: 44 }]));
    const blurred = await applyBlurRegions(original, [PILL], BLUR_DEFAULTS);
    const after = await toGray(blurred);
    const row = PILL.y + PILL.h / 2;

    // Along the middle row, just right of the pill, the values have to come from the blur band, not from the noise.
    const jump = Math.abs(after.data[row * WIDTH + PILL.x + PILL.w + 2] - after.data[row * WIDTH + PILL.x + PILL.w - 2]);

    expect(jump).toBeLessThan(90);
  });

  it('returns the very same bytes when there is nothing to blur', async () => {
    const original = await encode(noisyImage([PILL]));

    expect(await applyBlurRegions(original, [], BLUR_DEFAULTS)).toBe(original);
  });

  it('keeps the image size', async () => {
    const original = await encode(noisyImage([PILL]));
    const blurred = await applyBlurRegions(original, [PILL, DISC], BLUR_DEFAULTS);
    const meta = await sharp(blurred).metadata();

    expect([meta.width, meta.height]).toEqual([WIDTH, HEIGHT]);
  });
});

describe('the blur configuration', () => {
  const HUB_CONVERSAS = 'hub081/conversas.png';
  const HUB_SIZE = { width: 1919, height: 911 };

  it('blurs contact names only when the blurNames switch is on', () => {
    const base = regionsFor(HUB_CONVERSAS);
    const withNames = regionsFor(HUB_CONVERSAS, { blurNames: true });

    expect(withNames.length).toBe(base.length + BLUR_SOURCES[HUB_CONVERSAS].nameRegions.length);
    expect(BLUR_SOURCES[HUB_CONVERSAS].nameRegions.length).toBe(5);
  });

  it('has a photo and a phone number region for each of the five conversations, plus the owner block', () => {
    const regions = regionsFor(HUB_CONVERSAS);

    // 5 contact photos + 5 phone numbers + owner photo, name and e-mail (bottom left) + owner photo (top right)
    expect(regions).toHaveLength(14);
  });

  it('keeps every region inside the screenshot', () => {
    for (const key of Object.keys(BLUR_SOURCES)) {
      for (const region of regionsFor(key, { blurNames: true })) {
        const bounds = regionBounds(region);
        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.top).toBeGreaterThanOrEqual(0);
        expect(bounds.left + bounds.width).toBeLessThanOrEqual(HUB_SIZE.width + 1);
        expect(bounds.top + bounds.height).toBeLessThanOrEqual(HUB_SIZE.height);
      }
    }
  });

  it('uses a blur strong enough to hide digits and faces', () => {
    for (const key of Object.keys(BLUR_SOURCES)) {
      for (const region of regionsFor(key, { blurNames: true })) {
        expect(region.sigma ?? BLUR_DEFAULTS.sigma).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('has nothing to blur for a file that is not listed', () => {
    expect(regionsFor('hub081/login.png')).toEqual([]);
  });
});
