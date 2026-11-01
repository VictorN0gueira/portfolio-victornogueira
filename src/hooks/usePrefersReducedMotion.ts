import { useMediaQuery } from './useMediaQuery';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Live `prefers-reduced-motion: reduce` setting. Unlike motion's useReducedMotion, which reads
 * the query once per mount, this re-renders when the visitor flips the OS setting mid session.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}
