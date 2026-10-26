import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { FINE_POINTER_QUERY, REDUCED_MOTION_QUERY, stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { useMagnetic } from './useMagnetic';

const A11Y_STORAGE_KEY = 'a11y-preferences';
const ELEMENT_WIDTH = 100;
const ELEMENT_HEIGHT = 40;

function boxAt(left: number, top: number): DOMRect {
  return {
    left,
    top,
    right: left + ELEMENT_WIDTH,
    bottom: top + ELEMENT_HEIGHT,
    width: ELEMENT_WIDTH,
    height: ELEMENT_HEIGHT,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

function stubRect(el: HTMLElement): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(boxAt(0, 0));
}

/** Like the browser: the rect of an element is shifted by the translate currently applied to it. */
function stubRectShiftedByTransform(el: HTMLElement): void {
  vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => {
    const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(el.style.transform);
    return boxAt(match ? Number(match[1]) : 0, match ? Number(match[2]) : 0);
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
    localStorage.clear();
    stubMatchMedia({ [FINE_POINTER_QUERY]: true });
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

  describe('pull feedback', () => {
    it('gives the same pull on repeated moves at one position although the rect follows the pull', () => {
      renderWithProviders(<Magnet />);
      const el = screen.getByTestId('magnet');
      stubRectShiftedByTransform(el);

      fireEvent.pointerMove(el, { clientX: 100, clientY: 40 });
      const first = el.style.transform;
      fireEvent.pointerMove(el, { clientX: 100, clientY: 40 });
      fireEvent.pointerMove(el, { clientX: 100, clientY: 40 });

      expect(first).toBe('translate(9px, 6px)');
      expect(el.style.transform).toBe(first);
    });

    it('does not flip the sign at full strength', () => {
      renderWithProviders(<Magnet strength={{ x: 1, y: 1 }} />);
      const el = screen.getByTestId('magnet');
      stubRectShiftedByTransform(el);

      fireEvent.pointerMove(el, { clientX: 100, clientY: 40 });
      fireEvent.pointerMove(el, { clientX: 100, clientY: 40 });

      expect(el.style.transform).toBe('translate(50px, 20px)');
    });

    it('measures from the resting center again after the pointer leaves', () => {
      renderWithProviders(<Magnet />);
      const el = screen.getByTestId('magnet');
      stubRectShiftedByTransform(el);
      fireEvent.pointerMove(el, { clientX: 100, clientY: 40 });

      fireEvent.pointerLeave(el);
      fireEvent.pointerMove(el, { clientX: 100, clientY: 40 });

      expect(el.style.transform).toBe('translate(9px, 6px)');
    });
  });

  it('resets the transform when the pointer leaves', () => {
    const el = setup();
    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });
    expect(el.style.transform).not.toBe('');

    fireEvent.pointerLeave(el);

    expect(el.style.transform).toBe('');
  });

  it('does nothing on a coarse pointer', () => {
    stubMatchMedia({ [FINE_POINTER_QUERY]: false });
    const el = setup();

    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });

    expect(el.style.transform).toBe('');
  });

  it('does nothing when the system prefers reduced motion', () => {
    stubMatchMedia({ [FINE_POINTER_QUERY]: true, [REDUCED_MOTION_QUERY]: true });
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

  it('goes inert and drops the pull when the system turns reduced motion on mid hover', () => {
    const media = stubMatchMedia({ [FINE_POINTER_QUERY]: true });
    const el = setup();
    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });
    expect(el.style.transform).toBe('translate(9px, 0px)');

    act(() => media.set(REDUCED_MOTION_QUERY, true));
    expect(el.style.transform).toBe('');

    fireEvent.pointerMove(el, { clientX: 100, clientY: 20 });
    expect(el.style.transform).toBe('');
  });

  it('leaves the element alone on pointer leave while inactive', () => {
    stubMatchMedia({ [FINE_POINTER_QUERY]: false });
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
