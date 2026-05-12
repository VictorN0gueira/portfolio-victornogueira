import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface A11yState {
  fontSize: boolean;
  highContrast: boolean;
  grayscale: boolean;
  noAnimations: boolean;
  underlineLinks: boolean;
  readableFont: boolean;
}

interface A11yContextValue {
  state: A11yState;
  toggle: (key: keyof A11yState) => void;
  reset: () => void;
}

const defaultState: A11yState = {
  fontSize: false,
  highContrast: false,
  grayscale: false,
  noAnimations: false,
  underlineLinks: false,
  readableFont: false,
};

const classMap: Record<keyof A11yState, string> = {
  fontSize: 'a11y-font-large',
  highContrast: 'a11y-high-contrast',
  grayscale: 'a11y-grayscale',
  noAnimations: 'a11y-no-animations',
  underlineLinks: 'a11y-underline-links',
  readableFont: 'a11y-readable-font',
};

const STORAGE_KEY = 'a11y-preferences';

const A11yContext = createContext<A11yContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<A11yState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    (Object.keys(classMap) as Array<keyof A11yState>).forEach((key) => {
      root.classList.toggle(classMap[key], state[key]);
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage não disponível
    }
  }, [state]);

  const toggle = (key: keyof A11yState) =>
    setState((prev) => ({ ...prev, [key]: !prev[key] }));

  const reset = () => setState(defaultState);

  return (
    <A11yContext.Provider value={{ state, toggle, reset }}>
      {children}
    </A11yContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error('useAccessibility deve ser usado dentro de AccessibilityProvider');
  return ctx;
}
