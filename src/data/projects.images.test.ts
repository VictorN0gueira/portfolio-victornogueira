// @vitest-environment node
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ProjectImage } from '../lib/projectImage';
import { projectImageManifest } from './projectImages';
import { coverOf, projects } from './projects';

const PUBLIC_DIR = resolve(__dirname, '../../public');
const MAX_FILE_BYTES = 200 * 1024;
const REMOTE_HOST = /https?:\/\//;

const allImages = projects.flatMap((project) =>
  [...project.shots.map((shot) => shot.image), ...(project.shareImage ? [project.shareImage] : [])].map((image) => ({
    slug: project.slug,
    image,
  })),
);

/** The file paths a ProjectImage points at, under public/. */
function filesOf(image: ProjectImage): string[] {
  const urls = [image.src, image.thumbSrc, ...image.srcSet.split(',').map((candidate) => candidate.trim().split(' ')[0])];
  if (image.shareUrl) urls.push(new URL(image.shareUrl).pathname);
  return urls;
}

describe('project images', () => {
  it('covers every project with at least a cover and one more image', () => {
    expect(projects.length).toBeGreaterThan(0);
    for (const project of projects) expect(project.shots.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps every image on this site: no remote host in any src, srcSet or thumbnail', () => {
    const urls = allImages.flatMap(({ image }) => [image.src, image.thumbSrc, image.srcSet]);

    for (const url of urls) expect(url).not.toMatch(REMOTE_HOST);
    for (const url of urls) expect(url).not.toMatch(/minio/i);
  });

  it('serves every image from the projects folder with an absolute path', () => {
    for (const { image } of allImages) {
      expect(image.src.startsWith('/projects/')).toBe(true);
      expect(image.thumbSrc.startsWith('/projects/')).toBe(true);
    }
  });

  it('has every referenced file on disk under public/', () => {
    const missing = allImages.flatMap(({ slug, image }) =>
      filesOf(image)
        .filter((path) => !existsSync(resolve(PUBLIC_DIR, `.${path}`)))
        .map((path) => `${slug}: ${path}`),
    );

    expect(missing).toEqual([]);
  });

  it('gives every image a width, a height and a srcSet with w descriptors', () => {
    for (const { image } of allImages) {
      expect(Number.isInteger(image.width) && image.width > 0).toBe(true);
      expect(Number.isInteger(image.height) && image.height > 0).toBe(true);
      expect(image.srcSet).toMatch(/^(\S+ \d+w)(, \S+ \d+w)*$/);
    }
  });

  it('keeps a share image, as an absolute https URL, on every cover that has one', () => {
    const covers = projects.map((project) => ({ slug: project.slug, cover: coverOf(project) }));

    for (const { cover } of covers) {
      if (cover.shareUrl) expect(cover.shareUrl).toMatch(/^https:\/\/vnone\.com\.br\/projects\/.+-share\.jpg$/);
    }
  });

  it('keeps each file small: nothing above 200 KB', () => {
    const oversized = allImages.flatMap(({ slug, image }) =>
      filesOf(image)
        .filter((path) => existsSync(resolve(PUBLIC_DIR, `.${path}`)))
        .filter((path) => statSync(resolve(PUBLIC_DIR, `.${path}`)).size > MAX_FILE_BYTES)
        .map((path) => `${slug}: ${path}`),
    );

    expect(oversized).toEqual([]);
  });

  it('has no manifest entry that no project uses', () => {
    const used = new Set(allImages.map(({ image }) => image.src));
    const unused = Object.keys(projectImageManifest).filter((key) => !used.has(`/projects/${key}-${Math.max(...projectImageManifest[key].widths)}.webp`));

    expect(unused).toEqual([]);
  });
});
