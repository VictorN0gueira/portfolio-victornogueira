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

/** Rounds to hundredths so the inline style never carries float noise. */
function toPx(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Pulls an element toward the pointer by `strength` times the distance from its center.
 * It writes `style.transform` directly, so React never re-renders on pointer move.
 * Active only with a fine pointer and motion allowed; otherwise the handlers do nothing.
 */
export function useMagnetic<T extends HTMLElement>(
  strength: MagneticStrength = DEFAULT_STRENGTH,
): UseMagneticResult<T> {
  const ref = useRef<T | null>(null);
  const hasFinePointer = useFinePointer();
  const isMotionAllowed = useMotionAllowed();
  const isActive = hasFinePointer && isMotionAllowed;
  const { x: strengthX, y: strengthY } = strength;

  // Drop a pull that is still applied when the hook turns inactive or unmounts.
  useEffect(() => {
    if (!isActive) return;
    return () => {
      ref.current?.style.removeProperty('transform');
    };
  }, [isActive]);

  const onPointerMove = useCallback(
    (event: PointerEvent<T>) => {
      if (!isActive) return;

      const element = ref.current ?? event.currentTarget;
      const rect = element.getBoundingClientRect();
      const offsetX = event.clientX - (rect.left + rect.width / 2);
      const offsetY = event.clientY - (rect.top + rect.height / 2);
      element.style.transform = `translate(${toPx(offsetX * strengthX)}px, ${toPx(offsetY * strengthY)}px)`;
    },
    [isActive, strengthX, strengthY],
  );

  const onPointerLeave = useCallback(() => {
    if (!isActive) return;
    ref.current?.style.removeProperty('transform');
  }, [isActive]);

  return { ref, onPointerMove, onPointerLeave };
}
