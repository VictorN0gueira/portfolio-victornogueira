// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { projectImageManifest } from './projectImages';
import { getProjectBySlug, projects } from './projects';

const EXPECTED_ORDER = [
  'dizpara',
  'hub081',
  'diagnostico-empresarial',
  'dashboard-consumo-crm',
  'portal-link-in-bio',
  'ai-playlist-maker',
  'travel-ia',
];
const REMOVED_SLUGS = ['troco', 'importacao-massiva-nfe'];
const FULL_IMAGE_COUNT = 3;
const REMOTE_OR_ACCESS = /https?:\/\/|www\.|dizpara\.com|vupt\.site|minio/i;
const DASHES = /[\u2013\u2014]/;

describe('projects data', () => {
  it('lists the seven projects of the owner, DizPara and Hub081 first', () => {
    expect(projects.map((project) => project.slug)).toEqual(EXPECTED_ORDER);
  });

  it('marks exactly DizPara and Hub081 as featured, and they are the first two', () => {
    expect(projects.filter((project) => project.featured).map((project) => project.slug)).toEqual(['dizpara', 'hub081']);
    expect(projects.slice(0, 2).every((project) => project.featured)).toBe(true);
  });

  it('keeps every slug unique and removes the projects the owner did not list', () => {
    expect(new Set(projects.map((project) => project.slug)).size).toBe(projects.length);
    for (const slug of REMOVED_SLUGS) expect(getProjectBySlug(slug)).toBeUndefined();
  });

  it('has no access link, no personal or client type and no remote host anywhere in a project', () => {
    for (const project of projects) {
      expect(Object.keys(project)).not.toContain('link');
      expect(Object.keys(project)).not.toContain('type');
      // shareUrl is the one absolute address: the site's own JPEG for link previews.
      const withoutShare = JSON.stringify(project, (key, value: unknown) => (key === 'shareUrl' ? undefined : value));
      expect(withoutShare).not.toMatch(REMOTE_OR_ACCESS);
    }
  });

  it('gives each project exactly three images, the cover first', () => {
    for (const project of projects) expect(project.shots, project.slug).toHaveLength(FULL_IMAGE_COUNT);
  });

  it('gives the two featured projects a share image, made for link previews', () => {
    for (const project of projects.filter((item) => item.featured)) {
      expect(project.shareImage?.shareUrl, project.slug).toMatch(/^https:\/\/vnone\.com\.br\/projects\/.+\/cover-share\.jpg$/);
    }
  });

  it('never gives a project more than three images, and never repeats one inside a project', () => {
    for (const project of projects) {
      const sources = project.shots.map((shot) => shot.image.src);
      expect(sources.length).toBeLessThanOrEqual(FULL_IMAGE_COUNT);
      expect(new Set(sources).size).toBe(sources.length);
    }
  });

  it('points every image at a file of the generated manifest', () => {
    const keys = new Set(Object.keys(projectImageManifest).map((key) => `/projects/${key}-1600.webp`));
    for (const project of projects) {
      for (const shot of project.shots) expect(keys.has(shot.image.src), `${project.slug}: ${shot.image.src}`).toBe(true);
    }
  });

  it('describes every image with a Portuguese alt text and no dash', () => {
    for (const project of projects) {
      for (const shot of project.shots) {
        expect(shot.alt.length).toBeGreaterThan(20);
        expect(shot.alt).not.toMatch(DASHES);
        expect(shot.alt).toMatch(/[a-z]{3,}/i);
      }
    }
  });

  it('gives only the two featured projects a highlighted line and a list of what they do', () => {
    for (const project of projects) {
      if (project.featured) {
        expect(project.highlight?.length).toBeGreaterThan(10);
        expect(project.features?.length).toBeGreaterThanOrEqual(3);
      } else {
        expect(project.highlight).toBeUndefined();
        expect(project.features).toBeUndefined();
      }
    }
  });

  it('states no result or number for Hub081', () => {
    const hub = getProjectBySlug('hub081');

    expect(hub?.impact).toBeUndefined();
    const copy = [hub?.description, hub?.highlight, ...(hub?.features ?? []), ...(hub?.tags ?? [])].join(' ');
    expect(copy).not.toMatch(/\d/);
  });

  it('keeps the Proplast case on its existing slug', () => {
    expect(getProjectBySlug('dashboard-consumo-crm')?.title).toBe('Dashboard de Consumo CRM');
  });
});
