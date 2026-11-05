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

// Widths of the card image, measured on the rendered page. The page is 1216px wide with 48px gutters from md (1120px of
// content from a 1216px window, the window minus 96px below that). The card has a 1px border and 16px of padding from md
// (12px under it), and the image sits in a frame with its own 1px border, so the image is the cell minus 36px from md and
// minus 28px under it. From lg the grid has six columns with a 40px gap, from md two with a 32px gap.
//   cell of 2 columns, lg: (content - 200) / 3 + 40   -> 310.7px at 1216px and up, (window - 284px) / 3 image
//   cell of 3 columns, lg: (content - 200) / 2 + 80   -> 504px at 1216px and up, (window - 208px) / 2 image
//   cell of 6 columns, lg: the content                -> 1084px at 1216px and up, window - 132px image
//   cell at md: (content - 32) / 2, so (window - 200px) / 2 image, or the content, so window - 132px, for the odd card
// projectGrid.test.ts holds the measured values and e2e/page-projetos.spec.ts compares them with the real layout.
const LARGE_BREAKPOINT_PX = 1216;
const PHONE_SIZE = 'calc(100vw - 60px)';
const MEDIUM_PAIR_SIZE = 'calc((100vw - 200px) / 2)';
const MEDIUM_FULL_SIZE = 'calc(100vw - 132px)';
const LARGE_SIZES = {
  2: { fluid: 'calc((100vw - 284px) / 3)', fixed: '311px' },
  3: { fluid: 'calc((100vw - 208px) / 2)', fixed: '504px' },
  6: { fluid: 'calc(100vw - 132px)', fixed: '1084px' },
} as const;

/** The `sizes` attribute of the image of a card that takes `large` of the 6 columns of lg and, at md, a pair cell or the full row. */
function sizesOf(large: 2 | 3 | 6, isOddOnMedium: boolean): string {
  const { fluid, fixed } = LARGE_SIZES[large];
  const medium = isOddOnMedium ? MEDIUM_FULL_SIZE : MEDIUM_PAIR_SIZE;
  return `(min-width: ${LARGE_BREAKPOINT_PX}px) ${fixed}, (min-width: 1024px) ${fluid}, (min-width: 768px) ${medium}, ${PHONE_SIZE}`;
}

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
  return { cellClassName, imageSizes: sizesOf(large, isOddOnMedium) };
}
