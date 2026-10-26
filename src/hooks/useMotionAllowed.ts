import { useReducedMotion } from 'motion/react';
import { useAccessibility } from '../contexts/AccessibilityContext';

/**
 * True when animation is welcome: neither the system asks for reduced motion
 * nor the site's own accessibility toggle turned animations off.
 * Must be used inside AccessibilityProvider.
 */
export function useMotionAllowed(): boolean {
  const { state } = useAccessibility();
  const prefersReducedMotion = useReducedMotion() ?? false;

  return !(prefersReducedMotion || state.noAnimations);
}
