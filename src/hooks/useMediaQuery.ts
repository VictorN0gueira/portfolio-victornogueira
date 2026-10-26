import { useCallback, useSyncExternalStore } from 'react';

function canMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Live result of a CSS media query. Re-renders when the query starts or stops matching
 * (for example when the visitor changes an OS setting with the tab open).
 * It is false on the server and wherever matchMedia is unavailable.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatchMedia()) return () => undefined;

      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => canMatchMedia() && window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
