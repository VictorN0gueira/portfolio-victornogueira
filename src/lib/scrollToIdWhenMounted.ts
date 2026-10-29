/** How long the section may take to show up in the page (its lazy chunk can be slow). */
const MOUNT_WINDOW_MS = 5000;
/** How long after the first scroll the anchor keeps being put back while late content settles. */
const REALIGN_WINDOW_MS = 5000;
/** The anchor is moved back only when it is farther than this from where an anchor puts it. */
const DEVIATION_PX = 8;
/** A scroll has ended when none was seen for this long (the smooth scroll of the first move takes a while). */
const SCROLL_IDLE_MS = 120;
/** Any of these means the visitor is in charge of the scroll: the page stops moving it. */
const USER_INPUT_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

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

  const stop = () => {
    isStopped = true;
    observer.disconnect();
    window.clearTimeout(checkTimer);
    window.clearTimeout(endTimer);
    window.removeEventListener('scroll', markScroll);
    for (const type of USER_INPUT_EVENTS) window.removeEventListener(type, stop);
  };
  for (const type of USER_INPUT_EVENTS) window.addEventListener(type, stop, { passive: true });
  const endTimer = window.setTimeout(stop, REALIGN_WINDOW_MS);
  schedule();
  return stop;
}

/**
 * Scrolls to the element with this id (smoothly unless the visitor asked for reduced motion, which the CSS of the page
 * decides), even when it is not in the page yet (a lazy section is mounted by a chunk that may arrive late), and then
 * keeps it aligned while late content settles above it. The page has no scroll anchoring in every browser, so the
 * correction does not rely on it. It gives up looking for the element after MOUNT_WINDOW_MS and stops correcting at the
 * first wheel, touch, key or pointer input of the visitor, or after REALIGN_WINDOW_MS. Returns the function that
 * cancels all of it.
 */
export function scrollToIdWhenMounted(id: string): () => void {
  const startedAt = performance.now();
  let frame = 0;
  let stopAligning: (() => void) | undefined;

  const tryScroll = () => {
    frame = 0;
    const element = document.getElementById(id);
    if (element) {
      // No behavior given: the page decides. Its scroll-behavior (index.css) is smooth only when the visitor has not
      // asked for reduced motion, and a hard coded smooth here would glide anyway.
      element.scrollIntoView();
      stopAligning = keepAligned(element);
    } else if (performance.now() - startedAt < MOUNT_WINDOW_MS) {
      frame = requestAnimationFrame(tryScroll);
    }
  };
  tryScroll();

  return () => {
    cancelAnimationFrame(frame);
    stopAligning?.();
  };
}
