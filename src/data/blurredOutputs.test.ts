// @vitest-environment node
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { regionBounds } from '../../scripts/blur-regions.mjs';
import { BLUR_SOURCES, regionsFor } from '../../scripts/project-blur-regions.mjs';

// The committed outputs, not the originals: text and faces left in them would show up as edge energy.
const PROJECTS_DIR = resolve(__dirname, '../../public/projects');
const WEBP_WIDTH = 1600;
const SHARE_SIZE = { width: 1200, height: 630 };
const MAX_RELATIVE_ENERGY = 0.12;
const INSCRIBED_SQUARE = 0.6;
const BLOCK_WIDTH = 48;
const BLOCK_HEIGHT = 24;
const MIN_REFERENCE_ENERGY = 10;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Gray {
  data: Uint8Array;
  width: number;
  height: number;
}

type Region = Parameters<typeof regionBounds>[0];

async function loadGray(file: string): Promise<Gray> {
  const { data, info } = await sharp(join(PROJECTS_DIR, file)).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * The part of a region to measure, in output pixels. For a circle it is the inscribed square: the soft
 * outer rim of a blurred photo is a smooth fade against the page, not detail, and must not count.
 */
function scaled(region: Region, scale: number, offset = { x: 0, y: 0 }): Box {
  if (region.shape === 'circle') {
    const half = region.r * INSCRIBED_SQUARE * scale;
    return { x: Math.round(region.cx * scale - half + offset.x), y: Math.round(region.cy * scale - half + offset.y), w: Math.round(half * 2), h: Math.round(half * 2) };
  }
  const bounds = regionBounds(region);
  return {
    x: Math.round(bounds.left * scale + offset.x),
    y: Math.round(bounds.top * scale + offset.y),
    w: Math.round(bounds.width * scale),
    h: Math.round(bounds.height * scale),
  };
}

/**
 * Mean absolute second difference, horizontal plus vertical, per pixel inside a box. A blurred patch is a smooth
 * ramp (a first difference would count the ramp), while text and faces are made of sharp turns.
 */
function energy(image: Gray, box: Box): number {
  let total = 0;
  let count = 0;
  const at = (x: number, y: number) => image.data[y * image.width + x];
  for (let y = box.y + 1; y < box.y + box.h - 1; y += 1) {
    for (let x = box.x + 1; x < box.x + box.w - 1; x += 1) {
      total += Math.abs(at(x - 1, y) - 2 * at(x, y) + at(x + 1, y)) + Math.abs(at(x, y - 1) - 2 * at(x, y) + at(x, y + 1));
      count += 1;
    }
  }
  return total / count;
}

/** The busiest block of the image: sharp text somewhere on the same screen, the yardstick of "still readable". */
function busiestBlock(image: Gray): number {
  let best = 0;
  for (let y = 0; y + BLOCK_HEIGHT < image.height; y += BLOCK_HEIGHT) {
    for (let x = 0; x + BLOCK_WIDTH < image.width; x += BLOCK_WIDTH) best = Math.max(best, energy(image, { x, y, w: BLOCK_WIDTH, h: BLOCK_HEIGHT }));
  }
  return best;
}

const entries = Object.entries(BLUR_SOURCES) as [string, { sizes: { width: number; height: number }[] }][];

describe.each(entries)('the committed image of %s', (key, source) => {
  const regions = regionsFor(key) as Region[];
  const scale = WEBP_WIDTH / source.sizes[0].width;

  it('has no edge energy left inside any of its blurred regions, names of leads included', async () => {
    const image = await loadGray(`${key}-${WEBP_WIDTH}.webp`);
    const reference = busiestBlock(image);

    expect(reference).toBeGreaterThan(MIN_REFERENCE_ENERGY);
    for (const region of regions) expect(energy(image, scaled(region, scale))).toBeLessThan(reference * MAX_RELATIVE_ENERGY);
  });
});

describe('the share images', () => {
  const SHARED = ['hub081/dashboards', 'dizpara/lista-de-leads', 'ai-playlist-maker/tela-email'] as const;

  it.each(SHARED)('blurs the same regions in the 1200 by 630 JPEG of %s', async (key) => {
    const source = (BLUR_SOURCES as Record<string, { sizes: { width: number; height: number }[] }>)[key];
    const { width, height } = source.sizes[0];
    const fit = Math.min(SHARE_SIZE.width / width, SHARE_SIZE.height / height);
    const offset = { x: (SHARE_SIZE.width - width * fit) / 2, y: (SHARE_SIZE.height - height * fit) / 2 };
    const image = await loadGray(`${key}-share.jpg`);
    const reference = busiestBlock(image);

    for (const region of regionsFor(key) as Region[]) {
      expect(energy(image, scaled(region, fit, offset))).toBeLessThan(reference * MAX_RELATIVE_ENERGY * 2);
    }
  });
});

describe('the blur configuration of the Hub081 conversations', () => {
  it('blurs the names of the five leads, and the photos and phone numbers beside them', () => {
    const base = regionsFor('hub081/conversas', { keepNames: true });
    const withNames = regionsFor('hub081/conversas');

    expect(withNames).toHaveLength(base.length + 5);
    expect(BLUR_SOURCES['hub081/conversas'].nameRegions).toHaveLength(5);
  });
});
