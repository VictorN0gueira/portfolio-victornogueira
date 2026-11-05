import type { Page } from '@playwright/test';
import { TAB_POSITION_STORAGE_KEY } from '../src/lib/tabPositionStorage';
import { menuButton, nextFrames, waitForStableBox, waitForSteadyHeight } from './homeSupport';
import { expect, test } from './n8nGuard';
import { expectPanelInside, overlaps, panelOf, PHONE, PLACES, rectOf, startAt, store, SUBPIXEL, trigger, whatsApp, WINDOW } from './tabSupport';

// What a moved accessibility tab and its open panel must survive: the font growing under the panel, a turned phone, a
// drag that ends without a choice, a modal that locks the scroll, and the larger font on the tab itself.

const GAP_OVER_WHATSAPP_PX = 16;

test.describe('the open panel when the font grows', () => {
  // "Texto maior" and "Fonte legível" set a class on the page after the widget rendered, and the panel gets bigger.
  for (const place of PLACES) {
    test(`${place.side} at ${place.ratio}: stays inside the window after Texto maior and Fonte legível`, async ({ page }, testInfo) => {
      test.slow();
      const size = testInfo.project.name === 'mobile' ? PHONE : WINDOW;
      await startAt(page, size, place);
      await trigger(page).click();
      await expect(panelOf(page)).toBeVisible();
      await expectPanelInside(page, size, 'before');

      await panelOf(page).getByRole('button', { name: /Texto maior/ }).click();
      await expect(page.locator('html')).toHaveClass(/a11y-font-large/);
      await expectPanelInside(page, size, 'Texto maior');

      await panelOf(page).getByRole('button', { name: /Fonte legível/ }).click();
      await expectPanelInside(page, size, 'Fonte legível');
    });
  }
});

test.describe('the tab with the larger font', () => {
  test('keeps 44px and a 16px gap over WhatsApp on the left', async ({ page }, testInfo) => {
    test.slow();
    const size = testInfo.project.name === 'mobile' ? { width: 844, height: 390 } : WINDOW;
    await startAt(page, size, { side: 'left', ratio: 1 }, true);

    const tab = await rectOf(trigger(page));
    const wa = await rectOf(whatsApp(page));
    expect(tab.right - tab.left, 'the tab is 44px wide').toBeCloseTo(44, 0);
    expect(tab.bottom - tab.top, 'the tab is 44px tall').toBeCloseTo(44, 0);
    expect(wa.top - tab.bottom, 'gap over WhatsApp').toBeGreaterThanOrEqual(GAP_OVER_WHATSAPP_PX - SUBPIXEL);
  });
});

test.describe('a stored place and a turned phone', () => {
  test('the tab and the open panel stay inside the window and over WhatsApp', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'a phone turning');
    test.slow();
    await startAt(page, PHONE, { side: 'left', ratio: 1 });

    for (const size of [{ width: 844, height: 390 }, PHONE, { width: 667, height: 375 }]) {
      await page.setViewportSize(size);
      await nextFrames(page);
      await waitForStableBox(trigger(page));
      const tab = await rectOf(trigger(page));
      const wa = await rectOf(whatsApp(page));
      const label = `${size.width}x${size.height}`;
      expect(tab.bottom, `${label}: tab bottom`).toBeLessThanOrEqual(size.height);
      expect(tab.top, `${label}: tab top`).toBeGreaterThanOrEqual(0);
      expect(overlaps(tab, wa), `${label}: tab over WhatsApp`).toBe(false);
      expect(wa.top - tab.bottom, `${label}: gap over WhatsApp`).toBeGreaterThanOrEqual(GAP_OVER_WHATSAPP_PX - SUBPIXEL);
      await trigger(page).click();
      await expect(panelOf(page)).toBeVisible();
      await expectPanelInside(page, size, label);
      await page.keyboard.press('Escape');
      await expect(panelOf(page)).toBeHidden();
    }
  });
});

const centreOf = async (page: Page) => {
  const start = await rectOf(trigger(page));
  return { start, from: { x: (start.left + start.right) / 2, y: (start.top + start.bottom) / 2 } };
};

test.describe('a drag that ends without a choice', () => {
  test('Escape in the middle of a drag puts the tab back and stores nothing', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the mouse is the desktop project');
    test.slow();
    await startAt(page, WINDOW, null);
    const { start, from } = await centreOf(page);

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 6 });
    expect((await rectOf(trigger(page))).left, 'it follows the pointer').toBeLessThan(start.left - 300);
    await page.keyboard.press('Escape');
    await page.mouse.up();

    await waitForStableBox(trigger(page));
    expect(await rectOf(trigger(page))).toEqual(start);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), TAB_POSITION_STORAGE_KEY)).toBeNull();
    await expect(panelOf(page), 'the drag that was cancelled does not open the panel').toHaveCount(0);
  });

  test('a pointercancel with the panel open leaves the panel beside the tab, where it was', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'touch is the mobile project');
    test.slow();
    await startAt(page, PHONE, { side: 'right', ratio: 0.9 });
    await trigger(page).tap();
    await expect(panelOf(page)).toBeVisible();
    await waitForStableBox(panelOf(page));
    const panelBefore = await rectOf(panelOf(page));
    const { start, from } = await centreOf(page);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
    for (let step = 1; step <= 6; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x - step * 25, y: from.y - step * 60 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await cdp.detach();

    await waitForStableBox(trigger(page));
    expect(await rectOf(trigger(page))).toEqual(start);
    await waitForStableBox(panelOf(page));
    const panelAfter = await rectOf(panelOf(page));
    expect(Math.abs(panelAfter.top - panelBefore.top), 'the panel is where it was').toBeLessThan(1);
    expect(Math.abs(panelAfter.left - panelBefore.left)).toBeLessThan(1);
  });
});

test.describe('a modal that locks the scroll, with a moved tab', () => {
  const snapshot = async (page: Page) => ({ tab: await rectOf(trigger(page)), wa: await rectOf(whatsApp(page)) });

  test('the testimonial dialog (classic scrollbar) shifts neither the tab nor WhatsApp', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'a classic scrollbar is the desktop project');
    test.slow();
    for (const side of ['right', 'left'] as const) {
      await startAt(page, WINDOW, { side, ratio: 0.5 });
      const opener = page.getByRole('button', { name: /Ler depoimento completo/ }).first();
      await opener.evaluate((button) => button.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await nextFrames(page);
      const before = await snapshot(page);

      await opener.click();
      await expect(page.getByRole('dialog').first()).toBeVisible();
      await nextFrames(page);

      expect(await snapshot(page), `${side}: nothing moved`).toEqual(before);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  });

  test('the mobile menu shifts neither the tab nor WhatsApp', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the mobile menu is the phone');
    test.slow();
    await startAt(page, PHONE, { side: 'right', ratio: 0.5 });
    const before = await snapshot(page);

    await menuButton(page).click();
    await expect(page.getByRole('dialog', { name: 'Menu de navegação' })).toBeVisible();
    await nextFrames(page);

    expect(await snapshot(page)).toEqual(before);
  });
});

test.describe('the end of the page with a tab low on the window', () => {
  // Nothing can scroll past the end, so the footer itself has to leave room: its last control stays above the tab.
  for (const path of ['/blog', '/servicos']) {
    for (const place of [{ side: 'left', ratio: 1 }, { side: 'right', ratio: 0.9 }] as const) {
      test(`${path} with the tab on the ${place.side} at ${place.ratio}: the lowest control of the footer is above the tab`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'mobile', 'measured with the phone window');
        test.slow();
        await page.setViewportSize(PHONE);
        await store(page, place);
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await waitForSteadyHeight(page);
        await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
        await nextFrames(page);

        const tab = await rectOf(trigger(page));
        const lowest = await page.evaluate(() => Math.max(...Array.from(document.querySelectorAll('footer a, footer button')).map((node) => node.getBoundingClientRect().bottom)));

        expect(lowest, `the lowest footer control is at ${lowest.toFixed(0)}px, the tab starts at ${tab.top.toFixed(0)}px`).toBeLessThanOrEqual(tab.top);
      });
    }
  }
});
