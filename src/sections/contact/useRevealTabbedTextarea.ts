import { useEffect, type RefObject } from 'react';

/**
 * A focus that lands this soon after a Tab keydown is that Tab's. The key and the focus move it causes are one task, so
 * the window only has to cover a busy phone that was slow to run the handler; a visit to the field by a click or by the
 * page (the quote of the simulator) comes long after the last Tab, or with none.
 */
const TAB_FOCUS_WINDOW_MS = 1000;

/** A scroll padding the browser reports in px; an empty or unparsed value (no stylesheet, jsdom) counts as none. */
function readPaddingPx(value: string): number {
  return Number.parseFloat(value) || 0;
}

/** The height of the window the scroll padding of index.css leaves visible: between the header and the floating buttons. */
function visibleBandHeight(): number {
  const { scrollPaddingTop, scrollPaddingBottom } = getComputedStyle(document.documentElement);
  return window.innerHeight - readPaddingPx(scrollPaddingTop) - readPaddingPx(scrollPaddingBottom);
}

/**
 * Where the box goes in the band: moved only as far as needed (nearest) when it fits, and with its top at the top of the
 * band (start) when it is taller, as on a phone on its side where the band is about 208px. Nearest would then keep whatever
 * part is already in view, and the caret line (the first one of an empty box) could stay outside it.
 */
function alignmentOf(field: HTMLElement): ScrollLogicalPosition {
  return field.getBoundingClientRect().height > visibleBandHeight() ? 'start' : 'nearest';
}

/**
 * Brings the whole textarea inside the scroll padding when Tab (or Shift+Tab) focuses it.
 *
 * Chromium scrolls a focused text control only far enough to show its caret, and the caret of an empty textarea sits on
 * its first line: with the field already "visible" there, its lower half stayed under the floating WhatsApp button and the
 * accessibility tab, which is what WCAG 2.4.11 (focus not obscured) rules out. scrollIntoView with block nearest moves the
 * page only when part of the box is outside the scroll padding of index.css, and not at all when it is already clear. A box
 * taller than the band that padding leaves visible cannot fit in it: it goes to the top of the band (see alignmentOf).
 *
 * It runs a frame later because the browser reveals the caret after the focus event, and that reveal would otherwise
 * replace this scroll. Only a keyboard focus scrolls. A click is the visitor's own aim, and a press anywhere clears the
 * last Tab, so a click that lands within the window after a Tab does not move the page under the pointer. The focus the page
 * gives the field on purpose is placed by the alignment of scrollToIdWhenMounted, which a second scroll would fight.
 *
 * The key and focus listeners sit on the wrapper the ref points to (keydown and focusin bubble from the field), added in an
 * effect because a wrapper that is not a control takes no key or focus handlers in its JSX. The press is heard on the
 * document, in the capture phase, because the page can also focus the field from a press outside the wrapper (the quote of
 * the simulator) and that press must clear the Tab as well.
 */
export function useRevealTabbedTextarea(wrapperRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    let lastTabAt = Number.NEGATIVE_INFINITY;
    let frame = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') lastTabAt = event.timeStamp;
    };
    const handlePointerDown = () => {
      lastTabAt = Number.NEGATIVE_INFINITY;
    };
    const handleFocusIn = (event: FocusEvent) => {
      const field = event.target;
      if (!(field instanceof HTMLTextAreaElement)) return;
      if (event.timeStamp - lastTabAt > TAB_FOCUS_WINDOW_MS) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.activeElement === field) field.scrollIntoView?.({ block: alignmentOf(field), inline: 'nearest' });
      });
    };

    wrapper.addEventListener('keydown', handleKeyDown);
    wrapper.addEventListener('focusin', handleFocusIn);
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      cancelAnimationFrame(frame);
      wrapper.removeEventListener('keydown', handleKeyDown);
      wrapper.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [wrapperRef]);
}
