import { routeMetaFor } from '../src/seo/routeMeta';
import { expect, test } from './n8nGuard';

// index.html carries the home tags for crawlers that do not run JavaScript, and SEO.tsx adds the ones of each page. React
// hoists them next to the static ones instead of replacing them, so SEO removes the static ones on mount. This counts
// what a real browser ends up with in the head of each kind of route.

const ONE_PER_PAGE = [
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:image"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
  'meta[name="twitter:image"]',
  'meta[property="og:type"]',
  'meta[property="og:site_name"]',
  'meta[property="og:locale"]',
];
const ROUTES = [
  { path: '/', hasOgUrl: true, title: /Automação de processos e agentes de IA/ },
  { path: '/servicos', hasOgUrl: true, title: /^Serviços/ },
  { path: '/projetos/dizpara', hasOgUrl: true, title: /^DizPara/ },
  { path: '/blog', hasOgUrl: false, title: /^Blog/ },
  { path: '/rota-que-nao-existe', hasOgUrl: false, title: /^Página não encontrada/ },
] as const;

for (const { path, hasOgUrl, title } of ROUTES) {
  test(`${path} has one of each share tag in the head`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);

    // The static tags go away in the effect that follows the first render of the page.
    await expect.poll(() => page.locator('head [data-static-seo]').count()).toBe(0);
    for (const selector of ONE_PER_PAGE) {
      await expect(page.locator(selector), selector).toHaveCount(1);
    }
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(hasOgUrl ? 1 : 0);
    if (hasOgUrl) {
      const url = await page.locator('meta[property="og:url"]').getAttribute('content');
      expect(url?.endsWith(path === '/' ? '.br/' : path)).toBe(true);
    }
  });
}

// The blog only lists articles of other sites: it is out of the index (and stays crawlable, so that the noindex is seen).
test('/blog is out of the index: noindex, no canonical, no structured data', async ({ page }) => {
  await page.goto('/blog');
  await expect(page).toHaveTitle(/^Blog/);
  await expect.poll(() => page.locator('head [data-static-seo]').count()).toBe(0);

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});

test('the raw HTML still carries the home share tags for crawlers that run no script', async ({ page }) => {
  const html = await (await page.request.get('/')).text();

  expect(html).toContain('property="og:title"');
  expect(html).toContain('property="og:image"');
  expect(html).toContain('name="description"');
});

// Between two pages, while the chunk of the next one is slow, the head must not fall back to the static home title,
// and the announcement of the new page must be its own title (not the home one).
const SLOW_PAGE_CHUNK = /\/assets\/ServicesPage-[^/]*\.js$/;
const SLOW_PAGE_MS = 2500;
const HOME_TITLE_TEXT = 'VN One | Automação de processos e agentes de IA sob medida';
const TITLE_SAMPLE_MS = 25;

test('the title never goes back to the home title between /sobre and a slow /servicos', async ({ page }) => {
  await page.goto('/sobre');
  await expect(page).toHaveTitle(/^Sobre/);
  await expect.poll(() => page.locator('head [data-static-seo]').count()).toBe(0);

  await page.route(SLOW_PAGE_CHUNK, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, SLOW_PAGE_MS));
    await route.fallback();
  });
  await page.evaluate((interval) => {
    const seen: string[] = [];
    (window as unknown as { __titles: string[] }).__titles = seen;
    window.setInterval(() => seen.push(document.title), interval);
  }, TITLE_SAMPLE_MS);

  await page.locator('footer a[href="/servicos"]').first().click();
  await expect(page).toHaveTitle(/^Serviços/, { timeout: SLOW_PAGE_MS * 3 });

  const seen = await page.evaluate(() => (window as unknown as { __titles: string[] }).__titles);
  expect(seen.length).toBeGreaterThan(SLOW_PAGE_MS / TITLE_SAMPLE_MS / 2);
  expect(seen).not.toContain(HOME_TITLE_TEXT);
  await expect(page.locator('[role="status"].sr-only').first()).toHaveText(/^Serviços/);
});

// The raw HTML of a route (what a crawler without JavaScript reads) and the head after the app mounted (what SEO.tsx writes)
// must say the same thing, or a page changes its own title under the reader. The target of both is src/seo/routeMeta.ts.
//
// The inner pages still pass their own title and description to SEO.tsx, so what they write at run time is not yet what the
// route metadata says. The 'after M2' block holds those comparisons: batch M2 (the pages switch to routeMeta) turns them on by
// setting IS_AFTER_M2. They show as skipped, with the reason, until then.
const IS_AFTER_M2 = false;
const PARITY_PATHS = ['/', '/servicos', '/sobre', '/projetos', '/projetos/hub081', '/contato', '/blog', '/privacidade', '/lgpd'] as const;
/** The pages whose SEO props are already the metadata of the route: the home passes none, the legal pages are frozen and equal. */
const PAGES_ON_ROUTE_META: ReadonlySet<string> = new Set(['/', '/privacidade', '/lgpd']);

interface HeadSnapshot {
  title: string;
  description: string | null;
  canonicals: string[];
  ogUrls: string[];
  robots: string | null;
  jsonLdTypes: string[];
}

/**
 * The head facts of the live document (html is null) or of an HTML text, read the same way. It runs in the browser, so it
 * holds everything it needs. The JSON-LD is searched in the whole document: the static ones are in the head, and React 19
 * writes the ones of the app where the component sits.
 */
function readHead(html: string | null): HeadSnapshot {
  const doc = html === null ? document : new DOMParser().parseFromString(html, 'text/html');
  const content = (selector: string) => doc.head.querySelector(selector)?.getAttribute('content') ?? null;
  return {
    title: doc.title,
    description: content('meta[name="description"]'),
    canonicals: [...doc.head.querySelectorAll('link[rel="canonical"]')].map((link) => link.getAttribute('href') ?? ''),
    ogUrls: [...doc.head.querySelectorAll('meta[property="og:url"]')].map((meta) => meta.getAttribute('content') ?? ''),
    robots: content('meta[name="robots"]'),
    jsonLdTypes: [...doc.querySelectorAll('script[type="application/ld+json"]')]
      .map((script) => String((JSON.parse(script.textContent ?? '{}') as { '@type'?: string })['@type']))
      .sort(),
  };
}

async function readBoth(page: import('@playwright/test').Page, path: string) {
  const raw = await (await page.request.get(path)).text();
  await page.goto(path);
  await expect.poll(() => page.locator('head [data-static-seo]').count()).toBe(0);
  return { rawHead: await page.evaluate(readHead, raw), liveHead: await page.evaluate(readHead, null) };
}

test.describe('raw HTML against the head after the app mounts', () => {
  for (const path of PARITY_PATHS) {
    test(`${path}: canonical, og:url and robots are the same`, async ({ page }) => {
      const { rawHead, liveHead } = await readBoth(page, path);

      expect(liveHead.canonicals).toEqual(rawHead.canonicals);
      expect(liveHead.ogUrls).toEqual(rawHead.ogUrls);
      expect(liveHead.robots).toBe(rawHead.robots);
    });
  }

  for (const path of PARITY_PATHS.filter((entry) => PAGES_ON_ROUTE_META.has(entry))) {
    test(`${path}: title, description and structured data are the same`, async ({ page }) => {
      const { rawHead, liveHead } = await readBoth(page, path);

      expect(liveHead.title).toBe(rawHead.title);
      expect(liveHead.description).toBe(rawHead.description);
      expect(liveHead.jsonLdTypes).toEqual(rawHead.jsonLdTypes);
    });
  }
});

test.describe('after M2', () => {
  test.skip(!IS_AFTER_M2, 'needs batch M2: the inner pages still pass their own title, description and JSON-LD to SEO.tsx');

  for (const path of PARITY_PATHS.filter((entry) => !PAGES_ON_ROUTE_META.has(entry))) {
    test(`${path}: the title, the description and the structured data are the ones of routeMeta, before and after mount`, async ({ page }) => {
      const meta = routeMetaFor(path)!;
      const { rawHead, liveHead } = await readBoth(page, path);

      expect(rawHead.title).toBe(meta.title);
      expect(liveHead.title).toBe(meta.title);
      expect(rawHead.description).toBe(meta.description);
      expect(liveHead.description).toBe(meta.description);
      expect(liveHead.jsonLdTypes).toEqual(rawHead.jsonLdTypes);
    });
  }
});

// An unknown path is a real 404 with the app page: the head says noindex before and after the app mounts, with no canonical.
test('an unknown path answers 404 with noindex in the raw HTML and after the app mounts', async ({ page }) => {
  const response = await page.request.get('/rota-que-nao-existe');
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain('name="robots" content="noindex, nofollow"');

  await page.goto('/rota-que-nao-existe');
  await expect.poll(() => page.locator('head [data-static-seo]').count()).toBe(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page).toHaveTitle(/^Página não encontrada/);
});
