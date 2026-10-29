// @vitest-environment node
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BLUR_SOURCES } from '../../scripts/project-blur-regions.mjs';
import { projectImage } from '../lib/projectImage';
import { projectImageManifest } from './projectImages';

const ROOT = resolve(__dirname, '../..');
const PUBLIC_DIR = join(ROOT, 'public');
const PROJECTS_DIR = join(PUBLIC_DIR, 'projects');
const MAX_FILE_BYTES = 250 * 1024;
const SHARE_SIZE = { width: 1200, height: 630 };

const FEATURED_KEYS = [
  'hub081/login',
  'hub081/conversas',
  'hub081/dashboards',
  'hub081/cover',
  'dizpara/captura-de-leads',
  'dizpara/lista-de-leads',
  'dizpara/nova-campanha',
  'dizpara/cover',
] as const;

/** The names of the original screenshots the owner supplied. They hold private data and live outside the repo. */
const ORIGINAL_NAMES = ['login', 'conversas', 'dashboards', 'captura-de-leads', 'lista-de-leads', 'nova-campanha'] as const;
const ORIGINAL_EXTENSIONS = ['png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff', 'gif'];

function pathOf(key: string, width: number): string {
  return join(PROJECTS_DIR, `${key}-${width}.webp`);
}

function walk(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const full = join(folder, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return [full];
  });
}

describe('Hub081 and DizPara featured images', () => {
  it('has every size of every featured image on disk', () => {
    const missing = FEATURED_KEYS.flatMap((key) => {
      const entry = projectImageManifest[key];
      if (!entry) return [`${key}: not in the manifest`];
      return entry.widths.filter((width) => !existsSync(pathOf(key, width))).map((width) => `${key}-${width}.webp`);
    });

    expect(missing).toEqual([]);
  });

  it('offers the 800 and 1600 wide files for the six screens', () => {
    const screens = FEATURED_KEYS.filter((key) => !key.endsWith('/cover'));

    expect(screens).toHaveLength(6);
    for (const key of screens) expect(projectImageManifest[key].widths).toEqual([800, 1600]);
  });

  it('has manifest sizes that match the files', async () => {
    for (const key of FEATURED_KEYS) {
      const entry = projectImageManifest[key];
      const widest = Math.max(...entry.widths);
      const meta = await sharp(pathOf(key, widest)).metadata();

      expect([key, meta.width, meta.height]).toEqual([key, entry.width, entry.height]);
    }
  });

  it('keeps each file under 250 KB', () => {
    const oversized = FEATURED_KEYS.flatMap((key) =>
      projectImageManifest[key].widths.map((width) => pathOf(key, width)).filter((file) => statSync(file).size > MAX_FILE_BYTES),
    );

    expect(oversized).toEqual([]);
  });

  it('gives the two covers a 1200 by 630 JPEG for social sharing', async () => {
    for (const slug of ['hub081', 'dizpara']) {
      const meta = await sharp(join(PROJECTS_DIR, slug, 'cover-share.jpg')).metadata();

      expect([slug, meta.format, meta.width, meta.height]).toEqual([slug, 'jpeg', SHARE_SIZE.width, SHARE_SIZE.height]);
      expect(projectImage(`${slug}/cover`).shareUrl).toBe(`https://vnone.com.br/projects/${slug}/cover-share.jpg`);
    }
  });

  it('serves the six screens through projectImage with srcSet and the file size', () => {
    const image = projectImage('hub081/conversas');

    expect(image.src).toBe('/projects/hub081/conversas-1600.webp');
    expect(image.srcSet).toBe('/projects/hub081/conversas-800.webp 800w, /projects/hub081/conversas-1600.webp 1600w');
    expect(image.width).toBe(projectImageManifest['hub081/conversas'].width);
  });
});

describe('no original screenshot is committed', () => {
  it('holds only the blurred WebP outputs and the share JPEG in the two project folders', () => {
    for (const slug of ['hub081', 'dizpara']) {
      const stray = readdirSync(join(PROJECTS_DIR, slug)).filter((name) => !/-(800|1600)\.webp$/.test(name) && name !== 'cover-share.jpg');

      expect([slug, stray]).toEqual([slug, []]);
    }
  });

  it('has no PNG anywhere under public/projects', () => {
    expect(walk(PROJECTS_DIR).filter((file) => /\.png$/i.test(file))).toEqual([]);
  });

  it('sentinel: no file named like an original screenshot exists under public/, scripts/ or src/', () => {
    const names = ORIGINAL_NAMES.flatMap((name) => ORIGINAL_EXTENSIONS.map((extension) => `${name}.${extension}`));
    const found = [PUBLIC_DIR, join(ROOT, 'scripts'), join(ROOT, 'src')]
      .flatMap(walk)
      .filter((file) => names.includes(file.split(/[\\/]/).pop()?.toLowerCase() ?? ''));

    expect(found).toEqual([]);
  });

  it('has a blur entry for every private original, so the build cannot publish one unblurred by mistake', () => {
    const listed = Object.keys(BLUR_SOURCES);

    expect(listed).toEqual(
      expect.arrayContaining(['hub081/conversas.png', 'hub081/dashboards.png', 'dizpara/lista-de-leads.png']),
    );
    for (const key of listed) {
      const [slug, file] = key.split('/');
      expect(projectImageManifest[`${slug}/${file.replace(/\.png$/, '')}`]).toBeDefined();
    }
  });
});
