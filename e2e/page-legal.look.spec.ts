import { HEADER_BOTTOM_PX } from './headerBounds';
import { brokenWordsIn, enableLargeFont, measureOverflow } from './homeSupport';
import { expect, test } from './n8nGuard';
import { openPage } from './pageContract';
import {
  DESKTOP,
  INK_RGB,
  LGPD,
  MIN_RING_CONTRAST,
  MIN_SMALL_PRINT_PX,
  NARROWEST,
  ONLY_IN_DESKTOP,
  PAGES,
  PALETTE_RGB,
  PHONE,
  PRIVACY,
  TITLES,
  TOC_NAV,
  TRANSPARENT,
  WHITE_RGB,
  byId,
  expectJustBelowHeader,
  settledTop,
  tocLinks,
} from './legalSupport';

test.describe('the look of the legal pages', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
    await page.setViewportSize(DESKTOP);
  });

  for (const contract of PAGES) {
    test(`${contract.path}: the ring on the title a link leads to is 3:1 against its own background, in every card`, async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      await openPage(page, contract);
      const count = await tocLinks(page).count();

      for (let index = 0; index < count; index += 1) {
        await tocLinks(page).nth(index).focus();
        await page.keyboard.press('Enter');
        const ring = await page.evaluate(() => {
          const channels = (color: string): number[] => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
          const luminance = ([red, green, blue]: number[]): number => {
            const linear = [red, green, blue].map((value) => {
              const unit = value / 255;
              return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
          };
          const heading = document.activeElement as HTMLElement;
          let surface: Element | null = heading;
          while (surface && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)')
            surface = surface.parentElement;
          const style = getComputedStyle(heading);
          const outline = luminance(channels(style.outlineColor));
          const ground = luminance(
            channels(surface ? getComputedStyle(surface).backgroundColor : 'rgb(255, 255, 255)'),
          );
          const [light, dark] = outline > ground ? [outline, ground] : [ground, outline];
          return {
            tag: heading.tagName,
            style: style.outlineStyle,
            width: parseFloat(style.outlineWidth),
            contrast: (light + 0.05) / (dark + 0.05),
            name: (heading.textContent ?? '').trim().slice(0, 30),
          };
        });

        expect(ring.tag).toBe('H2');
        expect(ring.style, ring.name).not.toBe('none');
        expect(ring.width, ring.name).toBeGreaterThanOrEqual(2);
        expect(ring.contrast, `${ring.name}: contrast of the ring`).toBeGreaterThanOrEqual(MIN_RING_CONTRAST);
      }
    });
  }

  for (const viewport of [DESKTOP, PHONE]) {
    test(`/lgpd: after a jump to the controller card its small line is not under the floating header, at ${viewport.width}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openPage(page, LGPD);
      if (viewport === PHONE) await page.locator(`${TOC_NAV} summary`).click();
      const link = tocLinks(page).first();
      const id = ((await link.getAttribute('href')) ?? '').slice(1);
      await link.click();

      const heading = byId(page, id);
      await expect(heading).toBeFocused();
      expectJustBelowHeader(await settledTop(heading), 'the title of the card');
      const kicker = page.locator('[data-legal-body] [class*="bg-zinc-950"] p[class*="text-[10px]"]').first();
      const kickerTop = await kicker.evaluate((element) => element.getBoundingClientRect().top);
      expect(kickerTop, 'the kicker is below the header').toBeGreaterThan(HEADER_BOTTOM_PX);
    });
  }

  test('with forced colors the title being read is told apart by more than the color of its bar', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await openPage(page, PRIVACY);
    await tocLinks(page).nth(2).click();
    await expect(page.locator(`${TOC_NAV} a[aria-current="location"]`)).toHaveCount(1);

    const lines = await tocLinks(page).evaluateAll((links) =>
      links.map((link) => ({
        isCurrent: link.getAttribute('aria-current') === 'location',
        decoration: getComputedStyle(link).textDecorationLine,
      })),
    );

    expect(lines.filter((line) => line.isCurrent).every((line) => line.decoration.includes('underline'))).toBe(true);
    expect(lines.filter((line) => !line.isCurrent).every((line) => !line.decoration.includes('underline'))).toBe(true);
  });

  for (const contract of PAGES) {
    test(`${contract.path}: the old markup is restyled by CSS, in the computed styles, at 1440`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await openPage(page, contract);

      const report = await page.evaluate(
        ({ palette, transparent, minSmall }) => {
          const body = document.querySelector('[data-legal-body]');
          if (!body) throw new Error('no body');
          const paletteSet = new Set(palette);
          const problems: string[] = [];
          const name = (element: Element) =>
            `${element.tagName.toLowerCase()} "${(element.textContent ?? '').trim().slice(0, 30)}"`;
          const checkColor = (element: Element, property: string, value: string, allowTransparent: boolean) => {
            if (allowTransparent && value === transparent) return;
            if (!paletteSet.has(value)) problems.push(`${name(element)} ${property} ${value}`);
          };

          for (const element of Array.from(body.querySelectorAll('*'))) {
            const style = getComputedStyle(element);
            if (style.display === 'none') continue;
            if (style.fontStyle === 'italic') problems.push(`${name(element)} is italic`);
            if (style.backgroundImage !== 'none') problems.push(`${name(element)} has a background image`);
            if (style.filter !== 'none') problems.push(`${name(element)} has a filter ${style.filter}`);
            if (element.matches('[class*="text-[10px]"]') && parseFloat(style.fontSize) < minSmall) {
              problems.push(`${name(element)} is ${style.fontSize}`);
            }
            const hasText = Array.from(element.childNodes).some(
              (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
            );
            if (hasText || element.matches('svg')) checkColor(element, 'color', style.color, false);
            checkColor(element, 'background-color', style.backgroundColor, true);
            if (parseFloat(style.borderTopWidth) > 0) checkColor(element, 'border-color', style.borderTopColor, false);
          }
          const h1 = getComputedStyle(body.querySelector('h1') as Element);
          // A title is ink, except inside a black card, where it is white.
          const h2s = Array.from(body.querySelectorAll('h2')).map((heading) => ({
            transform: getComputedStyle(heading).textTransform,
            color: getComputedStyle(heading).color,
            isOnBlack:
              getComputedStyle(heading.closest('[class*="bg-zinc-950"]') ?? heading).backgroundColor ===
              'rgb(10, 10, 10)',
          }));
          return {
            problems,
            h1: { transform: h1.textTransform, spacing: h1.letterSpacing, color: h1.color, weight: h1.fontWeight },
            h2s,
          };
        },
        { palette: [...PALETTE_RGB], transparent: TRANSPARENT, minSmall: MIN_SMALL_PRINT_PX },
      );

      expect(report.problems).toEqual([]);
      expect(report.h1.transform).toBe('lowercase');
      expect(parseFloat(report.h1.spacing)).toBeLessThan(0);
      expect(report.h1.color).toBe(INK_RGB);
      expect(report.h1.weight).toBe('700');
      for (const title of report.h2s) {
        expect(title.transform).toBe('lowercase');
        expect(title.color).toBe(title.isOnBlack ? WHITE_RGB : INK_RGB);
      }
      await page.screenshot({
        path: `e2e/__shots__/legal-restyle-${contract.path.slice(1)}-1440x900.png`,
        fullPage: true,
      });
    });
  }

  for (const contract of PAGES) {
    for (const viewport of [NARROWEST, { width: 320, height: 568 }]) {
      test(`${contract.path}: no e-mail or long word pushes the page past ${viewport.width}px, with the font at 120 percent`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await enableLargeFont(page);
        await openPage(page, contract);

        const overflow = await measureOverflow(page, viewport.width);
        expect(overflow.documentExcess, 'no horizontal scroll').toBeLessThanOrEqual(0);
        expect(overflow.elements, 'nothing past the right edge').toEqual([]);
        expect(await brokenWordsIn(page, TITLES), 'no word of a title is broken in the middle').toEqual([]);
        await page.screenshot({
          path: `e2e/__shots__/legal-large-${contract.path.slice(1)}-${viewport.width}x${viewport.height}.png`,
          fullPage: true,
        });
      });
    }
  }
});
