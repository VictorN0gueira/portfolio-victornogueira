import type { Locator, Page } from '@playwright/test';
import { expect, test } from './n8nGuard';
import { HOURS_PILL_NAME } from './homeSupport';

// jsdom cannot see it: in Tailwind v4 `outline-none` on an option cancelled the ring that its `outline-2` should draw, so
// a keyboard visitor walking the hero lists saw no focus at all. Only a real browser reports the computed outline.
const TASK_PILL_NAME = /^Tarefa/;
const WIDTHS = [390, 1440];
const VIEWPORT_HEIGHT_PX = 900;
const RING_WIDTH = '2px';

async function openPill(page: Page, name: RegExp): Promise<Locator> {
  await page.getByRole('button', { name }).click();
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  return list;
}

async function outlineOf(option: Locator) {
  return option.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
  });
}

test.describe('the active option of a hero list', () => {
  for (const width of WIDTHS) {
    for (const [label, name] of [
      ['hours', HOURS_PILL_NAME],
      ['task', TASK_PILL_NAME],
    ] as const) {
      test(`draws a 2px ring at ${width}px on the ${label} pill, for every option the arrows reach`, async ({ page }) => {
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT_PX });
        await page.goto('/');
        const list = await openPill(page, name);
        const active = list.locator('[data-active="true"]');

        for (let step = 0; step < 4; step += 1) {
          await expect(active).toHaveCount(1);
          await expect(active).toBeFocused();
          const ring = await outlineOf(active);
          expect(ring.style, `outline style, step ${step}`).not.toBe('none');
          expect(ring.width, `outline width, step ${step}`).toBe(RING_WIDTH);
          await page.keyboard.press('ArrowDown');
        }
      });
    }
  }

  test('is not marked by the cream tint alone: the tint is a visible gray', async ({ page }) => {
    await page.goto('/');
    const list = await openPill(page, HOURS_PILL_NAME);

    const tint = await list.locator('[data-active="true"]').evaluate((element) => getComputedStyle(element).backgroundColor);

    expect(tint).not.toBe('rgb(242, 242, 242)');
    expect(tint).not.toBe('rgba(0, 0, 0, 0)');
  });
});
