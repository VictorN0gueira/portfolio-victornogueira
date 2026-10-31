import { createContext, useContext } from 'react';

export interface A11yState {
  fontSize: boolean;
  highContrast: boolean;
  grayscale: boolean;
  noAnimations: boolean;
  underlineLinks: boolean;
  readableFont: boolean;
}

/** The keys of the six preferences. */
export type A11yKey = keyof A11yState;

interface A11yContextValue {
  state: A11yState;
  toggle: (key: A11yKey) => void;
  reset: () => void;
}

export const A11yContext = createContext<A11yContextValue | null>(null);

export function useAccessibility() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error('useAccessibility deve ser usado dentro de AccessibilityProvider');
  return ctx;
}
