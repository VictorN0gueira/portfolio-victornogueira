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

const DEFAULT_STRENGTH: MagneticStrength = { x: 0.18, y: 0.3 };
const NO_PULL: MagneticStrength = { x: 0, y: 0 };

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
 */
export function useMagnetic<T extends HTMLElement>(
  strength: MagneticStrength = DEFAULT_STRENGTH,
): UseMagneticResult<T> {
  const ref = useRef<T | null>(null);
  const pullRef = useRef<MagneticStrength>(NO_PULL);
  const hasFinePointer = useFinePointer();
  const isMotionAllowed = useMotionAllowed();
  const isActive = hasFinePointer && isMotionAllowed;
  const { x: strengthX, y: strengthY } = strength;

  const clearPull = useCallback(() => {
    pullRef.current = NO_PULL;
    ref.current?.style.removeProperty('transform');
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
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2 - pullRef.current.x;
      const centerY = rect.top + rect.height / 2 - pullRef.current.y;
      const pull = {
        x: toPx((event.clientX - centerX) * strengthX),
        y: toPx((event.clientY - centerY) * strengthY),
      };
      pullRef.current = pull;
      element.style.transform = `translate(${pull.x}px, ${pull.y}px)`;
    },
    [isActive, strengthX, strengthY],
  );

  const onPointerLeave = useCallback(() => {
    if (!isActive) return;
    clearPull();
  }, [isActive, clearPull]);

  return { ref, onPointerMove, onPointerLeave };
}
