import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePointerSpotlight } from './usePointerSpotlight';
import { stubRect } from '../test/rect';

function Spotlight() {
  const { ref, onPointerMove } = usePointerSpotlight<HTMLDivElement>();
  return <div ref={ref} data-testid="card" onPointerMove={onPointerMove} />;
}

describe('usePointerSpotlight', () => {
  it('writes --mx and --my in px relative to the element', () => {
    render(<Spotlight />);
    const el = screen.getByTestId('card');
    stubRect(el, { left: 10, top: 10 });

    fireEvent.pointerMove(el, { clientX: 30, clientY: 40 });

    expect(el.style.getPropertyValue('--mx')).toBe('20px');
    expect(el.style.getPropertyValue('--my')).toBe('30px');
  });

  it('follows the pointer on every move', () => {
    render(<Spotlight />);
    const el = screen.getByTestId('card');
    stubRect(el, { left: 0, top: 0 });

    fireEvent.pointerMove(el, { clientX: 5, clientY: 6 });
    fireEvent.pointerMove(el, { clientX: 50, clientY: 12 });

    expect(el.style.getPropertyValue('--mx')).toBe('50px');
    expect(el.style.getPropertyValue('--my')).toBe('12px');
  });

  it('works on the event target when the ref is not attached', () => {
    function Detached() {
      const { onPointerMove } = usePointerSpotlight<HTMLDivElement>();
      return <div data-testid="card" onPointerMove={onPointerMove} />;
    }
    render(<Detached />);
    const el = screen.getByTestId('card');
    stubRect(el, { left: 10, top: 10 });

    fireEvent.pointerMove(el, { clientX: 30, clientY: 40 });

    expect(el.style.getPropertyValue('--mx')).toBe('20px');
  });

  it('returns a stable onPointerMove across renders', () => {
    const handlers: unknown[] = [];
    function Capture() {
      const { onPointerMove } = usePointerSpotlight<HTMLDivElement>();
      handlers.push(onPointerMove);
      return null;
    }
    const { rerender } = render(<Capture />);

    rerender(<Capture />);

    expect(handlers[1]).toBe(handlers[0]);
  });
});
