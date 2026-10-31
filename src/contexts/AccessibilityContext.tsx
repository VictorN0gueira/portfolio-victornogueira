import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { A11yContext, type A11yKey, type A11yState } from './useAccessibility';

const defaultState: A11yState = {
  fontSize: false,
  highContrast: false,
  grayscale: false,
  noAnimations: false,
  underlineLinks: false,
  readableFont: false,
};

const classMap: Record<A11yKey, string> = {
  fontSize: 'a11y-font-large',
  highContrast: 'a11y-high-contrast',
  grayscale: 'a11y-grayscale',
  noAnimations: 'a11y-no-animations',
  underlineLinks: 'a11y-underline-links',
  readableFont: 'a11y-readable-font',
};

/** The localStorage key of the preferences. Exported so nothing else repeats the literal. */
export const A11Y_STORAGE_KEY = 'a11y-preferences';

const A11Y_KEYS = Object.keys(defaultState) as Array<A11yKey>;

/**
 * The preferences stored by an earlier visit, kept to the known keys and to the value `true` exactly. Anything
 * else (a corrupted value, a string, an array, a key this version does not know) is dropped, so a stored
 * `{ "fontSize": "no" }` can never turn a class on.
 */
function parseStoredState(saved: string | null): A11yState {
  if (!saved) return defaultState;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return defaultState;
    const record = parsed as Record<string, unknown>;
    return A11Y_KEYS.reduce<A11yState>((next, key) => ({ ...next, [key]: record[key] === true }), defaultState);
  } catch {
    return defaultState;
  }
}

function readStoredState(): A11yState {
  try {
    return parseStoredState(localStorage.getItem(A11Y_STORAGE_KEY));
  } catch {
    return defaultState;
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<A11yState>(readStoredState);

  useEffect(() => {
    const root = document.documentElement;
    A11Y_KEYS.forEach((key) => {
      root.classList.toggle(classMap[key], state[key]);
    });
    try {
      localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage não disponível
    }
  }, [state]);

  const toggle = useCallback((key: A11yKey) => setState((prev) => ({ ...prev, [key]: !prev[key] })), []);
  const reset = useCallback(() => setState(defaultState), []);
  const value = useMemo(() => ({ state, toggle, reset }), [state, toggle, reset]);

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}
