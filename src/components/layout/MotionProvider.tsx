import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import type { ReactNode } from 'react';
import { useAccessibility } from '../../contexts/useAccessibility';

interface MotionProviderProps {
  children: ReactNode;
}

/**
 * Tells every motion component below it how to treat reduced motion: it follows the system preference,
 * unless the visitor turned animations off with the site's own accessibility toggle, which always wins.
 * It also loads the animation features once (domAnimation: animate, exit, in view, hover, tap, focus) for the `m`
 * components. `strict` makes the full `motion` component throw, so nobody brings the whole library back by accident.
 * Layout animation and drag are not part of domAnimation: a subtree that needs them wraps itself in a nested
 * LazyMotion with `domMax` (nothing does today; src/test/motionUsage.test.ts guards it).
 * Needs AccessibilityProvider above it.
 */
export function MotionProvider({ children }: MotionProviderProps) {
  const { state } = useAccessibility();

  return (
    <MotionConfig reducedMotion={state.noAnimations ? 'always' : 'user'}>
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
