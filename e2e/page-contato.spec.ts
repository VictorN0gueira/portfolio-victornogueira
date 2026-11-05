import type { Page } from '@playwright/test';
import { contactCopy } from '../src/data/contactCopy';
import { homeCopy } from '../src/data/homeCopy';
import { routeMetaFor } from '../src/seo/routeMeta';
import { describePageContract } from './pageContract';
import { N8N_WEBHOOK_PATTERN, expect, fulfillOk, n8nRoute, test } from './n8nGuard';
import { QUOTE_BUTTON, QUOTE_START, enableLargeFont } from './homeSupport';
import { CONTACT_EMAIL } from '../src/lib/constants';

// /contato mounts the real contact form, so every test here takes `test` from the guard and answers the n8n route
// itself: nothing is typed into the form, nothing is submitted and the real webhooks are never reached.
const escapeForRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TITLE = new RegExp(`^${escapeForRegExp(routeMetaFor('/contato')?.title ?? '')}$`);
const messageField = (page: Page) => page.getByLabel('Mensagem', { exact: true });

test.describe('page /contato', () => {
  describePageContract({
    path: '/contato',
    title: TITLE,
    h1: contactCopy.title,
    readyHeading: homeCopy.roi.heading,
    hasContactForm: true,
    hasFloatingClearance: true,
  });

  test('writes the FAQPage of the questions once, and it matches the questions on the page', async ({
    page,
    network,
  }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    await page.goto('/contato');
    await expect(page.getByRole('heading', { level: 2, name: homeCopy.faq.heading })).toBeAttached();

    const faqPages = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map((node) => JSON.parse(node.textContent ?? '{}'))
        .flatMap((data) => (Array.isArray(data['@graph']) ? data['@graph'] : [data]))
        .filter((node) => node['@type'] === 'FAQPage')
        .map((node) => (node.mainEntity as Array<{ name: string }>).map((question) => question.name)),
    );
    // The questions that the page shows: the summaries of the FAQ section, the one named by the heading above.
    const faqSection = page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name: homeCopy.faq.heading }) });
    const visible = (await faqSection.locator('details summary').allTextContents()).map((text) => text.trim());

    expect(faqPages).toHaveLength(1);
    expect(visible.length).toBeGreaterThan(0);
    // Both ways: the same number of questions and the same set, so neither a missing nor an extra one goes unseen.
    expect(faqPages[0]).toHaveLength(visible.length);
    expect(new Set(faqPages[0])).toEqual(new Set(visible));
  });

  test('takes the estimate of the simulator to the message, with the n8n route answered and nothing sent', async ({
    page,
    network,
  }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    await page.goto('/contato');
    const quote = page.getByRole('button', { name: QUOTE_BUTTON });
    await quote.scrollIntoViewIfNeeded();
    await quote.click();

    await expect(messageField(page)).toHaveValue(new RegExp(`^${escapeForRegExp(QUOTE_START)}`));
    await expect(messageField(page)).toBeFocused();
    await expect(page.locator('div[role="status"]').filter({ hasText: /preenchida/ })).toHaveCount(1);
    expect(network.calls).toHaveLength(0);
  });
});

// The address of the channels card breaks only after the @ (a wbr there): at the narrowest phones and with the larger
// font each half stays whole on its own line, and the link never grows past the card.
const NARROWEST_WIDTH = 280;
const EMAIL_WIDTHS = [NARROWEST_WIDTH, 320];
const EMAIL_HEIGHT = 700;

for (const width of EMAIL_WIDTHS) {
  test(`breaks the e-mail only at the @ and keeps it inside the card at ${width}px with the larger font`, async ({ page, network }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the viewport is set by this test');
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    await enableLargeFont(page);
    await page.setViewportSize({ width, height: EMAIL_HEIGHT });
    await page.goto('/contato');
    const link = page.locator('main dl').getByRole('link', { name: new RegExp(`^${escapeForRegExp(CONTACT_EMAIL)}`) });
    await expect(link).toBeVisible();

    const report = await link.evaluate((anchor) => {
      const lines = (node: Node): number => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return new Set(Array.from(range.getClientRects()).map((box) => Math.round(box.top))).size;
      };
      const [name, domain] = Array.from(anchor.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
      const topOf = (node: Node): number => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return Math.round(range.getBoundingClientRect().top);
      };
      const card = anchor.closest('dl')?.parentElement?.getBoundingClientRect();
      const box = anchor.getBoundingClientRect();
      return {
        isBrokenAtTheAt: topOf(domain) > topOf(name),
        nameLines: lines(name),
        domainLines: lines(domain),
        pastCard: card ? Math.max(0, box.right - card.right) : Number.NaN,
        scrollExcess: anchor.scrollWidth - anchor.clientWidth,
        nameText: name.textContent,
        domainText: domain.textContent,
      };
    });

    expect(report.nameText).toMatch(/@$/);
    expect(report.nameLines, 'the part before the @ is on one line').toBe(1);
    expect(report.domainLines, 'the part after the @ is on one line').toBe(1);
    // At 280px there is no room for the whole address: the only break is the one after the @.
    if (width === NARROWEST_WIDTH) expect(report.isBrokenAtTheAt, 'the domain goes under the name').toBe(true);
    expect(report.pastCard).toBeLessThanOrEqual(0.5);
    expect(report.scrollExcess).toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}
