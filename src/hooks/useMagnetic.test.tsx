import { fireEvent, screen } from '@testing-library/react';
import { useReducedMotion } from 'motion/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { renderWithProviders } from '../test/render';
import { useMagnetic } from './useMagnetic';

vi.mock('motion/react', () => ({ useReducedMotion: vi.fn() }));

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const A11Y_STORAGE_KEY = 'a11y-preferences';

function stubFinePointer(isFine: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === FINE_POINTER_QUERY ? isFine : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function stubRect(el: HTMLElement): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 100,
    bottom: 40,
    width: 100,
    height: 40,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

function Magnet({ strength }: { strength?: { x: number; y: number } }) {
  const { ref, onPointerMove, onPointerLeave } = useMagnetic<HTMLButtonElement>(strength);
  return (
    <button
      ref={ref}
      data-testid="magnet"
      type="button"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    />
  );
}

function setup(strength?: { x: number; y: number }): HTMLElement {
  renderWithProviders(<Magnet strength={strength} />);
  const el = screen.getByTestId('magnet');
  stubRect(el);
  return el;
}

describe('useMagnetic', () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    localStorage.clear();
    stubFinePointer(true);
  });

  it('pulls toward the pointer by the default strength', () => {
    const el = setup();

    // right edge: 50px from the center, times 0.18
    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });

    expect(el.style.transform).toBe('translate(9px, 0px)');
  });

  it('applies the vertical strength to the vertical offset', () => {
    const el = setup();

    // bottom edge: 20px from the center, times 0.3
    fireEvent.pointerMove(el, { clientX: 50, clientY: 40 });

    expect(el.style.transform).toBe('translate(0px, 6px)');
  });

  it('pulls in the negative direction on the left and top', () => {
    const el = setup();

    fireEvent.pointerMove(el, { clientX: 0, clientY: 0 });

    expect(el.style.transform).toBe('translate(-9px, -6px)');
  });

  it('uses a custom strength', () => {
    const el = setup({ x: 0.5, y: 1 });

    fireEvent.pointerMove(el, { clientX: 100, clientY: 40 });

    expect(el.style.transform).toBe('translate(25px, 20px)');
  });

  it('resets the transform when the pointer leaves', () => {
    const el = setup();
    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });
    expect(el.style.transform).not.toBe('');

    fireEvent.pointerLeave(el);

    expect(el.style.transform).toBe('');
  });

  it('does nothing on a coarse pointer', () => {
    stubFinePointer(false);
    const el = setup();

    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });

    expect(el.style.transform).toBe('');
  });

  it('does nothing when the system prefers reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const el = setup();

    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });

    expect(el.style.transform).toBe('');
  });

  it('does nothing when the accessibility preference turns animations off', () => {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    const el = setup();

    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });

    expect(el.style.transform).toBe('');
  });

  it('leaves the element alone on pointer leave while inactive', () => {
    stubFinePointer(false);
    const el = setup();
    el.style.transform = 'rotate(3deg)';

    fireEvent.pointerLeave(el);

    expect(el.style.transform).toBe('rotate(3deg)');
  });

  it('drops an applied pull when animations are turned off mid hover', () => {
    function MagnetWithToggle() {
      const { toggle } = useAccessibility();
      return (
        <>
          <Magnet />
          <button type="button" onClick={() => toggle('noAnimations')}>
            toggle
          </button>
        </>
      );
    }
    renderWithProviders(<MagnetWithToggle />);
    const el = screen.getByTestId('magnet');
    stubRect(el);
    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });
    expect(el.style.transform).toBe('translate(9px, 0px)');

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));

    expect(el.style.transform).toBe('');
  });

  it('works on the event target when the ref is not attached', () => {
    function Detached() {
      const { onPointerMove } = useMagnetic<HTMLButtonElement>();
      return <button data-testid="magnet" type="button" onPointerMove={onPointerMove} />;
    }
    renderWithProviders(<Detached />);
    const el = screen.getByTestId('magnet');
    stubRect(el);

    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });

    expect(el.style.transform).toBe('translate(9px, 0px)');
  });

  it('does not re-render while the pointer moves', () => {
    let renders = 0;
    function Counted() {
      renders += 1;
      const { ref, onPointerMove } = useMagnetic<HTMLButtonElement>();
      return <button ref={ref} data-testid="magnet" type="button" onPointerMove={onPointerMove} />;
    }
    renderWithProviders(<Counted />);
    const el = screen.getByTestId('magnet');
    stubRect(el);
    const rendersAfterMount = renders;

    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });
    fireEvent.pointerMove(el, { clientX: 10, clientY: 5 });

    expect(renders).toBe(rendersAfterMount);
  });
});
