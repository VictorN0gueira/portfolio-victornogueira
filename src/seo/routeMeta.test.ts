// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { coverOf, projects, REMOVED_PROJECT_SLUGS } from '../data/projects';
import { SITE } from '../lib/site';
import { ROUTE_METAS, routeMetaFor, type RouteMeta } from './routeMeta';

const ROOT = resolve(__dirname, '../..');
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const BANNED_TEXT = new RegExp(`${EM_DASH}|${EN_DASH}| / |&|chatbot`, 'i');
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BRAND_SUFFIX = ` | ${SITE.name}`;
const BRAND_PREFIX = `${SITE.name} | `;

const TITLE_MIN = 50;
const TITLE_MAX = 60;
const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 160;
const LEGAL_DESCRIPTION_MIN = 100;

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

/** The paths of the <Route> elements of App.tsx, with a `path={CONSTANT}` resolved through the const declared in the file. */
function routerPaths(): string[] {
  const source = read('src/App.tsx');
  const literals = [...source.matchAll(/<Route[^>]*\spath="([^"]+)"/g)].map((match) => match[1]);
  const named = [...source.matchAll(/<Route[^>]*\spath=\{(\w+)\}/g)].map((match) => {
    const declaration = source.match(new RegExp(`const ${match[1]} = '([^']+)'`));
    if (!declaration) throw new Error(`App.tsx has a route with path={${match[1]}} but no const of that name`);
    return declaration[1];
  });
  return [...literals, ...named];
}

function metaOf(path: string): RouteMeta {
  const meta = routeMetaFor(path);
  if (!meta) throw new Error(`no route meta for ${path}`);
  return meta;
}

describe('ROUTE_METAS', () => {
  it('covers every path the router serves', () => {
    const paths = routerPaths();
    const fixedPaths = paths.filter((path) => path !== '*' && !path.includes(':'));

    expect(fixedPaths.length).toBeGreaterThan(5);
    for (const path of fixedPaths) expect(routeMetaFor(path), path).toBeDefined();
    expect(paths.some((path) => path === '/projetos/:slug')).toBe(true);
    for (const project of projects) expect(routeMetaFor(`/projetos/${project.slug}`), project.slug).toBeDefined();
  });

  it('has no route the router does not serve', () => {
    const served = new Set(routerPaths());
    const projectPaths = new Set(projects.map((project) => `/projetos/${project.slug}`));

    for (const meta of ROUTE_METAS) {
      expect(served.has(meta.path) || projectPaths.has(meta.path), meta.path).toBe(true);
    }
  });

  it('has a unique path, a unique title and a unique description per route', () => {
    for (const key of ['path', 'title', 'description'] as const) {
      const values = ROUTE_METAS.map((meta) => meta[key]);
      expect(new Set(values).size, key).toBe(values.length);
    }
  });

  it('keeps titles and descriptions inside the snippet ranges', () => {
    for (const meta of ROUTE_METAS) {
      if (meta.kind === 'legal') {
        expect(meta.title.length, meta.path).toBeLessThanOrEqual(TITLE_MAX);
        expect(meta.description.length, meta.path).toBeGreaterThanOrEqual(LEGAL_DESCRIPTION_MIN);
      } else {
        expect(meta.title.length, `${meta.path} title`).toBeGreaterThanOrEqual(TITLE_MIN);
        expect(meta.title.length, `${meta.path} title`).toBeLessThanOrEqual(TITLE_MAX);
        expect(meta.description.length, `${meta.path} description`).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      }
      expect(meta.description.length, `${meta.path} description`).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it('follows the brand pattern: "<Topic> | VN One" inside, "VN One | <proposal>" on the home', () => {
    for (const meta of ROUTE_METAS) {
      if (meta.kind === 'home') expect(meta.title.startsWith(BRAND_PREFIX), meta.path).toBe(true);
      else expect(meta.title.endsWith(BRAND_SUFFIX), meta.path).toBe(true);
    }
  });

  it('obeys the copy rules in titles, descriptions, image alts and crumbs', () => {
    for (const meta of ROUTE_METAS) {
      const texts = [meta.title, meta.description, meta.image?.alt ?? '', ...meta.crumbs.map((crumb) => crumb.name)];
      for (const text of texts) expect(text, `${meta.path}: ${text}`).not.toMatch(BANNED_TEXT);
    }
  });

  it('takes the home title and description from SITE, one source only', () => {
    const home = metaOf('/');

    expect(home.kind).toBe('home');
    expect(home.title).toBe(SITE.title);
    expect(home.description).toBe(SITE.description);
    expect(home.crumbs).toEqual([]);
  });

  it('matches the frozen legal pages: their <SEO> title and description are the registry ones', () => {
    for (const [file, path] of [
      ['src/pages/PrivacyPage.tsx', '/privacidade'],
      ['src/pages/LgpdPage.tsx', '/lgpd'],
    ] as const) {
      const seo = read(file).match(/<SEO\s[^>]*?title="([^"]*)"[^>]*?description="([^"]*)"/s);
      expect(seo, file).not.toBeNull();
      const meta = metaOf(path);

      expect(meta.kind).toBe('legal');
      expect(meta.title).toBe(`${seo?.[1]}${BRAND_SUFFIX}`);
      expect(meta.description).toBe(seo?.[2]);
    }
  });

  it('dates every route in ISO form and never in the future', () => {
    const today = new Date().toISOString().slice(0, 10);

    for (const meta of ROUTE_METAS) {
      expect(meta.lastmod, meta.path).toMatch(ISO_DATE);
      expect(meta.lastmod <= today, `${meta.path} ${meta.lastmod}`).toBe(true);
    }
  });

  it('leaves the removed projects and the 404 out', () => {
    for (const slug of REMOVED_PROJECT_SLUGS) expect(routeMetaFor(`/projetos/${slug}`), slug).toBeUndefined();
    expect(routeMetaFor('/rota-que-nao-existe')).toBeUndefined();
    expect(routeMetaFor('/projetos/xyz')).toBeUndefined();
    expect(ROUTE_METAS.some((meta) => meta.path.includes('*') || meta.path.includes(':'))).toBe(false);
  });

  it('writes paths without a trailing slash, except the home', () => {
    for (const meta of ROUTE_METAS) {
      if (meta.path !== '/') expect(meta.path.endsWith('/'), meta.path).toBe(false);
      expect(meta.path.startsWith('/'), meta.path).toBe(true);
    }
  });

  it('keeps the blog out of the index and everything else in', () => {
    expect(metaOf('/blog').isIndexable).toBe(false);
    for (const meta of ROUTE_METAS.filter((entry) => entry.path !== '/blog')) expect(meta.isIndexable, meta.path).toBe(true);
  });

  it('gives each inner route the crumbs Home and itself, and a project three levels', () => {
    for (const meta of ROUTE_METAS.filter((entry) => entry.kind !== 'home')) {
      const last = meta.crumbs[meta.crumbs.length - 1];
      expect(meta.crumbs[0], meta.path).toEqual({ name: 'Início', path: '/' });
      expect(last.path, meta.path).toBe(meta.path);
      expect(meta.crumbs.length, meta.path).toBe(meta.kind === 'project' ? 3 : 2);
    }
    for (const project of projects) expect(metaOf(`/projetos/${project.slug}`).crumbs[2].name).toBe(project.title);
  });

  it('agrees with the project data: one project route per project, the same name, cover and alt', () => {
    const projectMetas = ROUTE_METAS.filter((meta) => meta.kind === 'project');

    expect(projectMetas.map((meta) => meta.path).sort()).toEqual(projects.map((project) => `/projetos/${project.slug}`).sort());
    for (const project of projects) {
      const meta = metaOf(`/projetos/${project.slug}`);

      expect(meta.crumbs[2].name, project.slug).toBe(project.title);
      expect(meta.image?.url, project.slug).toBe(coverOf(project).shareUrl);
      expect(meta.image?.alt, project.slug).toBe(project.shots[0].alt);
      expect([meta.image?.width, meta.image?.height]).toEqual([1200, 630]);
    }
  });

  it('marks a FAQ only where it is visible: the home and the contact page', () => {
    const withFaq = ROUTE_METAS.filter((meta) => meta.hasFaq).map((meta) => meta.path);

    expect(withFaq.sort()).toEqual(['/', '/contato']);
  });
});

describe('routeMetaFor', () => {
  it('accepts a trailing slash and ignores the query string and the hash', () => {
    expect(routeMetaFor('/servicos/')?.path).toBe('/servicos');
    expect(routeMetaFor('/servicos?utm=x')?.path).toBe('/servicos');
    expect(routeMetaFor('/servicos#automacao')?.path).toBe('/servicos');
    expect(routeMetaFor('/projetos/dizpara/?a=1#b')?.path).toBe('/projetos/dizpara');
    expect(routeMetaFor('/')?.path).toBe('/');
    expect(routeMetaFor('')?.path).toBeUndefined();
  });
});
