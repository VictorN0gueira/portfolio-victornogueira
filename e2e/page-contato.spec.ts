import type { Page } from '@playwright/test';
import { contactCopy } from '../src/data/contactCopy';
import { homeCopy } from '../src/data/homeCopy';
import { routeMetaFor } from '../src/seo/routeMeta';
import { describePageContract } from './pageContract';
import { N8N_WEBHOOK_PATTERN, expect, fulfillOk, n8nRoute, test } from './n8nGuard';
import { QUOTE_BUTTON, QUOTE_START } from './homeSupport';

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
    const visible = await page.locator('section details summary').allTextContents();

    expect(faqPages).toHaveLength(1);
    expect(faqPages[0].length).toBeGreaterThan(0);
    for (const question of faqPages[0]) expect(visible.map((text) => text.trim())).toContain(question);
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
