import { devices, type Locator, type Page } from '@playwright/test';
import { MIN_TOUCH_PX, TOUCH_ROUNDING_PX, nextFrames, openHome } from './homeSupport';
import { expect, test } from './n8nGuard';

// The moving widgets and the accessibility panel in a real browser: the pause control of the integrations strip, the use
// case tabs on a phone, and the panel (order, focus, stacking with the WhatsApp button). The home mounts the real form,
// so the test comes from ./n8nGuard and nothing here sends it.

const TRIGGER_NAME = 'Abrir opções de acessibilidade';
const PANEL_NAME = 'Opções de acessibilidade';
const MARQUEE_PAUSE_NAME = 'Pausar faixa de integrações';
const TABS_PAUSE_NAME = 'Pausar troca automática';
const TOUCH_AGENT = devices['Pixel 7'].userAgent;
const MIN_GAP_PX = 8;
// The owner asked for the trigger to sit clearly above the WhatsApp button (it was 12 px, too tight): about 44 px now.
const MAX_GAP_PX = 56;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('the element has no box');
  return box;
}

function overlapArea(first: Box, second: Box): number {
  const overlapX = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
  const overlapY = Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y);
  return overlapX > 0 && overlapY > 0 ? overlapX * overlapY : 0;
}

const whatsAppLink = (page: Page) => page.getByRole('complementary', { name: 'Contato rápido' }).getByRole('link');
const trigger = (page: Page) => page.getByRole('button', { name: TRIGGER_NAME });
const playState = (track: Locator) => track.evaluate((element) => getComputedStyle(element).animationPlayState);

test.describe('the integrations marquee pause (WCAG 2.2.2)', () => {
  test('pauses and resumes the loop with a click, and with the keyboard, without any hover', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHome(page);
    const region = page.getByRole('region', { name: 'A gente conecta o que você já usa' });
    await region.scrollIntoViewIfNeeded();
    // The pointer is far from the strip, so only the toggle can pause it.
    await page.mouse.move(2, 2);
    const track = region.locator('.vn-marquee');
    const toggle = region.getByRole('button', { name: MARQUEE_PAUSE_NAME });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await playState(track)).toBe('running');

    await toggle.click();
    await page.mouse.move(2, 2);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await playState(track)).toBe('paused');

    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await playState(track)).toBe('running');
    await page.keyboard.press('Space');
    expect(await playState(track)).toBe('paused');
  });

  test('keeps the toggle in the tab order, ahead of the marquee, with a 44px target', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 390, height: 844 });
    await openHome(page);
    const region = page.getByRole('region', { name: 'A gente conecta o que você já usa' });
    const toggle = region.getByRole('button', { name: MARQUEE_PAUSE_NAME });
    await toggle.scrollIntoViewIfNeeded();

    const box = await boxOf(toggle);
    expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH_PX - TOUCH_ROUNDING_PX);
    expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH_PX - TOUCH_ROUNDING_PX);
    const isBefore = await page.evaluate(() => {
      const button = document.querySelector('button[aria-label="Pausar faixa de integrações"]') as HTMLElement;
      const track = document.querySelector('.vn-marquee') as HTMLElement;
      return Boolean(button.compareDocumentPosition(track) & Node.DOCUMENT_POSITION_FOLLOWING) && button.tabIndex >= 0;
    });
    expect(isBefore).toBe(true);
  });

  test('shows a static wrapping list and no pause button when the system asks for reduced motion', async ({ page }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await openHome(page);
    const region = page.getByRole('region', { name: 'A gente conecta o que você já usa' });

    await expect(region.locator('.vn-marquee')).toHaveCount(0);
    await expect(region.getByRole('button')).toHaveCount(0);
    expect(await region.getByRole('listitem').count()).toBeGreaterThan(5);
  });
});

test.describe('the use case tabs on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: TOUCH_AGENT });

  test('starts paused on a touch screen, with the toggle before and clear of the tabs, and the last tab can be reached', async ({
    page,
  }) => {
    test.slow();
    await openHome(page);
    const tablist = page.getByRole('tablist', { name: 'Casos de uso' });
    const toggle = page.getByRole('button', { name: TABS_PAUSE_NAME });
    await tablist.scrollIntoViewIfNeeded();

    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(overlapArea(await boxOf(toggle), await boxOf(tablist))).toBe(0);

    const tabs = tablist.getByRole('tab');
    const last = tabs.last();
    await tabs.first().focus();
    await page.keyboard.press('End');
    await expect(last).toHaveAttribute('aria-selected', 'true');
    // The scroll to the selected tab is smooth, so the box is read until it has arrived.
    await expect
      .poll(async () => {
        const listBox = await boxOf(tablist);
        const lastBox = await boxOf(last);
        return lastBox.x >= listBox.x - 0.5 && lastBox.x + lastBox.width <= listBox.x + listBox.width + 0.5;
      }, { message: 'the last tab lies inside the scroller' })
      .toBe(true);
  });
});

// The toggle stops being drawn once the visitor picks a tab; the row must not slide under the pointer when it goes.
for (const width of [390, 1024, 1440]) {
  test.describe(`the use case tab row at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('does not move when the visitor picks the second tab with a click', async ({ page }) => {
      test.slow();
      await openHome(page);
      const tablist = page.getByRole('tablist', { name: 'Casos de uso' });
      await tablist.scrollIntoViewIfNeeded();
      const tabs = tablist.getByRole('tab');
      const before = await boxOf(tabs.first());

      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('button', { name: TABS_PAUSE_NAME })).toHaveCount(0);
      const afterClick = await boxOf(tabs.first());

      expect(afterClick.x, 'x of the first tab after a click').toBeCloseTo(before.x, 0);
      expect(afterClick.y, 'y of the first tab after a click').toBeCloseTo(before.y, 0);
    });

    test('does not move on the first arrow key either', async ({ page }) => {
      test.slow();
      await openHome(page);
      const tablist = page.getByRole('tablist', { name: 'Casos de uso' });
      await tablist.scrollIntoViewIfNeeded();
      const tabs = tablist.getByRole('tab');
      const before = await boxOf(tabs.first());

      await tabs.first().focus();
      await page.keyboard.press('ArrowRight');
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

      expect((await boxOf(tabs.first())).x).toBeCloseTo(before.x, 0);
    });
  });
}

for (const width of [320, 390]) {
  test.describe(`the accessibility trigger at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: TOUCH_AGENT });

    test('sits right above the WhatsApp button without touching it, with the panel closed and open, and clear of the first heading', async ({
      page,
    }) => {
      test.slow();
      await openHome(page);
      await nextFrames(page);
      const heading = await boxOf(page.getByRole('heading', { level: 1 }));

      for (const isOpen of [false, true]) {
        if (isOpen) await trigger(page).tap();
        await nextFrames(page);
        const widgetBox = await boxOf(trigger(page));
        const whatsApp = await boxOf(whatsAppLink(page));
        expect(overlapArea(widgetBox, whatsApp), 'trigger and WhatsApp button').toBe(0);
        expect(whatsApp.y - (widgetBox.y + widgetBox.height), 'gap between the trigger and the WhatsApp button').toBeGreaterThanOrEqual(MIN_GAP_PX);
        expect(whatsApp.y - (widgetBox.y + widgetBox.height), 'the trigger is above the WhatsApp button, with room between them').toBeLessThanOrEqual(MAX_GAP_PX);
        expect(whatsApp.y - (widgetBox.y + widgetBox.height), 'room between the trigger and the WhatsApp button').toBeGreaterThanOrEqual(3 * MIN_GAP_PX);
        if (isOpen) {
          const panel = await boxOf(page.getByRole('dialog', { name: PANEL_NAME }));
          expect(overlapArea(panel, whatsApp), 'panel and WhatsApp button').toBe(0);
        }
      }
      expect(overlapArea(await boxOf(trigger(page)), heading), 'the trigger does not cover the main heading at load').toBe(0);
    });
  });
}

test.describe('the accessibility panel with the keyboard', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('opens with Enter into the first option, reads trigger then dialog, and Escape gives the focus back', async ({ page }) => {
    test.slow();
    await openHome(page);
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: PANEL_NAME });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('button').first()).toBeFocused();

    const snapshot = await page.getByRole('complementary', { name: PANEL_NAME }).ariaSnapshot();
    expect(snapshot.indexOf(TRIGGER_NAME), 'the trigger is in the accessibility tree').toBeGreaterThanOrEqual(0);
    expect(snapshot.indexOf(TRIGGER_NAME), 'the trigger comes before the dialog').toBeLessThan(snapshot.indexOf('dialog'));

    await page.keyboard.press('Tab');
    await expect(panel.getByRole('button').nth(1)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(panel.getByRole('button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page)).toHaveAccessibleDescription('1 opção ativa');
  });

  test('closes when the focus leaves the widget, and keeps the panel while it moves inside', async ({ page }) => {
    test.slow();
    await openHome(page);
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: PANEL_NAME });
    await expect(panel).toBeVisible();

    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');

    await expect(panel).toHaveCount(0);
  });
});
