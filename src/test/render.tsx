import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { LazyMotion, domAnimation } from 'motion/react';
import { MemoryRouter } from 'react-router-dom';
import { AccessibilityProvider } from '../contexts/AccessibilityContext';

const DEFAULT_ROUTE = '/';

interface AllProvidersProps {
  children: ReactNode;
  route?: string;
}

export interface RenderWithProvidersOptions {
  route?: string;
  /** Wraps the tree in StrictMode, so effects run twice on mount like in development. Off by default. */
  strict?: boolean;
}

/**
 * The providers the real app mounts in main.tsx, in a form tests can reuse.
 * Pass it as the `wrapper` of `renderHook`, or use `renderWithProviders` for components.
 */
export function AllProviders({ children, route = DEFAULT_ROUTE }: AllProvidersProps) {
  return (
    <AccessibilityProvider>
      {/* The animation features the app loads in MotionProvider: without them an m component never animates. */}
      <LazyMotion features={domAnimation} strict>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </LazyMotion>
    </AccessibilityProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}): RenderResult {
  const route = options.route ?? DEFAULT_ROUTE;
  const Wrapper = ({ children }: { children: ReactNode }) => <AllProviders route={route}>{children}</AllProviders>;
  // StrictMode must be the outermost element: nested inside the wrapper it does not run the effects twice.
  return render(ui, { wrapper: Wrapper, reactStrictMode: options.strict ?? false });
}
