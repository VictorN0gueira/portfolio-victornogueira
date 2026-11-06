import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { USER_INPUT_EVENTS } from '../../lib/focusGuard';
import { activeIdOf } from './legalReading';

/** The scroll that follows a press has settled when no scroll event came for this long. */
const SCROLL_SETTLED_MS = 150;

interface ReadingMark {
  /** The id of the title the reader is in, or null while they are above the first one. */
  activeId: string | null;
  /** Marks the title the reader is in now, from where the titles are on the screen. Does nothing while a press is held. */
  refresh: () => void;
  /** Marks the pressed title at once and keeps it marked until its scroll ends or the reader takes over. */
  press: (id: string) => void;
}

/**
 * Which title the reader is in. The observer asks for a refresh when a title crosses the line. A press marks its title at
 * once and holds it while the scroll to it goes on (the smooth scroll passes the titles in between, which are not "being
 * read"). The hold ends when the scroll events stop for a moment, or at the first wheel, touch, key or pointer of the
 * reader. When it ends the mark is worked out again from where the titles are, so no report that came during the hold is lost.
 */
export function useReadingMark(headingsRef: RefObject<readonly HTMLElement[]>): ReadingMark {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isHeldRef = useRef(false);
  const releaseRef = useRef<((shouldRefresh: boolean) => void) | null>(null);

  const refresh = useCallback(() => {
    if (!isHeldRef.current) setActiveId(activeIdOf(headingsRef.current ?? []));
  }, [headingsRef]);

  const press = useCallback(
    (id: string) => {
      releaseRef.current?.(false);
      let timer = 0;
      const release = (shouldRefresh: boolean) => {
        window.clearTimeout(timer);
        window.removeEventListener('scroll', restart);
        for (const type of USER_INPUT_EVENTS) window.removeEventListener(type, onInput);
        isHeldRef.current = false;
        releaseRef.current = null;
        if (shouldRefresh) refresh();
      };
      const restart = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => release(true), SCROLL_SETTLED_MS);
      };
      const onInput = () => release(true);

      isHeldRef.current = true;
      releaseRef.current = release;
      window.addEventListener('scroll', restart, { passive: true });
      for (const type of USER_INPUT_EVENTS) window.addEventListener(type, onInput, { passive: true });
      restart();
      setActiveId(id);
    },
    [refresh],
  );

  useEffect(() => () => releaseRef.current?.(false), []);

  return { activeId, refresh, press };
}
