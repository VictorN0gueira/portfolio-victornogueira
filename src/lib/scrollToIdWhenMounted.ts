import { USER_INPUT_EVENTS, focusWithoutScrolling, guardFocus, watchVisitorInput } from './focusGuard';

/**
 * How long the section may take to show up in the page (its lazy chunk can be slow: a bad mobile network took six
 * seconds in a test). The wait ends sooner when the visitor scrolls, types or taps, or the caller cancels it.
 */
export const MOUNT_WINDOW_MS = 15_000;
/** How long the lookup of the focus target may take once the section is in the page (a field filled in by an effect). */
const FOCUS_LOOKUP_WINDOW_MS = 5000;
/** How long after the first scroll the anchor keeps being put back while late content settles. */
const REALIGN_WINDOW_MS = 5000;
/** The anchor is moved back only when it is farther than this from where an anchor puts it (below that is rounding). */
const DEVIATION_PX = 1;
/** A scroll has ended when none was seen for this long (the smooth scroll of the first move takes a while). */
const SCROLL_IDLE_MS = 120;

/** The space the header takes at the top: where an anchor puts the section (scroll-padding-top of index.css). */
function readScrollPadding(): number {
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  return Number.isFinite(padding) ? padding : 0;
}

/** Keeps the element where an anchor puts it while the content around it settles, until the visitor takes over. */
function keepAligned(element: HTMLElement): () => void {
  let lastScrollAt = performance.now();
  let checkTimer = 0;
  let isStopped = false;

  const check = () => {
    checkTimer = 0;
    if (isStopped) return;
    if (performance.now() - lastScrollAt < SCROLL_IDLE_MS) {
      checkTimer = window.setTimeout(check, SCROLL_IDLE_MS);
      return;
    }
    const deviation = element.getBoundingClientRect().top - readScrollPadding();
    // Instant: the page has scroll-behavior smooth, and a correction that glides would be seen as a second scroll.
    if (Math.abs(deviation) > DEVIATION_PX) window.scrollBy({ top: deviation, behavior: 'instant' });
  };
  const schedule = () => {
    if (!isStopped && !checkTimer) checkTimer = window.setTimeout(check, SCROLL_IDLE_MS);
  };
  // Every scroll is followed by a check once it ends: a smooth scroll that finishes on a target the layout has since
  // moved from leaves the section off its place with no change of size to say so.
  const markScroll = () => {
    lastScrollAt = performance.now();
    schedule();
  };

  // Content that grows or shrinks above the element changes the height of the body.
  const observer = new ResizeObserver(schedule);
  observer.observe(document.body);
  window.addEventListener('scroll', markScroll, { passive: true });

  let endTimer = 0;
  const stop = () => {
    isStopped = true;
    observer.disconnect();
    window.clearTimeout(checkTimer);
    window.clearTimeout(endTimer);
    window.removeEventListener('scroll', markScroll);
    for (const type of USER_INPUT_EVENTS) window.removeEventListener(type, stop);
  };
  for (const type of USER_INPUT_EVENTS) window.addEventListener(type, stop, { passive: true });
  endTimer = window.setTimeout(stop, REALIGN_WINDOW_MS);
  schedule();
  return stop;
}

/** What to focus after the first scroll: the heading of the section, or whatever a lookup finds in it (null: not yet). */
export type FocusTarget = 'heading' | ((section: HTMLElement) => HTMLElement | null);

export interface ScrollToIdOptions {
  /** Moves focus after the first scroll, so the next Tab continues from where the visitor was sent. Off by default. */
  focus?: FocusTarget;
  /** Called once focus has landed, with the element that got it (to announce it, for example). Not called when it never moved. */
  onFocused?: (target: HTMLElement) => void;
}

/** The heading a section is labelled by, or the section itself when it has none. Never null: there is always a target. */
function findHeading(section: HTMLElement): HTMLElement {
  const labelId = section.getAttribute('aria-labelledby')?.split(' ')[0];
  return (labelId ? document.getElementById(labelId) : null) ?? section;
}

/**
 * Focuses into the section after the first scroll, unless the visitor gave input since the call: a person who is
 * already scrolling or typing keeps their place. A lookup that returns null is asked again on every frame for
 * FOCUS_LOOKUP_WINDOW_MS (a form field that a lazy chunk and an effect fill in late). Returns the function that cancels it.
 */
function focusWhenReady(
  section: HTMLElement,
  target: FocusTarget,
  hasVisitorTakenOver: () => boolean,
  onFocused?: (focused: HTMLElement) => void,
): () => void {
  const lookup = target === 'heading' ? findHeading : target;
  const startedAt = performance.now();
  let frame = 0;

  let stopGuard: (() => void) | undefined;

  const attempt = () => {
    frame = 0;
    if (hasVisitorTakenOver()) return;
    const found = lookup(section);
    if (found) {
      focusWithoutScrolling(found);
      stopGuard = guardFocus(found, hasVisitorTakenOver);
      onFocused?.(found);
    } else if (performance.now() - startedAt < FOCUS_LOOKUP_WINDOW_MS) frame = requestAnimationFrame(attempt);
  };
  attempt();

  return () => {
    cancelAnimationFrame(frame);
    stopGuard?.();
  };
}

/**
 * Scrolls to the element with this id (smoothly unless the visitor asked for reduced motion, which the CSS of the page
 * decides), even when it is not in the page yet (a lazy section is mounted by a chunk that may arrive late), and then
 * keeps it aligned while late content settles above it. The page has no scroll anchoring in every browser, so the
 * correction does not rely on it. It gives up looking for the element after MOUNT_WINDOW_MS, and stops looking or
 * correcting at the first wheel, touch, key or pointer input of the visitor, or after REALIGN_WINDOW_MS. With `focus`
 * it also moves focus into the section after the first scroll (preventScroll, so the alignment is left alone), unless
 * the visitor gave input meanwhile. Returns the function that cancels all of it.
 */
export function scrollToIdWhenMounted(id: string, options: ScrollToIdOptions = {}): () => void {
  const startedAt = performance.now();
  const visitorInput = watchVisitorInput();
  let frame = 0;
  let stopAligning: (() => void) | undefined;
  let cancelFocus: (() => void) | undefined;

  const tryScroll = () => {
    frame = 0;
    // The visitor scrolling, typing or tapping while the section is still on its way is in charge of the page.
    if (visitorInput.hasTakenOver()) {
      visitorInput.stop();
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      // No behavior given: the page decides. Its scroll-behavior (index.css) is smooth only when the visitor has not
      // asked for reduced motion, and a hard coded smooth here would glide anyway.
      element.scrollIntoView();
      stopAligning = keepAligned(element);
      if (options.focus) {
        cancelFocus = focusWhenReady(element, options.focus, visitorInput.hasTakenOver, options.onFocused);
      } else visitorInput.stop();
      return;
    }
    if (performance.now() - startedAt < MOUNT_WINDOW_MS) frame = requestAnimationFrame(tryScroll);
    else visitorInput.stop();
  };
  tryScroll();

  return () => {
    cancelAnimationFrame(frame);
    stopAligning?.();
    cancelFocus?.();
    visitorInput.stop();
  };
}
