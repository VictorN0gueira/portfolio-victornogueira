import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { collectToc, tocHeadings, type TocEntry } from './legalToc';

/** What index.css keeps free at the top for an anchor, when the browser cannot say (jsdom, or a value it does not know). */
const FALLBACK_SCROLL_PADDING_PX = 96;
/** A title is the one being read a little after the place an anchor puts it, so one that was just put there counts. */
const ACTIVE_LINE_MARGIN_PX = 24;
/** The scroll that follows a press has settled when no scroll event came for this long. */
const SCROLL_SETTLED_MS = 150;

interface LegalToc {
  /** Null until the titles were read: the folded list keeps its place (an empty shell) meanwhile, so nothing moves. */
  entries: TocEntry[] | null;
  /** The id of the title being read, or null while the visitor is still above the first one. */
  activeId: string | null;
  /** Scrolls to the title, moves focus to it and puts its id in the address. */
  goTo: (id: string) => void;
}

/**
 * The line a title has to cross to count as being read: the space the page keeps free at the top (scroll-padding-top, which
 * grows when the accessibility tab sits at the top) plus a margin. Read each time, so it follows that tab being moved.
 */
function activeLinePx(): number {
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  return (Number.isFinite(padding) ? padding : FALLBACK_SCROLL_PADDING_PX) + ACTIVE_LINE_MARGIN_PX;
}

/**
 * Puts the id and the tabindex the table of contents needs on a title, from the outside: the legal files are frozen, so
 * the attributes are set on the rendered element and not in the source. Returns the function that takes them back.
 */
function markHeading(heading: HTMLElement, id: string): () => void {
  const hadId = heading.hasAttribute('id');
  const hadTabIndex = heading.hasAttribute('tabindex');
  if (!hadId) heading.id = id;
  if (!hadTabIndex) heading.tabIndex = -1;
  return () => {
    if (!hadId) heading.removeAttribute('id');
    if (!hadTabIndex) heading.removeAttribute('tabindex');
  };
}

/** The last title whose top is above the line, which is the one the visitor is reading. */
function activeIdOf(headings: readonly HTMLElement[]): string | null {
  const line = activeLinePx();
  const passed = headings.filter((heading) => heading.getBoundingClientRect().top <= line);
  return passed.at(-1)?.id ?? null;
}

const isSameList = (first: readonly TocEntry[] | null, second: readonly TocEntry[]): boolean =>
  first !== null &&
  first.length === second.length &&
  first.every((entry, index) => entry.id === second[index].id && entry.label === second[index].label);

/**
 * The table of contents of the legal text inside `bodyRef`, read from the h2 that were rendered. It sets the id and the
 * tabindex on those titles (taken back on cleanup, and safe under the double effect of StrictMode), keeps one
 * IntersectionObserver that marks the title being read, and one MutationObserver that follows a title added to the text or
 * taken out of it later. Nothing here touches the network or builds markup.
 */
export function useLegalToc(bodyRef: RefObject<HTMLElement | null>): LegalToc {
  const [entries, setEntries] = useState<TocEntry[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const isMotionAllowed = useMotionAllowed();
  const headingsRef = useRef<HTMLElement[]>([]);
  // While the scroll that follows a press is going, the titles it passes are not "being read": the pressed link stays marked.
  const isScrollingToRef = useRef(false);
  const stopHoldingRef = useRef<(() => void) | null>(null);

  // A layout effect: the contents are put in the page before it is painted. In an effect that runs after the paint the text
  // is drawn first and the folded list is then inserted above it, which pushes all of it down.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const restores = new Map<HTMLHeadingElement, () => void>();
    const refresh = () => {
      if (!isScrollingToRef.current) setActiveId(activeIdOf(headingsRef.current));
    };
    // The line is the top edge of the observed area, and a title is reported when it crosses it (the threshold 1) or when it
    // leaves the area (the threshold 0), so the active title changes when its top goes above the line. The margin is read
    // here, once: the callback reads the line again every time, so a tab moved later only costs a little precision.
    const intersections = new IntersectionObserver(refresh, {
      rootMargin: `-${activeLinePx()}px 0px 0px 0px`,
      threshold: [0, 1],
    });

    const sync = () => {
      const headings = tocHeadings(body);
      const toc = collectToc(body);
      headings.forEach((heading, index) => {
        if (restores.has(heading)) return;
        restores.set(heading, markHeading(heading, toc[index].id));
        intersections.observe(heading);
      });
      for (const [heading, restore] of restores) {
        if (headings.includes(heading)) continue;
        intersections.unobserve(heading);
        restore();
        restores.delete(heading);
      }
      headingsRef.current = headings;
      // The ids are read back from the titles: a title that had an id of its own keeps it.
      const next = headings.map((heading, index) => ({ id: heading.id, label: toc[index].label }));
      setEntries((current) => (isSameList(current, next) ? current : next));
      refresh();
    };

    sync();
    // Only the arrival and the leaving of nodes: setting an attribute on a title (what sync does) is not seen.
    const mutations = new MutationObserver(sync);
    mutations.observe(body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      intersections.disconnect();
      stopHoldingRef.current?.();
      restores.forEach((restore) => restore());
      headingsRef.current = [];
    };
  }, [bodyRef]);

  /** Marks the pressed link as read until the scroll to it stopped (no scroll event for a moment), then lets go. */
  const holdMarkUntilScrollSettles = useCallback(() => {
    stopHoldingRef.current?.();
    let timer = 0;
    const stop = () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', restart);
      isScrollingToRef.current = false;
      stopHoldingRef.current = null;
    };
    const restart = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(stop, SCROLL_SETTLED_MS);
    };
    isScrollingToRef.current = true;
    stopHoldingRef.current = stop;
    window.addEventListener('scroll', restart, { passive: true });
    restart();
  }, []);

  const goTo = useCallback(
    (id: string) => {
      const heading = headingsRef.current.find((candidate) => candidate.id === id);
      if (!heading) return;
      heading.scrollIntoView({ behavior: isMotionAllowed ? 'smooth' : 'instant', block: 'start' });
      // The scroll is already on its way: focus must not start another one.
      heading.focus({ preventScroll: true });
      window.history.replaceState(window.history.state, '', `#${id}`);
      setActiveId(id);
      holdMarkUntilScrollSettles();
    },
    [isMotionAllowed, holdMarkUntilScrollSettles],
  );

  return { entries, activeId, goTo };
}
