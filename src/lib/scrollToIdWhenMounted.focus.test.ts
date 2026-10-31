import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scrollToIdWhenMounted } from './scrollToIdWhenMounted';

const FRAME_MS = 16;
const FOCUS_LOOKUP_WINDOW_MS = 5000;
const FOCUS_GUARD_MS = 1000;

class QuietResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

interface Mounted {
  section: HTMLElement;
  heading: HTMLElement;
  scrollIntoView: ReturnType<typeof vi.fn>;
}

/** A section like the ones of the home: a <section aria-labelledby> whose heading has no tabindex of its own. */
function mountSection(id: string): Mounted {
  const section = document.createElement('section');
  section.id = id;
  section.setAttribute('aria-labelledby', `${id}-heading`);
  const heading = document.createElement('h2');
  heading.id = `${id}-heading`;
  heading.textContent = 'titulo';
  section.appendChild(heading);
  const scrollIntoView = vi.fn();
  section.scrollIntoView = scrollIntoView;
  section.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  document.body.appendChild(section);
  return { section, heading, scrollIntoView };
}

function useControlledTime(): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    vi.stubGlobal('ResizeObserver', QuietResizeObserver);
  });

  afterEach(() => {
    window.dispatchEvent(new Event('wheel'));
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });
}

describe('scrollToIdWhenMounted with focus', () => {
  useControlledTime();

  it('does not move focus when no focus option is given, as before', () => {
    const { heading } = mountSection('x');
    const focus = vi.spyOn(heading, 'focus');

    scrollToIdWhenMounted('x');
    vi.advanceTimersByTime(FRAME_MS * 3);

    expect(focus).not.toHaveBeenCalled();
  });

  it('focuses the heading the section is labelled by, without scrolling again', () => {
    const { heading } = mountSection('x');
    const focus = vi.spyOn(heading, 'focus');

    scrollToIdWhenMounted('x', { focus: 'heading' });

    expect(focus).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(heading).toHaveFocus();
  });

  it('gives the heading tabindex -1 so it can take focus, and takes it away when focus leaves', () => {
    const { heading } = mountSection('x');
    scrollToIdWhenMounted('x', { focus: 'heading' });
    expect(heading).toHaveAttribute('tabindex', '-1');

    heading.blur();

    expect(heading).not.toHaveAttribute('tabindex');
  });

  it('scrolls first and focuses after, so the focus never starts the scroll', () => {
    const { heading, scrollIntoView } = mountSection('x');
    const order: string[] = [];
    scrollIntoView.mockImplementation(() => order.push('scroll'));
    vi.spyOn(heading, 'focus').mockImplementation(() => void order.push('focus'));

    scrollToIdWhenMounted('x', { focus: 'heading' });

    expect(order).toEqual(['scroll', 'focus']);
  });

  it('focuses the section itself when it has no labelling heading', () => {
    const section = document.createElement('section');
    section.id = 'plain';
    section.scrollIntoView = vi.fn();
    section.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    document.body.appendChild(section);

    scrollToIdWhenMounted('plain', { focus: 'heading' });

    expect(section).toHaveFocus();
    expect(section).toHaveAttribute('tabindex', '-1');
  });

  it('leaves the tabindex alone on a target that is already focusable', () => {
    const { section, heading } = mountSection('x');
    heading.setAttribute('tabindex', '0');

    scrollToIdWhenMounted('x', { focus: 'heading' });

    expect(section).not.toHaveFocus();
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute('tabindex', '0');
  });

  it('waits for a section whose chunk arrives late, and focuses it then', () => {
    scrollToIdWhenMounted('x', { focus: 'heading' });
    vi.advanceTimersByTime(2000);

    const { heading } = mountSection('x');
    vi.advanceTimersByTime(FRAME_MS * 2);

    expect(heading).toHaveFocus();
  });

  it.each(['wheel', 'touchstart', 'keydown', 'pointerdown'])(
    'neither scrolls nor takes focus for a visitor who gave %s input while the section was still loading',
    (type) => {
      scrollToIdWhenMounted('x', { focus: 'heading' });
      window.dispatchEvent(new Event(type));

      const { heading, scrollIntoView } = mountSection('x');
      vi.advanceTimersByTime(FRAME_MS * 2);

      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(heading).not.toHaveFocus();
    },
  );

  it('does not focus after the function that was returned cancelled it', () => {
    const cancel = scrollToIdWhenMounted('x', { focus: 'heading' });
    cancel();

    const { heading } = mountSection('x');
    vi.advanceTimersByTime(FRAME_MS * 3);

    expect(heading).not.toHaveFocus();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves no input listener behind once it is cancelled', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');

    const cancel = scrollToIdWhenMounted('x', { focus: 'heading' });
    cancel();

    const added = add.mock.calls.map(([type]) => type).sort();
    const removed = remove.mock.calls.map(([type]) => type).sort();
    expect(added.length).toBeGreaterThan(0);
    expect(removed).toEqual(added);
  });

  it('is safe to run twice, as StrictMode does: start, cancel, start again ends focused and quiet', () => {
    const { heading } = mountSection('x');

    const first = scrollToIdWhenMounted('x', { focus: 'heading' });
    first();
    scrollToIdWhenMounted('x', { focus: 'heading' });

    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute('tabindex', '-1');
  });
});

describe('scrollToIdWhenMounted when something else takes the focus away', () => {
  useControlledTime();

  /** The button that opened the mobile menu: Radix gives it the focus back when the menu closes. */
  function mountMenuButton(): HTMLButtonElement {
    const button = document.createElement('button');
    document.body.appendChild(button);
    return button;
  }

  it('takes focus back when it moves by itself right after, as a closing menu returns it to its button', () => {
    const { heading } = mountSection('x');
    const menuButton = mountMenuButton();

    scrollToIdWhenMounted('x', { focus: 'heading' });
    menuButton.focus();

    expect(heading).toHaveFocus();
  });

  it('leaves focus where the visitor puts it', () => {
    const { heading } = mountSection('x');
    const other = mountMenuButton();

    scrollToIdWhenMounted('x', { focus: 'heading' });
    window.dispatchEvent(new Event('keydown'));
    other.focus();

    expect(heading).not.toHaveFocus();
    expect(other).toHaveFocus();
  });

  it('stops guarding after a short while, so a later focus change is never fought', () => {
    const { heading } = mountSection('x');
    const other = mountMenuButton();

    scrollToIdWhenMounted('x', { focus: 'heading' });
    vi.advanceTimersByTime(FOCUS_GUARD_MS + 1);
    other.focus();

    expect(heading).not.toHaveFocus();
    expect(other).toHaveFocus();
  });

  it('removes its focus listener when it is cancelled', () => {
    const { heading } = mountSection('x');
    const other = mountMenuButton();

    const cancel = scrollToIdWhenMounted('x', { focus: 'heading' });
    cancel();
    other.focus();

    expect(heading).not.toHaveFocus();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('scrollToIdWhenMounted with a focus target that is looked up', () => {
  useControlledTime();

  it('keeps asking for the target on every frame until it is there, then focuses it without scrolling', () => {
    const { section } = mountSection('x');
    const field = document.createElement('textarea');
    section.appendChild(field);
    const focus = vi.spyOn(field, 'focus');
    const lookup = vi
      .fn<(root: HTMLElement) => HTMLElement | null>()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValue(field);

    scrollToIdWhenMounted('x', { focus: lookup });
    expect(focus).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FRAME_MS * 3);

    expect(lookup).toHaveBeenCalledWith(section);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('tells the caller once focus has landed, with the element that got it, and not before', () => {
    const { section } = mountSection('x');
    const field = document.createElement('textarea');
    const onFocused = vi.fn();
    const lookup = vi.fn<(root: HTMLElement) => HTMLElement | null>().mockReturnValueOnce(null).mockReturnValue(field);
    section.appendChild(field);

    scrollToIdWhenMounted('x', { focus: lookup, onFocused });
    expect(onFocused).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FRAME_MS * 2);

    expect(onFocused).toHaveBeenCalledTimes(1);
    expect(onFocused).toHaveBeenCalledWith(field);
    expect(field).toHaveFocus();
  });

  it('does not tell the caller when the visitor took over and focus never moved', () => {
    mountSection('x');
    const onFocused = vi.fn();
    scrollToIdWhenMounted('y', { focus: 'heading', onFocused });
    window.dispatchEvent(new Event('keydown'));

    mountSection('y');
    vi.advanceTimersByTime(FRAME_MS * 2);

    expect(onFocused).not.toHaveBeenCalled();
  });

  it('gives up after the mount window when the target never comes, and stops asking', () => {
    mountSection('x');
    const lookup = vi.fn().mockReturnValue(null);

    scrollToIdWhenMounted('x', { focus: lookup });
    vi.advanceTimersByTime(FOCUS_LOOKUP_WINDOW_MS + FRAME_MS * 4);
    const calls = lookup.mock.calls.length;
    vi.advanceTimersByTime(FOCUS_LOOKUP_WINDOW_MS);

    expect(lookup.mock.calls.length).toBe(calls);
  });

  it('stops looking when the visitor takes over', () => {
    mountSection('x');
    const lookup = vi.fn().mockReturnValue(null);

    scrollToIdWhenMounted('x', { focus: lookup });
    vi.advanceTimersByTime(FRAME_MS * 2);
    window.dispatchEvent(new Event('keydown'));
    const calls = lookup.mock.calls.length;
    vi.advanceTimersByTime(FRAME_MS * 5);

    expect(lookup.mock.calls.length).toBe(calls);
  });
});
