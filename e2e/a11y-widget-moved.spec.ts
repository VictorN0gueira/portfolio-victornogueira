import type { Locator, Page } from '@playwright/test';
import { a11yWidgetCopy } from '../src/components/a11yWidgetCopy';
import { TAB_POSITION_STORAGE_KEY } from '../src/lib/tabPositionStorage';
import { PAGE_LOAD_TIMEOUT_MS, waitForSteadyHeight } from './homeSupport';
import { expect, test } from './n8nGuard';

// Closure review of the movable accessibility tab: what a moved tab must not change (anchors, the open panel after the
// font grows, a resize, a cancelled drag, a modal that locks the scroll). The drag itself is in a11y-widget-drag.spec.ts.

const TRIGGER = a11yWidgetCopy.triggerLabel;
const PANEL = a11yWidgetCopy.panelLabel;
const SUBPIXEL = 0.75;
const ANCHOR_TOLERANCE_PX = 3;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

type Side = 'left' | 'right';

const trigger = (page: Page) => page.locator(`aside[aria-label="${PANEL}"] button[aria-label="${TRIGGER}"]`);
const whatsApp = (page: Page) => page.locator('aside[aria-label="Contato rápido"] a');
const panelOf = (page: Page) => page.getByRole('dialog', { name: PANEL });

async function rectOf(target: Locator): Promise<Rect> {
  const box = await target.boundingBox();
  if (!box) throw new Error('the element has no box');
  return { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height };
}

const overlaps = (a: Rect, b: Rect) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);

async function store(page: Page, place: { side: Side; ratio: number } | null) {
  await page.addInitScript(
    ([key, value]) => {
      if (value) window.localStorage.setItem(key as string, value as string);
      else window.localStorage.removeItem(key as string);
    },
    [TAB_POSITION_STORAGE_KEY, place ? JSON.stringify(place) : null],
  );
}

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

const PLACES: Array<{ side: Side; ratio: number }> = [0, 0.3, 0.5, 0.9].flatMap((ratio) => (['right', 'left'] as const).map((side) => ({ side, ratio })));

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
