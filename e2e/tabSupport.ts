import type { Locator, Page } from '@playwright/test';
import { a11yWidgetCopy } from '../src/components/a11yWidgetCopy';
import { TAB_POSITION_STORAGE_KEY } from '../src/lib/tabPositionStorage';
import { enableLargeFont, nextFrames, openHome, waitForStableBox } from './homeSupport';
import { expect } from './n8nGuard';

// Helpers of the specs of the movable accessibility tab (a11y-widget-moved.spec.ts, a11y-widget-states.spec.ts).

export const TRIGGER_NAME = a11yWidgetCopy.triggerLabel;
export const PANEL_NAME = a11yWidgetCopy.panelLabel;
export const SUBPIXEL = 0.75;
export const WINDOW = { width: 1440, height: 900 };
export const PHONE = { width: 390, height: 844 };

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type Side = 'left' | 'right';
export interface Place {
  side: Side;
  ratio: number;
}

export const trigger = (page: Page) => page.locator(`aside[aria-label="${PANEL_NAME}"] button[aria-label="${TRIGGER_NAME}"]`);
export const whatsApp = (page: Page) => page.locator('aside[aria-label="Contato rápido"] a');
export const panelOf = (page: Page) => page.getByRole('dialog', { name: PANEL_NAME });

export async function rectOf(target: Locator): Promise<Rect> {
  const box = await target.boundingBox();
  if (!box) throw new Error('the element has no box');
  return { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height };
}

export const overlaps = (a: Rect, b: Rect) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);

/** Sets the stored place before the page loads (null removes it). */
export async function store(page: Page, place: Place | null) {
  await page.addInitScript(
    ([key, value]) => {
      if (value) window.localStorage.setItem(key as string, value as string);
      else window.localStorage.removeItem(key as string);
    },
    [TAB_POSITION_STORAGE_KEY, place ? JSON.stringify(place) : null],
  );
}

/** The sides and heights the review tries: high, a third down, the middle and low, on both edges. */
export const PLACES: Place[] = [0, 0.3, 0.5, 0.9].flatMap((ratio) => (['right', 'left'] as const).map((side) => ({ side, ratio })));

export async function startAt(page: Page, size: { width: number; height: number }, place: Place | null, hasLargeFont = false) {
  await page.setViewportSize(size);
  if (hasLargeFont) await enableLargeFont(page);
  await store(page, place);
  await openHome(page);
  await expect(trigger(page)).toBeVisible();
  await nextFrames(page);
}

/** The open panel is inside the window, clear of the tab and WhatsApp, and its last button can be reached. */
export async function expectPanelInside(page: Page, size: { width: number; height: number }, label: string) {
  await waitForStableBox(panelOf(page));
  const panel = await rectOf(panelOf(page));
  expect(panel.left, `${label}: panel left`).toBeGreaterThanOrEqual(-SUBPIXEL);
  expect(panel.right, `${label}: panel right`).toBeLessThanOrEqual(size.width + SUBPIXEL);
  expect(panel.top, `${label}: panel top`).toBeGreaterThanOrEqual(-SUBPIXEL);
  expect(panel.bottom, `${label}: panel bottom`).toBeLessThanOrEqual(size.height + SUBPIXEL);
  expect(overlaps(panel, await rectOf(trigger(page))), `${label}: panel over the tab`).toBe(false);
  expect(overlaps(panel, await rectOf(whatsApp(page))), `${label}: panel over WhatsApp`).toBe(false);
  // On a short window the panel scrolls inside itself: the last button is reached by scrolling it, and must then be in the window.
  const last = panelOf(page).getByRole('button', { name: a11yWidgetCopy.resetPositionLabel });
  await last.scrollIntoViewIfNeeded();
  await expect(last, `${label}: the last button is in the window`).toBeInViewport();
}
