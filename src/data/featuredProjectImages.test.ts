// @vitest-environment node
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BLUR_SOURCES } from '../../scripts/project-blur-regions.mjs';
import { projectImage } from '../lib/projectImage';
import { projectImageManifest } from './projectImages';

const ROOT = resolve(__dirname, '../..');
const PUBLIC_DIR = join(ROOT, 'public');
const PROJECTS_DIR = join(PUBLIC_DIR, 'projects');
const SHARE_SIZE = { width: 1200, height: 630 };

const SCREEN_KEYS = [
  'hub081/dashboards',
  'hub081/conversas',
  'hub081/login',
  'dizpara/lista-de-leads',
  'dizpara/captura-de-leads',
  'dizpara/nova-campanha',
] as const;
/** The image of each featured project that is also shared on social networks (no copy of it exists under another name). */
const SHARED_KEYS = ['hub081/dashboards', 'dizpara/lista-de-leads'] as const;
const FEATURED_KEYS = SCREEN_KEYS;

/** The names of the original screenshots the owner supplied. They hold private data and live outside the repo. */
const ORIGINAL_NAMES = ['login', 'conversas', 'dashboards', 'captura-de-leads', 'lista-de-leads', 'nova-campanha', 'karlaalvares', 'tela-email'] as const;
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

  it('offers the 800 and 1600 wide files for the six screens (the login crop is only 975 wide, so 800 only)', () => {
    expect(SCREEN_KEYS).toHaveLength(6);
    for (const key of SCREEN_KEYS) {
      expect(projectImageManifest[key].widths).toEqual(key === 'hub081/login' ? [800] : [800, 1600]);
    }
  });

  it('has manifest sizes that match the files', async () => {
    for (const key of FEATURED_KEYS) {
      const entry = projectImageManifest[key];
      const widest = Math.max(...entry.widths);
      const meta = await sharp(pathOf(key, widest)).metadata();

      expect([key, meta.width, meta.height]).toEqual([key, entry.width, entry.height]);
    }
  });

  it('gives the image that is shared a 1200 by 630 JPEG, and no image of a copy under another name', async () => {
    for (const key of SHARED_KEYS) {
      const [slug, name] = key.split('/');
      const meta = await sharp(join(PROJECTS_DIR, slug, `${name}-share.jpg`)).metadata();

      expect([key, meta.format, meta.width, meta.height]).toEqual([key, 'jpeg', SHARE_SIZE.width, SHARE_SIZE.height]);
      expect(projectImage(key).shareUrl).toBe(`https://vnone.com.br/projects/${slug}/${name}-share.jpg`);
    }
    for (const slug of ['hub081', 'dizpara']) expect(existsSync(join(PROJECTS_DIR, slug, 'cover-800.webp'))).toBe(false);
  });
});

describe('no original screenshot is committed', () => {
  it('holds only the blurred WebP outputs and the share JPEG in the two project folders', () => {
    for (const slug of ['hub081', 'dizpara']) {
      const stray = readdirSync(join(PROJECTS_DIR, slug)).filter((name) => !/-(800|1600)\.webp$/.test(name) && !/-share\.jpg$/.test(name));

      expect([slug, stray]).toEqual([slug, []]);
    }
  });

  it('has no PNG anywhere under public/projects', () => {
    expect(walk(PROJECTS_DIR).filter((file) => /\.png$/i.test(file))).toEqual([]);
  });

  it('sentinel: no file named like an original screenshot exists under public/, scripts/, src/, docs/, e2e/ or .superpowers/', () => {
    const names = ORIGINAL_NAMES.flatMap((name) => ORIGINAL_EXTENSIONS.map((extension) => `${name}.${extension}`));
    const found = [PUBLIC_DIR, ...['scripts', 'src', 'docs', 'e2e', '.superpowers'].map((folder) => join(ROOT, folder))]
      .flatMap(walk)
      .filter((file) => names.includes(file.split(/[\\/]/).pop()?.toLowerCase() ?? ''));

    expect(found).toEqual([]);
  });

  it('has a blur entry for every private original, so the build cannot publish one unblurred by mistake', () => {
    const listed = Object.keys(BLUR_SOURCES);

    expect(listed).toEqual(
      expect.arrayContaining(['hub081/conversas', 'hub081/dashboards', 'dizpara/lista-de-leads', 'diagnostico-empresarial/dashboard']),
    );
    for (const key of listed) expect(projectImageManifest[key], key).toBeDefined();
  });
});
