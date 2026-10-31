import { useCallback, useSyncExternalStore } from 'react';

function canMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function getServerSnapshot(): boolean {
  return false;
}

/** One query that at least one component is subscribed to: its MediaQueryList, the one listener on it and who wants to hear. */
interface SharedQuery {
  list: MediaQueryList;
  onChange: () => void;
  subscribers: Set<() => void>;
}

// The home holds about a hundred components that ask for a query (every reveal item, every card). Each one used to open its
// own MediaQueryList and its own listener, and to open a new list on every read. Now a query has one list and one listener on
// the browser for as long as someone is subscribed, and the components share it. The entry goes away with its last subscriber,
// so nothing outlives the page (and a test that swaps window.matchMedia never meets a stale list).
const sharedQueries = new Map<string, SharedQuery>();

function subscribeToQuery(query: string, onStoreChange: () => void): () => void {
  let shared = sharedQueries.get(query);
  if (!shared) {
    const subscribers = new Set<() => void>();
    const list = window.matchMedia(query);
    const onChange = () => subscribers.forEach((notify) => notify());
    list.addEventListener('change', onChange);
    shared = { list, onChange, subscribers };
    sharedQueries.set(query, shared);
  }

  shared.subscribers.add(onStoreChange);
  const entry = shared;
  return () => {
    entry.subscribers.delete(onStoreChange);
    if (entry.subscribers.size > 0) return;
    entry.list.removeEventListener('change', entry.onChange);
    if (sharedQueries.get(query) === entry) sharedQueries.delete(query);
  };
}

/** The current answer: from the shared list when the query is subscribed, from a fresh read otherwise (the first render). */
function readQuery(query: string): boolean {
  if (!canMatchMedia()) return false;
  return sharedQueries.get(query)?.list.matches ?? window.matchMedia(query).matches;
}

/**
 * Live result of a CSS media query. Re-renders when the query starts or stops matching
 * (for example when the visitor changes an OS setting with the tab open).
 * It is false on the server and wherever matchMedia is unavailable.
 * Every component that asks the same query shares one MediaQueryList and one listener.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => (canMatchMedia() ? subscribeToQuery(query, onStoreChange) : () => undefined),
    [query],
  );
  const getSnapshot = useCallback(() => readQuery(query), [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
