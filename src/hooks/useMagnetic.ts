import { useCallback, useEffect, useRef, type PointerEvent, type RefObject } from 'react';
import { useFinePointer } from './useFinePointer';
import { useMotionAllowed } from './useMotionAllowed';

interface MagneticStrength {
  x: number;
  y: number;
}

interface UseMagneticResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  onPointerMove: (event: PointerEvent<T>) => void;
  onPointerLeave: () => void;
}

/** The element the hook last wrote a transform to, with the pull it wrote. */
interface AppliedPull<T extends HTMLElement> extends MagneticStrength {
  element: T;
}

const DEFAULT_STRENGTH: MagneticStrength = { x: 0.18, y: 0.3 };

/** Rounds to hundredths so the inline style never carries float noise. */
function toPx(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Pulls an element toward the pointer by `strength` times the distance from its center.
 * It writes `style.transform` directly, so React never re-renders on pointer move.
 * Active only with a fine pointer and motion allowed; otherwise the handlers do nothing.
 *
 * The center is measured with getBoundingClientRect() of the element being moved, so the last
 * written pull is subtracted to measure the resting center and keep the pull from feeding back
 * into itself. That only holds while the element sits where the last write put it: with a CSS
 * transition on `transform`, the rect reports the in-flight position, so keep that transition
 * short or apply it only on pointer leave.
 *
 * `ref` is optional: without it the hook moves the element the handler is attached to
 * (`event.currentTarget`). Either way it remembers the element it last wrote, so leaving and
 * turning inactive clear exactly that element.
 */
export function useMagnetic<T extends HTMLElement>(
  strength: MagneticStrength = DEFAULT_STRENGTH,
): UseMagneticResult<T> {
  const ref = useRef<T | null>(null);
  const appliedRef = useRef<AppliedPull<T> | null>(null);
  const hasFinePointer = useFinePointer();
  const isMotionAllowed = useMotionAllowed();
  const isActive = hasFinePointer && isMotionAllowed;
  const { x: strengthX, y: strengthY } = strength;

  const clearPull = useCallback(() => {
    const applied = appliedRef.current;
    if (!applied) return;
    applied.element.style.transform = '';
    appliedRef.current = null;
  }, []);

  // Drop a pull that is still applied when the hook turns inactive (for example when the
  // visitor turns animations off while hovering).
  useEffect(() => {
    if (!isActive) return;
    return clearPull;
  }, [isActive, clearPull]);

  const onPointerMove = useCallback(
    (event: PointerEvent<T>) => {
      if (!isActive) return;

      const element = ref.current ?? event.currentTarget;
      // A pull left on another element must not leak into this measurement or stay on screen.
      if (appliedRef.current?.element !== element) clearPull();

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2 - (appliedRef.current?.x ?? 0);
      const centerY = rect.top + rect.height / 2 - (appliedRef.current?.y ?? 0);
      const pull = {
        element,
        x: toPx((event.clientX - centerX) * strengthX),
        y: toPx((event.clientY - centerY) * strengthY),
      };
      appliedRef.current = pull;
      element.style.transform = `translate(${pull.x}px, ${pull.y}px)`;
    },
    [isActive, strengthX, strengthY, clearPull],
  );

  const onPointerLeave = useCallback(() => {
    if (!isActive) return;
    clearPull();
  }, [isActive, clearPull]);

  return { ref, onPointerMove, onPointerLeave };
}
