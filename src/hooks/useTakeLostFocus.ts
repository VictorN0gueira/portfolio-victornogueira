import { useEffect, useRef, type RefObject } from 'react';
import { focusWithoutScrolling, guardFocus, releasePageGuard, watchVisitorInput } from '../lib/focusGuard';

/**
 * Gives the element focus when it mounts, but only if the focus is lost: on the body (a retry button that was just
 * replaced, a page that reloaded) or on an ancestor of the element (the main landmark that a route change focused,
 * which now holds an error panel). A field or a button the visitor is on keeps the focus. The element needs
 * tabindex -1. No scroll: the panel announces itself with role alert, and a section far down the page stays where it is.
 * Once it holds the focus it guards it for a moment against a menu that gives focus back to its button (a focus move
 * that no input of the visitor caused), as the other claimers of focus do.
 */
export function useTakeLostFocus<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    const active = document.activeElement;
    if (!element) return;
    const isLost = !active || active === document.body || active.contains(element);
    if (!isLost) return;
    // A render error right after a change of page: the guard of the main landmark would take this focus back.
    releasePageGuard();
    const visitorInput = watchVisitorInput();
    focusWithoutScrolling(element);
    const stopGuard = guardFocus(element, visitorInput.hasTakenOver);
    return () => {
      stopGuard();
      visitorInput.stop();
    };
  }, []);

  return ref;
}
