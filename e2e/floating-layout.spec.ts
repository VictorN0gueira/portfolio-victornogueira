import type { Locator, Page } from '@playwright/test';
import { a11yWidgetCopy } from '../src/components/a11yWidgetCopy';
import { enableLargeFont, menuButton, MIN_TOUCH_PX, TOUCH_ROUNDING_PX, nextFrames, openHome, waitForStableBox, walkPage } from './homeSupport';
import { expect, test } from './n8nGuard';

// The two fixed buttons in a real browser: the WhatsApp button at the bottom left and the accessibility tab on the right
// edge, with the panel closed and open. At ten window sizes, with the normal and the larger font, they must never overlap
// each other, the panel must stay inside the window, both must be at least 44px, and they must leave the Enviar button
// (scrolled to the middle of the window) and the footer links (at the end of the page) alone. The home mounts the real
// form, so the test comes from ./n8nGuard and nothing here sends it.

const TRIGGER_NAME = a11yWidgetCopy.triggerLabel;
const PANEL_NAME = a11yWidgetCopy.panelLabel;
const WHATSAPP_LANDMARK = 'Contato rápido';
const EDGE_MARGIN_PX = 8;

interface WindowSize {
  width: number;
  height: number;
}

// Phones run in the mobile project (touch, overlay scrollbars), the rest in the desktop one (a classic scrollbar).
const PHONE_SIZES: WindowSize[] = [
  { width: 280, height: 653 },
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
];
const DESKTOP_SIZES: WindowSize[] = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Found by the label of the landmark, not by role: an open dialog hides the rest of the page from the accessibility tree,
// and the two buttons still have to be measured then.
const whatsAppLink = (page: Page) => page.locator(`aside[aria-label="${WHATSAPP_LANDMARK}"] a`);
const trigger = (page: Page) => page.locator(`aside[aria-label="${PANEL_NAME}"] button[aria-label="${TRIGGER_NAME}"]`);

async function rectOf(target: Locator): Promise<Rect> {
  const box = await target.boundingBox();
  if (!box) throw new Error('the element has no box');
  return { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height };
}

function overlaps(first: Rect, second: Rect): boolean {
  return Math.min(first.right, second.right) > Math.max(first.left, second.left) && Math.min(first.bottom, second.bottom) > Math.max(first.top, second.top);
}

const isInside = (inner: Rect, size: WindowSize) =>
  inner.left >= 0 && inner.top >= 0 && inner.right <= size.width + TOUCH_ROUNDING_PX && inner.bottom <= size.height + TOUCH_ROUNDING_PX;

const describeRect = (box: Rect) => `[${box.left.toFixed(0)},${box.top.toFixed(0)} to ${box.right.toFixed(0)},${box.bottom.toFixed(0)}]`;

const label = (size: WindowSize, hasLargeFont: boolean) => `${size.width}x${size.height}${hasLargeFont ? ' larger font' : ''}`;

/** The boxes of the footer links, one per line a link takes (an inline link that wraps has two). */
function footerLinkRects(page: Page): Promise<Array<Rect & { name: string }>> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('footer a')).flatMap((link) =>
      Array.from(link.getClientRects()).map((box) => ({
        name: (link.getAttribute('aria-label') ?? link.textContent ?? '').trim().slice(0, 40),
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
      })),
    ),
  );
}

async function openForMeasuring(page: Page, size: WindowSize, hasLargeFont: boolean) {
  await page.setViewportSize(size);
  if (hasLargeFont) await enableLargeFont(page);
  await openHome(page);
  await expect(trigger(page)).toBeVisible();
  await walkPage(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await nextFrames(page);
}

/** Closed and open: the two buttons stay apart, 44px or more, inside the window, and the open panel stays inside too. */
async function checkButtonsAndPanel(page: Page, size: WindowSize, notes: string[]): Promise<string[]> {
  const problems: string[] = [];
  const whatsApp = await rectOf(whatsAppLink(page));
  for (const isOpen of [false, true]) {
    if (isOpen) {
      await trigger(page).click();
      await expect(page.getByRole('dialog', { name: PANEL_NAME })).toBeVisible();
      // The panel grows in (scale and fade): it is measured once it has come to rest.
      await waitForStableBox(page.getByRole('dialog', { name: PANEL_NAME }));
    }
    const tab = await rectOf(trigger(page));
    const state = isOpen ? 'panel open' : 'panel closed';
    notes.push(`${state}: WhatsApp ${describeRect(whatsApp)}, tab ${describeRect(tab)}`);
    if (overlaps(whatsApp, tab)) problems.push(`${state}: the WhatsApp button and the tab overlap`);
    if (!isInside(tab, size) || !isInside(whatsApp, size)) problems.push(`${state}: a button leaves the window`);
    for (const [name, box] of [['WhatsApp button', whatsApp], ['tab', tab]] as const) {
      const smallest = Math.min(box.right - box.left, box.bottom - box.top);
      if (smallest < MIN_TOUCH_PX - TOUCH_ROUNDING_PX) problems.push(`${state}: the ${name} is ${smallest}px, under ${MIN_TOUCH_PX}px`);
    }
    if (whatsApp.left < EDGE_MARGIN_PX || whatsApp.bottom > size.height - EDGE_MARGIN_PX) problems.push(`${state}: the WhatsApp button hugs the edge`);
    if (isOpen) {
      const panel = await rectOf(page.getByRole('dialog', { name: PANEL_NAME }));
      notes.push(`panel ${describeRect(panel)}`);
      if (!isInside(panel, size)) problems.push(`panel open: the panel leaves the window (${JSON.stringify(panel)})`);
      if (panel.top < EDGE_MARGIN_PX) problems.push(`panel open: the panel hugs the top edge (${panel.top}px)`);
      if (overlaps(panel, whatsApp)) problems.push('panel open: the panel covers the WhatsApp button');
    }
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: PANEL_NAME })).toBeHidden();
  return problems;
}

/** Enviar scrolled to the middle of the window is clear of both buttons and is what a click at its centre reaches. */
async function checkEnviar(page: Page, notes: string[]): Promise<string[]> {
  const submit = page.locator('form[name="contact"]').getByRole('button', { name: 'Enviar', exact: true });
  await submit.evaluate((button) => button.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await nextFrames(page);
  const problems: string[] = [];
  const box = await rectOf(submit);
  notes.push(`Enviar centred ${describeRect(box)}`);
  for (const [name, target] of [['WhatsApp button', whatsAppLink(page)], ['tab', trigger(page)]] as const) {
    if (overlaps(box, await rectOf(target))) problems.push(`Enviar (centred) is overlapped by the ${name}`);
  }
  // Enviar is off until the consent is ticked and takes no pointer then, so the point at its centre may reach the box
  // around it; what it must never reach is a fixed layer (the header or one of the two buttons).
  const coveredBy = await submit.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
    return hit?.closest('header, aside')?.tagName.toLowerCase() ?? null;
  });
  if (coveredBy) problems.push(`Enviar (centred): the point at its centre reaches the ${coveredBy}`);
  return problems;
}

/** At the end of the page no footer link is under a button. */
async function checkFooter(page: Page, notes: string[]): Promise<string[]> {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await nextFrames(page);
  const problems: string[] = [];
  const buttons = [
    ['WhatsApp button', await rectOf(whatsAppLink(page))],
    ['tab', await rectOf(trigger(page))],
  ] as const;
  const links = await footerLinkRects(page);
  notes.push(`footer: ${links.length} link boxes, lowest bottom ${Math.max(...links.map((link) => link.bottom)).toFixed(0)} in a window ${(await page.viewportSize())!.height} tall`);
  for (const link of links) {
    if (link.right <= link.left || link.bottom <= 0 || link.top >= (await page.viewportSize())!.height) continue;
    for (const [name, box] of buttons) {
      if (overlaps(link, box)) problems.push(`footer link "${link.name}" is overlapped by the ${name} at the end of the page`);
    }
  }
  return problems;
}

function defineCases(sizes: WindowSize[], projectName: 'mobile' | 'desktop') {
  for (const size of sizes) {
    for (const hasLargeFont of [false, true]) {
      test(`${label(size, hasLargeFont)}: the buttons keep apart and clear of Enviar and the footer links`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== projectName, `${size.width}px is measured in the ${projectName} project`);
        test.slow();
        await openForMeasuring(page, size, hasLargeFont);

        const notes: string[] = [];
        const problems = [...(await checkButtonsAndPanel(page, size, notes)), ...(await checkEnviar(page, notes)), ...(await checkFooter(page, notes))];
        testInfo.annotations.push({ type: 'measured', description: notes.join('; ') });

        expect(problems).toEqual([]);
      });
    }
  }
}

test.describe('floating buttons on phones', () => {
  defineCases(PHONE_SIZES, 'mobile');
});

test.describe('floating buttons on tablets and desktops', () => {
  defineCases(DESKTOP_SIZES, 'desktop');
});

const MENU_DIALOG_NAME = 'Menu de navegação';
const TESTIMONIAL_BUTTON = /Ler depoimento completo/;
const SUBPIXEL_PX = 0.5;

/** What the point at the centre of a button reaches: "aside" when the button is on top, else the dialog or its overlay. */
function layerAtCentreOf(target: Locator): Promise<string> {
  return target.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
    if (hit?.closest('aside')) return 'aside';
    if (hit?.closest('[role="dialog"]')) return 'dialog';
    return hit?.className.toString().includes('overlay') ? 'overlay' : (hit?.tagName.toLowerCase() ?? 'nothing');
  });
}

interface Moves {
  whatsApp: Rect;
  tab: Rect;
  anchor: Rect;
  contentWidth: number;
}

// The page content is watched through the main heading, found by tag: an open dialog hides the page from the role queries.
async function snapshotMoves(page: Page): Promise<Moves> {
  return {
    whatsApp: await rectOf(whatsAppLink(page)),
    tab: await rectOf(trigger(page)),
    anchor: await rectOf(page.locator('main h1').first()),
    contentWidth: await page.evaluate(() => document.body.getBoundingClientRect().width),
  };
}

function movesBetween(before: Moves, during: Moves): string[] {
  const shifted = (first: Rect, second: Rect) =>
    (['left', 'top', 'right', 'bottom'] as const).some((side) => Math.abs(first[side] - second[side]) > SUBPIXEL_PX);
  const problems: string[] = [];
  if (shifted(before.whatsApp, during.whatsApp)) problems.push('the WhatsApp button moved');
  if (shifted(before.tab, during.tab)) problems.push('the tab moved');
  if (shifted(before.anchor, during.anchor)) problems.push('the page content moved');
  if (Math.abs(before.contentWidth - during.contentWidth) > SUBPIXEL_PX) problems.push('the page width changed');
  return problems;
}

async function buttonsOnTopOfOverlay(page: Page, dialogName: string): Promise<string[]> {
  const onTop: string[] = [];
  for (const [name, target] of [['WhatsApp button', whatsAppLink(page)], ['tab', trigger(page)]] as const) {
    if ((await layerAtCentreOf(target)) === 'aside') onTop.push(`${dialogName}: the ${name} is on top of the overlay`);
  }
  return onTop;
}

const OVERLAY_SIZES: Array<{ size: WindowSize; projectName: 'mobile' | 'desktop' }> = [
  { size: { width: 390, height: 844 }, projectName: 'mobile' },
  { size: { width: 768, height: 1024 }, projectName: 'desktop' },
  { size: { width: 1440, height: 900 }, projectName: 'desktop' },
];

test.describe('both buttons stay behind an open dialog and nothing shifts', () => {
  for (const { size, projectName } of OVERLAY_SIZES) {
    test(`${size.width}px: the testimonial dialog and the mobile menu cover the buttons`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== projectName, `${size.width}px is measured in the ${projectName} project`);
      test.slow();
      await openForMeasuring(page, size, false);
      const problems: string[] = [];

      const opener = page.getByRole('button', { name: TESTIMONIAL_BUTTON }).first();
      await opener.evaluate((button) => button.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await nextFrames(page);
      const before = await snapshotMoves(page);
      // At rest both buttons are what a point at their centre reaches: the probe below can tell "on top" from "covered".
      expect([await layerAtCentreOf(whatsAppLink(page)), await layerAtCentreOf(trigger(page))]).toEqual(['aside', 'aside']);
      await opener.click();
      const testimonial = page.getByRole('dialog').first();
      await expect(testimonial).toBeVisible();
      await nextFrames(page);
      problems.push(...movesBetween(before, await snapshotMoves(page)).map((problem) => `testimonial dialog: ${problem}`));
      problems.push(...(await buttonsOnTopOfOverlay(page, 'testimonial dialog')));
      await page.keyboard.press('Escape');
      await expect(testimonial).toBeHidden();

      if (await menuButton(page).isVisible()) {
        const beforeMenu = await snapshotMoves(page);
        await menuButton(page).click();
        const menu = page.getByRole('dialog', { name: MENU_DIALOG_NAME });
        await expect(menu).toBeVisible();
        await expect.poll(async () => (await rectOf(menu)).right).toBeGreaterThanOrEqual(size.width - SUBPIXEL_PX);
        await nextFrames(page);
        problems.push(...movesBetween(beforeMenu, await snapshotMoves(page)).map((problem) => `mobile menu: ${problem}`));
        problems.push(...(await buttonsOnTopOfOverlay(page, 'mobile menu')));
      }

      expect(problems).toEqual([]);
    });
  }
});

test.describe('keyboard and reading order of the two buttons', () => {
  test('the page ends with the footer, then the WhatsApp button, then the accessibility tab', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the order is the same everywhere; one project is enough');
    await openForMeasuring(page, { width: 390, height: 844 }, false);

    const order = await page.evaluate((names) => {
      const isBefore = (first: Element | null, second: Element | null) =>
        Boolean(first && second && first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
      const main = document.querySelector('main');
      const footer = document.querySelector('footer');
      const whatsApp = document.querySelector(`aside[aria-label="${names.whatsApp}"]`);
      const widget = document.querySelector(`aside[aria-label="${names.widget}"]`);
      return { mainThenFooter: isBefore(main, footer), footerThenWhatsApp: isBefore(footer, whatsApp), whatsAppThenWidget: isBefore(whatsApp, widget) };
    }, { whatsApp: WHATSAPP_LANDMARK, widget: PANEL_NAME });
    expect(order).toEqual({ mainThenFooter: true, footerThenWhatsApp: true, whatsAppThenWidget: true });

    const lastFooterLink = page.locator('footer a').last();
    await lastFooterLink.focus();
    await page.keyboard.press('Tab');
    await expect(whatsAppLink(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(trigger(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(whatsAppLink(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(lastFooterLink).toBeFocused();
  });
});
