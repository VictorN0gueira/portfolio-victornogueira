import type { Locator, Page } from '@playwright/test';
import { N8N_WEBHOOK_PATTERN, expect, fulfillOk, n8nRoute, test } from './n8nGuard';
import { useOverlayScrollbars } from './phoneEmulation';

// The whole home, assembled: the sections in order, no horizontal overflow, the anchors that point into it and the
// hand over of the ROI quote to the form. Every test goes through the guard of ./n8nGuard (the home mounts the real
// form, so nothing may reach n8n), and none sends the form.

const STATEMENT_HEADING = 'O trabalho repetitivo vai para os fluxos. A equipe fica com o resto.';
const FINAL_HEADING = 'Qual processo a gente automatiza primeiro?';
const SECTION_HEADINGS = [
  'Comece pelo processo que mais pesa na rotina',
  'Três jeitos de tirar trabalho manual da sua frente',
  'Do primeiro papo ao fluxo rodando',
  'Quanto o trabalho manual custa por ano',
  'Quem já automatizou com a gente',
  'Perguntas que a gente sempre ouve',
  FINAL_HEADING,
];
const QUOTE_BUTTON = 'Quero automatizar esse processo';
const QUOTE_START = 'Olá, VN One! Usei a calculadora do site';
const OVERFLOW_WIDTHS = [320, 768, 1024, 1440];
const SMALLEST_PHONE = { width: 280, height: 653 };
const DESKTOP_1440 = { width: 1440, height: 900 };
const ULTRA_WIDE = { width: 2560, height: 1080 };
const MIN_TOUCH_PX = 44;
const PLACEHOLDER_EMAIL = 'voce@empresa.com.br';
// The header floats over the top of the page and the anchors stop below it (scroll-padding-top of index.css).
const ANCHOR_TOP_MAX_PX = 140;
const ANCHOR_TOP_MIN_PX = -2;
const PAGE_LOAD_TIMEOUT_MS = 20_000;
// A late chunk: long enough for the sections around it to be laid out first.
const CHUNK_DELAY_MS = 1200;
const SUBPIXEL_PX = 1;

/** The home is ready when its last lazy section, the form, is in the page. */
async function openHome(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('form[name="contact"]')).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });
  for (const name of [STATEMENT_HEADING, ...SECTION_HEADINGS]) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeAttached();
  }
}

async function enableLargeFont(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('a11y-preferences', JSON.stringify({ fontSize: true }));
  });
}

/** Two frames later: layout and any scroll the page started have been applied. */
const nextFrames = (page: Page) =>
  page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

const topOf = (page: Page, id: string) =>
  page.evaluate((target) => document.getElementById(target)?.getBoundingClientRect().top ?? Number.NaN, id);

/** Waits for the smooth scroll of an anchor to end with the section right under the header. */
async function expectSectionAtTop(page: Page, id: string) {
  await expect.poll(() => topOf(page, id), { timeout: PAGE_LOAD_TIMEOUT_MS }).toBeLessThanOrEqual(ANCHOR_TOP_MAX_PX);
  await expect.poll(() => topOf(page, id), { timeout: PAGE_LOAD_TIMEOUT_MS }).toBeGreaterThanOrEqual(ANCHOR_TOP_MIN_PX);
}

test.describe('home sections', () => {
  test('shows the hero first and every section after it, one under the other, in the order of the brief', async ({ page }) => {
    await openHome(page);

    const tops = await page.evaluate((headings) => {
      const top = (element: Element | null) => (element ? element.getBoundingClientRect().top + window.scrollY : Number.NaN);
      const h2s = Array.from(document.querySelectorAll('h2'));
      return {
        hero: top(document.querySelector('h1')),
        named: headings.map((name) => top(h2s.find((h2) => h2.textContent === name) ?? null)),
      };
    }, [STATEMENT_HEADING, ...SECTION_HEADINGS]);

    const ordered = [tops.hero, ...tops.named];
    expect(ordered.every(Number.isFinite)).toBe(true);
    expect([...ordered].sort((a, b) => a - b)).toEqual(ordered);
    expect(new Set(ordered).size).toBe(ordered.length);
  });

  test('has one contact form, and only one anchor called contato', async ({ page }) => {
    await openHome(page);

    await expect(page.locator('form[name="contact"]')).toHaveCount(1);
    await expect(page.locator('#contato')).toHaveCount(1);
    await expect(page.locator('#contact-nome')).toHaveCount(1);
  });

  test('carries none of the old home sections', async ({ page }) => {
    await openHome(page);

    await expect(page.getByText('Cases em Destaque')).toHaveCount(0);
    await expect(page.getByText(/Vamos criar/)).toHaveCount(0);
  });

  for (const width of OVERFLOW_WIDTHS) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await openHome(page);
      await nextFrames(page);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
});

test.describe('home anchors', () => {
  for (const id of ['metodo', 'clientes']) {
    test(`lands on #${id} after the lazy sections have loaded`, async ({ page }) => {
      await openHome(page, `/#${id}`);

      await expectSectionAtTop(page, id);
    });

    test(`keeps #${id} in place when the sections above it arrive late`, async ({ page }) => {
      // The chunks of the sections above both anchors answer late, one after the other, while the rest is there.
      for (const chunk of ['StatementStats', 'UseCaseTabs', 'ServicesCards']) {
        await page.route(new RegExp(`/assets/${chunk}-[^/]+\\.js$`), async (route) => {
          await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
          await route.continue();
        });
      }
      await openHome(page, `/#${id}`);
      await nextFrames(page);

      await expectSectionAtTop(page, id);
    });
  }
});

test.describe('home quote hand over', () => {
  const messageField = (page: Page) => page.getByLabel('Mensagem', { exact: true });

  test('fills the message and scrolls to the form, and does it again after the field was edited', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    await openHome(page);
    const quote = page.getByRole('button', { name: QUOTE_BUTTON });
    await quote.scrollIntoViewIfNeeded();
    await quote.click();

    await expect(messageField(page)).toHaveValue(new RegExp(`^${QUOTE_START}`));
    await expectSectionAtTop(page, 'contato');
    const message = await messageField(page).inputValue();

    await messageField(page).fill('Outra coisa');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await quote.scrollIntoViewIfNeeded();
    await quote.click();

    await expect(messageField(page)).toHaveValue(message);
    await expectSectionAtTop(page, 'contato');
    expect(network.calls).toHaveLength(0);
  });
});

test.describe('final call to action fit (M11)', () => {
  const heading = (page: Page): Locator => page.getByRole('heading', { level: 2, name: FINAL_HEADING });

  /** The words of the heading that are drawn on more than one line box: a word broken in the middle. */
  const brokenWords = (target: Locator) =>
    target.evaluate((element) => {
      const broken: string[] = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent ?? '';
        for (const match of text.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(node, match.index ?? 0);
          range.setEnd(node, (match.index ?? 0) + match[0].length);
          const lines = new Set(Array.from(range.getClientRects()).map((rect) => Math.round(rect.top)));
          if (lines.size > 1) broken.push(match[0]);
        }
      }
      return broken;
    });

  for (const viewport of [DESKTOP_1440, ULTRA_WIDE]) {
    test(`never breaks a word of the heading, "automatiza" included, at ${viewport.width}px with the larger font`, async ({ page }) => {
      await enableLargeFont(page);
      await page.setViewportSize(viewport);
      await openHome(page);
      await expect(page.locator('html')).toHaveClass(/a11y-font-large/);
      await heading(page).scrollIntoViewIfNeeded();
      await nextFrames(page);

      expect(await brokenWords(heading(page))).toEqual([]);
    });
  }

  test('fits the longest placeholder in the e-mail field at 280px, and every control is 44px tall', async ({ page }) => {
    await page.setViewportSize(SMALLEST_PHONE);
    await openHome(page);
    await useOverlayScrollbars(page);
    const form = page.locator('form[name="contact"]');
    await form.scrollIntoViewIfNeeded();
    const email = form.getByLabel('E-mail', { exact: true });
    await expect(email).toHaveAttribute('placeholder', PLACEHOLDER_EMAIL);

    const { textWidth, contentWidth } = await email.evaluate((input, text) => {
      const style = getComputedStyle(input);
      const context = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      return { textWidth: context.measureText(text).width, contentWidth: input.clientWidth - padding };
    }, PLACEHOLDER_EMAIL);
    expect(textWidth).toBeLessThanOrEqual(contentWidth + SUBPIXEL_PX);

    const panel = form.locator('xpath=..');
    const controls: Record<string, Locator> = {
      'Por e-mail': panel.getByRole('button', { name: 'Por e-mail' }),
      'Por WhatsApp': panel.getByRole('button', { name: 'Por WhatsApp' }),
      Nome: form.getByLabel('Nome', { exact: true }),
      Serviço: form.getByRole('button', { name: 'Selecione um serviço' }),
      'E-mail': email,
      Mensagem: form.getByLabel('Mensagem', { exact: true }),
      Enviar: form.getByRole('button', { name: 'Enviar', exact: true }),
    };
    for (const [name, control] of Object.entries(controls)) {
      const box = await control.boundingBox();
      expect(box, name).not.toBeNull();
      expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
    }
  });
});
