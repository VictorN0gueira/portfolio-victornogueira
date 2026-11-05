import type { Page } from '@playwright/test';
import { aboutCopy } from '../src/data/aboutCopy';
import { toolCategories } from '../src/data/tools';
import { toolMarks } from '../src/sections/about/toolMarks';
import { PAGE_LOAD_TIMEOUT_MS, walkPage } from './homeSupport';
import { describePageContract, openPage, type PageContract } from './pageContract';
import { expect, test } from './n8nGuard';

const ABOUT: PageContract = {
  path: '/sobre',
  title: /^Sobre a VN One e Victor Nogueira/,
  h1: 'Sobre mim',
  readyHeading: aboutCopy.tools.heading,
  hasFloatingClearance: true,
};
const GRAY_DARK_RGB = 'rgb(77, 77, 77)';
const ONLY_IN_DESKTOP = 'a hover test needs a pointer: it runs once, in the desktop project';
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/** '#2496ED' to 'rgb(36, 150, 237)', the form the browser reports a computed color in. */
function toRgb(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${red}, ${green}, ${blue})`;
}

/** The tile of a tool, found by its exact name: "Go (Golang)" must not be taken for the one of "Google Cloud". */
const cellOf = (page: Page, name: string) =>
  page.getByRole('listitem').filter({ hasText: new RegExp(`^${name.replace(REGEX_SPECIALS, '\\$&')}$`) });

test.describe('/sobre', () => {
  describePageContract(ABOUT);

  test('scrolls to the method section when the address is /sobre#metodo, and leaves the heading below the header', async ({ page }) => {
    await page.goto('/sobre#metodo');
    const method = page.locator('#metodo');
    await expect(method).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });
    await expect.poll(async () => (await method.boundingBox())?.y ?? Number.POSITIVE_INFINITY, { timeout: PAGE_LOAD_TIMEOUT_MS }).toBeLessThan(200);
    await expect(page.getByRole('heading', { level: 2, name: 'Do primeiro papo ao fluxo rodando' })).toBeVisible();
  });

  test('loads the photo of the founder in a modern format, with a real size', async ({ page }) => {
    await page.goto('/sobre');
    const photo = page.getByRole('img', { name: 'Victor Nogueira' });
    await expect(photo).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });
    await photo.scrollIntoViewIfNeeded();

    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth), { timeout: PAGE_LOAD_TIMEOUT_MS }).toBeGreaterThan(0);
    expect(await photo.evaluate((image: HTMLImageElement) => image.currentSrc)).toMatch(/\/founder\/victor-(480|960)\.(avif|webp)$/);
    await expect(page.getByText(aboutCopy.photoCaption)).toBeVisible();
  });

  test('lists the tools by name and draws each logo gray at rest', async ({ page }) => {
    await openPage(page, ABOUT);

    for (const category of toolCategories) {
      const list = page.getByRole('list', { name: category.title });
      await expect(list.getByRole('listitem')).toHaveCount(category.tools.length);
      for (const tool of category.tools) {
        const cell = cellOf(page, tool.name);
        await expect(cell.locator('svg')).toHaveCSS('color', GRAY_DARK_RGB);
        await expect(cell.locator('svg')).toHaveAttribute('aria-hidden', 'true');
      }
    }
  });

  test('shows the original brand color of a logo on hover', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
    await openPage(page, ABOUT);

    for (const tool of toolCategories.flatMap((category) => category.tools)) {
      const cell = cellOf(page, tool.name);
      await cell.scrollIntoViewIfNeeded();
      await cell.hover();
      await expect(cell.locator('svg'), tool.name).toHaveCSS('color', toRgb(toolMarks[tool.id].brand));
    }
  });

  test('shows the brand color with the keyboard focus too, and gray again when the focus leaves', async ({ page }) => {
    await openPage(page, ABOUT);
    const cell = cellOf(page, 'Docker');
    await cell.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);

    await cell.focus();
    await expect(cell.locator('svg')).toHaveCSS('color', toRgb(toolMarks.docker.brand));
    await expect(cell).toBeFocused();

    await cell.evaluate((element: HTMLElement) => element.blur());
    await expect(cell.locator('svg')).toHaveCSS('color', GRAY_DARK_RGB);
  });

  test('puts the tab order of the tools in the order of the page: a tab from one tile reaches the next', async ({ page }) => {
    await openPage(page, ABOUT);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await cellOf(page, 'n8n').focus();

    await page.keyboard.press('Tab');

    await expect(cellOf(page, 'Make')).toBeFocused();
    await walkPage(page);
  });
});
