import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { AccessibilityProvider } from '../contexts/AccessibilityContext';

const DEFAULT_ROUTE = '/';

interface AllProvidersProps {
  children: ReactNode;
  route?: string;
}

/**
 * The providers the real app mounts in main.tsx, in a form tests can reuse.
 * Pass it as the `wrapper` of `renderHook`, or use `renderWithProviders` for components.
 */
export function AllProviders({ children, route = DEFAULT_ROUTE }: AllProvidersProps) {
  return (
    <HelmetProvider>
      <AccessibilityProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </AccessibilityProvider>
    </HelmetProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options: { route?: string } = {},
): RenderResult {
  const route = options.route ?? DEFAULT_ROUTE;
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllProviders route={route}>{children}</AllProviders>
  );
  return render(ui, { wrapper: Wrapper });
}
