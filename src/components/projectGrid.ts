// The grid of the regular projects on /projetos: one column on a phone, two from md, six small columns from lg
// (three cards of two columns). A last row that would leave a hole gets wider cards, so the grid is always full.

const LARGE_COLUMNS = 3;
const MEDIUM_COLUMNS = 2;

interface ProjectCardLayout {
  /** The span classes of the grid cell, written out whole so the stylesheet generator can see them. */
  readonly cellClassName: string;
  /** The `sizes` attribute of the card image: the width the card takes at each breakpoint. */
  readonly imageSizes: string;
}

// Widths on the 1280px page with 40px gaps: a card of two columns is 368px, one of three is 572px.
const NARROW_SIZES = '(min-width: 1280px) 368px, (min-width: 1024px) 30vw, (min-width: 768px) 46vw, 92vw';
const WIDE_ON_LARGE_SIZES = '(min-width: 1280px) 572px, (min-width: 1024px) 44vw, (min-width: 768px) 46vw, 92vw';
const WIDE_ON_BOTH_SIZES = '(min-width: 1280px) 572px, (min-width: 1024px) 44vw, (min-width: 768px) 90vw, 92vw';
const WIDE_ON_MEDIUM_SIZES = '(min-width: 1280px) 368px, (min-width: 1024px) 30vw, (min-width: 768px) 90vw, 92vw';

/** How many of the 6 columns of the lg grid a card takes, and whether it is the odd card of the md grid. */
function spanOf(index: number, total: number): { large: 2 | 3 | 6; isOddOnMedium: boolean } {
  const lastRowSize = total % LARGE_COLUMNS;
  const isInLastRow = index >= total - lastRowSize;
  const large = lastRowSize !== 0 && isInLastRow ? ((6 / lastRowSize) as 3 | 6) : 2;
  const isOddOnMedium = total % MEDIUM_COLUMNS === 1 && index === total - 1;
  return { large, isOddOnMedium };
}

const LARGE_CLASSES = { 2: 'lg:col-span-2', 3: 'lg:col-span-3', 6: 'lg:col-span-6' } as const;

export function cardLayout(index: number, total: number): ProjectCardLayout {
  const { large, isOddOnMedium } = spanOf(index, total);
  const cellClassName = `${isOddOnMedium ? 'md:col-span-2 ' : ''}${LARGE_CLASSES[large]}`;
  if (large !== 2) return { cellClassName, imageSizes: isOddOnMedium ? WIDE_ON_BOTH_SIZES : WIDE_ON_LARGE_SIZES };
  return { cellClassName, imageSizes: isOddOnMedium ? WIDE_ON_MEDIUM_SIZES : NARROW_SIZES };
}
