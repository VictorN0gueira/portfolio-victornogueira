import { act, fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { StrictMode, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dodgeOffset } from '../lib/floatingDodge';
import { TAB_SIZE_PX, TAB_SLIDE_MS, type Box, type TabPosition } from '../lib/floatingLayout';
import { clearDodge, readDodge, useTabDodge } from './useTabDodge';

// jsdom has no layout. The scene below says where the window is, where the tab rests and where the focused link is, and the
// mocks answer from it, so a test can change the scene (a rotation, a scroll) and let the hook judge again.

const FRAME_MS = 16;
const SETTLE_MS = 100;
const PRESS_WINDOW_MS = 500;
const PHONE = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };

interface Scene {
  window: { width: number; height: number };
  tab: Box;
  link: Box;
  clip?: Box;
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
      <input data-testid="field" />
      <div data-testid="clip" style={{ overflowX: 'hidden', overflowY: 'hidden' }}>
        <a href="#d" data-testid="link-d">
          d
        </a>
      </div>
      <div data-testid="context" style={{ position: 'absolute', zIndex: 1 }}>
        <a href="#f" data-testid="link-f" style={{ position: 'relative', zIndex: 9999 }}>
          f
        </a>
      </div>
      <dialog open data-testid="dialog">
        <a href="#e" data-testid="link-e">
          e
        </a>
      </dialog>
      <aside ref={wrapperRef} data-testid="wrapper" style={{ zIndex: 150 }}>
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
  for (const id of ['link-a', 'link-b', 'link-c', 'link-d', 'link-e', 'link-f', 'field']) {
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
  // The wrapper is mounted before a test could spy on it, and the hook reads its box when it mounts.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const id = this.getAttribute('data-testid');
    const none = { left: 0, top: 0, width: 0, height: 0 };
    return rectOf(id === 'wrapper' ? scene.tab : id === 'clip' ? (scene.clip ?? none) : none);
  });
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

  it('judges the last focus of a quick run once per frame, the first frame after it, with no quiet moment to wait for', () => {
    const { tab, a, b } = setup();
    const reads = a.getClientRects as ReturnType<typeof vi.fn>;
    act(() => {
      a.focus();
      b.focus();
      a.focus();
    });
    frame();
    expect(reads).toHaveBeenCalledTimes(1);
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

  it('leaves a focus the pointer brought to a text field alone, but not the same field after a key', () => {
    const { tab, view } = setup();
    const field = view.getByTestId('field');
    fireEvent.pointerDown(document.body);
    act(() => field.focus());
    frame();
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    expect(dy(tab)).toBe('');

    act(() => field.blur());
    fireEvent.keyDown(document, { key: 'Tab' });
    act(() => field.focus());
    frame();
    expect(dy(tab)).toBe('-38px');
  });

  it('does not carry a press on a non-focusable area into a focus that comes much later from assistive technology', () => {
    const { tab, view } = setup();
    const field = view.getByTestId('field');
    fireEvent.pointerDown(document.body);
    fireEvent.pointerUp(document.body);
    act(() => vi.advanceTimersByTime(PRESS_WINDOW_MS + SETTLE_MS));
    act(() => field.focus());
    frame();
    expect(dy(tab)).toBe('-38px');
  });

  it('does not move for a link the pointer focused when the browser does not call it focus-visible', () => {
    const { tab, a } = setup();
    isFocusVisible = false;
    fireEvent.pointerDown(document.body);
    act(() => a.focus());
    frame();
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    expect(dy(tab)).toBe('');
  });

  it('judges a focus from assistive technology after an earlier touch: the latch covers the event, not the lifetime', () => {
    const { tab, a, b } = setup();
    fireEvent.pointerDown(document.body);
    act(() => b.focus());
    frame();
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');
  });

  it('puts the dodge back after a wheel turn that does not scroll, when the control is still under the tab', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');

    fireEvent.wheel(document.body);
    expect(dy(tab)).toBe('0px');
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    expect(dy(tab)).toBe('-38px');
  });
});

describe('a press on the tab', () => {
  it('holds the tab where it is drawn until the pointer lets go: the focus the press brings does not send it home', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');

    fireEvent.pointerDown(tab);
    act(() => tab.focus());
    frame();
    expect(dy(tab)).toBe('-38px');

    fireEvent.pointerUp(tab);
    frame();
    expect(dy(tab)).toBe('0px');
  });

  it('is held only by a press, so a wheel turn over the tab sends it home like any other pointer use', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    fireEvent.wheel(tab);
    expect(dy(tab)).toBe('0px');
  });
});

describe('a hold that can not stick', () => {
  function pressAndFocusTheTab() {
    const harness = setup();
    act(() => harness.a.focus());
    frame();
    fireEvent.pointerDown(harness.tab, { button: 0 });
    act(() => harness.tab.focus());
    frame();
    expect(dy(harness.tab)).toBe('-38px');
    return harness;
  }

  it('is not taken by a press of another button, whose release the OS context menu swallows', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    fireEvent.pointerDown(tab, { button: 2 });
    act(() => tab.focus());
    frame();
    expect(dy(tab)).toBe('0px');
  });

  for (const [name, release] of [
    ['a key', () => fireEvent.keyDown(document, { key: 'Escape' })],
    ['the window losing the focus', () => fireEvent.blur(window)],
    ['a context menu', () => fireEvent.contextMenu(document.body)],
    ['a pointercancel', () => fireEvent.pointerCancel(document.body)],
  ] as const) {
    it(`is let go by ${name}`, () => {
      const { tab } = pressAndFocusTheTab();
      act(() => {
        release();
      });
      frame();
      expect(dy(tab)).toBe('0px');
    });
  }
});

describe('what the tab can not cover', () => {
  const CLEAR_OF_TAB = { left: 0, top: 0, width: 300, height: 844 };

  it('ignores a control whose clipped part is clear of the tab', () => {
    scene = { ...scene, clip: CLEAR_OF_TAB };
    const { tab, view } = setup();
    act(() => view.getByTestId('link-d').focus());
    frame();
    expect(dy(tab)).toBe('');
  });

  it('judges a clipped control by the part that shows', () => {
    scene = { ...scene, clip: { left: 0, top: 0, width: 390, height: 844 } };
    const { tab, view } = setup();
    act(() => view.getByTestId('link-d').focus());
    frame();
    expect(dy(tab)).toBe('-38px');
  });

  it('still steps aside for a non-modal dialog: it is not in the top layer and paints below the widget', () => {
    const { tab, view } = setup();
    act(() => view.getByTestId('link-e').focus());
    frame();
    expect(dy(tab)).toBe('-38px');
  });

  it('skips a control inside a modal dialog: it is in the top layer, above the widget', () => {
    const closest = Element.prototype.closest;
    vi.spyOn(Element.prototype, 'closest').mockImplementation(function (this: Element, selector: string) {
      return selector.includes(':modal') && this.getAttribute('data-testid') === 'link-e'
        ? this
        : closest.call(this, selector);
    });
    const { tab, view } = setup();
    act(() => view.getByTestId('link-e').focus());
    frame();
    expect(dy(tab)).toBe('');
  });

  it('knows a stacking context caps its children: a z-index of 9999 inside a context at 1 is below the widget', () => {
    const { tab, view } = setup();
    act(() => view.getByTestId('link-f').focus());
    frame();
    expect(dy(tab)).toBe('-38px');
  });

  it('skips a control whose outermost stacking context is above the widget, whatever z-index it has itself', () => {
    const { tab, view } = setup();
    const above = view.getByTestId('above');
    const inner = document.createElement('a');
    inner.href = '#g';
    inner.style.cssText = 'position:relative;z-index:1';
    above.append(inner);
    vi.spyOn(inner, 'getClientRects').mockImplementation(() => [rectOf(scene.link)] as unknown as DOMRectList);
    act(() => inner.focus());
    frame();
    expect(dy(tab)).toBe('');
  });

  it('skips a control inside an open popover', () => {
    const closest = Element.prototype.closest;
    vi.spyOn(Element.prototype, 'closest').mockImplementation(function (this: Element, selector: string) {
      return selector.includes(':popover-open') && this.getAttribute('data-testid') === 'link-a'
        ? this
        : closest.call(this, selector);
    });
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('');
  });
});

describe('a page that has room to scroll the control clear', () => {
  const root = document.documentElement;
  const LOW_TAB = { left: 346, top: 500, width: TAB_SIZE_PX, height: TAB_SIZE_PX };
  const LOW_LINK = { left: 0, top: 510, width: 390, height: 40 };
  let scrollY = 0;

  beforeEach(() => {
    scrollY = 0;
    Object.defineProperty(root, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(window, 'scrollY', { get: () => scrollY, configurable: true });
    scene = { ...scene, tab: LOW_TAB, link: LOW_LINK };
  });

  afterEach(() => {
    Reflect.deleteProperty(root, 'scrollHeight');
    Reflect.deleteProperty(window, 'scrollY');
  });

  it('waits for the scroll to settle instead of hopping while the browser is on its way', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('');

    scene = { ...scene, link: { ...LOW_LINK, top: 300 } };
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    expect(dy(tab)).toBe('');
  });

  it('still steps aside once the scroll has settled and the control is under the tab', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    expect(Number.parseFloat(dy(tab))).not.toBe(0);
    expect(dy(tab)).not.toBe('');
  });

  it('comes home at once when the focus lands on a control that is not under the tab, while a scroll may be on its way', () => {
    const { tab, a, b } = setup();
    act(() => a.focus());
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    expect(dy(tab)).not.toBe('');

    act(() => b.focus());
    frame();
    expect(dy(tab)).toBe('0px');
  });

  it('judges at once when the page is at its end, where nothing can scroll', () => {
    scrollY = 2000 - PHONE.height;
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    expect(dy(tab)).not.toBe('');
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
    const offset = dodgeOffset({
      tab: scene.tab,
      target: scene.link,
      viewport: PHONE,
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    });

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
    const { view, a } = setup();
    const reads = a.getClientRects as ReturnType<typeof vi.fn>;
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
          'pointerup',
          'pointercancel',
          'blur',
          'contextmenu',
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
    expect(reads).not.toHaveBeenCalled();
  });
});

describe('readDodge', () => {
  it('reads what the dodge has put in the style of the tab, and zero before it has', () => {
    const { tab, a } = setup();
    expect(readDodge(tab)).toEqual({ dx: 0, dy: 0 });
    act(() => a.focus());
    frame();
    expect(readDodge(tab)).toEqual({ dx: 0, dy: -38 });
  });
});

describe('the end of a drag', () => {
  it('puts the tab home at once when the pointer lets go of a drag, before the new place is laid out', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');

    tab.dataset.dragging = 'true';
    fireEvent.pointerUp(document.body);
    expect(dy(tab)).toBe('0px');
    expect(tab.style.transition).toBe('');
  });

  it('leaves a dodge alone when the pointer lets go of something that was not a drag of the tab', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    fireEvent.pointerUp(document.body);
    expect(dy(tab)).toBe('-38px');
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
  it('is left to the stylesheet: the stop of every transition is the one of motion.css, and the tab is drawn by a class', () => {
    const widget = readFileSync(resolve(__dirname, './AccessibilityWidget.tsx'), 'utf8');
    const motion = readFileSync(resolve(__dirname, '../styles/motion.css'), 'utf8');
    expect(widget).toContain('vn-tab-trigger');
    expect(motion).toContain('transition-duration: .01ms !important');
  });
});
