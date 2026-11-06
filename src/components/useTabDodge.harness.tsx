/* eslint-disable react-refresh/only-export-components -- a test harness: the component is local to the tests that import it */
import { act, render } from '@testing-library/react';
import { StrictMode, useRef } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import { TAB_SIZE_PX, type Box, type TabPosition } from '../lib/floatingLayout';
import { useTabDodge } from './useTabDodge';

// jsdom has no layout. The env.scene below says where the window is, where the tab rests and where the focused link is, and the
// mocks answer from it, so a test can change the env.scene (a rotation, a scroll) and let the hook judge again.

export const FRAME_MS = 16;
export const SETTLE_MS = 100;
export const PRESS_WINDOW_MS = 500;
export const PHONE = { width: 390, height: 844 };
export const SIDEWAYS = { width: 844, height: 390 };

interface Scene {
  window: { width: number; height: number };
  tab: Box;
  link: Box;
  clip?: Box;
}

// jsdom answers :focus-visible with its own idea of keyboard use: the tests say what the browser would.
export const env: { scene: Scene; isFocusVisible: boolean } = {
  scene: undefined as unknown as Scene,
  isFocusVisible: true,
};

export const rectOf = ({ left, top, width, height }: Box): DOMRect =>
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

export const PHONE_SCENE: Scene = {
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
      <div data-testid="cap-parent">
        <div data-testid="cap">
          <a href="#g" data-testid="link-g" style={{ position: 'relative', zIndex: 9999 }}>
            g
          </a>
        </div>
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

export function setup(props: HarnessProps = {}, isStrict = false) {
  const element = <Harness {...props} />;
  const view = render(isStrict ? <StrictMode>{element}</StrictMode> : element);
  const wrapper = view.getByTestId('wrapper');
  for (const id of ['link-a', 'link-b', 'link-c', 'link-d', 'link-e', 'link-f', 'link-g', 'field']) {
    vi.spyOn(view.getByTestId(id), 'getClientRects').mockImplementation(
      () =>
        [
          rectOf(id === 'link-b' ? { left: 0, top: 100, width: 390, height: 40 } : env.scene.link),
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

export function resizeTo(size: { width: number; height: number }) {
  env.scene = { ...env.scene, window: size };
  Object.defineProperty(window, 'innerHeight', { value: size.height, configurable: true });
  Object.defineProperty(document.documentElement, 'clientWidth', { value: size.width, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(FRAME_MS);
  });
}

export const dy = (tab: HTMLElement) => tab.style.getPropertyValue('--vn-dodge-y');
export const dx = (tab: HTMLElement) => tab.style.getPropertyValue('--vn-dodge-x');
export const frame = () => act(() => vi.advanceTimersByTime(FRAME_MS));
export const overlapArea = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));

/** Registers the clock, the mocks and their cleanup for the tests of the file that calls it. */
export function installHarnessHooks() {
  beforeEach(() => {
    vi.useFakeTimers();
    env.scene = { ...PHONE_SCENE };
    env.isFocusVisible = true;
    // The wrapper is mounted before a test could spy on it, and the hook reads its box when it mounts.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const id = this.getAttribute('data-testid');
      const none = { left: 0, top: 0, width: 0, height: 0 };
      return rectOf(id === 'wrapper' ? env.scene.tab : id === 'clip' ? (env.scene.clip ?? none) : none);
    });
    const matches = Element.prototype.matches;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
      return selector === ':focus-visible' ? env.isFocusVisible : matches.call(this, selector);
    });
    Object.defineProperty(window, 'innerHeight', { value: PHONE.height, configurable: true });
    Object.defineProperty(document.documentElement, 'clientWidth', { value: PHONE.width, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
}
