import { expect, test } from './n8nGuard';
import { SITE } from '../src/lib/site';
import { ROUTE_METAS, type RouteMeta } from '../src/seo/routeMeta';
import { structuredDataFor } from '../src/seo/structuredData';

// What Google indexes is the DOM after the page ran, and what WhatsApp and the build read is the metadata of the route
// (src/seo). The two must say the same. For every public route this reads the head of a real browser once the page has
// mounted (and SEO.tsx has taken the static tags away) and compares it with routeMeta and structuredData.

interface HeadSnapshot {
  title: string;
  description: string[];
  canonical: string[];
  robots: string[];
  ogTitle: string[];
  ogDescription: string[];
  ogUrl: string[];
  twitterTitle: string[];
  twitterDescription: string[];
  ogImage: string[];
  jsonLd: string[];
}

function expectedSnapshot(meta: RouteMeta): HeadSnapshot {
  const url = `${SITE.url}${meta.path}`;
  const image = meta.image?.url ?? SITE.ogImage;

  return {
    title: meta.title,
    description: [meta.description],
    canonical: meta.isIndexable ? [url] : [],
    robots: meta.isIndexable ? [] : ['noindex, nofollow'],
    ogTitle: [meta.title],
    ogDescription: [meta.description],
    ogUrl: meta.isIndexable ? [url] : [],
    twitterTitle: [meta.title],
    twitterDescription: [meta.description],
    ogImage: [image],
    jsonLd: structuredDataFor(meta)
      .map((node) => JSON.stringify(node))
      .sort(),
  };
}

// Runs in the page: one list per tag, so a duplicate shows up as two entries instead of being hidden.
function readHead(): HeadSnapshot {
  const contents = (selector: string, attribute: string): string[] =>
    Array.from(document.head.querySelectorAll(selector)).map((tag) => tag.getAttribute(attribute) ?? '');

  return {
    title: document.title,
    description: contents('meta[name="description"]', 'content'),
    canonical: contents('link[rel="canonical"]', 'href'),
    robots: contents('meta[name="robots"]', 'content'),
    ogTitle: contents('meta[property="og:title"]', 'content'),
    ogDescription: contents('meta[property="og:description"]', 'content'),
    ogUrl: contents('meta[property="og:url"]', 'content'),
    twitterTitle: contents('meta[name="twitter:title"]', 'content'),
    twitterDescription: contents('meta[name="twitter:description"]', 'content'),
    ogImage: contents('meta[property="og:image"]', 'content'),
    // React renders a JSON-LD script where the component is (the body), not in the head.
    jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map((script) => JSON.stringify(JSON.parse(script.textContent ?? 'null')))
      .sort(),
  };
}

for (const meta of ROUTE_METAS) {
  test(`${meta.path}: the head of the DOM equals the route metadata`, async ({ page }) => {
    await page.goto(meta.path);
    await expect(page).toHaveTitle(meta.title);
    // The static tags of the HTML go away in the effect that follows the first render of the page.
    await expect.poll(() => page.locator('head [data-static-seo]').count()).toBe(0);

    const head = await page.evaluate(readHead);

    expect(head).toEqual(expectedSnapshot(meta));
  });
}

test('a project that left the list goes to /projetos with the head of that page', async ({ page }) => {
  await page.goto('/projetos/troco');
  await expect(page).toHaveURL(/\/projetos$/);
  const meta = ROUTE_METAS.find((route) => route.path === '/projetos');
  await expect(page).toHaveTitle(meta?.title ?? '');
  await expect.poll(() => page.locator('head [data-static-seo]').count()).toBe(0);

  expect((await page.evaluate(readHead)).canonical).toEqual([`${SITE.url}/projetos`]);
});

for (const path of ['/projetos/nao-existe', '/rota-que-nao-existe']) {
  test(`${path}: out of the index at once, with no canonical, no og:url and no structured data`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(/^(Projeto|Página) não encontrad[ao]/);
    await expect.poll(() => page.locator('head [data-static-seo]').count()).toBe(0);

    const head = await page.evaluate(readHead);

    expect(head.robots).toEqual(['noindex, nofollow']);
    expect(head.canonical).toEqual([]);
    expect(head.ogUrl).toEqual([]);
    expect(head.jsonLd).toEqual([]);
  });
}
