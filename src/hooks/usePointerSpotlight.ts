import { useCallback, useRef, type PointerEvent, type RefObject } from 'react';

interface UsePointerSpotlightResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  onPointerMove: (event: PointerEvent<T>) => void;
}

/**
 * Tracks the pointer inside an element by writing `--mx` and `--my` (in px, relative to the
 * element's top left corner). CSS draws the spotlight from them, so React never re-renders.
 */
export function usePointerSpotlight<T extends HTMLElement>(): UsePointerSpotlightResult<T> {
  const ref = useRef<T | null>(null);

  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    const element = ref.current ?? event.currentTarget;
    const rect = element.getBoundingClientRect();
    element.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    element.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }, []);

  return { ref, onPointerMove };
}
