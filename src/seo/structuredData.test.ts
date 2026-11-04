// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SOCIAL_LINKS } from '../lib/constants';
import { faqs } from '../data/faqs';
import { projects } from '../data/projects';
import { services } from '../data/services';
import { serializeJsonLd } from '../lib/jsonLd';
import { SITE } from '../lib/site';
import { ROUTE_METAS, routeMetaFor, type RouteMeta } from './routeMeta';
import {
  breadcrumbNode,
  faqNode,
  organizationNode,
  serviceNodes,
  structuredDataFor,
  websiteNode,
} from './structuredData';

type Node = Record<string, unknown>;

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const BANNED_TEXT = new RegExp(`${EM_DASH}|${EN_DASH}| / |chatbot`, 'i');
const FORBIDDEN_KEYS = ['aggregateRating', 'review', 'offers', 'price', 'priceCurrency', 'streetAddress', 'vatID', 'taxID'];

function metaOf(path: string): RouteMeta {
  const meta = routeMetaFor(path);
  if (!meta) throw new Error(`no route meta for ${path}`);
  return meta;
}

/** Every plain object of a tree, the root included. */
function walk(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(walk);
  if (value === null || typeof value !== 'object') return [];
  const node = value as Node;
  return [node, ...Object.values(node).flatMap(walk)];
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

function typeOf(node: object): unknown {
  return (node as Node)['@type'];
}

function nodesOfType(nodes: readonly object[], type: string): Node[] {
  return nodes.filter((node) => typeOf(node) === type) as Node[];
}

describe('organizationNode', () => {
  it('takes the phone from SITE and gives the contact point no other number', () => {
    const organization = organizationNode() as Node;
    const contactPoint = organization.contactPoint as Node;

    expect(organization.telephone).toBe(SITE.telephone);
    expect(contactPoint.telephone).toBe(SITE.telephone);
    expect(contactPoint.contactType).toBe('customer service');
    expect(contactPoint.availableLanguage).toBe('pt-BR');
    expect(JSON.stringify(organization).match(/\+55-\d{2}-\d{5}-\d{4}/g)?.every((phone) => phone === SITE.telephone)).toBe(true);
  });

  it('says only the city and the country as the address: no street, no tax id', () => {
    const address = (organizationNode() as Node).address as Node;

    expect(address).toEqual({ '@type': 'PostalAddress', addressLocality: 'Recife', addressCountry: 'BR' });
  });

  it('uses a square logo of at least 112 px, as an ImageObject', () => {
    const logo = (organizationNode() as Node).logo as Node;

    expect(logo['@type']).toBe('ImageObject');
    expect(logo.url).toBe(`${SITE.url}/brand/favicon-512.png`);
    expect([logo.width, logo.height]).toEqual([512, 512]);
  });

  it('lists in sameAs only links of the constants, never an empty one', () => {
    const known = new Set(SOCIAL_LINKS.map((link) => link.href));
    const organization = organizationNode() as Node;
    const founder = organization.founder as Node;
    const urls = [...((organization.sameAs as string[] | undefined) ?? []), ...((founder.sameAs as string[] | undefined) ?? [])];

    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).not.toBe('');
      expect(known.has(url), url).toBe(true);
    }
  });

  it('has stable ids for the organization and its founder', () => {
    const organization = organizationNode() as Node;

    expect(organization['@id']).toBe(`${SITE.url}/#organization`);
    expect((organization.founder as Node)['@id']).toBe(`${SITE.url}/#founder`);
  });
});

describe('websiteNode', () => {
  it('names the site VN One with the alternate names, in Portuguese, with no search action', () => {
    const website = websiteNode() as Node;

    expect(website['@id']).toBe(`${SITE.url}/#website`);
    expect(website.name).toBe('VN One');
    expect(website.alternateName).toEqual(['VN One Automação e IA', 'vnone.com.br']);
    expect(website.inLanguage).toBe('pt-BR');
    expect(website.publisher).toEqual({ '@id': `${SITE.url}/#organization` });
    expect(website).not.toHaveProperty('potentialAction');
  });
});

describe('serviceNodes', () => {
  it('has one Service per entry of the services data, in the same order, with the text of the data', () => {
    const nodes = serviceNodes() as Node[];

    expect(nodes).toHaveLength(services.length);
    services.forEach((service, index) => {
      expect(nodes[index]).toMatchObject({
        '@type': 'Service',
        name: service.nome,
        description: service.descricao,
        serviceType: service.categoria,
        url: `${SITE.url}/servicos#${service.slug}`,
        provider: { '@id': `${SITE.url}/#organization` },
        areaServed: 'BR',
      });
    });
  });
});

describe('breadcrumbNode', () => {
  it('numbers the crumbs from 1 and gives each an absolute URL', () => {
    const node = breadcrumbNode(metaOf(`/projetos/${projects[0].slug}`).crumbs) as Node;
    const items = node.itemListElement as Node[];

    expect(node['@type']).toBe('BreadcrumbList');
    expect(items.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(items[0].item).toBe(`${SITE.url}/`);
    expect(items[1].item).toBe(`${SITE.url}/projetos`);
    expect(items[2].item).toBe(`${SITE.url}/projetos/${projects[0].slug}`);
  });
});

describe('structuredDataFor', () => {
  it('emits the organization, the site and the FAQ on the home, and no breadcrumb', () => {
    const types = structuredDataFor(metaOf('/')).map(typeOf);

    expect(types).toEqual(['Organization', 'WebSite', 'FAQPage']);
  });

  it('emits the FAQ only on routes with hasFaq, with the questions of the faqs data', () => {
    for (const meta of ROUTE_METAS) {
      const faqPages = nodesOfType(structuredDataFor(meta), 'FAQPage');
      expect(faqPages.length, meta.path).toBe(meta.hasFaq ? 1 : 0);
      if (meta.hasFaq) {
        const names = (faqPages[0].mainEntity as Node[]).map((question) => question.name);
        expect(names).toEqual(faqs.map((faq) => faq.question));
      }
    }
    expect(faqNode(faqs)['@type']).toBe('FAQPage');
  });

  it('puts the breadcrumb and one Service per service on /servicos', () => {
    const nodes = structuredDataFor(metaOf('/servicos'));

    expect(nodesOfType(nodes, 'BreadcrumbList')).toHaveLength(1);
    expect(nodesOfType(nodes, 'Service')).toHaveLength(services.length);
    expect(nodesOfType(nodes, 'Organization')).toHaveLength(0);
  });

  it('puts a breadcrumb, and only that, on the other indexable inner routes', () => {
    for (const meta of ROUTE_METAS.filter((entry) => entry.kind !== 'home' && entry.path !== '/servicos' && entry.isIndexable)) {
      const types = structuredDataFor(meta).map(typeOf);
      expect(types.filter((type) => type !== 'FAQPage'), meta.path).toEqual(['BreadcrumbList']);
    }
  });

  it('emits nothing for a route that is out of the index', () => {
    expect(structuredDataFor(metaOf('/blog'))).toEqual([]);
  });

  it('gives every node a schema.org context', () => {
    for (const meta of ROUTE_METAS) {
      for (const node of structuredDataFor(meta)) expect((node as Node)['@context'], meta.path).toBe('https://schema.org');
    }
  });

  it('never claims a rating, a review, an offer or a price', () => {
    const all = ROUTE_METAS.flatMap((meta) => structuredDataFor(meta));

    for (const node of walk(all)) {
      for (const key of FORBIDDEN_KEYS) expect(Object.keys(node), key).not.toContain(key);
    }
    expect(nodesOfType(all, 'LocalBusiness')).toHaveLength(0);
  });

  it('references only ids that a node of the home defines', () => {
    const home = structuredDataFor(metaOf('/'));
    const defined = new Set(walk(home).flatMap((node) => (typeof node['@id'] === 'string' && Object.keys(node).length > 1 ? [node['@id']] : [])));
    const all = ROUTE_METAS.flatMap((meta) => structuredDataFor(meta));
    const references = walk(all).filter((node) => Object.keys(node).length === 1 && typeof node['@id'] === 'string');

    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) expect(defined.has(reference['@id'] as string), String(reference['@id'])).toBe(true);
  });

  it('follows the copy rules in every text', () => {
    for (const text of strings(ROUTE_METAS.flatMap((meta) => structuredDataFor(meta)))) {
      expect(text, text).not.toMatch(BANNED_TEXT);
    }
  });

  it('serializes to JSON that parses back, and a text with a closing script tag cannot end the element', () => {
    const node = { '@type': 'Thing', name: '</script><img src=x onerror=alert(1)>' };
    const text = serializeJsonLd(node);

    expect(JSON.parse(text)).toEqual(node);
    expect(text).not.toContain('<');
    for (const entry of ROUTE_METAS.flatMap((meta) => structuredDataFor(meta))) {
      expect(JSON.parse(serializeJsonLd(entry))).toEqual(entry);
    }
  });
});
