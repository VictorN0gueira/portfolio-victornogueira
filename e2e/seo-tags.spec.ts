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
