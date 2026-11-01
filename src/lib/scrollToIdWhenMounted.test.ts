import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scrollToIdWhenMounted } from './scrollToIdWhenMounted';

const FRAME_MS = 16;
const MOUNT_WINDOW_MS = 15_000;
const SLOW_CHUNK_MS = 6000;
const REALIGN_WINDOW_MS = 5000;
const SCROLL_IDLE_MS = 120;
const OLD_WINDOW_MS = 1000;

let resizeCallbacks: Array<() => void> = [];
let observers: ControlledResizeObserver[] = [];

class ControlledResizeObserver {
  isDisconnected = false;
  constructor(callback: () => void) {
    resizeCallbacks.push(callback);
    observers.push(this);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {
    this.isDisconnected = true;
  }
}

/** The element is `top` pixels below the top of the viewport; change it to move the section while the page settles. */
function mountTarget(id: string, top = 0) {
  const element = document.createElement('section');
  element.id = id;
  const state = { top };
  const scrollIntoView = vi.fn();
  element.scrollIntoView = scrollIntoView;
  element.getBoundingClientRect = () => ({ top: state.top }) as DOMRect;
  document.body.appendChild(element);
  return { state, scrollIntoView };
}

const resizeBody = () => resizeCallbacks.forEach((callback) => callback());

describe('scrollToIdWhenMounted', () => {
  let scrollBy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    resizeCallbacks = [];
    observers = [];
    vi.stubGlobal('ResizeObserver', ControlledResizeObserver);
    scrollBy = vi.fn();
    vi.stubGlobal('scrollBy', scrollBy);
    window.scrollBy = scrollBy as unknown as typeof window.scrollBy;
  });

  afterEach(() => {
    // Whatever a test left running (the correction keeps going for a while) stops at the first input of a visitor.
    window.dispatchEvent(new Event('wheel'));
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('scrolls at once, leaving the behavior to the CSS of the page, when the element is already in the page', () => {
    const { scrollIntoView } = mountTarget('x');

    scrollToIdWhenMounted('x');

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith();
  });

  it('waits for an element whose chunk arrives after more than the old one second window, and scrolls once', () => {
    scrollToIdWhenMounted('x');
    vi.advanceTimersByTime(OLD_WINDOW_MS + 2000);

    const { scrollIntoView } = mountTarget('x');
    vi.advanceTimersByTime(2 * FRAME_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('waits for a section whose chunk takes six seconds, then scrolls to it', () => {
    scrollToIdWhenMounted('x');
    vi.advanceTimersByTime(SLOW_CHUNK_MS);

    const { scrollIntoView } = mountTarget('x');
    vi.advanceTimersByTime(2 * FRAME_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it.each(['wheel', 'touchstart', 'keydown', 'pointerdown'])('stops waiting for the element at the first %s of the visitor', (type) => {
    scrollToIdWhenMounted('x');
    vi.advanceTimersByTime(2000);

    window.dispatchEvent(new Event(type));
    const { scrollIntoView } = mountTarget('x');
    vi.advanceTimersByTime(MOUNT_WINDOW_MS);

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops waiting for the element when the function it returned is called, with no input listener left', () => {
    const removed: string[] = [];
    const remove = window.removeEventListener.bind(window);
    vi.spyOn(window, 'removeEventListener').mockImplementation((type: string, ...rest: [EventListenerOrEventListenerObject, ...unknown[]]) => {
      removed.push(type);
      return remove(type, ...(rest as [EventListenerOrEventListenerObject]));
    });
    const cancel = scrollToIdWhenMounted('x');
    vi.advanceTimersByTime(1000);

    cancel();
    const { scrollIntoView } = mountTarget('x');
    vi.advanceTimersByTime(MOUNT_WINDOW_MS);

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(removed).toEqual(expect.arrayContaining(['wheel', 'touchstart', 'keydown', 'pointerdown']));
    vi.restoreAllMocks();
  });

  const INPUT_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'];

  /** How many input listeners were taken off the window, counted per event type. */
  function spyOnInputListenerRemoval() {
    const removed: string[] = [];
    const remove = window.removeEventListener.bind(window);
    vi.spyOn(window, 'removeEventListener').mockImplementation((type: string, ...rest: [EventListenerOrEventListenerObject, ...unknown[]]) => {
      removed.push(type);
      return remove(type, ...(rest as [EventListenerOrEventListenerObject]));
    });
    return (type: string) => removed.filter((name) => name === type).length;
  }

  it('lets go of its input listeners once the element is found when there is no focus to move, without being cancelled', () => {
    mountTarget('x');
    const removedCount = spyOnInputListenerRemoval();

    scrollToIdWhenMounted('x');

    // The alignment loop still runs and keeps its own listeners: only the wait for the visitor input is over.
    for (const type of INPUT_EVENTS) expect(removedCount(type), type).toBeGreaterThanOrEqual(1);
    vi.restoreAllMocks();
  });

  it('lets go of its input listeners at the end of the mount window when the element never came', () => {
    const removedCount = spyOnInputListenerRemoval();
    scrollToIdWhenMounted('x');
    for (const type of INPUT_EVENTS) expect(removedCount(type), type).toBe(0);

    vi.advanceTimersByTime(MOUNT_WINDOW_MS + 4 * FRAME_MS);

    for (const type of INPUT_EVENTS) expect(removedCount(type), type).toBeGreaterThanOrEqual(1);
    vi.restoreAllMocks();
  });

  it('gives up when the element has not come after the mount window, and leaves nothing running', () => {
    scrollToIdWhenMounted('x');
    vi.advanceTimersByTime(MOUNT_WINDOW_MS + 4 * FRAME_MS);

    const late = mountTarget('x');
    vi.advanceTimersByTime(MOUNT_WINDOW_MS);

    expect(late.scrollIntoView).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('puts the element back under the header when late content moved it, once the scroll has ended', () => {
    const { state } = mountTarget('x', 0);
    scrollToIdWhenMounted('x');

    state.top = 180;
    resizeBody();
    vi.advanceTimersByTime(SCROLL_IDLE_MS + FRAME_MS);

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ top: 180, behavior: 'instant' });
  });

  it('puts the element back even when it is only a few pixels off, so the section ends where an anchor puts it', () => {
    const { state } = mountTarget('x', 0);
    scrollToIdWhenMounted('x');

    state.top = 7.2;
    resizeBody();
    vi.advanceTimersByTime(SCROLL_IDLE_MS + FRAME_MS);

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ top: 7.2, behavior: 'instant' });
  });

  it('leaves the page alone when the element is within one pixel of its place, so rounding never makes it jitter', () => {
    const { state } = mountTarget('x', 0);
    scrollToIdWhenMounted('x');

    state.top = 0.8;
    resizeBody();
    state.top = -0.8;
    resizeBody();
    vi.advanceTimersByTime(SCROLL_IDLE_MS + FRAME_MS);

    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('does not correct while the page is still scrolling, and corrects when the scroll ends', () => {
    const { state } = mountTarget('x', 0);
    scrollToIdWhenMounted('x');

    state.top = 300;
    resizeBody();
    vi.advanceTimersByTime(SCROLL_IDLE_MS - 20);
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(SCROLL_IDLE_MS - 20);
    expect(scrollBy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SCROLL_IDLE_MS * 2);

    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it('checks again when a scroll ends, so a smooth scroll that finished on a stale target is put right', () => {
    const { state } = mountTarget('x', 0);
    scrollToIdWhenMounted('x');
    vi.advanceTimersByTime(SCROLL_IDLE_MS + FRAME_MS);
    expect(scrollBy).not.toHaveBeenCalled();

    // The page grew above the section during the scroll, and the scroll ended 140px past where the section is now.
    state.top = -140;
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(SCROLL_IDLE_MS * 2 + FRAME_MS);

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ top: -140, behavior: 'instant' });
  });

  it.each(['wheel', 'touchstart', 'keydown', 'pointerdown'])('stops correcting at the first %s of the visitor', (type) => {
    const { state } = mountTarget('x', 0);
    scrollToIdWhenMounted('x');

    window.dispatchEvent(new Event(type));
    state.top = 400;
    resizeBody();
    vi.advanceTimersByTime(SCROLL_IDLE_MS * 3);

    expect(scrollBy).not.toHaveBeenCalled();
    expect(observers.at(-1)?.isDisconnected).toBe(true);
  });

  it('stops correcting after the realign window', () => {
    const { state } = mountTarget('x', 0);
    scrollToIdWhenMounted('x');
    vi.advanceTimersByTime(REALIGN_WINDOW_MS + FRAME_MS);

    state.top = 400;
    resizeBody();
    vi.advanceTimersByTime(SCROLL_IDLE_MS * 3);

    expect(scrollBy).not.toHaveBeenCalled();
    expect(observers.at(-1)?.isDisconnected).toBe(true);
  });

  it('cancels the wait and the correction with the function it returns', () => {
    const { state } = mountTarget('x', 0);
    const cancel = scrollToIdWhenMounted('x');
    const pending = scrollToIdWhenMounted('later');

    cancel();
    pending();
    state.top = 400;
    resizeBody();
    vi.advanceTimersByTime(SCROLL_IDLE_MS * 3);

    expect(scrollBy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps correcting after a correction, when more content arrives', () => {
    const { state } = mountTarget('x', 0);
    scrollToIdWhenMounted('x');

    state.top = 150;
    resizeBody();
    vi.advanceTimersByTime(SCROLL_IDLE_MS + FRAME_MS);
    state.top = -90;
    resizeBody();
    vi.advanceTimersByTime(SCROLL_IDLE_MS + FRAME_MS);

    expect(scrollBy).toHaveBeenNthCalledWith(1, { top: 150, behavior: 'instant' });
    expect(scrollBy).toHaveBeenNthCalledWith(2, { top: -90, behavior: 'instant' });
  });
});
