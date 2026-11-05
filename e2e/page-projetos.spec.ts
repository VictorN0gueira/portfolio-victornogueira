import { projects } from '../src/data/projects';
import { PROJECT_CTA_TEXT } from '../src/components/projectLabels';
import { PAGE_LOAD_TIMEOUT_MS } from './homeSupport';
import { expect, test } from './n8nGuard';
import { describePageContract, openPage, type PageContract } from './pageContract';

const FEATURED = projects.filter((project) => project.featured);
const WIDTHS = [320, 390, 768, 1024, 1440];
const VIEWPORT_HEIGHT = 900;
const PIXEL_TOLERANCE = 1;
const SIZES_WINDOWS = [320, 390, 768, 900, 1023, 1024, 1100, 1215, 1216, 1440];
const MEDIUM_WIDTH_PX = 768;
// On a phone the declared width ignores the 20px gutters that start at xs, so it may be a few pixels over.
const PHONE_EXCESS_PX = 10;
const REGULAR_COUNT = projects.filter((project) => !project.featured).length;

const CONTRACT: PageContract = {
  path: '/projetos',
  title: /^Projetos/,
  h1: 'Projetos',
  readyHeading: FEATURED[0].title,
  hasFloatingClearance: true,
};

test.describe('/projetos', () => {
  describePageContract(CONTRACT);

  test('no card is wider than the screen or cuts its own content, at the five widths', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'the test sets its own viewport: it runs once, in the desktop project',
    );
    test.slow();
    const problems: string[] = [];

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await openPage(page, CONTRACT);
      const cards = await page
        .locator('main ul > li > * a[href^="/projetos/"], main ul > li > a[href^="/projetos/"]')
        .evaluateAll(
          (links, limit) =>
            links.map((link) => {
              const box = link.getBoundingClientRect();
              return {
                href: link.getAttribute('href'),
                right: box.right,
                left: box.left,
                hasCutContent: link.scrollWidth > link.clientWidth + limit,
              };
            }),
          PIXEL_TOLERANCE,
        );

      expect(cards.length, `${width}px: all the cards are there`).toBe(projects.length);
      for (const card of cards) {
        if (card.right > width + PIXEL_TOLERANCE || card.left < -PIXEL_TOLERANCE)
          problems.push(`${width}px ${card.href} is outside the screen`);
        if (card.hasCutContent) problems.push(`${width}px ${card.href} has content wider than the card`);
      }
    }

    expect(problems).toEqual([]);
  });

  test('the sizes attribute of every regular card image is the width the image really gets', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'the test sets its own viewport: it runs once, in the desktop project',
    );
    test.slow();
    const problems: string[] = [];

    for (const width of SIZES_WINDOWS) {
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await openPage(page, CONTRACT);
      // The declared width is evaluated by the browser itself: the first entry of `sizes` whose media query holds is
      // given to a probe element as its width, so calc() and vw mean what they mean in the page.
      const images = await page.locator('main ul > li img').evaluateAll((all) =>
        all.map((image) => {
          const entry = (image.getAttribute('sizes') ?? '')
            .split(', ')
            .map((candidate) => /^(?:\((.+?)\) )?(.+)$/.exec(candidate))
            .find((match) => match && (!match[1] || matchMedia(`(${match[1]})`).matches));
          const probe = document.createElement('div');
          probe.style.width = entry?.[2] ?? '0px';
          probe.style.position = 'absolute';
          document.body.append(probe);
          const declared = probe.getBoundingClientRect().width;
          probe.remove();
          return { alt: image.getAttribute('alt') ?? '', declared, rendered: image.getBoundingClientRect().width };
        }),
      );
      // Only the covers of the five regular cards: the featured cards and their small shots have sizes of their own.
      for (const { alt, declared, rendered } of images.slice(-REGULAR_COUNT)) {
        const excess = declared - rendered;
        const tolerance = width < MEDIUM_WIDTH_PX ? PHONE_EXCESS_PX : PIXEL_TOLERANCE;
        if (excess > tolerance || excess < -PIXEL_TOLERANCE) {
          problems.push(
            `${width}px "${alt.slice(0, 30)}": declared ${declared.toFixed(0)}px, rendered ${rendered.toFixed(0)}px`,
          );
        }
      }
    }

    expect(problems).toEqual([]);
  });

  test('every card is one link that goes to its case, and the closing band goes to /contato', async ({ page }) => {
    await openPage(page, CONTRACT);

    const hrefs = await page
      .locator('main a[href^="/projetos/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs).toEqual(projects.map((project) => `/projetos/${project.slug}`));

    const band = page.getByRole('region', { name: PROJECT_CTA_TEXT });
    await expect(band.getByRole('link', { name: 'Vamos conversar' })).toHaveAttribute('href', '/contato');
  });

  test('a click on a card opens the page of the case', async ({ page }) => {
    await openPage(page, CONTRACT);

    await page.getByRole('link', { name: /^Hub081 Ver detalhes$/ }).click();

    await expect(page).toHaveURL(/\/projetos\/hub081$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Hub081' })).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
  });
});
