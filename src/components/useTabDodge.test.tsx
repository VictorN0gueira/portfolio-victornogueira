import { act, fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { StrictMode, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dodgeOffset, TAB_SIZE_PX, TAB_SLIDE_MS, type Box, type TabPosition } from '../lib/floatingLayout';
import { clearDodge, useTabDodge } from './useTabDodge';

// jsdom has no layout. The scene below says where the window is, where the tab rests and where the focused link is, and the
// mocks answer from it, so a test can change the scene (a rotation, a scroll) and let the hook judge again.

const FRAME_MS = 16;
const SETTLE_MS = 100;
const PHONE = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };

interface Scene {
  window: { width: number; height: number };
  tab: Box;
  link: Box;
}

let scene: Scene;
// jsdom answers :focus-visible with its own idea of keyboard use: the tests say what the browser would.
let isFocusVisible = true;

const rectOf = ({ left, top, width, height }: Box): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const PHONE_SCENE: Scene = {
  window: PHONE,
  tab: { left: 346, top: 316, width: TAB_SIZE_PX, height: TAB_SIZE_PX },
  link: { left: 0, top: 330, width: 390, height: 40 },
};

interface HarnessProps {
  isOpen?: boolean;
  position?: TabPosition | null;
}

function Harness({ isOpen = false, position = null }: HarnessProps) {
  const wrapperRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useTabDodge({ wrapperRef, triggerRef, isOpen, position });
  return (
    <>
      <a href="#a" data-testid="link-a">
        a
      </a>
      <a href="#b" data-testid="link-b">
        b
      </a>
      <div data-testid="above" style={{ position: 'fixed', zIndex: 200 }}>
        <a href="#c" data-testid="link-c">
          c
        </a>
      </div>
      <aside ref={wrapperRef} data-testid="wrapper">
        <button ref={triggerRef} type="button" data-testid="tab">
          tab
        </button>
        <button type="button" data-testid="option">
          option
        </button>
      </aside>
    </>
  );
}

function setup(props: HarnessProps = {}, isStrict = false) {
  const element = <Harness {...props} />;
  const view = render(isStrict ? <StrictMode>{element}</StrictMode> : element);
  const wrapper = view.getByTestId('wrapper');
  vi.spyOn(wrapper, 'getBoundingClientRect').mockImplementation(() => rectOf(scene.tab));
  for (const id of ['link-a', 'link-b', 'link-c']) {
    vi.spyOn(view.getByTestId(id), 'getClientRects').mockImplementation(
      () =>
        [
          rectOf(id === 'link-b' ? { left: 0, top: 100, width: 390, height: 40 } : scene.link),
        ] as unknown as DOMRectList,
    );
  }
  const rerender = (next: HarnessProps) =>
    view.rerender(
      isStrict ? (
        <StrictMode>
          <Harness {...next} />
        </StrictMode>
      ) : (
        <Harness {...next} />
      ),
    );
  return {
    view,
    rerender,
    tab: view.getByTestId('tab'),
    a: view.getByTestId('link-a'),
    b: view.getByTestId('link-b'),
    wrapper,
  };
}

function resizeTo(size: { width: number; height: number }) {
  scene = { ...scene, window: size };
  Object.defineProperty(window, 'innerHeight', { value: size.height, configurable: true });
  Object.defineProperty(document.documentElement, 'clientWidth', { value: size.width, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(FRAME_MS);
  });
}

const dy = (tab: HTMLElement) => tab.style.getPropertyValue('--vn-dodge-y');
const dx = (tab: HTMLElement) => tab.style.getPropertyValue('--vn-dodge-x');
const frame = () => act(() => vi.advanceTimersByTime(FRAME_MS));
const overlapArea = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));

beforeEach(() => {
  vi.useFakeTimers();
  scene = { ...PHONE_SCENE };
  isFocusVisible = true;
  const matches = Element.prototype.matches;
  vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
    return selector === ':focus-visible' ? isFocusVisible : matches.call(this, selector);
  });
  Object.defineProperty(window, 'innerHeight', { value: PHONE.height, configurable: true });
  Object.defineProperty(document.documentElement, 'clientWidth', { value: PHONE.width, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the tab steps aside for a control the keyboard focused under it', () => {
  it('judges on the focus itself, in the next frame, with no key and no quiet moment: 32px clears the link', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    expect(dy(tab)).toBe('');
    frame();

    expect(dy(tab)).toBe('-38px');
    expect(dx(tab)).toBe('0px');
  });

  it('judges any keyboard driven focus, not only a Tab key (a skip link, a hash, an arrow key)', () => {
    const { tab, a } = setup();
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');
  });

  it('does not move for a focus that is not focus-visible (the pointer put it there)', () => {
    const { tab, a } = setup();
    isFocusVisible = false;
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('');
  });

  it('comes back when the focus leaves, and does not hop for a control that is not under the tab', () => {
    const { tab, a, b } = setup();
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');

    act(() => b.focus());
    frame();
    expect(dy(tab)).toBe('0px');
    act(() => b.blur());
    frame();
    expect(dy(tab)).toBe('0px');
  });

  it('judges the last focus of a quick run once per frame, so a held Tab never waits for a quiet moment', () => {
    const { tab, a, b, wrapper } = setup();
    const spy = wrapper.getBoundingClientRect as ReturnType<typeof vi.fn>;
    act(() => {
      a.focus();
      b.focus();
      a.focus();
    });
    frame();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(dy(tab)).toBe('-38px');
  });

  it('goes home when the focus is inside the widget (the panel is open) and is not judged while it is dragged', () => {
    const { tab, a, view } = setup();
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');

    tab.dataset.dragging = 'true';
    act(() => view.getByTestId('option').focus());
    frame();
    expect(dy(tab)).toBe('-38px');

    delete tab.dataset.dragging;
    act(() => {
      view.getByTestId('option').blur();
      view.getByTestId('option').focus();
    });
    frame();
    expect(dy(tab)).toBe('0px');
  });

  it('skips a control that lives above the widget in z order: the tab can never cover it', () => {
    const { tab, view } = setup();
    const c = view.getByTestId('link-c');
    act(() => c.focus());
    frame();
    expect(dy(tab)).toBe('');
  });
});

describe('the pointer', () => {
  it('sends the tab home for a press elsewhere and keeps it for a press on the tab itself', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');

    fireEvent.pointerDown(tab);
    expect(dy(tab)).toBe('-38px');
    fireEvent.pointerDown(document.body);
    expect(dy(tab)).toBe('0px');
  });

  it('leaves a focus after a press alone until a key is pressed again', () => {
    const { tab, a, b } = setup();
    fireEvent.pointerDown(document.body);
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('');

    act(() => b.focus());
    fireEvent.keyDown(document, { key: 'Tab' });
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');
  });
});

describe('the judge never keeps an offset of its own', () => {
  it('keeps the dodge across effect re-runs (the panel opens and closes, the tab is moved) and judges again', () => {
    const { tab, a, rerender } = setup();
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');

    rerender({ isOpen: true });
    expect(dy(tab)).toBe('-38px');
    rerender({ isOpen: false });
    expect(dy(tab)).toBe('-38px');
    scene = { ...scene, link: { ...scene.link, top: 100 } };
    rerender({ isOpen: true });
    rerender({ isOpen: false });
    frame();
    expect(dy(tab)).toBe('0px');
  });

  it('waits for the slide of a moved tab before it judges from the box of the tab', () => {
    const { tab, a, rerender } = setup();
    act(() => a.focus());
    frame();
    scene = { ...scene, link: { ...scene.link, top: 100 } };

    rerender({ position: { side: 'right', ratio: 0.4 } });
    act(() => vi.advanceTimersByTime(TAB_SLIDE_MS));
    expect(dy(tab)).toBe('-38px');
    act(() => vi.advanceTimersByTime(SETTLE_MS + FRAME_MS));
    expect(dy(tab)).toBe('0px');
  });

  it('judges again after the scroll settles, also for a scroll of a nested container', () => {
    const { tab, a, view } = setup();
    act(() => a.focus());
    frame();
    scene = { ...scene, link: { ...scene.link, top: 100 } };

    act(() => {
      fireEvent.scroll(view.getByTestId('above'));
      vi.advanceTimersByTime(SETTLE_MS - 1);
    });
    expect(dy(tab)).toBe('-38px');
    act(() => vi.advanceTimersByTime(2));
    expect(dy(tab)).toBe('0px');
  });

  it('ends a rotation to the side and back with the tab inside the window and clear of the focused link', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();

    const places: Array<{ window: { width: number; height: number }; tab: Box; link: Box }> = [
      {
        window: SIDEWAYS,
        tab: { left: 800, top: 150, width: TAB_SIZE_PX, height: TAB_SIZE_PX },
        link: { left: 0, top: 160, width: 844, height: 40 },
      },
      { window: PHONE, tab: PHONE_SCENE.tab, link: PHONE_SCENE.link },
    ];
    for (const next of places) {
      scene = next;
      resizeTo(next.window);
      const drawn = {
        ...next.tab,
        left: next.tab.left + Number.parseFloat(dx(tab)),
        top: next.tab.top + Number.parseFloat(dy(tab)),
      };
      expect(drawn.left).toBeGreaterThanOrEqual(0);
      expect(drawn.left + TAB_SIZE_PX).toBeLessThanOrEqual(next.window.width);
      expect(drawn.top).toBeGreaterThanOrEqual(0);
      expect(drawn.top + TAB_SIZE_PX).toBeLessThanOrEqual(next.window.height);
      expect(overlapArea(drawn, next.link)).toBe(0);
    }
  });

  it('keeps the tab where it can be reached for a control that fills the window: in the window, and no part of the control is lost', () => {
    scene = { ...scene, link: { left: 0, top: 0, width: 390, height: 844 } };
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    const offset = dodgeOffset({ tab: scene.tab, target: scene.link, viewport: PHONE, insets: { top: 0, bottom: 0, left: 0, right: 0 } });

    expect(Number.parseFloat(dx(tab) || '0')).toBe(offset.dx);
    expect(Number.parseFloat(dy(tab) || '0')).toBe(offset.dy);
    expect(scene.tab.left + offset.dx).toBeGreaterThanOrEqual(0);
    expect(scene.tab.left + offset.dx + TAB_SIZE_PX).toBeLessThanOrEqual(PHONE.width);
    expect(scene.tab.top + offset.dy).toBeGreaterThanOrEqual(0);
    expect(scene.tab.top + offset.dy + TAB_SIZE_PX).toBeLessThanOrEqual(PHONE.height);
  });
});

describe('mounting', () => {
  it('works the same under StrictMode, which mounts the effect twice', () => {
    const { tab, a } = setup({}, true);
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');
  });

  it('removes every listener it added and stops judging when it unmounts', () => {
    const names = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.map(([name]) => String(name)).sort();
    const added = [vi.spyOn(document, 'addEventListener'), vi.spyOn(window, 'addEventListener')];
    const removed = [vi.spyOn(document, 'removeEventListener'), vi.spyOn(window, 'removeEventListener')];
    const { view, a, wrapper } = setup();
    const spy = wrapper.getBoundingClientRect as ReturnType<typeof vi.fn>;
    const mine = (list: string[]) =>
      list.filter((name) =>
        [
          'focusin',
          'focusout',
          'keydown',
          'scroll',
          'resize',
          'orientationchange',
          'pointerdown',
          'touchstart',
          'wheel',
        ].includes(name),
      );
    act(() => a.focus());
    view.unmount();
    act(() => vi.advanceTimersByTime(SETTLE_MS * 4));

    expect(
      mine(names(removed[0]!))
        .concat(mine(names(removed[1]!)))
        .sort(),
    ).toEqual(
      mine(names(added[0]!))
        .concat(mine(names(added[1]!)))
        .sort(),
    );
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('clearDodge', () => {
  it('puts the tab home with no transition, and does nothing when it is already home', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    const writes = vi.spyOn(tab.style, 'setProperty');

    clearDodge(tab);
    expect(dy(tab)).toBe('0px');
    expect(dx(tab)).toBe('0px');
    expect(tab.style.transition).toBe('');
    const count = writes.mock.calls.length;
    clearDodge(tab);
    expect(writes.mock.calls.length).toBe(count);
  });
});

describe('motion off', () => {
  it('is left to the stylesheet: the move is a translate with a transition of the slide length, which the motion off rule makes instant', () => {
    const widget = readFileSync(resolve(__dirname, './AccessibilityWidget.tsx'), 'utf8');
    const motion = readFileSync(resolve(__dirname, '../styles/motion.css'), 'utf8');
    expect(TAB_SLIDE_MS).toBe(220);
    expect(widget).toContain('translate-x-[var(--vn-dodge-x,0px)]');
    expect(widget).toContain('[transition-duration:300ms,300ms,300ms,220ms]');
    expect(widget).toContain('[transition-timing-function:var(--ease-out)]');
    expect(motion).toContain('transition-duration: .01ms !important');
  });
});
