import { createContext, useContext } from 'react';

interface RevealGroupContextValue {
  isInView: boolean;
  /** Seconds an item waits before it animates: the group delay plus its position in the group times the stagger. */
  getDelay: (item: Element) => number;
}

export const RevealGroupContext = createContext<RevealGroupContextValue | null>(null);

/**
 * Whether the surrounding RevealGroup has come into view, or null outside a group. Something that animates with the group
 * (the count of a stat) reads this instead of observing its own element: one observer for the whole group.
 * Kept apart from Reveal.tsx so that file only exports components (Fast Refresh).
 */
export function useRevealGroupInView(): boolean | null {
  return useContext(RevealGroupContext)?.isInView ?? null;
}
