import { FEATURES_LABEL, TAGS_LABEL } from '../src/components/projectLabels';
import { PAGE_LOAD_TIMEOUT_MS, nextFrames } from './homeSupport';
import { expect, test } from './n8nGuard';
import { describePageContract, openPage, type PageContract } from './pageContract';

const FEATURED: PageContract = {
  path: '/projetos/dizpara',
  title: /^DizPara/,
  h1: 'DizPara',
  readyHeading: FEATURES_LABEL,
  hasFloatingClearance: true,
};
const REGULAR: PageContract = {
  path: '/projetos/travel-ia',
  title: /^Travel IA/,
  h1: 'Travel IA',
  readyHeading: TAGS_LABEL,
  hasFloatingClearance: true,
};
const DESKTOP = { width: 1440, height: 900 };
const SCROLL_PX = 150;
const STUCK_OFFSET_PX = 250;
const PIXEL_TOLERANCE = 1;

test.describe('case page of a featured project', () => {
  describePageContract(FEATURED);
});

test.describe('case page of a regular project', () => {
  describePageContract(REGULAR);
});

test.describe('the case pages', () => {
  test('an address of a project that left the list ends in /projetos', async ({ page }) => {
    await page.goto('/projetos/troco');

    await expect(page).toHaveURL(/\/projetos$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Projetos' })).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
  });

  test('the column of facts stays in place while the three stacked shots scroll, at 1440', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'the test sets its own viewport: it runs once, in the desktop project',
    );
    await page.setViewportSize(DESKTOP);
    await openPage(page, REGULAR);
    const facts = page.locator('[data-case-body] > :first-child');
    const gallery = page.getByRole('group', { name: /^Telas de/ });
    // A regular project has three stacked shots, taller than the facts, so there is room to stick (the gallery of a
    // featured project is shorter than its facts). The top of the body is above the window, so the facts are stuck at their sticky top.
    await page.evaluate((offset) => {
      const body = document.querySelector('[data-case-body]') as HTMLElement;
      window.scrollTo({ top: body.getBoundingClientRect().top + window.scrollY + offset, behavior: 'instant' });
    }, STUCK_OFFSET_PX);
    await nextFrames(page);
    const before = (await facts.boundingBox())?.y ?? Number.NaN;
    const galleryBefore = (await gallery.boundingBox())?.y ?? Number.NaN;

    await page.evaluate((delta) => window.scrollBy({ top: delta, behavior: 'instant' }), SCROLL_PX);
    await nextFrames(page);
    const after = (await facts.boundingBox())?.y ?? Number.NaN;
    const galleryAfter = (await gallery.boundingBox())?.y ?? Number.NaN;

    expect(galleryBefore - galleryAfter, 'the gallery moved up with the scroll').toBeGreaterThan(
      SCROLL_PX - PIXEL_TOLERANCE,
    );
    expect(Math.abs(before - after), 'the facts stayed where they were').toBeLessThanOrEqual(PIXEL_TOLERANCE);
  });

  test('the next project is the last link before the closing band, and it opens that case', async ({ page }) => {
    await openPage(page, FEATURED);

    await page.getByRole('link', { name: /^próximo projeto Hub081/i }).click();

    await expect(page).toHaveURL(/\/projetos\/hub081$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Hub081' })).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
  });
});
