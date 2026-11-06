import { ANCHOR_BOUNDS } from './headerBounds';
import { PAGE_LOAD_TIMEOUT_MS, nextFrames } from './homeSupport';
import { expect, test } from './n8nGuard';
import { describePageContract, openPage } from './pageContract';
import {
  CONTROLLER_KICKER,
  DESKTOP,
  INK_RGB,
  LGPD,
  MAX_BODY_SHIFT,
  ONLY_IN_DESKTOP,
  PAGES,
  PHONE,
  POSITION_TOLERANCE_PX,
  PRIVACY,
  PRIVACY_HASH_TARGET,
  SCROLL_STEP_PX,
  STICKY_TOP_PX,
  TOC_NAV,
  byId,
  entriesToTry,
  expectJustBelowHeader,
  readShifts,
  settledTop,
  tocLinks,
  watchShifts,
} from './legalSupport';

test.describe('/privacidade and /lgpd', () => {
  for (const contract of PAGES) {
    describePageContract(contract);
  }
});

test.describe('the frame of the legal pages', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
    await page.setViewportSize(DESKTOP);
  });

  for (const contract of PAGES) {
    test(`${contract.path}: the contents stay put while the text scrolls, at 1440`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await openPage(page, contract);
      const nav = page.locator(TOC_NAV);
      await expect(nav).toBeVisible();
      expect(await nav.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
      expect(await page.locator(`${TOC_NAV} details`).count(), 'a column, not a folded list').toBe(0);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await nextFrames(page);

      for (const offset of [SCROLL_STEP_PX / 4, SCROLL_STEP_PX / 2]) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), offset);
        await nextFrames(page);
        const top = await nav.evaluate((element) => element.getBoundingClientRect().top);
        expect(Math.abs(top - STICKY_TOP_PX), `top of the contents at scroll ${offset}`).toBeLessThanOrEqual(
          POSITION_TOLERANCE_PX,
        );
      }
      await page.screenshot({ path: `e2e/__shots__/legal-sticky-${contract.path.slice(1)}-1440x900.png` });
    });

    test(`${contract.path}: a click on the contents puts the title under the header and keeps focus on it, at 1440`, async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      await openPage(page, contract);

      for (const index of await entriesToTry(page)) {
        const link = tocLinks(page).nth(index);
        const href = (await link.getAttribute('href')) ?? '';
        await link.click();

        const heading = byId(page, href.slice(1));
        await expect(heading).toBeFocused();
        expectJustBelowHeader(await settledTop(heading), `${contract.path} entry ${index}`);
        await expect(link).toHaveAttribute('aria-current', 'location');
        expect(new URL(page.url()).hash).toBe(href);
        expect(new URL(page.url()).pathname).toBe(contract.path);
      }
    });

    test(`${contract.path}: the contents do not push the text when they appear, at 390`, async ({ page }) => {
      await page.setViewportSize(PHONE);
      await watchShifts(page);
      await page.goto(contract.path);
      await expect(page.locator(`${TOC_NAV} summary`)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT_MS });
      await page.evaluate(() => document.fonts.ready);
      await nextFrames(page);
      await nextFrames(page);

      const shifts = (await readShifts(page)).filter((shift) => shift.isPageBody);

      expect(
        shifts.reduce((sum, shift) => sum + shift.value, 0),
        `layout shifts of the page body: ${shifts.map((shift) => shift.value).join(', ')}`,
      ).toBeLessThan(MAX_BODY_SHIFT);
    });

    test(`${contract.path}: marks the section being read while scrolling, one at a time, at 1440`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await openPage(page, contract);
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight / 2, behavior: 'instant' }),
      );

      await expect(page.locator(`${TOC_NAV} a[aria-current="location"]`)).toHaveCount(1);
    });

    test(`${contract.path}: the contents are a folded list above the text at 390, and a choice closes it and lands on the title`, async ({
      page,
    }) => {
      await page.setViewportSize(PHONE);
      await openPage(page, contract);
      const details = page.locator(`${TOC_NAV} details`);
      await expect(details).toHaveCount(1);
      await expect(details).not.toHaveAttribute('open', '');
      await page.screenshot({ path: `e2e/__shots__/legal-folded-${contract.path.slice(1)}-390x844.png` });

      for (const index of await entriesToTry(page)) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await details.locator('summary').click();
        await expect(details).toHaveAttribute('open', '');
        const link = tocLinks(page).nth(index);
        const box = await link.boundingBox();
        expect(box?.height ?? 0, 'a row is a 44px target').toBeGreaterThanOrEqual(44 - 0.01);
        const id = ((await link.getAttribute('href')) ?? '').slice(1);
        await link.click();

        await expect(details).not.toHaveAttribute('open', '');
        await expect(byId(page, id)).toBeFocused();
        expectJustBelowHeader(await settledTop(byId(page, id)), `${contract.path} entry ${index} at 390`);
      }
    });
  }

  test('/privacidade: an address with a hash leads to its title, below the header, with focus on it', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`/privacidade#${PRIVACY_HASH_TARGET}`);
    const heading = byId(page, PRIVACY_HASH_TARGET);

    await expect(heading).toBeFocused({ timeout: PAGE_LOAD_TIMEOUT_MS });
    await expect
      .poll(() => heading.evaluate((element) => element.getBoundingClientRect().top))
      .toBeGreaterThan(ANCHOR_BOUNDS.minTopPx);
    await expect
      .poll(() => heading.evaluate((element) => element.getBoundingClientRect().top))
      .toBeLessThan(ANCHOR_BOUNDS.maxTopPx);
  });

  test('the links of the contents show a ring when reached by the keyboard, and Enter leads to the title', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await openPage(page, PRIVACY);
    const second = tocLinks(page).nth(1);
    await tocLinks(page).first().focus();
    await page.keyboard.press('Tab');

    await expect(second).toBeFocused();
    const outline = await second.evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, color: style.outlineColor };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(2);
    expect(outline.color).toBe(INK_RGB);

    const id = ((await second.getAttribute('href')) ?? '').slice(1);
    await page.keyboard.press('Enter');
    await expect(byId(page, id)).toBeFocused();
  });

  test('the table of contents reads the same as the titles: the same words, the same case, in the same order', async ({
    page,
  }) => {
    for (const contract of PAGES) {
      await page.setViewportSize(DESKTOP);
      await openPage(page, contract);
      const labels = await tocLinks(page).allInnerTexts();
      const titles = await page.locator('[data-legal-body] h2').allInnerTexts();
      // On /lgpd the black card of the controller is named by its kicker, not by the name of the person.
      const expected = contract === LGPD ? [CONTROLLER_KICKER.toLowerCase(), ...titles.slice(1)] : titles;

      // The titles are lowercase by CSS (the site rule), and so are the labels: both read the same on the screen.
      expect(labels).toEqual(expected);
      expect(labels.length).toBeGreaterThan(2);
      const transforms = await tocLinks(page).evaluateAll((links) =>
        links.map((link) => getComputedStyle(link).textTransform),
      );
      expect(new Set(transforms)).toEqual(new Set(['lowercase']));
    }
  });
});
