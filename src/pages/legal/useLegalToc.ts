import { useCallback, useRef, type RefObject } from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import type { TocEntry } from './legalToc';
import { useReadingMark } from './useReadingMark';
import { useTocEntries } from './useTocEntries';

interface LegalToc {
  /** Null until the titles were read: the folded list keeps its place (an empty shell) meanwhile, so nothing moves. */
  entries: TocEntry[] | null;
  /** The id of the title being read, or null while the reader is still above the first one. */
  activeId: string | null;
  /** Scrolls to the title, moves focus to it and puts its id in the address. */
  goTo: (id: string) => void;
}

/**
 * The table of contents of the legal text inside `bodyRef`, read from the h2 that were rendered (useTocEntries), the title
 * being read (useReadingMark), and the jump to a title. Nothing here touches the network or builds markup.
 */
export function useLegalToc(bodyRef: RefObject<HTMLElement | null>): LegalToc {
  const headingsRef = useRef<readonly HTMLHeadingElement[]>([]);
  const isMotionAllowed = useMotionAllowed();
  const { activeId, refresh, press } = useReadingMark(headingsRef);
  const entries = useTocEntries(bodyRef, headingsRef, refresh);

  const goTo = useCallback(
    (id: string) => {
      const heading = headingsRef.current.find((candidate) => candidate.id === id);
      if (!heading) return;
      heading.scrollIntoView({ behavior: isMotionAllowed ? 'smooth' : 'instant', block: 'start' });
      // The scroll is already on its way: focus must not start another one.
      heading.focus({ preventScroll: true });
      window.history.replaceState(window.history.state, '', `#${id}`);
      press(id);
    },
    [isMotionAllowed, press],
  );

  return { entries, activeId, goTo };
}
