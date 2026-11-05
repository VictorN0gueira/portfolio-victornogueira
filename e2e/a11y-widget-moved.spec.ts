import type { Page } from '@playwright/test';
import { PAGE_LOAD_TIMEOUT_MS, waitForSteadyHeight } from './homeSupport';
import { expect, test } from './n8nGuard';
import { PLACES, store } from './tabSupport';

// A moved accessibility tab must not change where an in page anchor lands (the top scroll band used to push every hash
// and anchor down by the height of the band: 200px too low with the tab a third of the way down).

const ANCHOR_TOLERANCE_PX = 3;

/** The top of an anchored section once the page stopped scrolling. */
async function landingOf(page: Page, path: string, id: string): Promise<number> {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(`#${id}`)).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });
  await waitForSteadyHeight(page);
  let last = Number.NaN;
  await expect
    .poll(
      async () => {
        const top = await page.locator(`#${id}`).evaluate((node) => node.getBoundingClientRect().top);
        const isSteady = Math.abs(top - last) < 0.5;
        last = top;
        return isSteady;
      },
      { timeout: PAGE_LOAD_TIMEOUT_MS, intervals: [300] },
    )
    .toBe(true);
  return last;
}

test.describe('in page anchors with a moved tab', () => {
  for (const { path, id } of [
    { path: '/#metodo', id: 'metodo' },
    { path: '/servicos#agente-de-ia-sob-medida', id: 'agente-de-ia-sob-medida' },
  ]) {
    test(`${path} lands where it does with the tab at its default place, wherever the tab is`, async ({ page: reference }) => {
      test.slow();
      // The pages of this test share the fixture's context, so the network guard covers them all.
      const context = reference.context();
      const expected = await landingOf(reference, path, id);

      const problems: string[] = [];
      for (const place of PLACES) {
        const page = await context.newPage();
        await store(page, place);
        const top = await landingOf(page, path, id);
        if (Math.abs(top - expected) > ANCHOR_TOLERANCE_PX) problems.push(`${place.side} ${place.ratio}: landed at ${top.toFixed(0)}px, the default lands at ${expected.toFixed(0)}px`);
        await page.close();
      }

      expect(problems).toEqual([]);
    });
  }
});
