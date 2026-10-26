import { vi } from 'vitest';

type ChangeListener = (event: MediaQueryListEvent) => void;

export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface MatchMediaStub {
  matchMedia: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  /** Flips one query and fires its `change` listeners, like the browser does. */
  set: (query: string, matches: boolean) => void;
  listenerCount: (query: string) => number;
}

/**
 * Replaces window.matchMedia with a controllable stub. Only the queries given as true match;
 * every other query answers false, so a test never reads as reduced motion by accident.
 * The global is restored by the afterEach in src/test/setup.ts.
 */
export function stubMatchMedia(initial: Record<string, boolean> = {}): MatchMediaStub {
  const state = new Map<string, boolean>(Object.entries(initial));
  const listeners = new Map<string, Set<ChangeListener>>();

  const listenersFor = (query: string): Set<ChangeListener> => {
    const existing = listeners.get(query);
    if (existing) return existing;
    const created = new Set<ChangeListener>();
    listeners.set(query, created);
    return created;
  };

  const removeEventListener = vi.fn();
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return state.get(query) ?? false;
    },
    media: query,
    addEventListener: (type: string, listener: ChangeListener) => {
      if (type === 'change') listenersFor(query).add(listener);
    },
    removeEventListener: (type: string, listener: ChangeListener) => {
      removeEventListener(type, listener);
      if (type === 'change') listenersFor(query).delete(listener);
    },
  }));
  vi.stubGlobal('matchMedia', matchMedia);

  return {
    matchMedia,
    removeEventListener,
    set(query, matches) {
      state.set(query, matches);
      listenersFor(query).forEach((listener) => listener({ matches } as MediaQueryListEvent));
    },
    listenerCount: (query) => listenersFor(query).size,
  };
}
