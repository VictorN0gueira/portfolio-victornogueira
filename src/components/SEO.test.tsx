import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, expect, it } from 'vitest';
import SEO from './SEO';

const DASH_PATTERN = /[\u2014\u2013]/;

// react-helmet-async v3 on React 19 renders plain elements that React hoists
// into document.head. HelmetProvider `context.helmet` is NOT populated on
// React 19, so the rendered head is read from the document instead.
function renderSeo(props: Parameters<typeof SEO>[0] = {}) {
  return render(
    <HelmetProvider>
      <SEO {...props} />
    </HelmetProvider>,
  );
}

function readJsonLd(): Array<Record<string, unknown>> {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  return Array.from(scripts).map((node) => JSON.parse(node.textContent ?? '{}'));
}

function readMeta(attr: 'name' | 'property', key: string): string | null {
  return document.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? null;
}

describe('SEO', () => {
  it('uses the VN One default title on the home route', () => {
    renderSeo();

    expect(document.title).toContain('VN One | Automação e IA para empresas');
  });

  it('suffixes a page title with VN One', () => {
    renderSeo({ title: 'Serviços', path: '/servicos' });

    expect(document.title).toBe('Serviços | VN One');
  });

  it('publishes Organization with its founder as JSON-LD on the home route', () => {
    renderSeo();

    const schemas = readJsonLd();
    const organization = schemas.find((schema) => schema['@type'] === 'Organization');

    expect(organization).toBeDefined();
    expect(organization).toMatchObject({
      name: 'VN One',
      url: 'https://vnone.com.br',
      logo: 'https://vnone.com.br/brand/vn-one-logo-dark.webp',
      areaServed: 'BR',
      founder: {
        '@type': 'Person',
        name: 'Victor Nogueira',
        sameAs: [
          'https://www.linkedin.com/in/victornogueira-vn',
          'https://github.com/VictorN0gueira',
        ],
      },
    });
  });

  it('publishes a WebSite schema named VN One on the home route', () => {
    renderSeo();

    const website = readJsonLd().find((schema) => schema['@type'] === 'WebSite');

    expect(website).toMatchObject({ name: 'VN One', url: 'https://vnone.com.br' });
  });

  it('skips the entity schemas on inner routes', () => {
    renderSeo({ title: 'Contato', path: '/contato' });

    const types = readJsonLd().map((schema) => schema['@type']);

    expect(types).not.toContain('Organization');
    expect(types).not.toContain('WebSite');
  });

  it('points og:site_name, og:image and the canonical at VN One', () => {
    renderSeo({ path: '/contato' });

    expect(readMeta('property', 'og:site_name')).toBe('VN One');
    expect(readMeta('property', 'og:image')).toBe('https://vnone.com.br/og-banner.png?v=3');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://vnone.com.br/contato',
    );
  });

  it('does not emit a keywords meta', () => {
    renderSeo();

    expect(readMeta('name', 'keywords')).toBeNull();
  });

  it('never emits an em or en dash in the head', () => {
    renderSeo();

    expect(document.head.innerHTML).not.toMatch(DASH_PATTERN);
  });
});
