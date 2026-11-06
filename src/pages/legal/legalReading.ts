import type { TocEntry } from './legalToc';

/** What index.css keeps free at the top for an anchor, when the browser cannot say (jsdom, or a value it does not know). */
const FALLBACK_SCROLL_PADDING_PX = 96;
/** A title that an anchor just put in place sits exactly on the line: this keeps rounding from putting it a hair under. */
const LINE_EPSILON_PX = 2;

const pixelsOf = (value: string, fallback: number): number => {
  const pixels = parseFloat(value);
  return Number.isFinite(pixels) ? pixels : fallback;
};

/**
 * The line a title has to cross to count as being read: the place an anchor puts a title, which is the space the page keeps
 * free at the top (scroll-padding-top, which grows when the accessibility tab sits at the top) plus the margin of the title
 * itself (scroll-margin-top). So the title a click on the contents just landed is the one marked, and a reader going up
 * gets the previous title as soon as the next one is back under the line. Read each time: it follows the tab being moved.
 */
export function activeLinePx(headings: readonly HTMLElement[]): number {
  const padding = pixelsOf(getComputedStyle(document.documentElement).scrollPaddingTop, FALLBACK_SCROLL_PADDING_PX);
  const margin = headings.length > 0 ? pixelsOf(getComputedStyle(headings[0]).scrollMarginTop, 0) : 0;
  return padding + margin + LINE_EPSILON_PX;
}

/** The last title whose top is above the line, which is the one the reader is in. Null above the first title. */
export function activeIdOf(headings: readonly HTMLElement[]): string | null {
  const line = activeLinePx(headings);
  const passed = headings.filter((heading) => heading.getBoundingClientRect().top <= line);
  return passed.at(-1)?.id ?? null;
}

/**
 * Puts the id and the tabindex the table of contents needs on a title, from the outside: the legal files are frozen, so
 * the attributes are set on the rendered element and not in the source. Returns the function that takes them back.
 */
export function markHeading(heading: HTMLElement, id: string): () => void {
  const hadId = heading.hasAttribute('id');
  const hadTabIndex = heading.hasAttribute('tabindex');
  if (!hadId) heading.id = id;
  if (!hadTabIndex) heading.tabIndex = -1;
  return () => {
    if (!hadId) heading.removeAttribute('id');
    if (!hadTabIndex) heading.removeAttribute('tabindex');
  };
}

export const isSameList = (first: readonly TocEntry[] | null, second: readonly TocEntry[]): boolean =>
  first !== null &&
  first.length === second.length &&
  first.every((entry, index) => entry.id === second[index].id && entry.label === second[index].label);
