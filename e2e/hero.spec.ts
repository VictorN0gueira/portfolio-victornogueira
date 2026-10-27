import { expect, test, type Page } from '@playwright/test';

const ROWS_LIST_NAME = 'Passos da automação';
const HOURS_PILL_NAME = /^Horas por semana/;
const TASK_PILL_NAME = /^Tarefa/;
const ROW_COUNT = 4;
const TASK_OPTIONS = ['atendimento no WhatsApp', 'emissão de notas', 'follow-up de vendas', 'planilha e WhatsApp'];
// The accent of the palette, as the browser serializes a computed color.
const ACCENT_RGB = 'rgb(0, 229, 160)';
// Sub pixel rounding of boxes.
const OVERFLOW_TOLERANCE_PX = 0;
const TILT_FLAT_DEG = 0.5;
const TILT_LEANING_DEG = 1;
const READING_POSITION = 0.3;

function heading(page: Page) {
  return page.getByRole('heading', { level: 1 });
}

function flowRows(page: Page) {
  return page.getByRole('list', { name: ROWS_LIST_NAME }).getByRole('listitem');
}

async function choose(page: Page, pillName: RegExp, optionName: string) {
  await page.getByRole('button', { name: pillName }).click();
  await page.getByRole('option', { name: optionName }).click();
}

async function pageOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function scrollPanelToReadingPosition(page: Page) {
  await page.evaluate((fraction) => {
    const panel = document.querySelector('[data-flow-window]') as HTMLElement;
    const top = panel.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - Math.round(window.innerHeight * fraction), behavior: 'instant' });
  }, READING_POSITION);
}

/** The rotateX of the tilted layer, in degrees, read from its computed matrix (scale and perspective do not touch it). */
async function readTiltDegrees(page: Page): Promise<number> {
  return page.evaluate(() => {
    const layer = document.querySelector('[data-flow-tilt]') as HTMLElement;
    const { transform } = getComputedStyle(layer);
    if (transform === 'none') return 0;
    const values = transform.replace(/^matrix3d\(|\)$/g, '').split(',').map(Number);
    return (Math.atan2(values[6], values[5]) * 180) / Math.PI;
  });
}

test.describe('hero sentence and panel', () => {
  test('shows the sentence as the page heading', async ({ page }) => {
    await page.goto('/');

    await expect(heading(page)).toBeVisible();
    await expect(heading(page)).toContainText('Sua equipe perde');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('updates the result to R$ 6.933 when the hours change to 40', async ({ page }) => {
    await page.goto('/');

    await choose(page, HOURS_PILL_NAME, '40 horas');

    await expect(heading(page)).toContainText(/R\$\s6\.933/);
    // The visible number counts up to the same value.
    await expect(heading(page).locator('[data-value]')).toHaveAttribute('data-value', /R\$\s6\.933/);
  });

  test('shows "Nota emitida" in the panel when the task changes to invoice issuing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('list', { name: ROWS_LIST_NAME }).getByText('Planilha atualizada')).toBeVisible();

    await choose(page, TASK_PILL_NAME, 'emissão de notas');

    await expect(page.getByRole('list', { name: ROWS_LIST_NAME }).getByText('Nota emitida')).toBeVisible();
    await expect(page.getByRole('list', { name: ROWS_LIST_NAME }).getByText('Planilha atualizada')).toHaveCount(0);
  });

  test('has no horizontal overflow, at the top and with the panel in the reading position', async ({ page }) => {
    await page.goto('/');
    await expect(heading(page)).toBeVisible();
    expect(await pageOverflow(page)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);

    await scrollPanelToReadingPosition(page);

    expect(await pageOverflow(page)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
  });

  // Regression: the pill used to be capped at a percentage of its own item (pill plus period), a few pixels
  // under the width its text needs, so even the default option wrapped on a line wide enough for it.
  test('keeps every option of the task pill on one line in the wide column, and never overflows with it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'a phone wraps the long options by design');

    await page.goto('/');
    for (const option of TASK_OPTIONS) {
      await choose(page, TASK_PILL_NAME, option);

      const lines = await page.getByRole('button', { name: TASK_PILL_NAME }).evaluate((pill) => {
        const range = document.createRange();
        range.selectNodeContents(pill.querySelector('span') as HTMLElement);
        return new Set(Array.from(range.getClientRects()).map((rect) => Math.round(rect.top))).size;
      });
      expect(lines, option).toBe(1);
      expect(await pageOverflow(page)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
    }
  });

  test('marks the rows done one after another while motion is on', async ({ page }) => {
    await page.goto('/');

    await expect(flowRows(page).first()).toHaveAttribute('data-state', 'done');
    await expect(flowRows(page).nth(1)).toHaveAttribute('data-state', 'done');
  });

  test('has exactly one element in the accent inside the hero: the result pill', async ({ page }) => {
    await page.goto('/');
    await expect(heading(page)).toBeVisible();

    const accents = await page.evaluate((accent) => {
      const hero = document.querySelector('main section') as HTMLElement;
      return Array.from(hero.querySelectorAll('*'))
        .filter((element) => {
          const style = getComputedStyle(element);
          return (
            style.color === accent ||
            style.backgroundColor === accent ||
            style.borderTopColor === accent ||
            style.fill === accent ||
            style.stroke === accent
          );
        })
        .map((element) => (element as HTMLElement).className);
    }, ACCENT_RGB);

    expect(accents).toHaveLength(1);
    expect(accents[0]).toContain('bg-vn-accent');
  });

  test('leans the panel back at the top of the page and lies it flat once it is scrolled to', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-flow-tilt]')).toBeAttached();

    expect(Math.abs(await readTiltDegrees(page))).toBeGreaterThan(TILT_LEANING_DEG);

    await scrollPanelToReadingPosition(page);

    await expect.poll(async () => Math.abs(await readTiltDegrees(page))).toBeLessThan(TILT_FLAT_DEG);
  });

  test('opens the pill list with a tap on a phone', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'this is the touch check');

    await page.goto('/');
    await page.getByRole('button', { name: TASK_PILL_NAME }).tap();

    const list = page.getByRole('listbox', { name: 'Tarefa' });
    await expect(list).toBeVisible();
    await expect(list.getByRole('option')).toHaveCount(4);
  });

  test('reaches the contact and method anchors from the two calls to action', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Quero automatizar' })).toHaveAttribute('href', '/#contato');
    await expect(page.getByRole('link', { name: 'Ver como funciona' })).toHaveAttribute('href', '/#metodo');
  });
});

test.describe('hero with reduced motion', () => {
  // Not a top level option: Playwright Test ignores `reducedMotion` there without a word, so it goes in contextOptions.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('shows the four rows already done, with no tilt', async ({ page }) => {
    await page.goto('/');

    await expect(flowRows(page)).toHaveCount(ROW_COUNT);
    for (let index = 0; index < ROW_COUNT; index += 1) {
      await expect(flowRows(page).nth(index)).toHaveAttribute('data-state', 'done');
    }
    await expect(page.locator('[data-flow-tilt]')).toHaveCount(0);
  });

  test('keeps the rows done after the cycle would have restarted', async ({ page }) => {
    await page.goto('/');
    // The cycle takes 5 beats of 1.4s: wait past one whole lap.
    await page.waitForTimeout(7500);

    await expect(page.locator('[data-flow-window] [data-state="done"]')).toHaveCount(ROW_COUNT);
  });
});
