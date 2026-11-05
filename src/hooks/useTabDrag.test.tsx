import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Box, TabPosition, TabSide } from '../lib/floatingLayout';
import { useTabDrag } from './useTabDrag';

const VIEW = { viewport: { width: 390, height: 844 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } };
const START_RECT = { left: 346, top: 600, width: 44, height: 44 };

interface Spies {
  onLive: (rect: Box, side: TabSide) => void;
  onRelease: (position: TabPosition, from: Box) => void;
  onCancel: () => void;
  onClick: () => void;
  suppressed: boolean[];
}

function Harness({ spies }: { spies: Spies }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const drag = useTabDrag({
    triggerRef,
    wrapperRef,
    readView: () => VIEW,
    onLive: spies.onLive,
    onRelease: spies.onRelease,
    onCancel: spies.onCancel,
  });
  return (
    <div ref={wrapperRef} data-testid="wrapper">
      <button
        ref={triggerRef}
        type="button"
        {...drag.handlers}
        onClick={() => {
          const wasDrag = drag.takeSuppressedClick();
          spies.suppressed.push(wasDrag);
          if (!wasDrag) spies.onClick();
        }}
      >
        tab
      </button>
    </div>
  );
}

function setup() {
  const spies: Spies = { onLive: vi.fn(), onRelease: vi.fn(), onCancel: vi.fn(), onClick: vi.fn(), suppressed: [] };
  render(<Harness spies={spies} />);
  const button = screen.getByRole('button', { name: 'tab' });
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({ ...START_RECT, right: 390, bottom: 644, x: 346, y: 600, toJSON: () => ({}) });
  button.setPointerCapture = vi.fn();
  return { spies, button, wrapper: screen.getByTestId('wrapper') };
}

const point = (clientX: number, clientY: number, pointerId = 1, pointerType = 'touch') => ({ clientX, clientY, pointerId, pointerType, button: 0 });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useTabDrag', () => {
  it('follows the pointer with a transform on the wrapper while it moves, before the release', () => {
    const { spies, button, wrapper } = setup();

    fireEvent.pointerDown(button, point(360, 620));
    fireEvent.pointerMove(button, point(300, 560));

    expect(wrapper.style.transform).toBe('translate3d(-60px, -60px, 0)');
    expect(button.dataset.dragging).toBe('true');
    expect(spies.onLive).toHaveBeenCalledWith({ left: 286, top: 540, width: 44, height: 44 }, 'right');
    expect(spies.onRelease).not.toHaveBeenCalled();
  });

  it('keeps the tab inside the window while the pointer goes further', () => {
    const { button, wrapper } = setup();

    fireEvent.pointerDown(button, point(360, 620));
    fireEvent.pointerMove(button, point(900, 2000));

    expect(wrapper.style.transform).toBe(`translate3d(0px, ${844 - 44 - 16 - 600}px, 0)`);
  });

  it('snaps to the nearest side on release and tells where the tab was drawn', () => {
    const { spies, button } = setup();

    fireEvent.pointerDown(button, point(360, 620));
    fireEvent.pointerMove(button, point(40, 520));
    fireEvent.pointerUp(button, point(40, 520));

    expect(spies.onRelease).toHaveBeenCalledTimes(1);
    const [position, from] = (spies.onRelease as ReturnType<typeof vi.fn>).mock.calls[0] as [TabPosition, Box];
    expect(position.side).toBe('left');
    expect(position.ratio).toBeCloseTo((520 + 22 - 20) / 844, 3);
    expect(from.left).toBe(26);
    expect(button.dataset.dragging).toBeUndefined();
  });

  it('treats a press that moves less than 8px as a tap: no drag, the click goes through', () => {
    const { spies, button, wrapper } = setup();

    fireEvent.pointerDown(button, point(360, 620));
    fireEvent.pointerMove(button, point(364, 624));
    fireEvent.pointerUp(button, point(364, 624));
    fireEvent.click(button);

    expect(wrapper.style.transform).toBe('');
    expect(spies.onLive).not.toHaveBeenCalled();
    expect(spies.onRelease).not.toHaveBeenCalled();
    expect(spies.onClick).toHaveBeenCalledTimes(1);
  });

  it('swallows the click the browser fires after a real drag, once', () => {
    const { spies, button } = setup();

    fireEvent.pointerDown(button, point(360, 620));
    fireEvent.pointerMove(button, point(200, 620));
    fireEvent.pointerUp(button, point(200, 620));
    fireEvent.click(button);
    fireEvent.click(button);

    expect(spies.suppressed).toEqual([true, false]);
    expect(spies.onClick).toHaveBeenCalledTimes(1);
  });

  it('captures the pointer on the button', () => {
    const { button } = setup();

    fireEvent.pointerDown(button, point(360, 620, 7));

    expect(button.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it('works when setPointerCapture is missing or throws', () => {
    const { spies, button } = setup();
    button.setPointerCapture = () => {
      throw new DOMException('no', 'NotFoundError');
    };

    fireEvent.pointerDown(button, point(360, 620));
    fireEvent.pointerMove(button, point(200, 620));
    fireEvent.pointerUp(button, point(200, 620));

    expect(spies.onRelease).toHaveBeenCalledTimes(1);
  });

  it('cancels cleanly on pointercancel: the transform goes away and nothing is kept', () => {
    const { spies, button, wrapper } = setup();

    fireEvent.pointerDown(button, point(360, 620));
    fireEvent.pointerMove(button, point(200, 620));
    fireEvent.pointerCancel(button, point(200, 620));

    expect(wrapper.style.transform).toBe('');
    expect(spies.onCancel).toHaveBeenCalledTimes(1);
    expect(spies.onRelease).not.toHaveBeenCalled();
    expect(button.dataset.dragging).toBeUndefined();
  });

  it('cancels on Escape and on blur', () => {
    const { spies, button, wrapper } = setup();

    fireEvent.pointerDown(button, point(360, 620));
    fireEvent.pointerMove(button, point(200, 620));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(wrapper.style.transform).toBe('');
    expect(spies.onCancel).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(button, point(360, 620));
    fireEvent.pointerMove(button, point(200, 620));
    fireEvent.blur(button);
    expect(spies.onCancel).toHaveBeenCalledTimes(2);
    expect(spies.onRelease).not.toHaveBeenCalled();
  });

  it('swallows the click of the release that comes after Escape, even when the release is late', () => {
    const { spies, button } = setup();

    fireEvent.pointerDown(button, point(360, 620, 1, 'mouse'));
    fireEvent.pointerMove(button, point(200, 620, 1, 'mouse'));
    fireEvent.keyDown(document, { key: 'Escape' });
    // The finger or the mouse button is still down: the release comes well after the Escape key.
    vi.advanceTimersByTime(250);
    fireEvent.pointerUp(button, point(200, 620, 1, 'mouse'));
    fireEvent.click(button);

    expect(spies.suppressed).toEqual([true]);
    expect(spies.onClick).not.toHaveBeenCalled();
    expect(spies.onRelease).not.toHaveBeenCalled();
  });

  it('does not swallow a keyboard click after an Escape drag that was already released', () => {
    const { spies, button } = setup();

    fireEvent.pointerDown(button, point(360, 620, 1, 'mouse'));
    fireEvent.pointerMove(button, point(200, 620, 1, 'mouse'));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.pointerUp(button, point(200, 620, 1, 'mouse'));
    fireEvent.click(button);
    vi.advanceTimersByTime(250);
    fireEvent.click(button);

    expect(spies.suppressed).toEqual([true, false]);
    expect(spies.onClick).toHaveBeenCalledTimes(1);
  });

  it('does not swallow a later click after a pointercancel, which never has a release', () => {
    const { spies, button } = setup();

    fireEvent.pointerDown(button, point(360, 620, 1, 'mouse'));
    fireEvent.pointerMove(button, point(200, 620, 1, 'mouse'));
    fireEvent.pointerCancel(button);
    vi.advanceTimersByTime(250);
    fireEvent.click(button);

    expect(spies.suppressed).toEqual([false]);
    expect(spies.onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps waiting for the finger that was cancelled when another finger touches the tab and lifts first', () => {
    const { spies, button } = setup();

    fireEvent.pointerDown(button, point(360, 620, 1));
    fireEvent.pointerMove(button, point(200, 620, 1));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.pointerDown(button, point(350, 610, 2));
    fireEvent.pointerUp(button, point(350, 610, 2));
    fireEvent.pointerUp(button, point(200, 620, 1));
    fireEvent.click(button);

    expect(spies.suppressed).toEqual([true]);
    expect(spies.onClick).not.toHaveBeenCalled();
  });

  it('lets a new tap through after a cancelled drag whose pointer was never released', () => {
    const { spies, button } = setup();

    fireEvent.pointerDown(button, point(360, 620, 1, 'mouse'));
    fireEvent.pointerMove(button, point(200, 620, 1, 'mouse'));
    fireEvent.keyDown(document, { key: 'Escape' });
    // The release got lost (the window lost the pointer): the next press starts clean.
    fireEvent.pointerDown(button, point(360, 620, 1, 'mouse'));
    fireEvent.pointerUp(button, point(360, 620, 1, 'mouse'));
    vi.advanceTimersByTime(250);
    fireEvent.click(button);

    expect(spies.suppressed).toEqual([false]);
    expect(spies.onClick).toHaveBeenCalledTimes(1);
  });

  it('ignores another finger and the right mouse button', () => {
    const { spies, button } = setup();

    fireEvent.pointerDown(button, { ...point(360, 620, 1, 'mouse'), button: 2 });
    fireEvent.pointerMove(button, point(200, 620, 1, 'mouse'));
    expect(spies.onLive).not.toHaveBeenCalled();

    fireEvent.pointerDown(button, point(360, 620, 1));
    fireEvent.pointerMove(button, point(200, 620, 2));
    expect(spies.onLive).not.toHaveBeenCalled();
  });
});
