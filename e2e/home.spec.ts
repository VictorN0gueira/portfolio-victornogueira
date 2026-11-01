import type { Locator, Page } from '@playwright/test';
import {
  ACCENT_RGB,
  FINAL_HEADING,
  HOURS_PILL_NAME,
  MIN_TOUCH_PX,
  PAGE_LOAD_TIMEOUT_MS,
  QUOTE_BUTTON,
  QUOTE_START,
  ROI_HEADING,
  SECTION_HEADINGS,
  SERVICE_PLACEHOLDER,
  STATEMENT_HEADING,
  TOUCH_ROUNDING_PX,
  choosePillOption,
  countAccentBySection,
  enableLargeFont,
  menuButton,
  nextFrames,
  openHome,
  walkPage,
} from './homeSupport';
import { N8N_WEBHOOK_PATTERN, expect, fulfillOk, n8nRoute, test } from './n8nGuard';

// The whole home, assembled: the sections in order, no horizontal overflow, the anchors that point into it and the
// hand over of the ROI quote to the form. Every test goes through the guard of ./n8nGuard (the home mounts the real
// form, so nothing may reach n8n), and none sends the form.

const OVERFLOW_WIDTHS = [320, 768, 1024, 1440];
const SMALLEST_PHONE = { width: 280, height: 653 };
const DESKTOP_1440 = { width: 1440, height: 900 };
const ULTRA_WIDE = { width: 2560, height: 1080 };
const PLACEHOLDER_EMAIL = 'voce@empresa.com.br';
// A late chunk: long enough for the sections around it to be laid out first.
const CHUNK_DELAY_MS = 1200;
const SUBPIXEL_PX = 1;
// How far from its place an anchor may end after late chunks. The page puts a section back when it is more than 8px off.
const SETTLED_TOLERANCE_PX = 12;
// Frames in a row the section must stay in place to count as settled (30 is half a second at 60 frames a second).
const SETTLED_FRAMES = 30;

const topOf = (page: Page, id: string) =>
  page.evaluate((target) => document.getElementById(target)?.getBoundingClientRect().top ?? Number.NaN, id);

test.describe('home sections', () => {
  test('shows the hero first and every section after it, one under the other, in the order of the brief', async ({ page }) => {
    await openHome(page);

    const tops = await page.evaluate((headings) => {
      const top = (element: Element | null) => (element ? element.getBoundingClientRect().top + window.scrollY : Number.NaN);
      const h2s = Array.from(document.querySelectorAll('h2'));
      return {
        hero: top(document.querySelector('h1')),
        named: headings.map((name) => top(h2s.find((h2) => h2.textContent === name) ?? null)),
      };
    }, [STATEMENT_HEADING, ...SECTION_HEADINGS]);

    const ordered = [tops.hero, ...tops.named];
    expect(ordered.every(Number.isFinite)).toBe(true);
    expect([...ordered].sort((a, b) => a - b)).toEqual(ordered);
    expect(new Set(ordered).size).toBe(ordered.length);
  });

  test('has one contact form, and only one anchor called contato', async ({ page }) => {
    await openHome(page);

    await expect(page.locator('form[name="contact"]')).toHaveCount(1);
    await expect(page.locator('#contato')).toHaveCount(1);
    // The ids of the form come from useId, so the check is on the form and its label wiring, never on an id.
    await expect(page.locator('form[name="contact"] label[for]')).not.toHaveCount(0);
  });

  test('carries none of the old home sections', async ({ page }) => {
    await openHome(page);

    await expect(page.getByText('Cases em Destaque')).toHaveCount(0);
    await expect(page.getByText(/Vamos criar/)).toHaveCount(0);
  });

  for (const width of OVERFLOW_WIDTHS) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await openHome(page);
      await nextFrames(page);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
});

/**
 * Makes the chunks of the given sections answer late and counts how many times each was asked for. The count is what
 * proves the delay was really applied: a chunk that is renamed or merged would otherwise degrade the test in silence.
 */
async function delayChunks(page: Page, chunks: string[], delayMs: number): Promise<Map<string, number>> {
  const hits = new Map<string, number>(chunks.map((chunk) => [chunk, 0]));
  for (const chunk of chunks) {
    // [.] and not an escaped dot: a backslash in a template literal is eaten before the regular expression sees it.
    await page.route(new RegExp(`/assets/${chunk}-[^/]+[.]js$`), async (route) => {
      hits.set(chunk, (hits.get(chunk) ?? 0) + 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await route.continue();
    });
  }
  return hits;
}

function expectEveryChunkAnsweredLate(hits: Map<string, number>, chunks: string[]) {
  expect([...hits.keys()]).toEqual(chunks);
  for (const chunk of chunks) expect(hits.get(chunk), `${chunk} was requested and delayed`).toBeGreaterThanOrEqual(1);
}

/**
 * The section ends where an anchor puts it, however late the chunks came: it waits until the section has stayed within
 * the tolerance of its place for a run of frames (about half a second), so a position crossed on the way, or a section
 * that is put back after the last late chunk, does not count as settled.
 */
async function expectSettledAtAnchor(page: Page, id: string) {
  // The run of frames is counted on the page: a new call (the ROI test makes two on one page) starts from zero.
  await page.evaluate(() => {
    delete (window as unknown as { __settledFrames?: number }).__settledFrames;
  });
  await page.waitForFunction(
    ({ target, tolerance, frames }) => {
      const state = window as unknown as { __settledFrames?: number };
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
      const top = document.getElementById(target)?.getBoundingClientRect().top ?? Number.NaN;
      state.__settledFrames = Math.abs(top - padding) <= tolerance ? (state.__settledFrames ?? 0) + 1 : 0;
      return state.__settledFrames >= frames;
    },
    { target: id, tolerance: SETTLED_TOLERANCE_PX, frames: SETTLED_FRAMES },
    { timeout: PAGE_LOAD_TIMEOUT_MS },
  );
}

test.describe('home anchors', () => {
  const CHUNKS_ABOVE = ['StatementStats', 'UseCaseTabs', 'ServicesCards'];
  const OWN_CHUNK: Record<string, string> = { metodo: 'MethodSteps', clientes: 'Testimonials' };
  // The first scroll was once given only one second to find its target: this is longer than that.
  const OWN_CHUNK_DELAY_MS = 2500;

  for (const id of ['metodo', 'clientes']) {
    test(`lands on #${id} after the lazy sections have loaded`, async ({ page }) => {
      await openHome(page, `/#${id}`);

      await expectSettledAtAnchor(page, id);
    });

    test(`keeps #${id} in place when the sections above it arrive late`, async ({ page }) => {
      const hits = await delayChunks(page, CHUNKS_ABOVE, CHUNK_DELAY_MS);

      await openHome(page, `/#${id}`);
      // Every delayed chunk has answered (the page is complete).
      expectEveryChunkAnsweredLate(hits, CHUNKS_ABOVE);

      await expectSettledAtAnchor(page, id);
    });

    test(`reaches #${id} when its own chunk and the ones above it arrive late`, async ({ page }) => {
      const chunks = [...CHUNKS_ABOVE, OWN_CHUNK[id]];
      const hits = await delayChunks(page, chunks, OWN_CHUNK_DELAY_MS);

      await openHome(page, `/#${id}`);
      expectEveryChunkAnsweredLate(hits, chunks);

      await expectSettledAtAnchor(page, id);
    });
  }
});

test.describe('skeleton heights', () => {
  // The skeletons of the lazy sections (styles/skeleton.css) are measured data. When the copy or the layout of a section
  // changes its height, the table goes stale without a sound: this holds the eight chunks, reads each skeleton, lets the
  // sections in, reads each section, and compares. A failure names the section, the width and the font. If the table is
  // stale, measure it again with scripts/measure-skeletons.mjs.
  const SECTION_NAMES = ['statement', 'use-cases', 'services', 'method', 'roi', 'testimonials', 'faq', 'final-cta'];
  const LAZY_CHUNKS = [
    'StatementStats',
    'UseCaseTabs',
    'ServicesCards',
    'MethodSteps',
    'RoiSimulator',
    'Testimonials',
    'FaqSection',
    'FinalCta',
  ];
  const WIDTHS = [390, 1024, 1920];
  const FONTS = [
    { name: 'normal', isLarge: false },
    { name: 'larger', isLarge: true },
  ];
  const MAX_DRIFT_PX = 60;
  // Frames in a row with the same page height: the layout has stopped moving (images, fonts, late sections).
  const STEADY_FRAMES = 30;

  /** The heights of the eight lazy sections, or of their skeletons: the last eight blocks of the page. */
  const lazyBlockHeights = (page: Page) =>
    page.evaluate(() => {
      const blocks = Array.from((document.querySelector('main > *') as Element).children).slice(-8);
      return blocks.map((block) => block.getBoundingClientRect().height);
    });

  for (const { name: fontName, isLarge } of FONTS) {
    for (const width of WIDTHS) {
      test(`holds a height within ${MAX_DRIFT_PX}px of the real section, at ${width}px with the ${fontName} font`, async ({ page }) => {
        if (isLarge) await enableLargeFont(page);
        await page.setViewportSize({ width, height: 900 });
        let release: () => void = () => {};
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        const held = new Set<string>();
        for (const chunk of LAZY_CHUNKS) {
          await page.route(new RegExp(`/assets/${chunk}-[^/]+[.]js$`), async (route) => {
            held.add(chunk);
            await gate;
            await route.continue();
          });
        }

        await page.goto('/');
        await expect(page.getByText('Carregando...')).toHaveCount(LAZY_CHUNKS.length);
        await expect.poll(() => held.size, { message: 'every lazy chunk was held' }).toBe(LAZY_CHUNKS.length);
        const skeletons = await lazyBlockHeights(page);

        release();
        await openHome(page, '/');
        await page.waitForFunction(
          (frames) => {
            const state = window as unknown as { __steady?: { height: number; count: number } };
            const height = document.documentElement.scrollHeight;
            state.__steady = state.__steady?.height === height ? { height, count: state.__steady.count + 1 } : { height, count: 0 };
            return state.__steady.count >= frames;
          },
          STEADY_FRAMES,
          { timeout: PAGE_LOAD_TIMEOUT_MS },
        );
        const sections = await lazyBlockHeights(page);

        SECTION_NAMES.forEach((section, index) => {
          const drift = Math.abs(skeletons[index] - sections[index]);
          expect(
            drift,
            `${section} at ${width}px, ${fontName} font: skeleton ${Math.round(skeletons[index])}px, real ${Math.round(sections[index])}px`,
          ).toBeLessThanOrEqual(MAX_DRIFT_PX);
        });
      });
    }
  }
});

test.describe('hash anchor motion', () => {
  // How many scroll positions the page passes through on the way to #metodo, counting every frame. A glide has dozens;
  // a jump has the one it lands on, and a correction after a late chunk adds one more.
  const MAX_INTERMEDIATE_POSITIONS_WITH_REDUCED_MOTION = 2;

  async function sampleScrollYWhileOpening(page: Page): Promise<number[]> {
    await page.addInitScript(() => {
      const seen = new Set<number>();
      (window as unknown as { __scrollYSeen: Set<number> }).__scrollYSeen = seen;
      const sample = () => {
        seen.add(Math.round(window.scrollY));
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await openHome(page, '/#metodo');
    await expectSettledAtAnchor(page, 'metodo');
    return page.evaluate(() => [...(window as unknown as { __scrollYSeen: Set<number> }).__scrollYSeen]);
  }

  test.describe('with a preference for reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('jumps to #metodo, it does not glide', async ({ page }) => {
      const positions = await sampleScrollYWhileOpening(page);
      const final = Math.max(...positions);
      const intermediate = positions.filter((position) => position !== 0 && position !== final);

      expect(intermediate.length).toBeLessThanOrEqual(MAX_INTERMEDIATE_POSITIONS_WITH_REDUCED_MOTION);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
    });
  });

  test.describe('with no preference', () => {
    test.use({ contextOptions: { reducedMotion: 'no-preference' } });

    // Not a count of frames: a loaded machine draws few of them, and a few samples would say nothing about a glide.
    // The page glides because its CSS says so, and the hash scroll leaves the behavior to that CSS.
    test('leaves the glide to the CSS, which is smooth', async ({ page }) => {
      await openHome(page, '/#metodo');
      await expectSettledAtAnchor(page, 'metodo');

      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('smooth');
    });
  });
});

test.describe('home quote hand over', () => {
  const messageField = (page: Page) => page.getByLabel('Mensagem', { exact: true });

  test('fills the message and scrolls to the form, and does it again after the field was edited', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    await openHome(page);
    const quote = page.getByRole('button', { name: QUOTE_BUTTON });
    await quote.scrollIntoViewIfNeeded();
    await quote.click();

    await expect(messageField(page)).toHaveValue(new RegExp(`^${QUOTE_START}`));
    await expectSettledAtAnchor(page, 'contato');
    const message = await messageField(page).inputValue();

    await messageField(page).fill('Outra coisa');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await quote.scrollIntoViewIfNeeded();
    await quote.click();

    await expect(messageField(page)).toHaveValue(message);
    await expectSettledAtAnchor(page, 'contato');
    expect(network.calls).toHaveLength(0);
  });
});

test.describe('final call to action fit (M11)', () => {
  const heading = (page: Page): Locator => page.getByRole('heading', { level: 2, name: FINAL_HEADING });

  /** The words of the heading that are drawn on more than one line box: a word broken in the middle. */
  const brokenWords = (target: Locator) =>
    target.evaluate((element) => {
      const broken: string[] = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent ?? '';
        for (const match of text.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(node, match.index ?? 0);
          range.setEnd(node, (match.index ?? 0) + match[0].length);
          const lines = new Set(Array.from(range.getClientRects()).map((rect) => Math.round(rect.top)));
          if (lines.size > 1) broken.push(match[0]);
        }
      }
      return broken;
    });

  for (const viewport of [DESKTOP_1440, ULTRA_WIDE]) {
    test(`never breaks a word of the heading, "automatiza" included, at ${viewport.width}px with the larger font`, async ({ page }) => {
      await enableLargeFont(page);
      await page.setViewportSize(viewport);
      await openHome(page);
      await expect(page.locator('html')).toHaveClass(/a11y-font-large/);
      await heading(page).scrollIntoViewIfNeeded();
      await nextFrames(page);

      expect(await brokenWords(heading(page))).toEqual([]);
    });
  }

  test('fits the longest placeholder in the e-mail field at 280px, and every control is 44px tall', async ({ page }) => {
    await page.setViewportSize(SMALLEST_PHONE);
    await openHome(page);
    const form = page.locator('form[name="contact"]');
    await form.scrollIntoViewIfNeeded();
    const email = form.getByLabel('E-mail', { exact: true });
    await expect(email).toHaveAttribute('placeholder', PLACEHOLDER_EMAIL);

    const { textWidth, contentWidth } = await email.evaluate((input, text) => {
      const style = getComputedStyle(input);
      const context = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      return { textWidth: context.measureText(text).width, contentWidth: input.clientWidth - padding };
    }, PLACEHOLDER_EMAIL);
    expect(textWidth).toBeLessThanOrEqual(contentWidth + SUBPIXEL_PX);

    const panel = form.locator('xpath=..');
    const controls: Record<string, Locator> = {
      'Por e-mail': panel.getByRole('button', { name: 'Por e-mail' }),
      'Por WhatsApp': panel.getByRole('button', { name: 'Por WhatsApp' }),
      Nome: form.getByLabel('Nome', { exact: true }),
      Serviço: form.getByRole('button', { name: SERVICE_PLACEHOLDER }),
      'E-mail': email,
      Mensagem: form.getByLabel('Mensagem', { exact: true }),
      Enviar: form.getByRole('button', { name: 'Enviar', exact: true }),
    };
    for (const [name, control] of Object.entries(controls)) {
      const box = await control.boundingBox();
      expect(box, name).not.toBeNull();
      // A box of 44px can be measured as 43.99997 (floating point), which is not a smaller target.
      expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(MIN_TOUCH_PX - TOUCH_ROUNDING_PX);
    }
  });
});

test.describe('hero hours', () => {
  test('moves the sentence from R$ 1.733 (10 hours) to R$ 6.933 (40 hours) and back, on the assembled home', async ({ page }) => {
    await openHome(page);
    const sentence = page.getByRole('heading', { level: 1 });

    // 10 hours is the starting choice; hero.spec.ts covers the hero alone, this goes through the full page.
    await expect(sentence).toContainText(/R\$\s1\.733/);
    await choosePillOption(page, HOURS_PILL_NAME, '40 horas');
    await expect(sentence).toContainText(/R\$\s6\.933/);
    await choosePillOption(page, HOURS_PILL_NAME, '10 horas');
    await expect(sentence).toContainText(/R\$\s1\.733/);
  });
});

test.describe('one accent per section', () => {
  const MAX_ACCENT_PER_SECTION = 1;
  // The sections that are known to carry the accent, once each: the amount chip of the hero, the savings of the ROI
  // panel and the block after the heading of the final call to action. They are the positive control: if the accent
  // stops matching (the token moves to oklch, say), every count would be 0 and "at most one" would pass for nothing.
  const SECTIONS_WITH_THE_ACCENT = ['section 0', ROI_HEADING, FINAL_HEADING];

  async function expectAtMostOneAccentEach(page: Page) {
    await openHome(page);
    await walkPage(page);
    const sections = await countAccentBySection(page);

    // The count of each section goes to the report (annotations), so a section close to the limit is seen early.
    for (const { name, hits } of sections) test.info().annotations.push({ type: 'accent', description: `${name}: ${hits.length} ${hits.join(' | ')}` });
    expect(sections.length).toBeGreaterThanOrEqual(SECTION_HEADINGS.length);
    for (const { name, hits } of sections) {
      expect(hits.length, `${name}: ${hits.join(' | ')}`).toBeLessThanOrEqual(MAX_ACCENT_PER_SECTION);
    }
    for (const name of SECTIONS_WITH_THE_ACCENT) {
      const section = sections.find((candidate) => candidate.name === name);
      expect(section?.hits.length, `${name} carries the accent exactly once (the check still sees ${ACCENT_RGB})`).toBe(1);
    }
    expect(sections.reduce((total, section) => total + section.hits.length, 0)).toBeGreaterThanOrEqual(SECTIONS_WITH_THE_ACCENT.length);
  }

  test('draws #00E5A0 on at most one element in each section, and finds it where it is used', async ({ page }) => {
    await expectAtMostOneAccentEach(page);
  });

  test.describe('with a preference for reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('draws #00E5A0 on at most one element in each section, and finds it where it is used', async ({ page }) => {
      await expectAtMostOneAccentEach(page);
    });
  });
});

test.describe('hash anchors into the home', () => {
  const MAX_ARRIVAL_MS = 2000;
  const DESKTOP_NAV_MIN_WIDTH = 1024;

  /** Where the section is against the bottom of the header: positive when the header leaves it free. */
  const clearance = (page: Page, id: string) =>
    page.evaluate((target) => {
      const header = document.querySelector('header')?.getBoundingClientRect();
      const top = document.getElementById(target)?.getBoundingClientRect().top;
      return header && top !== undefined ? top - header.bottom : Number.NaN;
    }, id);

  test('opens /#contato with the form in the window within 2 seconds of the form being in the page, and rests under the header', async ({ page }) => {
    // What the 2 seconds cover: the section entering the window. The scroll to #contato cannot land before the form (the
    // target, the last lazy chunk) is in the page, and the page then glides about 9000px by its own smooth scroll (the
    // target is first in the window about 1.5s after the load event and rests about 2.3s after it, chunks served
    // locally). A budget from the load event would mostly time the network and the glide, so it starts when the form is
    // attached. The poll is true while the section is still travelling, so the arrival is asserted after it: the
    // section settles at its anchor and its top is clear of the header.
    await page.goto('/#contato');
    await expect(page.locator('form[name="contact"]')).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });

    await expect
      .poll(
        async () => {
          const gap = await clearance(page, 'contato');
          const top = await topOf(page, 'contato');
          const height = await page.evaluate(() => window.innerHeight);
          return gap >= -SUBPIXEL_PX && top < height;
        },
        { timeout: MAX_ARRIVAL_MS },
      )
      .toBe(true);

    await expectSettledAtAnchor(page, 'contato');
    expect(await clearance(page, 'contato')).toBeGreaterThanOrEqual(-SUBPIXEL_PX);
  });

  test('goes from /sobre to #metodo on the home when "Como funciona" is clicked in the header', async ({ page }) => {
    await page.goto('/sobre');
    await expect(page.getByRole('heading', { level: 1, name: 'Sobre mim' })).toBeVisible();
    const isDesktop = (page.viewportSize()?.width ?? 0) >= DESKTOP_NAV_MIN_WIDTH;
    if (isDesktop) {
      await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Como funciona' }).click();
    } else {
      await menuButton(page).click();
      await page.getByRole('dialog', { name: 'Menu de navegação' }).getByRole('link', { name: 'Como funciona' }).click();
    }

    await expect(page).toHaveURL(/\/#metodo$/);
    await expect(page.locator('form[name="contact"]')).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });
    await expectSettledAtAnchor(page, 'metodo');
    expect(await clearance(page, 'metodo')).toBeGreaterThanOrEqual(-SUBPIXEL_PX);
  });
});

test.describe('reduced motion on the home', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  // The assertion is the absence of change, so it needs a window: longer than the 4200ms a tab stays selected.
  const OBSERVATION_MS = 5000;

  test('keeps the use case tab where it is for 5 seconds, and shows every hero row done', async ({ page }) => {
    await openHome(page);
    await page.getByRole('tab').first().scrollIntoViewIfNeeded();
    const selectedBefore = await page.getByRole('tab', { selected: true }).innerText();

    const changes = await page.evaluate(
      (windowMs) =>
        new Promise<number>((resolve) => {
          let count = 0;
          const observer = new MutationObserver((records) => {
            count += records.length;
          });
          for (const tab of document.querySelectorAll('[role="tab"]')) {
            observer.observe(tab, { attributes: true, attributeFilter: ['aria-selected'] });
          }
          setTimeout(() => {
            observer.disconnect();
            resolve(count);
          }, windowMs);
        }),
      OBSERVATION_MS,
    );

    expect(changes).toBe(0);
    expect(await page.getByRole('tab', { selected: true }).innerText()).toBe(selectedBefore);
    const rows = page.locator('[data-flow-window] li[data-state]');
    expect(await rows.evaluateAll((items) => items.map((item) => item.getAttribute('data-state')))).toEqual([
      'done',
      'done',
      'done',
      'done',
    ]);
  });
});
