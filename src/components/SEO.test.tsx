import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SOCIAL_LINKS } from '../lib/constants';
import { SEO } from './SEO';

const DASH_PATTERN = /[\u2014\u2013]/;

// React 19 hoists the title, meta and link elements SEO renders into document.head, so the rendered head is read from
// the document.
function renderSeo(props: Parameters<typeof SEO>[0] = {}) {
  return render(<SEO {...props} />);
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

  describe('JSON-LD text', () => {
    const BREAKOUT = '</script><img src=x onerror=alert(1)>';

    function rawJsonLdTexts(): string[] {
      return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node) => node.textContent ?? '');
    }

    it('holds no "<" in any script, an FAQ answer with markup included', () => {
      const faq = { '@type': 'FAQPage', mainEntity: [{ acceptedAnswer: { text: BREAKOUT } }] };

      renderSeo({ path: '/contato', jsonLd: [faq] });

      const texts = rawJsonLdTexts();
      expect(texts.length).toBeGreaterThan(0);
      expect(texts.some((text) => text.includes('\\u003c/script>'))).toBe(true);
      for (const text of texts) expect(text).not.toContain('<');
    });

    it('still parses back to the same schema', () => {
      const faq = { '@type': 'FAQPage', text: `a${BREAKOUT}b\u2028c` };

      renderSeo({ path: '/contato', jsonLd: [faq] });

      expect(readJsonLd()).toContainEqual(faq);
    });

    it('holds no "<" on the home either, where the Organization and the WebSite are written', () => {
      renderSeo();

      for (const text of rawJsonLdTexts()) expect(text).not.toContain('<');
    });
  });

  it('lists the Instagram of VN One in the Organization sameAs, from the constants', () => {
    renderSeo();

    const organization = readJsonLd().find((schema) => schema['@type'] === 'Organization');

    expect(organization?.sameAs).toEqual([SOCIAL_LINKS.find((link) => link.label === 'Instagram')?.href]);
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

  it('keeps the Organization schema to the agreed fields, without a description', () => {
    renderSeo();

    const organization = readJsonLd().find((schema) => schema['@type'] === 'Organization');

    expect(organization).not.toHaveProperty('description');
    expect(Object.keys(organization ?? {}).sort()).toEqual([
      '@context',
      '@type',
      'areaServed',
      'email',
      'founder',
      'logo',
      'name',
      'sameAs',
      'telephone',
      'url',
    ]);
  });

  describe('share image', () => {
    const CUSTOM_IMAGE = 'https://vnone.com.br/projects/dizpara/lista-de-leads-share.jpg';

    it('declares 1200x630 for the default banner', () => {
      renderSeo();

      expect(readMeta('property', 'og:image')).toBe('https://vnone.com.br/og-banner.png?v=3');
      expect(readMeta('property', 'og:image:width')).toBe('1200');
      expect(readMeta('property', 'og:image:height')).toBe('630');
    });

    it('does not claim 1200x630 for a custom image', () => {
      renderSeo({ image: CUSTOM_IMAGE });

      expect(readMeta('property', 'og:image')).toBe(CUSTOM_IMAGE);
      expect(readMeta('name', 'twitter:image')).toBe(CUSTOM_IMAGE);
      expect(readMeta('property', 'og:image:width')).toBeNull();
      expect(readMeta('property', 'og:image:height')).toBeNull();
    });

    it('declares the size of a custom image when it is given', () => {
      renderSeo({ image: CUSTOM_IMAGE, imageWidth: 1200, imageHeight: 630 });

      expect(readMeta('property', 'og:image:width')).toBe('1200');
      expect(readMeta('property', 'og:image:height')).toBe('630');
    });

    it('describes the default banner in both alt tags', () => {
      renderSeo();

      expect(readMeta('property', 'og:image:alt')).toBe('VN One, automação e IA para empresas');
      expect(readMeta('name', 'twitter:image:alt')).toBe('VN One, automação e IA para empresas');
    });

    it('uses imageAlt for both alt tags when it is given', () => {
      renderSeo({ image: CUSTOM_IMAGE, imageAlt: 'Tela do projeto DizPara' });

      expect(readMeta('property', 'og:image:alt')).toBe('Tela do projeto DizPara');
      expect(readMeta('name', 'twitter:image:alt')).toBe('Tela do projeto DizPara');
    });
  });

  it('does not emit a keywords meta', () => {
    renderSeo();

    expect(readMeta('name', 'keywords')).toBeNull();
  });

  it('never emits an em or en dash in the head', () => {
    renderSeo();

    expect(document.head.innerHTML).not.toMatch(DASH_PATTERN);
  });

  describe('the static tags of index.html', () => {
    const STATIC_ATTR = 'data-static-seo';
    const rawHtml = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
    const staticTags: HTMLElement[] = [];

    /** A static tag as index.html has it, put in the head the way the browser does before React runs. */
    function addStaticTag(attr: 'name' | 'property', key: string, content: string, isMarked = true): void {
      const tag = document.createElement('meta');
      tag.setAttribute(attr, key);
      tag.setAttribute('content', content);
      if (isMarked) tag.setAttribute(STATIC_ATTR, '');
      document.head.appendChild(tag);
      staticTags.push(tag);
    }

    afterEach(() => {
      for (const tag of staticTags.splice(0)) tag.remove();
    });

    const managed = /<meta[^>]*(?:name="(?:description|twitter:[^"]*)"|property="og:[^"]*")[^>]*>/g;

    it('marks every tag the component manages, so the component can replace them (crawlers still read them raw)', () => {
      const tags = rawHtml.match(managed) ?? [];

      expect(tags.length).toBeGreaterThan(10);
      for (const tag of tags) expect(tag, tag).toContain(STATIC_ATTR);
    });

    it('leaves one description, og:title, og:image and og:url on a page, not the static home ones plus its own', () => {
      addStaticTag('name', 'description', 'static');
      addStaticTag('property', 'og:title', 'static');
      addStaticTag('property', 'og:image', 'static');
      addStaticTag('property', 'og:url', 'https://vnone.com.br/');
      addStaticTag('name', 'theme-color', '#0A0A0A', false);

      renderSeo({ title: 'Serviços', path: '/servicos' });

      for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:image"]', 'meta[property="og:url"]']) {
        expect(document.querySelectorAll(selector), selector).toHaveLength(1);
      }
      expect(readMeta('property', 'og:url')).toBe('https://vnone.com.br/servicos');
      expect(readMeta('name', 'theme-color')).toBe('#0A0A0A');
    });

    it('drops the static og:url on a noindex page instead of leaving the home one', () => {
      addStaticTag('property', 'og:url', 'https://vnone.com.br/');

      renderSeo({ title: 'Projeto não encontrado', noindex: true });

      expect(readMeta('property', 'og:url')).toBeNull();
    });
  });

  describe('a page that must not be indexed', () => {
    it('declares robots noindex and no canonical, no og:url and no twitter:url', () => {
      renderSeo({ title: 'Projeto não encontrado', noindex: true });

      expect(readMeta('name', 'robots')).toBe('noindex, nofollow');
      expect(document.querySelector('link[rel="canonical"]')).toBeNull();
      expect(readMeta('property', 'og:url')).toBeNull();
      expect(readMeta('name', 'twitter:url')).toBeNull();
    });

    it('publishes no JSON-LD, not even the Organization and WebSite of the home route', () => {
      renderSeo({ noindex: true, jsonLd: [{ '@type': 'BreadcrumbList' }] });

      expect(readJsonLd()).toEqual([]);
    });

    it('still publishes the home JSON-LD and the canonical of an indexed home page', () => {
      renderSeo();

      expect(readJsonLd().map((schema) => schema['@type']).sort()).toEqual(['Organization', 'WebSite']);
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://vnone.com.br/');
    });
  });
});
