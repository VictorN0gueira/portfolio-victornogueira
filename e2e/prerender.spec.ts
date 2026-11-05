import type { Page } from '@playwright/test';
import { services } from '../src/data/services';
import { ROUTE_METAS } from '../src/seo/routeMeta';
import { expect, test } from './n8nGuard';

// The build step (scripts/build-seo.mjs) writes the head of every public route into its own HTML file, so a crawler or a
// link preview that runs no JavaScript reads the right title, description, canonical and structured data of each URL.
// These requests carry no script: they read what the server sends.

const INDEXABLE = ROUTE_METAS.filter((meta) => meta.isIndexable);
const NOT_INDEXABLE = ROUTE_METAS.filter((meta) => !meta.isIndexable);

const ENTITIES: Readonly<Record<string, string>> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const decode = (text: string): string => text.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity]);

const titleOf = (html: string): string | undefined => {
  const raw = /<title[^>]*>([^<]*)<\/title>/.exec(html)?.[1];
  return raw === undefined ? undefined : decode(raw);
};
const metaOf = (html: string, key: string): string | undefined => {
  const raw = new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`).exec(html)?.[1];
  return raw === undefined ? undefined : decode(raw);
};
const canonicalsOf = (html: string): string[] => [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((match) => decode(match[1]));
const jsonLdOf = (html: string): Array<Record<string, unknown>> =>
  [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([^<]*)<\/script>/g)].map((match) => JSON.parse(match[1]) as Record<string, unknown>);

const fetchHtml = async (page: Page, path: string): Promise<string> => {
  const response = await page.request.get(path);
  expect(response.status(), path).toBe(200);
  return response.text();
};

for (const meta of INDEXABLE) {
  test(`${meta.path} carries its own head in the raw HTML`, async ({ page }) => {
    const html = await fetchHtml(page, meta.path);

    expect(titleOf(html)).toBe(meta.title);
    expect(metaOf(html, 'description')).toBe(meta.description);
    expect(metaOf(html, 'og:title')).toBe(meta.title);
    expect(metaOf(html, 'og:description')).toBe(meta.description);
    expect(metaOf(html, 'og:url')).toBe(`https://vnone.com.br${meta.path}`);
    expect(canonicalsOf(html)).toEqual([`https://vnone.com.br${meta.path}`]);
    expect(html).not.toContain('name="robots"');
    expect(html.match(/<title/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    for (const node of jsonLdOf(html)) expect(node['@type'], meta.path).toBeTruthy();
  });
}

for (const meta of NOT_INDEXABLE) {
  test(`${meta.path} is out of the index in the raw HTML and still crawlable`, async ({ page }) => {
    const html = await fetchHtml(page, meta.path);

    expect(titleOf(html)).toBe(meta.title);
    expect(metaOf(html, 'robots')).toBe('noindex, nofollow');
    expect(canonicalsOf(html)).toEqual([]);
    expect(metaOf(html, 'og:url')).toBeUndefined();
    expect(jsonLdOf(html)).toEqual([]);
  });
}

test('every route has a title and a description of its own', async ({ page }) => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const meta of ROUTE_METAS) {
    const html = await fetchHtml(page, meta.path);
    titles.add(titleOf(html) ?? '');
    descriptions.add(metaOf(html, 'description') ?? '');
  }

  expect(titles.size).toBe(ROUTE_METAS.length);
  expect(descriptions.size).toBe(ROUTE_METAS.length);
});

test('/servicos has one Service per item of the services data, and the breadcrumb', async ({ page }) => {
  const nodes = jsonLdOf(await fetchHtml(page, '/servicos'));
  const serviceNodes = nodes.filter((node) => node['@type'] === 'Service');

  expect(serviceNodes.map((node) => node.name)).toEqual(services.map((service) => service.nome));
  expect(nodes.some((node) => node['@type'] === 'BreadcrumbList')).toBe(true);
});

test('the home carries the organization and the site in its raw HTML', async ({ page }) => {
  const types = jsonLdOf(await fetchHtml(page, '/')).map((node) => node['@type']);

  expect(types).toEqual(expect.arrayContaining(['Organization', 'WebSite', 'FAQPage']));
});

test('the HTML of a route is still the app: the same script and no second head', async ({ page }) => {
  const [home, servicesHtml] = await Promise.all([fetchHtml(page, '/'), fetchHtml(page, '/servicos')]);
  const script = (html: string) => /<script type="module"[^>]*src="([^"]+)"/.exec(html)?.[1];

  expect(script(servicesHtml)).toBeTruthy();
  expect(script(servicesHtml)).toBe(script(home));
  expect(servicesHtml).toContain('<div id="root"></div>');
  expect(servicesHtml).toContain('rel="icon"');
});

// The file that nginx sends as the body of a 404. Asked directly, the preview server of this suite (e2e/vite.preview.config.ts)
// serves it with a 200, while the real nginx answers /404.html with a 404 (the location is internal): that is what
// scripts/smoke-container.mjs checks against the image. Here only the content of the file is under test.
test('the file of the 404 page is out of the index', async ({ page }) => {
  const html = await fetchHtml(page, '/404.html');

  expect(titleOf(html)).toBe('Página não encontrada | VN One');
  expect(metaOf(html, 'robots')).toBe('noindex, nofollow');
  expect(canonicalsOf(html)).toEqual([]);
  expect(html).toContain('<div id="root"></div>');
});

test('/sitemap.xml lists the routes in the index with their real dates, and not the blog', async ({ page }) => {
  const xml = await fetchHtml(page, '/sitemap.xml');
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  expect(locations).toEqual(INDEXABLE.map((meta) => `https://vnone.com.br${meta.path}`));
  expect(xml).not.toContain('/blog');
  expect(xml).not.toContain('2026-07');
  expect(xml).not.toMatch(/changefreq|priority/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('a route shows its own title and the text of its noscript block', async ({ page }) => {
    await page.goto('/servicos');

    await expect(page).toHaveTitle(/^Serviços/);
    await expect(page.locator('noscript h1')).toHaveCount(1);
    await expect(page.locator('noscript a[href="/contato"]')).toHaveCount(1);
  });
});

// The JSON-LD blocks are data, and the CSP of the site only allows scripts from its own origin: a block in the raw HTML must
// not be a violation, on any route, with the real headers of `vite preview`.
test.describe('the content security policy', () => {
  for (const meta of ROUTE_METAS) {
    test(`${meta.path} loads with no violation`, async ({ page }) => {
      const violations: string[] = [];
      page.on('console', (message) => {
        if (/content security policy|refused to/i.test(message.text())) violations.push(message.text());
      });
      await page.addInitScript(() => {
        const store: string[] = [];
        (window as unknown as { __csp: string[] }).__csp = store;
        document.addEventListener('securitypolicyviolation', (event) => store.push(`${event.violatedDirective} ${event.blockedURI}`));
      });

      await page.goto(meta.path);
      await expect(page).toHaveTitle(/\S/);
      await expect.poll(() => page.locator('head [data-static-seo]').count()).toBe(0);

      const recorded = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
      expect([...violations, ...recorded]).toEqual([]);
    });
  }
});
