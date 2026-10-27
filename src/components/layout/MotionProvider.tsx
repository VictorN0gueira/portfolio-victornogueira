import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface MotionProviderProps {
  children: ReactNode;
}

/**
 * Tells every motion component below it how to treat reduced motion: it follows the system preference,
 * unless the visitor turned animations off with the site's own accessibility toggle, which always wins.
 * Needs AccessibilityProvider above it.
 */
export function MotionProvider({ children }: MotionProviderProps) {
  const { state } = useAccessibility();

  return <MotionConfig reducedMotion={state.noAnimations ? 'always' : 'user'}>{children}</MotionConfig>;
}

export default MotionProvider;
