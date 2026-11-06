import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { collectToc, tocHeadings, type TocEntry } from './legalToc';

/**
 * A title is the one being read once its top went above this line (a little under the floating header and the 96px the
 * page keeps free at the top for an anchor, see scroll-padding-top in index.css).
 */
const ACTIVE_LINE_PX = 120;

interface LegalToc {
  /** Null until the titles were read: the folded list keeps its place (an empty shell) meanwhile, so nothing moves. */
  entries: TocEntry[] | null;
  /** The id of the title being read, or null while the visitor is still above the first one. */
  activeId: string | null;
  /** Scrolls to the title, moves focus to it and puts its id in the address. */
  goTo: (id: string) => void;
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
  const passed = headings.filter((heading) => heading.getBoundingClientRect().top <= ACTIVE_LINE_PX);
  return passed.at(-1)?.id ?? null;
}

/**
 * The table of contents of the legal text inside `bodyRef`, read from the h2 that were rendered. After mounting it sets
 * the id and tabindex on those titles (taken back on cleanup, and safe under the double effect of StrictMode) and keeps
 * one IntersectionObserver that marks the title being read. Nothing here touches the network or builds markup.
 */
export function useLegalToc(bodyRef: RefObject<HTMLElement | null>): LegalToc {
  const [entries, setEntries] = useState<TocEntry[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const isMotionAllowed = useMotionAllowed();
  const headingsRef = useRef<HTMLElement[]>([]);

  // A layout effect: the contents are put in the page before it is painted. In an effect that runs after the paint the text
  // is drawn first and the folded list is then inserted above it, which pushes all of it down.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const headings = tocHeadings(body);
    const toc = collectToc(body);
    const restores = headings.map((heading, index) => markHeading(heading, toc[index].id));
    headingsRef.current = headings;
    // The ids are read back from the titles: a title that had an id of its own keeps it.
    setEntries(toc.map((entry, index) => ({ ...entry, id: headings[index].id })));

    const refresh = () => setActiveId(activeIdOf(headings));
    // The line is the top edge of the observed area, and a title is reported when it crosses it (the threshold 1) or when it
    // leaves the area (the threshold 0), so the active title changes exactly when its top goes above the line.
    const observer = new IntersectionObserver(refresh, {
      rootMargin: `-${ACTIVE_LINE_PX}px 0px 0px 0px`,
      threshold: [0, 1],
    });
    headings.forEach((heading) => observer.observe(heading));
    refresh();

    return () => {
      observer.disconnect();
      restores.forEach((restore) => restore());
      headingsRef.current = [];
    };
  }, [bodyRef]);

  const goTo = useCallback(
    (id: string) => {
      const heading = headingsRef.current.find((candidate) => candidate.id === id);
      if (!heading) return;
      heading.scrollIntoView({ behavior: isMotionAllowed ? 'smooth' : 'instant', block: 'start' });
      // The scroll is already on its way: focus must not start another one.
      heading.focus({ preventScroll: true });
      window.history.replaceState(window.history.state, '', `#${id}`);
      setActiveId(id);
    },
    [isMotionAllowed],
  );

  return { entries, activeId, goTo };
}
