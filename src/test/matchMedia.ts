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

type ListenerFunction = (type: string, listener: ChangeListener) => void;

interface MediaQueryListBehavior {
  /** Read each time `matches` is read, so a later flip is seen. Defaults to never matching. */
  isMatching?: () => boolean;
  addEventListener?: ListenerFunction;
  removeEventListener?: ListenerFunction;
}

/**
 * The one MediaQueryList look alike of the unit tests. src/test/setup.ts installs it for every query with the
 * defaults (no match, inert listeners), and stubMatchMedia below gives it a state and real listeners.
 */
export function createMediaQueryList(query: string, behavior: MediaQueryListBehavior = {}): MediaQueryList {
  const { isMatching = () => false, addEventListener = vi.fn(), removeEventListener = vi.fn() } = behavior;
  return {
    get matches() {
      return isMatching();
    },
    media: query,
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  } as MediaQueryList;
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
  const matchMedia = vi.fn((query: string) =>
    createMediaQueryList(query, {
      isMatching: () => state.get(query) ?? false,
      addEventListener: (type, listener) => {
        if (type === 'change') listenersFor(query).add(listener);
      },
      removeEventListener: (type, listener) => {
        removeEventListener(type, listener);
        if (type === 'change') listenersFor(query).delete(listener);
      },
    }),
  );
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
