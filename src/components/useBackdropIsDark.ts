import { useCallback, useEffect, useState, type RefObject } from 'react';
import { TAB_SLIDE_MS } from '../lib/floatingLayout';

/** Below this brightness (0 to 255) the page under the trigger counts as dark. */
const DARK_BRIGHTNESS = 140;
/** A background with less alpha than this lets the layer below show through, so it is skipped. */
const MIN_OPAQUE_ALPHA = 0.3;
/** The brightness is read at most this often while the page scrolls or resizes. */
const THROTTLE_MS = 150;
/** Air after the slide of a moved trigger before its place is read. */
const SETTLE_MARGIN_MS = 40;
const RGB_PATTERN = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/;

/** The perceived brightness (0 to 255) of the first opaque background at or above the element, or null when none. */
function getBrightness(element: Element): number | null {
  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    const match = window.getComputedStyle(current).backgroundColor.match(RGB_PATTERN);
    const alpha = match?.[4] !== undefined ? parseFloat(match[4]) : 1;
    if (match && alpha > MIN_OPAQUE_ALPHA) {
      return (parseInt(match[1], 10) * 299 + parseInt(match[2], 10) * 587 + parseInt(match[3], 10) * 114) / 1000;
    }
    current = current.parentElement;
  }
  return null;
}

/** Reads again, at most every THROTTLE_MS, while the page scrolls or the window resizes. */
function useThrottledViewCheck(check: () => void): void {
  useEffect(() => {
    check();
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const handleMove = () => {
      if (timeout) return;
      timeout = setTimeout(() => {
        check();
        timeout = null;
      }, THROTTLE_MS);
    };
    window.addEventListener('scroll', handleMove, { passive: true });
    window.addEventListener('resize', handleMove, { passive: true });
    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener('scroll', handleMove);
      window.removeEventListener('resize', handleMove);
    };
  }, [check]);
}

/** The page under the trigger changes when the trigger is moved: read again at once and when its slide has ended. */
function useMovedCheck(check: () => void, placeKey: unknown): void {
  useEffect(() => {
    check();
    const timeout = setTimeout(check, TAB_SLIDE_MS + SETTLE_MARGIN_MS);
    return () => clearTimeout(timeout);
  }, [check, placeKey]);
}

/**
 * A step aside (useTabDodge) draws the tab somewhere else with a translate, with no scroll, resize or move of its place:
 * the page under it is read again when that slide ends.
 */
function useSlideEndCheck(triggerRef: RefObject<HTMLElement | null>, check: () => void): void {
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const handleEnd = (event: Event) => {
      if ((event as TransitionEvent).propertyName === 'translate') check();
    };
    trigger.addEventListener('transitionend', handleEnd);
    return () => trigger.removeEventListener('transitionend', handleEnd);
  }, [check, triggerRef]);
}

/**
 * True when the page under the centre of the trigger is dark, so the trigger can take the opposite colors.
 * Read on mount, when `placeKey` changes (the trigger was moved), when a translate of the trigger ends (a step aside) and,
 * throttled, while the page scrolls or the window resizes.
 */
export function useBackdropIsDark(triggerRef: RefObject<HTMLElement | null>, placeKey?: unknown): boolean {
  const [isDark, setIsDark] = useState(false);

  const check = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const layers = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    for (const layer of layers) {
      if (layer === trigger || trigger.contains(layer)) continue;
      const brightness = getBrightness(layer);
      if (brightness !== null) {
        setIsDark(brightness < DARK_BRIGHTNESS);
        return;
      }
    }
  }, [triggerRef]);

  useThrottledViewCheck(check);
  useMovedCheck(check, placeKey);
  useSlideEndCheck(triggerRef, check);
  return isDark;
}
