import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollToHash } from './useScrollToHash';
import { StrictMode } from 'react';

const FRAME_MS = 16;
const RETRY_WINDOW_MS = 15_000;
// The first window of the hook was one second: a lazy chunk that takes longer than that must still be waited for.
const OLD_WINDOW_MS = 1000;

function routerAt(entry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(MemoryRouter, { initialEntries: [entry] }, children);
  };
}

function mountTarget(id: string): ReturnType<typeof vi.fn> {
  const el = document.createElement('section');
  el.id = id;
  const scrollIntoView = vi.fn();
  el.scrollIntoView = scrollIntoView;
  document.body.appendChild(el);
  return scrollIntoView;
}

describe('useScrollToHash', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('scrolls to the element named by the hash, leaving the behavior to the CSS of the page', () => {
    const scrollIntoView = mountTarget('x');

    renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    vi.advanceTimersByTime(FRAME_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith();
  });

  it('keeps retrying and scrolls once the element mounts a few frames later', () => {
    renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    vi.advanceTimersByTime(3 * FRAME_MS);

    const scrollIntoView = mountTarget('x');
    expect(scrollIntoView).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * FRAME_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith();
  });

  it('still scrolls when the element mounts just inside the window', () => {
    renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    vi.advanceTimersByTime(RETRY_WINDOW_MS - 100);

    const scrollIntoView = mountTarget('x');
    expect(scrollIntoView).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * FRAME_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith();
  });

  it('waits for a target whose chunk takes longer than the old one second window', () => {
    renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    vi.advanceTimersByTime(OLD_WINDOW_MS + 1500);

    const scrollIntoView = mountTarget('x');
    expect(scrollIntoView).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * FRAME_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith();
  });

  it('stops scrolling retries after the element is found', () => {
    mountTarget('x');

    renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    vi.advanceTimersByTime(FRAME_MS);

    expect(vi.getTimerCount()).toBe(0);
  });

  it('gives up after the window when the element never appears', () => {
    expect(() => {
      renderHook(() => useScrollToHash(), { wrapper: routerAt('/#missing') });
      vi.advanceTimersByTime(RETRY_WINDOW_MS + 4 * FRAME_MS);
    }).not.toThrow();

    expect(vi.getTimerCount()).toBe(0);

    const late = mountTarget('missing');
    vi.advanceTimersByTime(RETRY_WINDOW_MS);
    expect(late).not.toHaveBeenCalled();
  });

  it('does nothing without a hash', () => {
    const scrollIntoView = mountTarget('x');

    renderHook(() => useScrollToHash(), { wrapper: routerAt('/') });

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(RETRY_WINDOW_MS);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls again when the same hash is followed a second time (a new navigation, same hash)', () => {
    const scrollIntoView = mountTarget('x');
    const { result } = renderHook(
      () => {
        useScrollToHash();
        return useNavigate();
      },
      { wrapper: routerAt('/#x') },
    );
    vi.advanceTimersByTime(FRAME_MS);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    act(() => result.current('/#x'));
    vi.advanceTimersByTime(FRAME_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('does not scroll again on a re-render that is not a navigation', () => {
    const scrollIntoView = mountTarget('x');
    const { rerender } = renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    vi.advanceTimersByTime(FRAME_MS);

    rerender();
    vi.advanceTimersByTime(RETRY_WINDOW_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending retry on unmount', () => {
    const { unmount } = renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('useScrollToHash focus', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  afterEach(() => {
    window.dispatchEvent(new Event('wheel'));
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  function mountLabelledSection(id: string): HTMLElement {
    const section = document.createElement('section');
    section.id = id;
    section.setAttribute('aria-labelledby', `${id}-title`);
    section.scrollIntoView = vi.fn();
    section.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const heading = document.createElement('h2');
    heading.id = `${id}-title`;
    section.appendChild(heading);
    document.body.appendChild(section);
    return heading;
  }

  it('moves focus to the heading of the section the hash points at, without scrolling again', () => {
    const heading = mountLabelledSection('metodo');
    const focus = vi.spyOn(heading, 'focus');

    renderHook(() => useScrollToHash(), { wrapper: routerAt('/#metodo') });
    vi.advanceTimersByTime(FRAME_MS);

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(heading).toHaveFocus();
  });

  it('focuses the heading again when the same hash link is followed a second time', () => {
    const heading = mountLabelledSection('metodo');
    const { result } = renderHook(
      () => {
        useScrollToHash();
        return useNavigate();
      },
      { wrapper: routerAt('/#metodo') },
    );
    heading.blur();
    expect(heading).not.toHaveFocus();

    act(() => result.current('/#metodo'));
    vi.advanceTimersByTime(FRAME_MS);

    expect(heading).toHaveFocus();
  });

  it('does not move focus when there is no hash', () => {
    const heading = mountLabelledSection('metodo');

    renderHook(() => useScrollToHash(), { wrapper: routerAt('/') });
    vi.advanceTimersByTime(FRAME_MS * 3);

    expect(heading).not.toHaveFocus();
  });

  it('survives StrictMode double effects: focused once the effects settle, nothing left running', () => {
    const heading = mountLabelledSection('metodo');

    const { unmount } = renderHook(() => useScrollToHash(), {
      wrapper: ({ children }: { children: ReactNode }) => createElement(StrictMode, null, createElement(routerAt('/#metodo'), null, children)),
    });
    vi.advanceTimersByTime(FRAME_MS);
    expect(heading).toHaveFocus();

    unmount();
    window.dispatchEvent(new Event('wheel'));
    expect(vi.getTimerCount()).toBe(0);
  });
});
