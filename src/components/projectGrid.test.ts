import { describe, expect, it } from 'vitest';
import { cardLayout } from './projectGrid';

const LARGE_COLUMNS = 6;
const MIN_WIDTH_QUERY = /^\(min-width: (\d+)px\) (.+)$/;
const CALC_WITH_DIVISION = /^calc\(\(100vw - (\d+)px\) \/ (\d+)\)$/;
const CALC_SUBTRACTION = /^calc\(100vw - (\d+)px\)$/;
const PIXELS = /^(\d+)px$/;
const MEDIUM_COLUMNS = 2;

/** The width a `sizes` attribute declares in a window `windowWidth` px wide: the first entry whose query holds wins. */
function widthDeclared(sizes: string, windowWidth: number): number {
  for (const entry of sizes.split(', ')) {
    const query = MIN_WIDTH_QUERY.exec(entry);
    if (query && windowWidth < Number(query[1])) continue;
    return evaluate(query ? query[2] : entry, windowWidth);
  }
  throw new Error(`no entry of "${sizes}" matches ${windowWidth}px`);
}

function evaluate(value: string, windowWidth: number): number {
  const division = CALC_WITH_DIVISION.exec(value);
  if (division) return (windowWidth - Number(division[1])) / Number(division[2]);
  const subtraction = CALC_SUBTRACTION.exec(value);
  if (subtraction) return windowWidth - Number(subtraction[1]);
  const pixels = PIXELS.exec(value);
  if (pixels) return Number(pixels[1]);
  throw new Error(`cannot read "${value}"`);
}

function spanOf(className: string, prefix: 'lg' | 'md'): number {
  const match = new RegExp(`${prefix}:col-span-(\\d)`).exec(className);
  return match ? Number(match[1]) : 1;
}

/** The empty cells a grid of `columns` columns leaves when the spans are placed one after the other. */
function holes(spans: number[], columns: number): number {
  let used = 0;
  let empty = 0;
  for (const span of spans) {
    if (used + span > columns) {
      empty += columns - used;
      used = 0;
    }
    used = (used + span) % columns;
  }
  return empty + (used === 0 ? 0 : columns - used);
}

describe('the grid of the regular projects', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])('leaves no hole at lg or at md with %s cards', (total) => {
    const layouts = Array.from({ length: total }, (_, index) => cardLayout(index, total));

    expect(
      holes(
        layouts.map(({ cellClassName }) => spanOf(cellClassName, 'lg')),
        LARGE_COLUMNS,
      ),
    ).toBe(0);
    // Below lg the cards are two by two: a card that has no partner takes the whole row.
    expect(
      holes(
        layouts.map(({ cellClassName }) => (cellClassName.includes('md:col-span-2') ? 2 : 1)),
        MEDIUM_COLUMNS,
      ),
    ).toBe(0);
  });

  it('gives the five cards of today three cards, then two wider ones, and the last one the full row at md', () => {
    const spans = Array.from({ length: 5 }, (_, index) => cardLayout(index, 5).cellClassName);

    expect(spans).toEqual([
      'lg:col-span-2',
      'lg:col-span-2',
      'lg:col-span-2',
      'lg:col-span-3',
      'md:col-span-2 lg:col-span-3',
    ]);
  });

  // The widths below are what the rendered card images measured (e2e/page-projetos.spec.ts compares the same sizes with the
  // real layout): a 1216px page with 48px gutters from md, 32px and 40px gaps, and the card's border and padding.
  it.each([
    [0, 768, 284],
    [0, 1024, 247],
    [0, 1440, 311],
    [3, 768, 284],
    [3, 1024, 408],
    [3, 1440, 504],
    [4, 1024, 408],
    [4, 1440, 504],
    [4, 768, 636],
  ])('declares for card %s at %spx the width it really gets, %spx', (index, windowWidth, expected) => {
    const declared = widthDeclared(cardLayout(index, 5).imageSizes, windowWidth);

    expect(Math.abs(declared - expected)).toBeLessThanOrEqual(1);
  });

  it('declares one honest width on a phone: the window minus the gutters and the card', () => {
    expect(widthDeclared(cardLayout(0, 5).imageSizes, 390)).toBe(330);
  });
});
