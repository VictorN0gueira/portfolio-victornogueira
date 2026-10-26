import { renderHook, screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { AllProviders, renderWithProviders } from './render';

function Probe() {
  const { state } = useAccessibility();
  const { pathname } = useLocation();
  return (
    <p data-testid="probe">
      {pathname}:{String(state.noAnimations)}
    </p>
  );
}

describe('renderWithProviders', () => {
  it('provides accessibility and router context on the default route', () => {
    renderWithProviders(<Probe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('/:false');
  });

  it('starts the router at the given route', () => {
    renderWithProviders(<Probe />, { route: '/servicos' });

    expect(screen.getByTestId('probe')).toHaveTextContent('/servicos:false');
  });

  it('keeps the providers when the UI is re-rendered', () => {
    const { rerender } = renderWithProviders(<Probe />);

    rerender(<Probe />);

    expect(screen.getByTestId('probe')).toBeInTheDocument();
  });
});

describe('AllProviders', () => {
  it('works as a renderHook wrapper', () => {
    const { result } = renderHook(() => useAccessibility(), { wrapper: AllProviders });

    expect(result.current.state.noAnimations).toBe(false);
  });
});
