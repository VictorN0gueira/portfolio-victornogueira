// @vitest-environment node
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { regionBounds } from '../../scripts/blur-regions.mjs';
import { BLUR_SOURCES } from '../../scripts/project-blur-regions.mjs';

// The committed outputs, not the originals: text and faces left in them would show up as edge energy.
const PROJECTS_DIR = resolve(__dirname, '../../public/projects');
const SOURCE_WIDTH = { 'hub081/conversas': 1919, 'hub081/dashboards': 1918, 'dizpara/lista-de-leads': 1920 } as const;
const MAX_RELATIVE_ENERGY = 0.12;
const ROW_COUNT = 5;
const FIRST_NAME_ROW_Y = 244;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

async function loadGray(key: string) {
  const { data, info } = await sharp(join(PROJECTS_DIR, `${key}-1600.webp`)).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const INSCRIBED_SQUARE = 0.6;

/**
 * The part of a region to measure, in output pixels. For a circle it is the inscribed square: the soft
 * outer rim of a blurred photo is a smooth fade against the page, not detail, and must not count.
 */
function scaled(region: Parameters<typeof regionBounds>[0], scale: number): Box {
  if (region.shape === 'circle') {
    const half = region.r * INSCRIBED_SQUARE * scale;
    return { x: Math.round(region.cx * scale - half), y: Math.round(region.cy * scale - half), w: Math.round(half * 2), h: Math.round(half * 2) };
  }
  const bounds = regionBounds(region);
  return { x: Math.round(bounds.left * scale), y: Math.round(bounds.top * scale), w: Math.round(bounds.width * scale), h: Math.round(bounds.height * scale) };
}

/** Mean absolute horizontal plus vertical gradient per pixel inside a box. */
function energy(image: { data: Uint8Array; width: number }, box: Box): number {
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

describe('the committed Hub081 conversas image', () => {
  const key = 'hub081/conversas';
  const scale = 1600 / SOURCE_WIDTH[key];
  const regions = BLUR_SOURCES['hub081/conversas.png'].regions;
  const photos = regions.filter((region) => region.shape === 'circle').slice(0, ROW_COUNT);
  const phones = regions.filter((region) => region.shape === 'rect').slice(0, ROW_COUNT);
  // Contact names stay readable by default: they are the reference for "text that is still sharp".
  const names = BLUR_SOURCES['hub081/conversas.png'].nameRegions;

  it('has little edge energy where contact photos and phone numbers were, compared with the names beside them', async () => {
    const image = await loadGray(key);
    const readable = names.map((name) => energy(image, scaled(name, scale)));
    const reference = Math.min(...readable);

    expect(reference).toBeGreaterThan(10);
    for (const region of [...photos, ...phones]) {
      expect(energy(image, scaled(region, scale))).toBeLessThan(reference * MAX_RELATIVE_ENERGY);
    }
  });

  it('keeps the contact names sharp', async () => {
    const image = await loadGray(key);

    for (const name of names) expect(energy(image, scaled(name, scale))).toBeGreaterThan(10);
  });

  it('has five names, one per visible conversation, starting at the first row', () => {
    expect(names).toHaveLength(ROW_COUNT);
    expect(regionBounds(names[0]).top).toBe(FIRST_NAME_ROW_Y);
  });

  it('blurs the owner block at the bottom left and the owner photo at the top right', async () => {
    const image = await loadGray(key);
    const owner = regions.slice(ROW_COUNT * 2);
    const reference = Math.min(...names.map((name) => energy(image, scaled(name, scale))));

    expect(owner).toHaveLength(4);
    for (const region of owner) {
      expect(energy(image, scaled(region, scale))).toBeLessThan(reference * MAX_RELATIVE_ENERGY);
    }
  });
});

describe('the committed Hub081 dashboards image', () => {
  it('blurs the owner block and the owner photo', async () => {
    const image = await loadGray('hub081/dashboards');
    const scale = 1600 / SOURCE_WIDTH['hub081/dashboards'];
    // The page heading is large sharp text of the same screen.
    const heading = energy(image, { x: Math.round(240 * scale), y: Math.round(88 * scale), w: Math.round(130 * scale), h: Math.round(24 * scale) });

    expect(heading).toBeGreaterThan(10);
    for (const region of BLUR_SOURCES['hub081/dashboards.png'].regions) {
      expect(energy(image, scaled(region, scale))).toBeLessThan(heading * MAX_RELATIVE_ENERGY);
    }
  });
});

describe('the committed DizPara leads list', () => {
  it('blurs the business phone numbers and the owner photo', async () => {
    const image = await loadGray('dizpara/lista-de-leads');
    const scale = 1600 / SOURCE_WIDTH['dizpara/lista-de-leads'];
    const title = energy(image, { x: Math.round(325 * scale), y: Math.round(200 * scale), w: Math.round(72 * scale), h: Math.round(26 * scale) });

    expect(title).toBeGreaterThan(10);
    for (const region of BLUR_SOURCES['dizpara/lista-de-leads.png'].regions) {
      expect(energy(image, scaled(region, scale))).toBeLessThan(title * MAX_RELATIVE_ENERGY);
    }
  });
});
