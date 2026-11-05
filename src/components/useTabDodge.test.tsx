import { act, fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTabDodge } from './useTabDodge';

// jsdom has no layout: the tab (a 44px box at the right edge of the 1024x768 window, at 316) and the focused link are given
// rects, and the test reads what the hook writes on the button (the two lengths and the duration its translate uses).

const SETTLE_MS = 120;
const TAB_BOX = {
  left: 980,
  top: 316,
  width: 44,
  height: 44,
  right: 1024,
  bottom: 360,
  x: 980,
  y: 316,
  toJSON: () => ({}),
};
const LINK_BOX = {
  left: 0,
  top: 300,
  width: 1024,
  height: 40,
  right: 1024,
  bottom: 340,
  x: 0,
  y: 300,
  toJSON: () => ({}),
};

interface HarnessProps {
  isOpen?: boolean;
  isMotionAllowed?: boolean;
}

function Harness({ isOpen = false, isMotionAllowed = true }: HarnessProps) {
  const wrapperRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useTabDodge({ wrapperRef, triggerRef, isOpen, isMotionAllowed, placeKey: 'right:316' });
  return (
    <>
      <a href="#x" data-testid="link">
        link
      </a>
      <aside ref={wrapperRef} data-testid="wrapper">
        <button ref={triggerRef} type="button" data-testid="tab">
          tab
        </button>
      </aside>
    </>
  );
}

function setup(props: HarnessProps = {}) {
  const view = render(<Harness {...props} />);
  const wrapper = view.getByTestId('wrapper');
  const link = view.getByTestId('link');
  vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(TAB_BOX);
  vi.spyOn(link, 'getClientRects').mockReturnValue([LINK_BOX] as unknown as DOMRectList);
  return { tab: view.getByTestId('tab'), link };
}

const dy = (tab: HTMLElement) => tab.style.getPropertyValue('--vn-dodge-y');
const dx = (tab: HTMLElement) => tab.style.getPropertyValue('--vn-dodge-x');
const settle = () => act(() => vi.advanceTimersByTime(SETTLE_MS + 1));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the tab steps aside for a control the keyboard focused under it', () => {
  it('moves clear of the control after a Tab key and a quiet moment, sliding for the length of the tab slide', () => {
    const { tab, link } = setup();
    fireEvent.keyDown(document, { key: 'Tab' });
    act(() => link.focus());
    expect(dy(tab)).toBe('');
    settle();

    // Below the link needs 340 + 8 - 316 = 32px; above needs 68px.
    expect(dy(tab)).toBe('32px');
    expect(dx(tab)).toBe('0px');
    expect(tab.style.getPropertyValue('--vn-dodge-ms')).toBe('220ms');
  });

  it('is instant when motion is off', () => {
    const { tab, link } = setup({ isMotionAllowed: false });
    fireEvent.keyDown(document, { key: 'Tab' });
    act(() => link.focus());
    settle();

    expect(dy(tab)).toBe('32px');
    expect(tab.style.getPropertyValue('--vn-dodge-ms')).toBe('0ms');
  });

  it('comes back when the focus leaves the control', () => {
    const { tab, link } = setup();
    fireEvent.keyDown(document, { key: 'Tab' });
    act(() => link.focus());
    settle();
    expect(dy(tab)).toBe('32px');

    act(() => link.blur());
    settle();
    expect(dy(tab)).toBe('0px');
  });

  it('does not move for a focus the keyboard did not bring, nor when nothing is under the tab', () => {
    const { tab, link } = setup();
    act(() => link.focus());
    settle();
    expect(dy(tab)).toBe('');

    act(() => link.blur());
    fireEvent.keyDown(document, { key: 'Tab' });
    vi.spyOn(link, 'getClientRects').mockReturnValue([
      { ...LINK_BOX, top: 100, bottom: 140 },
    ] as unknown as DOMRectList);
    act(() => link.focus());
    settle();
    expect(dy(tab)).toBe('0px');
  });

  it('comes home at once for the pointer and stays put for a focus after it', () => {
    const { tab, link } = setup();
    fireEvent.keyDown(document, { key: 'Tab' });
    act(() => link.focus());
    settle();
    expect(dy(tab)).toBe('32px');

    fireEvent.pointerDown(document.body);
    expect(dy(tab)).toBe('0px');
    expect(tab.style.getPropertyValue('--vn-dodge-ms')).toBe('0ms');

    act(() => link.blur());
    act(() => link.focus());
    settle();
    expect(dy(tab)).toBe('0px');
  });

  it('does nothing while the panel is open (the focus is inside it)', () => {
    const { tab, link } = setup({ isOpen: true });
    fireEvent.keyDown(document, { key: 'Tab' });
    act(() => link.focus());
    settle();
    expect(dy(tab)).toBe('');
  });
});
