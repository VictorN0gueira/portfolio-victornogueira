import { useLayoutEffect, useState, type MutableRefObject, type RefObject } from 'react';
import { activeLinePx, isSameList, markHeading } from './legalReading';
import { collectToc, tocHeadings, type TocEntry } from './legalToc';

type Restores = Map<HTMLHeadingElement, () => void>;

/** Marks the titles that are new, lets go of the ones that left, and returns the list the contents show. */
function syncHeadings(
  body: HTMLElement,
  restores: Restores,
  intersections: IntersectionObserver,
  headingsRef: MutableRefObject<readonly HTMLHeadingElement[]>,
): TocEntry[] {
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
  return headings.map((heading, index) => ({ id: heading.id, label: toc[index].label }));
}

/**
 * Keeps the titles of the legal text in step with the contents: reads them, gives each an id and a tabindex (taken back
 * when it goes, or with the frame), and tells `onChange` whenever the list or the place of a title may have changed.
 * It watches with one IntersectionObserver (a title crossing the line of the reader) and one MutationObserver (a title
 * added to the text or taken out of it later). Returns the entries, null until the titles were read. A layout effect: the
 * list is in the page before it is painted, so the folded list above the text does not push it down afterwards.
 */
export function useTocEntries(
  bodyRef: RefObject<HTMLElement | null>,
  headingsRef: MutableRefObject<readonly HTMLHeadingElement[]>,
  onChange: () => void,
): TocEntry[] | null {
  const [entries, setEntries] = useState<TocEntry[] | null>(null);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const restores: Restores = new Map();
    const intersections = new IntersectionObserver(onChange, {
      rootMargin: `-${activeLinePx(headingsRef.current)}px 0px 0px 0px`,
      threshold: [0, 1],
    });
    const sync = () => {
      const next = syncHeadings(body, restores, intersections, headingsRef);
      setEntries((current) => (isSameList(current, next) ? current : next));
      onChange();
    };

    sync();
    // Only the arrival and the leaving of nodes: setting an attribute on a title (what sync does) is not seen.
    const mutations = new MutationObserver(sync);
    mutations.observe(body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      intersections.disconnect();
      restores.forEach((restore) => restore());
      headingsRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bodyRef and headingsRef are refs (stable identity, never change between renders); including them would mislead future editors into thinking the effect re-runs when ref.current mutates
  }, [onChange]);

  return entries;
}
