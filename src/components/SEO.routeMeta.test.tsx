import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { projects } from '../data/projects';
import { services } from '../data/services';
import { routeMetaFor } from '../seo/routeMeta';
import { SEO } from './SEO';

function readMeta(attr: 'name' | 'property', key: string): string | null {
  return document.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? null;
}

function readJsonLd(): Array<Record<string, unknown>> {
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node) =>
    JSON.parse(node.textContent ?? '{}'),
  );
}

function metaOf(path: string) {
  const meta = routeMetaFor(path);
  if (!meta) throw new Error(`no route meta for ${path}`);
  return meta;
}

describe('SEO fed by the route metadata', () => {
  it('fills the title and the description of a route from its metadata when the page passes none', () => {
    render(<SEO path="/servicos" />);

    expect(document.title).toBe(metaOf('/servicos').title);
    expect(readMeta('name', 'description')).toBe(metaOf('/servicos').description);
    expect(readMeta('property', 'og:title')).toBe(metaOf('/servicos').title);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://vnone.com.br/servicos');
  });

  it('uses the home title and description on the home', () => {
    render(<SEO />);

    expect(document.title).toBe(metaOf('/').title);
    expect(readMeta('name', 'description')).toBe(metaOf('/').description);
  });

  it('lets an explicit title win and still suffixes it with the brand', () => {
    render(<SEO path="/servicos" title="X" />);

    expect(document.title).toBe('X | VN One');
    expect(readMeta('name', 'description')).toBe(metaOf('/servicos').description);
  });

  it('lets an explicit description win', () => {
    render(<SEO path="/servicos" description="Texto da página" />);

    expect(readMeta('name', 'description')).toBe('Texto da página');
  });

  it('puts the blog out of the index by its metadata: noindex, no canonical, no og:url, no JSON-LD', () => {
    render(<SEO path="/blog" />);

    expect(readMeta('name', 'robots')).toBe('noindex, nofollow');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(readMeta('property', 'og:url')).toBeNull();
    expect(readMeta('name', 'twitter:url')).toBeNull();
    expect(readJsonLd()).toEqual([]);
  });

  it('keeps the blog out of the index even when the page passes its own title and description', () => {
    render(<SEO title="Blog" description="Artigos." path="/blog" />);

    expect(readMeta('name', 'robots')).toBe('noindex, nofollow');
    expect(document.title).toBe('Blog | VN One');
  });

  it('lets an explicit noindex={false} keep an indexable route indexable', () => {
    render(<SEO path="/servicos" noindex={false} />);

    expect(readMeta('name', 'robots')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).not.toBeNull();
  });

  it('shares the cover of a project, with its size and alt, from the metadata', () => {
    const project = projects[0];
    const meta = metaOf(`/projetos/${project.slug}`);

    render(<SEO path={`/projetos/${project.slug}`} />);

    expect(readMeta('property', 'og:image')).toBe(meta.image?.url);
    expect(readMeta('name', 'twitter:image')).toBe(meta.image?.url);
    expect(readMeta('property', 'og:image:width')).toBe('1200');
    expect(readMeta('property', 'og:image:height')).toBe('630');
    expect(readMeta('property', 'og:image:alt')).toBe(meta.image?.alt);
  });

  it('writes a breadcrumb and one Service per service on /servicos, and no entity of the home', () => {
    render(<SEO path="/servicos" />);

    const nodes = readJsonLd();
    const types = nodes.map((node) => node['@type']);

    expect(types.filter((type) => type === 'BreadcrumbList')).toHaveLength(1);
    expect(types.filter((type) => type === 'Service')).toHaveLength(services.length);
    expect(types).not.toContain('Organization');
    expect(types).not.toContain('WebSite');
  });

  it('writes the FAQ of the contact page and a breadcrumb', () => {
    render(<SEO path="/contato" />);

    expect(readJsonLd().map((node) => node['@type']).sort()).toEqual(['BreadcrumbList', 'FAQPage']);
  });

  it('adds nothing of the metadata to an unknown path with a noindex, as the 404 does', () => {
    render(<SEO title="Página não encontrada" noindex />);

    expect(document.title).toBe('Página não encontrada | VN One');
    expect(readMeta('name', 'robots')).toBe('noindex, nofollow');
    expect(readJsonLd()).toEqual([]);
  });
});
