// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projects, REMOVED_PROJECT_SLUGS } from './projects';

const SITEMAP = readFileSync(resolve(__dirname, '../../public/sitemap.xml'), 'utf8');
const LOCATIONS = [...SITEMAP.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

describe('public/sitemap.xml', () => {
  it('lists the projects page and the case page of every project', () => {
    expect(LOCATIONS).toContain('https://vnone.com.br/projetos');
    for (const project of projects) expect(LOCATIONS, project.slug).toContain(`https://vnone.com.br/projetos/${project.slug}`);
  });

  it('lists no removed project, and no project twice', () => {
    for (const slug of REMOVED_PROJECT_SLUGS) expect(LOCATIONS).not.toContain(`https://vnone.com.br/projetos/${slug}`);
    expect(new Set(LOCATIONS).size).toBe(LOCATIONS.length);
  });

  it('dates the project pages from the day their copy and images last changed', () => {
    const entries = SITEMAP.split('<url>').slice(1);
    const projectEntries = entries.filter((entry) => /<loc>https:\/\/vnone\.com\.br\/projetos(\/|<)/.test(entry));

    expect(projectEntries).toHaveLength(projects.length + 1);
    for (const entry of projectEntries) expect(entry).toMatch(/<lastmod>2026-10-29<\/lastmod>/);
  });
});
