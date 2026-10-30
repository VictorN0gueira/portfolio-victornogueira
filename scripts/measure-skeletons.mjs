/**
 * Measures the real height of the eight lazy sections of the home and writes the table of src/styles/skeleton.css, the
 * heights the skeletons hold while a section loads (see that file, HomePage and SectionSkeleton).
 *
 * Usage (not part of CI; run it when the copy or the layout of a lazy section changed):
 *   npm run build
 *   npx vite preview --port 4191 --strictPort                 # in another terminal, any free port but 3000
 *   npm run measure:skeletons -- http://localhost:4191/        # prints the CSS
 *   npm run measure:skeletons -- http://localhost:4191/ --write   # replaces src/styles/skeleton.css
 *   npm run measure:skeletons -- http://localhost:4191/ --tolerance=24   # tighter bands (more of them)
 * Then run `npx playwright test e2e/home.spec.ts --grep "skeleton heights"`: it holds the skeletons to within 60px of
 * the real sections at 390, 1024 and 1920px with both fonts.
 *
 * It measures at every width of WIDTHS, once with the normal font and once with the larger font option (a11y-font-large),
 * in a fresh Chromium context each. It takes a few minutes. Each band of the table covers widths whose heights are within
 * twice the tolerance of each other and holds the middle of them.
 *
 * Offline safe: it only opens the page you give it, which has to be on this machine (localhost, 127.0.0.1) and not on
 * port 3000, the port of the dev server. Every request to any other host is aborted: the client logos and the project
 * images are self-hosted (/clients and /projects), so they are measured as the real images. The form is never touched,
 * so nothing is sent to n8n.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// SKELETON_PORT picks the preview this script opens when no URL is given, so two worktrees can measure at once.
const DEFAULT_SKELETON_PORT = 4191;
const DEFAULT_URL = `http://localhost:${process.env.SKELETON_PORT ?? DEFAULT_SKELETON_PORT}/`;
const DEV_SERVER_PORT = '3000';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const OUTPUT = resolve(import.meta.dirname, '../src/styles/skeleton.css');
const DEFAULT_TOLERANCE_PX = 32;
const WINDOW_HEIGHT_PX = 900;
// The widths measured: phones, the breakpoints of the layout (639 and 640, 767 and 768, 1023 and 1024) and in between.
const WIDTHS = [
  320, 330, 340, 350, 360, 375, 380, 390, 400, 412, 420, 440, 460, 480, 500, 520, 540, 560, 580, 600, 620, 639, 640, 660,
  680, 700, 720, 767, 768, 800, 820, 860, 900, 940, 960, 980, 1023, 1024, 1060, 1100, 1140, 1180, 1220, 1280, 1320, 1366,
  1400, 1440, 1480, 1536, 1600, 1700, 1800, 1920, 2200, 2560,
];
// The custom property of each section, in the order they come on the page.
const SECTIONS = ['statement', 'use-cases', 'services', 'method', 'roi', 'testimonials', 'faq', 'final-cta'];
const FONTS = [
  { name: 'normal', isLarge: false, selector: ':root', remPx: 16, title: 'Normal font' },
  { name: 'larger', isLarge: true, selector: 'html.a11y-font-large', remPx: 19.2, title: 'Larger font (a11y-font-large)' },
];
// Frames in a row with the same page height: the layout has stopped moving.
const STEADY_FRAMES = 30;
const LOAD_TIMEOUT_MS = 30_000;

function parseArguments(argv) {
  const flags = argv.filter((argument) => argument.startsWith('--'));
  const url = argv.find((argument) => !argument.startsWith('--')) ?? DEFAULT_URL;
  const toleranceFlag = flags.find((flag) => flag.startsWith('--tolerance='));
  const tolerance = toleranceFlag ? Number(toleranceFlag.slice('--tolerance='.length)) : DEFAULT_TOLERANCE_PX;
  if (!Number.isFinite(tolerance) || tolerance < 1) throw new Error(`--tolerance needs a number of pixels, got "${toleranceFlag}"`);
  return { url, tolerance, shouldWrite: flags.includes('--write') };
}

function assertLocalPage(url) {
  const { hostname, port } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname)) throw new Error(`Refusing ${url}: only a page on this machine (localhost or 127.0.0.1)`);
  if (port === DEV_SERVER_PORT) throw new Error('Refusing port 3000: it is the dev server. Use a preview on another port.');
}

/** The heights of the last eight blocks of the page, the eight lazy sections, once the layout has stopped moving. */
async function measureAt(browser, url, width, isLarge) {
  const origin = new URL(url).origin;
  const context = await browser.newContext({ viewport: { width, height: WINDOW_HEIGHT_PX } });
  try {
    const page = await context.newPage();
    if (isLarge) await page.addInitScript(() => localStorage.setItem('a11y-preferences', JSON.stringify({ fontSize: true })));
    await page.route('**/*', (route) => {
      const target = new URL(route.request().url());
      if (target.origin === origin) return route.continue();
      return route.abort();
    });
    await page.goto(url);
    await page.locator('form[name="contact"]').waitFor({ state: 'attached', timeout: LOAD_TIMEOUT_MS });
    await page.waitForFunction(
      (frames) => {
        const state = window;
        const height = document.documentElement.scrollHeight;
        state.__steady = state.__steady?.height === height ? { height, count: state.__steady.count + 1 } : { height, count: 0 };
        return state.__steady.count >= frames;
      },
      STEADY_FRAMES,
      { timeout: LOAD_TIMEOUT_MS },
    );
    return await page.evaluate(() =>
      Array.from(document.querySelector('main > *').children)
        .slice(-8)
        .map((block) => block.getBoundingClientRect().height),
    );
  } finally {
    await context.close();
  }
}

/** Widths from the first, grouped while the heights of a section stay within twice the tolerance; the middle of each. */
function bandsOf(heightsByWidth, sectionIndex, tolerance, remPx) {
  const bands = [];
  let start = 0;
  while (start < WIDTHS.length) {
    let low = heightsByWidth[start][sectionIndex];
    let high = low;
    let end = start;
    while (end + 1 < WIDTHS.length) {
      const next = heightsByWidth[end + 1][sectionIndex];
      if (Math.max(high, next) - Math.min(low, next) > 2 * tolerance) break;
      low = Math.min(low, next);
      high = Math.max(high, next);
      end += 1;
    }
    bands.push({ width: WIDTHS[start], rem: Math.round(((low + high) / 2 / remPx) * 10) / 10 });
    start = end + 1;
  }
  return bands;
}

function cssFor(font, heightsByWidth, tolerance) {
  const bandsBySection = SECTIONS.map((_section, index) => bandsOf(heightsByWidth, index, tolerance, font.remPx));
  const edges = [...new Set(bandsBySection.flatMap((bands) => bands.map((band) => band.width)))].sort((a, b) => a - b);
  const blocks = edges.map((edge) => {
    const lines = SECTIONS.flatMap((section, index) =>
      bandsBySection[index].filter((band) => band.width === edge).map((band) => `--vn-skeleton-${section}: ${band.rem}rem;`),
    );
    if (edge === WIDTHS[0]) return `${font.selector} {\n${lines.map((line) => `  ${line}\n`).join('')}}\n`;
    return `@media (min-width: ${edge}px) {\n  ${font.selector} {\n${lines.map((line) => `    ${line}\n`).join('')}  }\n}\n`;
  });
  return `/* ${font.title} */\n${blocks.join('\n')}`;
}

function headerFor(tolerance) {
  return `/*
 * Heights of the skeletons of the lazy home sections (HomePage, SectionSkeleton). A skeleton holds about the height of the
 * section it stands for, so a chunk that arrives late moves little of what is under it. The heights were measured in
 * Chromium at ${WIDTHS.length} widths from ${WIDTHS[0]} to ${WIDTHS.at(-1)}px, once with the normal font and once with the larger font option (the text
 * wraps differently, section by section, so the larger font has bands of its own and one scale cannot fit them all).
 * Each band spans at most about ${2 * tolerance}px of height and holds the middle of it. Normal font values are in rem of 16px, the
 * larger font ones in rem of 19.2px (120%), so both are the measured pixels. The larger font rules come after the normal
 * ones and are more specific, so they win at every width. skeleton.test.ts checks that every section has both.
 *
 * To measure again, after a change of the copy or the layout of a lazy section (see scripts/measure-skeletons.mjs):
 *   npm run build && npx vite preview --port 4191 --strictPort      # in another terminal
 *   npm run measure:skeletons -- http://localhost:4191/ --write
 * The e2e case "skeleton heights" of e2e/home.spec.ts fails when a band is more than 60px off the real section.
 */
`;
}

async function main() {
  const { url, tolerance, shouldWrite } = parseArguments(process.argv.slice(2));
  assertLocalPage(url);
  const browser = await chromium.launch();
  try {
    const parts = [];
    for (const font of FONTS) {
      const heightsByWidth = [];
      for (const width of WIDTHS) {
        heightsByWidth.push(await measureAt(browser, url, width, font.isLarge));
        process.stderr.write(`measured ${font.name} font at ${width}px\n`);
      }
      parts.push(cssFor(font, heightsByWidth, tolerance));
    }
    const css = `${headerFor(tolerance)}\n${parts.join('\n')}`;
    if (shouldWrite) {
      writeFileSync(OUTPUT, css, 'utf8');
      process.stderr.write(`wrote ${OUTPUT}\n`);
    } else {
      process.stdout.write(css);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
