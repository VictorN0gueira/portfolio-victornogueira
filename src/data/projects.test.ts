// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { projectImageManifest } from './projectImages';
import { coverOf, getProjectBySlug, projects, REMOVED_PROJECT_SLUGS } from './projects';

const EXPECTED_ORDER = [
  'dizpara',
  'hub081',
  'diagnostico-empresarial',
  'dashboard-consumo-crm',
  'portal-link-in-bio',
  'ai-playlist-maker',
  'travel-ia',
];
const SHOT_COUNT = 3;
const MAX_ALT_LENGTH = 125;
const REMOTE_OR_ACCESS = /https?:\/\/|www\.|dizpara\.com|vupt\.site|minio/i;
const DASHES = /[\u2013\u2014]/;
const REMOVED_FIELDS = ['link', 'type', 'impact', 'image', 'gallery', 'shareImage', 'id'];

describe('projects data', () => {
  it('lists the seven projects of the owner, DizPara and Hub081 first', () => {
    expect(projects.map((project) => project.slug)).toEqual(EXPECTED_ORDER);
  });

  it('marks exactly DizPara and Hub081 as featured, and they are the first two', () => {
    expect(projects.filter((project) => project.featured).map((project) => project.slug)).toEqual(['dizpara', 'hub081']);
    expect(projects.slice(0, 2).every((project) => project.featured)).toBe(true);
  });

  it('keeps every slug unique, and keeps the removed projects out of the list', () => {
    expect(new Set(projects.map((project) => project.slug)).size).toBe(projects.length);
    expect([...REMOVED_PROJECT_SLUGS]).toEqual(['troco', 'importacao-massiva-nfe']);
    for (const slug of REMOVED_PROJECT_SLUGS) expect(getProjectBySlug(slug)).toBeUndefined();
  });

  it('has no access link, no type, no result and no remote host anywhere in a project', () => {
    for (const project of projects) {
      for (const field of REMOVED_FIELDS) expect(Object.keys(project), `${project.slug}.${field}`).not.toContain(field);
      // shareUrl is the one absolute address: the site's own JPEG for link previews.
      const withoutShare = JSON.stringify(project, (key, value: unknown) => (key === 'shareUrl' ? undefined : value));
      expect(withoutShare).not.toMatch(REMOTE_OR_ACCESS);
    }
  });

  it('gives each project exactly three images, the cover first, none repeated', () => {
    for (const project of projects) {
      expect(project.shots, project.slug).toHaveLength(SHOT_COUNT);
      const sources = project.shots.map((shot) => shot.image.src);
      expect(new Set(sources).size).toBe(sources.length);
    }
  });

  it('points every image at a file of the generated manifest', () => {
    const keys = new Set(Object.entries(projectImageManifest).map(([key, entry]) => `/projects/${key}-${Math.max(...entry.widths)}.webp`));
    for (const project of projects) {
      for (const shot of project.shots) expect(keys.has(shot.image.src), `${project.slug}: ${shot.image.src}`).toBe(true);
    }
  });

  it('shares the cover of every project: its first shot has the 1200 by 630 JPEG made for link previews', () => {
    for (const project of projects) {
      expect(coverOf(project).shareUrl, project.slug).toMatch(/^https:\/\/vnone\.com\.br\/projects\/.+-share\.jpg$/);
      expect(project.shots.slice(1).every((shot) => shot.image.shareUrl === undefined)).toBe(true);
    }
  });

  it('describes every image with a short Portuguese alt text and no dash', () => {
    for (const project of projects) {
      for (const shot of project.shots) {
        expect(shot.alt.length).toBeGreaterThan(20);
        expect(shot.alt.length, shot.alt).toBeLessThanOrEqual(MAX_ALT_LENGTH);
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

  it('keeps the Proplast case on its existing slug', () => {
    expect(getProjectBySlug('dashboard-consumo-crm')?.title).toBe('Dashboard de Consumo CRM');
  });

  it('gives every project a category that starts with a capital letter and at least three tags', () => {
    for (const project of projects) {
      expect(project.category, project.slug).toMatch(/^\p{Lu}/u);
      expect(project.tags.length).toBeGreaterThanOrEqual(3);
    }
  });
});
