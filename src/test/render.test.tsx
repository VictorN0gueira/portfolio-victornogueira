import { renderHook, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAccessibility } from '../contexts/useAccessibility';
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

describe('renderWithProviders in strict mode', () => {
  function EffectCounter({ onEffect }: { onEffect: () => void }) {
    useEffect(() => {
      onEffect();
    }, [onEffect]);
    return null;
  }

  it('runs a mount effect once by default', () => {
    const onEffect = vi.fn();

    renderWithProviders(<EffectCounter onEffect={onEffect} />);

    expect(onEffect).toHaveBeenCalledTimes(1);
  });

  it('runs a mount effect twice with strict: true, like React development StrictMode', () => {
    const onEffect = vi.fn();

    renderWithProviders(<EffectCounter onEffect={onEffect} />, { strict: true });

    expect(onEffect).toHaveBeenCalledTimes(2);
  });

  it('keeps the route and the providers in strict mode', () => {
    renderWithProviders(<Probe />, { route: '/servicos', strict: true });

    expect(screen.getByTestId('probe')).toHaveTextContent('/servicos:false');
  });
});

describe('AllProviders', () => {
  it('works as a renderHook wrapper', () => {
    const { result } = renderHook(() => useAccessibility(), { wrapper: AllProviders });

    expect(result.current.state.noAnimations).toBe(false);
  });
});
