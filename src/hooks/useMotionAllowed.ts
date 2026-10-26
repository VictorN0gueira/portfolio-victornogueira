import { useAccessibility } from '../contexts/AccessibilityContext';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * True when animation is welcome: neither the system asks for reduced motion
 * nor the site's own accessibility toggle turned animations off.
 * Reactive to both. Must be used inside AccessibilityProvider.
 */
export function useMotionAllowed(): boolean {
  const { state } = useAccessibility();
  const prefersReducedMotion = usePrefersReducedMotion();

  return !(prefersReducedMotion || state.noAnimations);
}
