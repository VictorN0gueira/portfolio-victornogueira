import type { Page } from '@playwright/test';
import { BLOG_IMAGE_HOSTS, CLOUDINARY_HOST, CLOUDINARY_PATH_PREFIX } from '../config/blogImageHosts.mjs';
import { SECURITY_HEADERS } from '../config/securityHeaders.mjs';
import { contactFormCopy } from '../src/components/contact/contactFormCopy';
import { serviceOptions } from '../src/data/services';
import { WEBHOOKS } from '../src/lib/contact';
import { menuButton } from './homeSupport';
import { N8N_WEBHOOK_PATTERN, expect, fulfillOk, n8nRoute, test } from './n8nGuard';

// `vite preview` serves the build with the real security headers (config/securityHeaders.mjs, the same module that
// generates the nginx snippet), so every run of this suite executes under the production policy. This spec proves
// two things: the headers are on the responses, and no page of the site breaks the policy. A violation here means the
// site started to load something the policy forbids, which in production is a blocked script, image or request.
//
// The lead channel is exercised too: the webhook request is answered by a page route, and a route answers a request
// only after the browser has let it out, so the connect-src check still runs. The guard (./n8nGuard) never lets it
// reach the real n8n.

// A project case page. The slug is written here because src/data/projects reads import.meta.env, which Playwright does not have.
const PROJECT_SLUG = 'hub081';
const PAGE_PATHS = [
  '/',
  '/projetos',
  `/projetos/${PROJECT_SLUG}`,
  '/sobre',
  '/servicos',
  '/contato',
  '/blog',
  '/privacidade',
  '/lgpd',
  '/pagina-que-nao-existe',
];
const MENU_DIALOG_NAME = 'Menu de navegação';

interface Violation {
  directive: string;
  blocked: string;
  source: string;
}

/** Records every securitypolicyviolation of the document, from before the first script of the page runs. */
async function recordViolations(page: Page): Promise<() => Promise<Violation[]>> {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /content security policy/i.test(message.text()))
      consoleErrors.push(message.text());
  });
  await page.addInitScript(() => {
    const store: Violation[] = [];
    (window as unknown as { __cspViolations: Violation[] }).__cspViolations = store;
    document.addEventListener('securitypolicyviolation', (event) => {
      store.push({ directive: event.violatedDirective, blocked: event.blockedURI, source: event.sourceFile });
    });
  });
  return async () => {
    const seen = await page.evaluate(
      () => (window as unknown as { __cspViolations?: Violation[] }).__cspViolations ?? [],
    );
    return [...seen, ...consoleErrors.map((text) => ({ directive: 'console', blocked: text, source: '' }))];
  };
}

/** Scrolls down screen by screen, so lazy sections and lazy images load while the page is watched. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const frame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    for (let top = 0; top < document.documentElement.scrollHeight; top += window.innerHeight) {
      window.scrollTo(0, top);
      await frame();
    }
    window.scrollTo(0, 0);
    await frame();
  });
}

async function visit(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('#root > *').first()).toBeAttached();
  await page.waitForLoadState('load');
  await scrollThrough(page);
}

test.describe('security headers on the preview', () => {
  test('the page and the files it loads carry every security header', async ({ page, baseURL }) => {
    const ownOrigin = new URL(baseURL ?? 'http://localhost:4173').origin;
    const responses: { url: string; headers: Record<string, string> }[] = [];
    page.on('response', (response) => {
      if (new URL(response.url()).origin === ownOrigin)
        responses.push({ url: response.url(), headers: response.headers() });
    });

    const document = await page.goto('/sobre');
    await page.waitForLoadState('load');

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(document?.headers()[name.toLowerCase()], `${name} on the page`).toBe(value);
    }
    const script = responses.find((response) => /\/assets\/.*\.js$/.test(response.url));
    const font = responses.find((response) => /\.woff2$/.test(response.url));
    expect(script, 'a script was loaded').toBeDefined();
    expect(font, 'a font was loaded').toBeDefined();
    for (const response of [script, font]) {
      expect(response?.headers['x-content-type-options'], response?.url).toBe('nosniff');
      expect(response?.headers['content-security-policy'], response?.url).toBe(
        SECURITY_HEADERS['Content-Security-Policy'],
      );
    }
  });

  test('the policy forbids framing, plugins and foreign scripts', async () => {
    const policy = SECURITY_HEADERS['Content-Security-Policy'];
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toMatch(/script-src 'self'(;|$)/);
  });
});

test.describe('no page breaks the policy', () => {
  for (const path of PAGE_PATHS) {
    test(`${path} loads with zero violations`, async ({ page }) => {
      const violations = await recordViolations(page);
      await visit(page, path);
      expect(await violations()).toEqual([]);
    });
  }

  test('the detector sees a forbidden request and an inline script (a control: the policy is really enforced)', async ({
    page,
  }) => {
    const violations = await recordViolations(page);
    await visit(page, '/sobre');

    await page.evaluate(() => fetch('https://not-allowed.example/data').catch(() => undefined));
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'window.__inlineRan = true';
      document.head.append(script);
    });

    const seen = await violations();
    expect(seen.map((violation) => violation.directive.split('-elem')[0])).toEqual(
      expect.arrayContaining(['connect-src', 'script-src']),
    );
    expect(await page.evaluate(() => (window as unknown as { __inlineRan?: boolean }).__inlineRan)).toBeUndefined();
  });

  test('the open testimonial dialog and the mobile menu break nothing', async ({ page }, testInfo) => {
    const violations = await recordViolations(page);
    await visit(page, '/');

    await page
      .getByRole('button', { name: /^Ler depoimento completo/ })
      .first()
      .click();
    const testimonial = page.getByRole('dialog').first();
    await expect(testimonial).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(testimonial).toBeHidden();

    if (testInfo.project.name === 'mobile') {
      await menuButton(page).click();
      const menu = page.getByRole('dialog', { name: MENU_DIALOG_NAME });
      await expect(menu).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
    }

    expect(await violations()).toEqual([]);
  });
});

const SUPABASE_ARTICLES = '**/rest/v1/articles*';
// A host the site already talks to (a feed it may fetch), but one that is not on the image list: the policy must refuse it for images.
const HOSTILE_IMAGE = 'https://www.tabnews.com.br/hostile-pixel.png';
const FALLBACK_IMAGE_PREFIX = 'data:image/svg+xml';
const CORS_JSON = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' };

/** One sample article whose cover image is `image`. Dated now, so the sanitizer keeps it. */
function sampleArticle(index: number, image: string) {
  return {
    title: `Artigo de teste ${index}`,
    summary: 'Texto de teste da política de segurança.',
    url: `https://dev.to/teste/artigo-${index}`,
    image,
    published_at: new Date(Date.now() - index * 3_600_000).toISOString(),
    source: 'Dev.to',
    language: 'pt',
  };
}

/** The blog's Supabase PostgREST endpoint answers with `articles` as a plain DB row array; preflight is answered too. */
async function serveArticles(page: Page, articles: readonly object[]) {
  await page.route(SUPABASE_ARTICLES, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_JSON });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: CORS_JSON,
      contentType: 'application/json',
      body: JSON.stringify(articles),
    });
  });
}

test.describe('the image sources of the policy', () => {
  test('the blog shows a cover image from every allowed host with zero violations, and a hostile host never loads', async ({
    page,
  }) => {
    const allowed = BLOG_IMAGE_HOSTS.map((host, index) =>
      sampleArticle(
        index + 1,
        `https://${host}${host === CLOUDINARY_HOST ? CLOUDINARY_PATH_PREFIX : '/'}cover-${index}.png`,
      ),
    );
    const hostile = sampleArticle(BLOG_IMAGE_HOSTS.length + 1, HOSTILE_IMAGE);
    await serveArticles(page, [...allowed, hostile]);
    const requested = new Set<string>();
    page.on('request', (request) => requested.add(request.url()));
    const violations = await recordViolations(page);

    await visit(page, '/blog');
    await expect(page.getByText(hostile.title)).toBeVisible();

    for (const host of BLOG_IMAGE_HOSTS) {
      const cover = page.locator(`img[src^="https://${host}/"]`);
      await expect(cover, host).toHaveCount(1);
      await cover.scrollIntoViewIfNeeded();
      await expect
        .poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { message: host })
        .toBe(true);
    }
    // The sanitizer drops the foreign cover before it is rendered, so the card shows the built-in placeholder and nothing is requested.
    const hostileCover = page
      .getByRole('article')
      .filter({ has: page.getByRole('link', { name: new RegExp(hostile.title) }) })
      .locator('img');
    await expect
      .poll(() => hostileCover.getAttribute('src').then((src) => src?.startsWith(FALLBACK_IMAGE_PREFIX)))
      .toBe(true);
    expect([...requested]).not.toContain(HOSTILE_IMAGE);
    expect(await violations()).toEqual([]);
  });

  test('the policy itself blocks an image from a host outside the list, even one the site fetches data from', async ({
    page,
  }) => {
    const violations = await recordViolations(page);
    await visit(page, '/blog');

    const outcome = await page.evaluate(
      (src) =>
        new Promise<{ loaded: boolean; width: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ loaded: true, width: img.naturalWidth });
          img.onerror = () => resolve({ loaded: false, width: img.naturalWidth });
          img.src = src;
        }),
      HOSTILE_IMAGE,
    );

    expect(outcome).toEqual({ loaded: false, width: 0 });
    // The browser reports it twice: as the securitypolicyviolation event and as a console error.
    const seen = await violations();
    expect(seen.map((violation) => violation.directive)).toEqual(['img-src', 'console']);
    expect(seen[0].blocked).toBe(HOSTILE_IMAGE);
    expect(seen[1].blocked).toContain(HOSTILE_IMAGE);
  });
});

test.describe('the lead channel under the policy', () => {
  test('the contact form still reaches the e-mail webhook, with zero violations and never the real n8n', async ({
    page,
    network,
  }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const violations = await recordViolations(page);
    await visit(page, '/#contato');

    const form = page.locator('form[name="contact"]');
    await form.scrollIntoViewIfNeeded();
    // Fictitious data on purpose: example.com is reserved, so a mock that failed open could not create a real lead.
    await form.getByLabel(contactFormCopy.labels.nome, { exact: true }).fill('Ana Lima');
    await form.getByRole('button', { name: contactFormCopy.placeholders.servico }).click();
    await form.getByRole('option', { name: serviceOptions[0] }).click();
    await form.getByLabel(contactFormCopy.labels.mensagem, { exact: true }).fill('Teste da politica de seguranca');
    await form.getByLabel(contactFormCopy.labels.email, { exact: true }).fill('ana@example.com');
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: contactFormCopy.submit, exact: true }).click();

    await expect(page.getByRole('heading', { level: 3, name: contactFormCopy.success.title })).toBeVisible();
    expect(network.calls).toHaveLength(1);
    expect(network.calls[0].url).toBe(WEBHOOKS.email);
    expect(await violations()).toEqual([]);
  });
});
