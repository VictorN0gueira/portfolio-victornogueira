import type { Page } from '@playwright/test';
import { enableLargeFont, nextFrames } from './homeSupport';
import { expect, test } from './n8nGuard';
import { openPage } from './pageContract';
import {
  DESKTOP,
  LGPD,
  ONLY_IN_DESKTOP,
  PAGES,
  PHONE,
  PRIVACY,
  PRIVACY_HASH_TARGET,
  byId,
  entriesToTry,
  settledTop,
  tocLinks,
} from './legalSupport';

// Where a title lands and which entry of the contents is marked, by every way a reader gets there: a link to the page with
// a hash (a reload, a shared address), a click on the contents, a wheel, a jump. The titles are found by what the page
// renders, and the line a title crosses to count as being read is the one the page itself keeps (scroll padding plus the
// margin of the title).

const CONTROLLER_HASH = 'controlador-dos-dados';
const TABLET = { width: 768, height: 1024 };
const LANDSCAPE = { width: 844, height: 390 };
const SETTLE_WAIT_MS = 600;
const WHEEL_STEP_PX = 300;
const WHEEL_STEPS = 6;
const FAR_JUMP_PX = 2300;
const LINE_EPSILON_PX = 2;

interface Setup {
  name: string;
  size: { width: number; height: number };
  hasLargeFont?: boolean;
}
const SETUPS: readonly Setup[] = [
  { name: '390x844', size: PHONE },
  { name: '768x1024', size: TABLET },
  { name: '1440x900', size: DESKTOP },
  { name: '844x390', size: LANDSCAPE },
  { name: '390x844 with the font at 120 percent', size: PHONE, hasLargeFont: true },
];

/** The line a title crosses to count as being read, and the index of the last title above it. Computed in the page. */
function expectedActiveIndex(page: Page): Promise<number> {
  return page.evaluate((epsilon) => {
    const body = document.querySelector('[data-legal-body]');
    const headings = Array.from(body?.querySelectorAll('h2') ?? []);
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const margin = headings.length ? parseFloat(getComputedStyle(headings[0]).scrollMarginTop) || 0 : 0;
    const line = padding + margin + epsilon;
    let last = -1;
    headings.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top <= line) last = index;
    });
    return last;
  }, LINE_EPSILON_PX);
}

async function expectMarkedIndex(page: Page, expected: number, label: string): Promise<void> {
  await expect
    .poll(
      async () =>
        tocLinks(page).evaluateAll((links) =>
          links.findIndex((link) => link.getAttribute('aria-current') === 'location'),
        ),
      {
        message: label,
        timeout: 5000,
      },
    )
    .toBe(expected);
}

test.describe('where the title of an address with a hash lands', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
    await page.setViewportSize(DESKTOP);
  });

  const TARGETS = [
    { contract: LGPD, id: CONTROLLER_HASH },
    { contract: PRIVACY, id: PRIVACY_HASH_TARGET },
  ];
  for (const { contract, id } of TARGETS) {
    for (const setup of SETUPS) {
      test(`${contract.path}#${id}: the line above the title is fully under the header, at ${setup.name}`, async ({
        page,
      }) => {
        await page.setViewportSize(setup.size);
        if (setup.hasLargeFont) await enableLargeFont(page);
        await page.goto(`${contract.path}#${id}`);
        const heading = byId(page, id);
        await expect(heading).toBeFocused({ timeout: 20_000 });
        // The page puts the title back once late content settled: look after that, not at the first scroll.
        await page.waitForTimeout(SETTLE_WAIT_MS);
        await settledTop(heading);

        const { kickerTop, headerBottom } = await heading.evaluate((element) => ({
          kickerTop: (element.previousElementSibling ?? element).getBoundingClientRect().top,
          headerBottom: document.querySelector('header')?.getBoundingClientRect().bottom ?? 0,
        }));

        expect(kickerTop, 'the small line (or the title itself) starts under the header').toBeGreaterThan(headerBottom);
      });
    }
  }
});

test.describe('which entry of the contents is marked', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
    await page.setViewportSize(DESKTOP);
  });

  for (const contract of PAGES) {
    test(`${contract.path}: the clicked entry is the marked one once the title has landed, first, middle and last`, async ({
      page,
    }) => {
      await openPage(page, contract);

      for (const index of await entriesToTry(page)) {
        await tocLinks(page).nth(index).click();
        await expect(byId(page, ((await tocLinks(page).nth(index).getAttribute('href')) ?? '').slice(1))).toBeFocused();
        await page.waitForTimeout(SETTLE_WAIT_MS);

        await expectMarkedIndex(page, index, `${contract.path}: entry ${index} stays marked after the landing`);
      }
    });
  }

  test('/privacidade: after a click, a jump far down marks the section the reader is in, not the one that was clicked', async ({
    page,
  }) => {
    await openPage(page, PRIVACY);
    await tocLinks(page).nth(1).click();
    await page.waitForTimeout(SETTLE_WAIT_MS);

    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), FAR_JUMP_PX);
    await page.waitForTimeout(SETTLE_WAIT_MS);

    const expected = await expectedActiveIndex(page);
    expect(expected, 'the jump went past the clicked section').toBeGreaterThan(1);
    await expectMarkedIndex(page, expected, 'the section of the reader after the jump');
  });

  test('/privacidade: after a click, a continuous wheel passing the headings leaves the marker on the right section', async ({
    page,
  }) => {
    await openPage(page, PRIVACY);
    await tocLinks(page).nth(1).click();
    await page.waitForTimeout(SETTLE_WAIT_MS);

    for (let step = 0; step < WHEEL_STEPS; step += 1) {
      await page.mouse.wheel(0, WHEEL_STEP_PX);
      await nextFrames(page);
    }
    await page.waitForTimeout(SETTLE_WAIT_MS);

    const expected = await expectedActiveIndex(page);
    expect(expected).toBeGreaterThan(1);
    await expectMarkedIndex(page, expected, 'the section of the reader after the wheel');
  });

  test('/privacidade: scrolling up from a section marks the previous one as soon as its title comes back under the line', async ({
    page,
  }) => {
    await openPage(page, PRIVACY);
    await tocLinks(page).nth(4).click();
    await page.waitForTimeout(SETTLE_WAIT_MS);
    await expectMarkedIndex(page, 4, 'the clicked section');

    for (let step = 0; step < WHEEL_STEPS; step += 1) {
      await page.mouse.wheel(0, -WHEEL_STEP_PX / 2);
      await nextFrames(page);
    }
    await page.waitForTimeout(SETTLE_WAIT_MS);

    await expectMarkedIndex(page, await expectedActiveIndex(page), 'the marked entry follows the reader up');
  });
});
