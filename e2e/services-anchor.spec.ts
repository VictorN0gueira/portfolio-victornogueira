import type { Page } from '@playwright/test';
import { ANCHOR_MAX_TOP_PX, ANCHOR_MIN_TOP_PX } from './headerBounds';
import { expect, test } from './n8nGuard';

// The six slugs of data/services.ts. The footer links of batch D point at /servicos#<slug>; this is what they need.
const SLUGS = [
  'automacao-essencial',
  'automacao-avancada',
  'super-agente',
  'agente-de-ia-sob-medida',
  'landing-page-ou-site',
  'sistema-web-sob-medida',
] as const;
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
];

async function cardTop(page: Page, slug: string): Promise<number> {
  return page.evaluate((id) => document.getElementById(id)?.getBoundingClientRect().top ?? Number.NaN, slug);
}

async function expectCardUnderHeader(page: Page, slug: string) {
  await expect
    .poll(() => cardTop(page, slug), { message: `${slug} lands under the header` })
    .toBeGreaterThan(ANCHOR_MIN_TOP_PX);
  await expect.poll(() => cardTop(page, slug)).toBeLessThan(ANCHOR_MAX_TOP_PX);
}

test.describe('/servicos#slug', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`at ${viewport.name} px`, () => {
      test.beforeEach(async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop', 'the viewport is set by this test');
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      for (const slug of SLUGS) {
        test(`scrolls a direct load of #${slug} to the card`, async ({ page }) => {
          await page.goto(`/servicos#${slug}`);

          await expectCardUnderHeader(page, slug);
        });
      }

      for (const slug of SLUGS) {
        test(`scrolls to #${slug} when the hash is followed inside the open page`, async ({ page }) => {
          await page.goto('/');
          await page.getByRole('link', { name: 'Serviços', exact: true }).first().click();
          await expect(page).toHaveURL(/\/servicos$/);
          // What a router Link to /servicos#slug does: push the entry and tell the router.
          await page.evaluate((id) => {
            window.history.pushState({}, '', `/servicos#${id}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }, slug);

          await expectCardUnderHeader(page, slug);
        });
      }
    });
  }
});
