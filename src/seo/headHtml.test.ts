import { describe, expect, it } from 'vitest';
import { SITE } from '../lib/site';
import {
  NOT_FOUND_META,
  applyHeadToTemplate,
  applyNoscriptToTemplate,
  escapeHtml,
  renderNoscript,
  renderSeoHead,
  topicOf,
} from './headHtml';
import { ROUTE_METAS, type RouteMeta } from './routeMeta';
import { structuredDataFor } from './structuredData';

const FIXTURE: RouteMeta = {
  path: '/servicos',
  kind: 'page',
  title: 'Serviços de automação | VN One',
  description: 'Automação de processos e agentes de IA sob medida.',
  isIndexable: true,
  lastmod: '2026-11-01',
  crumbs: [
    { name: 'Início', path: '/' },
    { name: 'Serviços', path: '/servicos' },
  ],
};

const TEMPLATE = [
  '<!doctype html><html><head>',
  '<meta charset="UTF-8" />',
  '<!-- seo:start -->',
  '<title data-static-seo>Home</title>',
  '<!-- seo:end -->',
  '<link rel="icon" href="/favicon.ico" />',
  '</head><body><div id="root"></div><script type="module" src="/assets/index-AAA.js"></script></body></html>',
].join('\n');

function parse(html: string): Document {
  return new DOMParser().parseFromString(`<!doctype html><html><head>${html}</head><body></body></html>`, 'text/html');
}

const metaContent = (doc: Document, selector: string) => doc.head.querySelector(selector)?.getAttribute('content');

describe('escapeHtml', () => {
  it('escapes the five characters that can break out of an attribute or a text node', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;');
  });

  it('leaves accents and plain text alone', () => {
    expect(escapeHtml('Automação e IA, em Recife')).toBe('Automação e IA, em Recife');
  });
});

describe('renderSeoHead of an indexable route', () => {
  const head = renderSeoHead(FIXTURE, []);
  const doc = parse(head);

  it('writes the title of the route, and only one', () => {
    expect(doc.querySelectorAll('title')).toHaveLength(1);
    expect(doc.title).toBe(FIXTURE.title);
  });

  it('writes one description, one canonical with the absolute url and one og:url', () => {
    expect(doc.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(metaContent(doc, 'meta[name="description"]')).toBe(FIXTURE.description);
    expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://vnone.com.br/servicos');
    expect(metaContent(doc, 'meta[property="og:url"]')).toBe('https://vnone.com.br/servicos');
    expect(metaContent(doc, 'meta[name="twitter:url"]')).toBe('https://vnone.com.br/servicos');
  });

  it('keeps the slash of the home canonical and drops it nowhere else', () => {
    const home = parse(renderSeoHead({ ...FIXTURE, path: '/', kind: 'home', crumbs: [] }, []));
    expect(home.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://vnone.com.br/');
  });

  it('writes the share tags with the default banner and its size', () => {
    expect(metaContent(doc, 'meta[property="og:title"]')).toBe(FIXTURE.title);
    expect(metaContent(doc, 'meta[property="og:description"]')).toBe(FIXTURE.description);
    expect(metaContent(doc, 'meta[property="og:image"]')).toBe(SITE.ogImage);
    expect(metaContent(doc, 'meta[property="og:image:width"]')).toBe('1200');
    expect(metaContent(doc, 'meta[property="og:image:height"]')).toBe('630');
    expect(metaContent(doc, 'meta[property="og:image:alt"]')).toBe(SITE.ogImageAlt);
    expect(metaContent(doc, 'meta[property="og:site_name"]')).toBe(SITE.name);
    expect(metaContent(doc, 'meta[property="og:locale"]')).toBe('pt_BR');
    expect(metaContent(doc, 'meta[property="og:type"]')).toBe('website');
    expect(metaContent(doc, 'meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(metaContent(doc, 'meta[name="twitter:title"]')).toBe(FIXTURE.title);
    expect(metaContent(doc, 'meta[name="twitter:description"]')).toBe(FIXTURE.description);
    expect(metaContent(doc, 'meta[name="twitter:image"]')).toBe(SITE.ogImage);
    expect(metaContent(doc, 'meta[name="twitter:image:alt"]')).toBe(SITE.ogImageAlt);
  });

  it('uses the image of the route, with its own size and alt, when it has one', () => {
    const image = { url: 'https://vnone.com.br/projects/x-share.jpg', alt: 'Tela "X" & Y', width: 1200, height: 628 };
    const withImage = parse(renderSeoHead({ ...FIXTURE, image }, []));

    expect(metaContent(withImage, 'meta[property="og:image"]')).toBe(image.url);
    expect(metaContent(withImage, 'meta[name="twitter:image"]')).toBe(image.url);
    expect(metaContent(withImage, 'meta[property="og:image:height"]')).toBe('628');
    expect(metaContent(withImage, 'meta[property="og:image:alt"]')).toBe(image.alt);
  });

  it('has no robots tag', () => {
    expect(doc.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('marks every tag with data-static-seo, so the app can take them over', () => {
    const tags = [...doc.head.children];
    expect(tags.length).toBeGreaterThan(15);
    for (const tag of tags) expect(tag.hasAttribute('data-static-seo'), tag.outerHTML).toBe(true);
  });
});

describe('renderSeoHead of a route out of the index', () => {
  const noindex: RouteMeta = { ...FIXTURE, path: '/blog', isIndexable: false };
  const doc = parse(renderSeoHead(noindex, []));

  it('says noindex, nofollow', () => {
    expect(doc.querySelectorAll('meta[name="robots"]')).toHaveLength(1);
    expect(metaContent(doc, 'meta[name="robots"]')).toBe('noindex, nofollow');
  });

  it('has no canonical, no og:url and no twitter:url', () => {
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    expect(doc.querySelector('meta[property="og:url"]')).toBeNull();
    expect(doc.querySelector('meta[name="twitter:url"]')).toBeNull();
  });

  it('still has the title, the description and the share text', () => {
    expect(doc.title).toBe(noindex.title);
    expect(metaContent(doc, 'meta[name="description"]')).toBe(noindex.description);
    expect(metaContent(doc, 'meta[property="og:title"]')).toBe(noindex.title);
  });

  it('marks the robots tag too', () => {
    expect(doc.querySelector('meta[name="robots"]')?.hasAttribute('data-static-seo')).toBe(true);
  });
});

describe('renderSeoHead with characters that mean something in HTML', () => {
  const nasty: RouteMeta = {
    ...FIXTURE,
    title: 'A "quoted" <b>title</b> & more | VN One',
    description: `It's <script>alert(1)</script> & "more"`,
  };
  const head = renderSeoHead(nasty, []);
  const doc = parse(head);

  it('writes them escaped, and parses back to the original text', () => {
    expect(head).not.toContain('<script>alert(1)');
    expect(head).not.toContain('<b>');
    expect(doc.title).toBe(nasty.title);
    expect(metaContent(doc, 'meta[name="description"]')).toBe(nasty.description);
    expect(metaContent(doc, 'meta[property="og:title"]')).toBe(nasty.title);
    expect(doc.head.querySelectorAll('script')).toHaveLength(0);
  });
});

describe('renderSeoHead with structured data', () => {
  it('writes each node as a marked JSON-LD script that parses back to the node', () => {
    const nodes = [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'VN One' }, { '@type': 'BreadcrumbList' }];
    const doc = parse(renderSeoHead(FIXTURE, nodes));
    const scripts = [...doc.querySelectorAll('script[type="application/ld+json"]')];

    expect(scripts).toHaveLength(2);
    for (const script of scripts) expect(script.hasAttribute('data-static-seo')).toBe(true);
    expect(scripts.map((script) => JSON.parse(script.textContent ?? ''))).toEqual(nodes);
  });

  it('does not let a value close the script element', () => {
    const doc = parse(renderSeoHead(FIXTURE, [{ name: '</script><img src=x onerror=alert(1)>' }]));

    expect(doc.querySelectorAll('script')).toHaveLength(1);
    expect(doc.querySelector('img')).toBeNull();
    expect(JSON.parse(doc.querySelector('script')?.textContent ?? '')).toEqual({ name: '</script><img src=x onerror=alert(1)>' });
  });

  it('writes no script when there is no structured data', () => {
    expect(parse(renderSeoHead(FIXTURE, [])).querySelectorAll('script')).toHaveLength(0);
  });
});

describe('applyHeadToTemplate', () => {
  it('swaps what is between the markers and keeps the rest of the template', () => {
    const result = applyHeadToTemplate(TEMPLATE, '<title data-static-seo>Other</title>');

    expect(result).toContain('<title data-static-seo>Other</title>');
    expect(result).not.toContain('<title data-static-seo>Home</title>');
    expect(result).toContain('<link rel="icon" href="/favicon.ico" />');
    expect(result).toContain('<meta charset="UTF-8" />');
    expect(result).toContain('src="/assets/index-AAA.js"');
  });

  it('keeps both markers, so the same template can be applied again', () => {
    const once = applyHeadToTemplate(TEMPLATE, '<title data-static-seo>One</title>');
    const twice = applyHeadToTemplate(once, '<title data-static-seo>Two</title>');

    expect(twice).toContain('<title data-static-seo>Two</title>');
    expect(twice).not.toContain('One');
    expect(twice.split('<!-- seo:start -->')).toHaveLength(2);
    expect(twice.split('<!-- seo:end -->')).toHaveLength(2);
  });

  it('inserts the text as it is, with no replacement pattern read in it', () => {
    const result = applyHeadToTemplate(TEMPLATE, '<title data-static-seo>$& and $1 and $$</title>');
    expect(result).toContain('<title data-static-seo>$& and $1 and $$</title>');
  });

  it.each([
    ['the start marker', TEMPLATE.replace('<!-- seo:start -->', '')],
    ['the end marker', TEMPLATE.replace('<!-- seo:end -->', '')],
  ])('fails loudly without %s', (_name, template) => {
    expect(() => applyHeadToTemplate(template, '<title>x</title>')).toThrow(/seo:(start|end)/);
  });

  it('fails when the end marker comes before the start marker', () => {
    const swapped = TEMPLATE.replace('<!-- seo:start -->', '@@').replace('<!-- seo:end -->', '<!-- seo:start -->').replace('@@', '<!-- seo:end -->');
    expect(() => applyHeadToTemplate(swapped, '<title>x</title>')).toThrow(/order/);
  });

  it('gives two routes two different titles', () => {
    const a = applyHeadToTemplate(TEMPLATE, renderSeoHead(ROUTE_METAS[0], []));
    const b = applyHeadToTemplate(TEMPLATE, renderSeoHead(ROUTE_METAS[1], []));
    const titleOf = (html: string) => /<title[^>]*>([^<]*)<\/title>/.exec(html)?.[1];

    expect(titleOf(a)).not.toBe(titleOf(b));
  });
});

describe('every public route', () => {
  it.each(ROUTE_METAS.map((meta) => [meta.path, meta] as const))('%s renders a head that parses with its own title and one canonical or noindex', (_path, meta) => {
    const doc = parse(renderSeoHead(meta, structuredDataFor(meta)));

    expect(doc.title).toBe(meta.title);
    expect(doc.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(meta.isIndexable ? 1 : 0);
    expect(doc.querySelectorAll('meta[name="robots"]')).toHaveLength(meta.isIndexable ? 0 : 1);
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) JSON.parse(script.textContent ?? '');
  });
});

describe('the 404 page', () => {
  const doc = parse(renderSeoHead(NOT_FOUND_META, []));

  it('is out of the index, with the title of the app and no canonical', () => {
    expect(doc.title).toBe('Página não encontrada | VN One');
    expect(metaContent(doc, 'meta[name="robots"]')).toBe('noindex, nofollow');
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    expect(doc.querySelector('meta[property="og:url"]')).toBeNull();
  });
});

describe('topicOf', () => {
  it('drops the brand from the end of an inner title and from the start of the home title', () => {
    expect(topicOf(FIXTURE)).toBe('Serviços de automação');
    expect(topicOf({ ...FIXTURE, title: SITE.title })).toBe('Automação de processos e agentes de IA sob medida');
    expect(topicOf({ ...FIXTURE, title: 'No brand here' })).toBe('No brand here');
  });
});

describe('renderNoscript', () => {
  const links = [
    { name: 'Serviços de automação', path: '/servicos' },
    { name: 'Projetos', path: '/projetos' },
  ];
  const html = renderNoscript(FIXTURE, links);
  const doc = new DOMParser().parseFromString(`<body>${html.replace(/^<noscript>|<\/noscript>$/g, '')}</body>`, 'text/html');

  it('is a noscript element', () => {
    expect(html.startsWith('<noscript>')).toBe(true);
    expect(html.endsWith('</noscript>')).toBe(true);
  });

  it('has the title without the brand as the h1 and the description', () => {
    expect(doc.querySelector('h1')?.textContent).toBe('Serviços de automação');
    expect(doc.body.textContent).toContain(FIXTURE.description);
  });

  it('lists only internal links, with the text of each', () => {
    const anchors = [...doc.querySelectorAll('a')];

    expect(anchors.map((anchor) => anchor.getAttribute('href'))).toEqual(['/servicos', '/projetos']);
    expect(anchors.map((anchor) => anchor.textContent)).toEqual(['Serviços de automação', 'Projetos']);
    for (const anchor of anchors) expect(anchor.getAttribute('href')).toMatch(/^\/(?!\/)/);
  });

  it('escapes the text it writes', () => {
    const risky = renderNoscript({ ...FIXTURE, title: 'A <b>x</b> | VN One', description: 'D <i>' }, [{ name: 'L <u>', path: '/x' }]);
    expect(risky).not.toMatch(/<b>|<i>|<u>/);
  });

  it('uses the home title as it is, since the brand leads it', () => {
    const home = renderNoscript({ ...FIXTURE, path: '/', kind: 'home', title: SITE.title }, []);
    expect(home).toContain('<h1>Automação de processos e agentes de IA sob medida</h1>');
  });

  it('writes no dash and no " / " separator in what it adds', () => {
    const all = renderNoscript(FIXTURE, links);
    expect(all).not.toMatch(/—|–| \/ /);
  });
});

describe('applyNoscriptToTemplate', () => {
  it('puts the block before the end of the body, after the root and the script', () => {
    const result = applyNoscriptToTemplate(TEMPLATE, '<noscript>x</noscript>');
    expect(result.indexOf('<noscript>x</noscript>')).toBeGreaterThan(result.indexOf('<div id="root">'));
    expect(result.indexOf('<noscript>x</noscript>')).toBeLessThan(result.indexOf('</body>'));
  });

  it('leaves one noscript block when it is applied twice', () => {
    const once = applyNoscriptToTemplate(TEMPLATE, '<noscript>one</noscript>');
    const twice = applyNoscriptToTemplate(once, '<noscript>two</noscript>');

    expect(twice.match(/<noscript>/g)).toHaveLength(1);
    expect(twice).toContain('<noscript>two</noscript>');
    expect(twice).not.toContain('one');
  });

  it('fails loudly when the template has no body end', () => {
    expect(() => applyNoscriptToTemplate('<html></html>', '<noscript></noscript>')).toThrow(/body/);
  });
});
