import { describe, expect, it } from 'vitest';
import { REMOVED_PROJECT_SLUGS } from '../data/projects';
import { ROUTE_METAS, type RouteMeta } from './routeMeta';
import { renderSitemap } from './sitemap';

const LOCATIONS = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);

const BASE: RouteMeta = {
  path: '/servicos',
  kind: 'page',
  title: 'Serviços | VN One',
  description: 'd',
  isIndexable: true,
  lastmod: '2026-11-01',
  crumbs: [],
};

describe('renderSitemap with a path that ends with a slash', () => {
  it('refuses it, so the canonical and the sitemap never carry a url that nginx redirects', () => {
    expect(() => renderSitemap([{ ...BASE, path: '/sobre/' }])).toThrow(/ends with a slash/);
  });

  it('accepts the home, which is the only path that ends with a slash', () => {
    expect(() => renderSitemap([{ ...BASE, path: '/' }])).not.toThrow();
  });
});

describe('renderSitemap', () => {
  const xml = renderSitemap(ROUTE_METAS);

  it('is a urlset in the sitemap namespace with the xml declaration', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('lists only the routes that are in the index, and leaves the blog out', () => {
    const expected = ROUTE_METAS.filter((meta) => meta.isIndexable).length;

    expect(LOCATIONS(xml)).toHaveLength(expected);
    expect(LOCATIONS(xml)).not.toContain('https://vnone.com.br/blog');
    expect(xml).not.toContain('/blog');
  });

  it('lists no route that is out of the index and no removed project, whatever the data holds', () => {
    const locations = LOCATIONS(xml);

    for (const meta of ROUTE_METAS.filter((entry) => !entry.isIndexable)) expect(locations, meta.path).not.toContain(`https://vnone.com.br${meta.path}`);
    for (const slug of REMOVED_PROJECT_SLUGS) expect(xml, slug).not.toContain(slug);
    expect(ROUTE_METAS.some((meta) => !meta.isIndexable)).toBe(true);
  });

  it('writes an absolute url per route, with no trailing slash except the home', () => {
    const locations = LOCATIONS(xml);

    expect(locations).toContain('https://vnone.com.br/');
    expect(locations).toContain('https://vnone.com.br/servicos');
    for (const location of locations) {
      expect(location).toMatch(/^https:\/\/vnone\.com\.br(\/|\/[^/].*[^/])$/);
    }
  });

  it('dates each url with the lastmod of its route', () => {
    for (const meta of ROUTE_METAS.filter((entry) => entry.isIndexable)) {
      const entry = xml.split('<url>').find((chunk) => chunk.includes(`<loc>https://vnone.com.br${meta.path}</loc>`));
      expect(entry, meta.path).toContain(`<lastmod>${meta.lastmod}</lastmod>`);
    }
  });

  it('has no changefreq and no priority, which Google ignores', () => {
    expect(xml).not.toMatch(/changefreq|priority/);
  });

  it('lists the legal pages and every project, each once', () => {
    const locations = LOCATIONS(xml);

    expect(locations).toContain('https://vnone.com.br/privacidade');
    expect(locations).toContain('https://vnone.com.br/lgpd');
    expect(locations.filter((location) => location.startsWith('https://vnone.com.br/projetos/')).length).toBeGreaterThan(0);
    expect(new Set(locations).size).toBe(locations.length);
  });

  it('writes the url escaped, so a path with an ampersand stays valid xml', () => {
    const out = renderSitemap([{ ...BASE, path: '/a&b' }]);
    expect(out).toContain('<loc>https://vnone.com.br/a&amp;b</loc>');
  });

  it('is a valid empty urlset when nothing is indexable', () => {
    const out = renderSitemap([{ ...BASE, isIndexable: false }]);
    expect(LOCATIONS(out)).toEqual([]);
    expect(out).toContain('</urlset>');
  });

  it('refuses a route listed twice, which would be a mistake in the data', () => {
    expect(() => renderSitemap([BASE, BASE])).toThrow(/twice/);
  });

  it('refuses a date that is not YYYY-MM-DD', () => {
    expect(() => renderSitemap([{ ...BASE, lastmod: '01/11/2026' }])).toThrow(/lastmod/);
  });
});
