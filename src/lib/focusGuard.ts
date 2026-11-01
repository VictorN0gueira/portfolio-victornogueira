/** How long after the focus landed it is taken back from a move that no input of the visitor caused. */
const FOCUS_GUARD_MS = 1000;
/** Any of these means the visitor is in charge of the page: what moves the scroll or the focus by itself stops. */
export const USER_INPUT_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/**
 * Focuses the element without scrolling (the scroll is the alignment loop's job, and a focus that scrolls would fight
 * it). A target that cannot take focus (a heading) gets tabindex -1 for as long as it holds it.
 */
export function focusWithoutScrolling(target: HTMLElement): void {
  if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  }
  target.focus({ preventScroll: true });
}

/**
 * For FOCUS_GUARD_MS after the focus landed, takes it back when it moves with no input of the visitor: a Radix dialog
 * that closes (the mobile menu, after a link of it) gives the focus back to the button that opened it, and that would
 * undo this one. A focus move that follows a key, a touch or a click is the visitor's and is left alone.
 */
export function guardFocus(target: HTMLElement, hasVisitorTakenOver: () => boolean): () => void {
  const handleFocusIn = (event: FocusEvent) => {
    if (event.target !== target && !hasVisitorTakenOver()) focusWithoutScrolling(target);
  };
  document.addEventListener('focusin', handleFocusIn);
  const timer = window.setTimeout(stop, FOCUS_GUARD_MS);

  function stop() {
    window.clearTimeout(timer);
    document.removeEventListener('focusin', handleFocusIn);
  }
  return stop;
}

/** Watches for the first input of the visitor from now on. `stop` removes the listeners. */
export function watchVisitorInput(): { hasTakenOver: () => boolean; stop: () => void } {
  let hasTakenOver = false;
  const markTakeover = () => {
    hasTakenOver = true;
  };
  for (const type of USER_INPUT_EVENTS) window.addEventListener(type, markTakeover, { passive: true });

  return {
    hasTakenOver: () => hasTakenOver,
    stop: () => {
      for (const type of USER_INPUT_EVENTS) window.removeEventListener(type, markTakeover);
    },
  };
}

/** Cancels the guard that focusAndGuard last installed for the page, if it is still running. */
let releasePageGuardNow: (() => void) | undefined;

/**
 * Puts focus on the target and keeps it there for FOCUS_GUARD_MS against a focus move no input of the visitor caused
 * (a Radix dialog that closes returns focus to its trigger when its animation ends, which can be after the page changed
 * on a slow phone). Input is watched from now on: the tap that started the change is not counted. Returns the function
 * that cancels it.
 */
export function focusAndGuard(target: HTMLElement): () => void {
  const visitorInput = watchVisitorInput();
  focusWithoutScrolling(target);
  const stopGuard = guardFocus(target, visitorInput.hasTakenOver);
  const timer = window.setTimeout(cancel, FOCUS_GUARD_MS);

  function cancel() {
    window.clearTimeout(timer);
    stopGuard();
    visitorInput.stop();
    if (releasePageGuardNow === cancel) releasePageGuardNow = undefined;
  }
  releasePageGuardNow = cancel;
  return cancel;
}

/**
 * Lets go of the guard that holds focus on the page landmark after a change of page. Called by whatever claims focus on
 * purpose a moment later (the heading a hash link points to, an error panel): without it the guard of the landmark would
 * take that focus back as a focus move no input of the visitor caused. The claimer then guards its own target.
 */
export function releasePageGuard(): void {
  releasePageGuardNow?.();
}
