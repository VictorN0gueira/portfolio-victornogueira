import { describe, expect, it } from 'vitest';
import { cardLayout } from './projectGrid';

const LARGE_COLUMNS = 6;
const MEDIUM_COLUMNS = 2;

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

    expect(holes(layouts.map(({ cellClassName }) => spanOf(cellClassName, 'lg')), LARGE_COLUMNS)).toBe(0);
    // Below lg the cards are two by two: a card that has no partner takes the whole row.
    expect(holes(layouts.map(({ cellClassName }) => (cellClassName.includes('md:col-span-2') ? 2 : 1)), MEDIUM_COLUMNS)).toBe(0);
  });

  it('gives the five cards of today three cards, then two wider ones, and the last one the full row at md', () => {
    const spans = Array.from({ length: 5 }, (_, index) => cardLayout(index, 5).cellClassName);

    expect(spans).toEqual(['lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-3', 'md:col-span-2 lg:col-span-3']);
  });

  it('sizes the image of a wider card for the width it really gets', () => {
    expect(cardLayout(0, 5).imageSizes).toContain('368px');
    expect(cardLayout(3, 5).imageSizes).toContain('572px');
    expect(cardLayout(4, 5).imageSizes).toContain('90vw');
  });
});
