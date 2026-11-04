import type { TabPosition } from './floatingLayout';

/** Its own key: never the one of the accessibility preferences (A11Y_STORAGE_KEY), which other scripts read. */
export const TAB_POSITION_STORAGE_KEY = 'vn-a11y-tab-position';

/** The stored text as a position, or null for anything that is not a side and a ratio from 0 to 1. */
function parseTabPosition(raw: string | null): TabPosition | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { side, ratio } = value as Record<string, unknown>;
  if (side !== 'left' && side !== 'right') return null;
  if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < 0 || ratio > 1) return null;
  return { side, ratio };
}

/** The place the visitor chose in this browser, or null (the default place) when none is stored or it is not valid. */
export function readTabPosition(): TabPosition | null {
  try {
    return parseTabPosition(window.localStorage.getItem(TAB_POSITION_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Remembers the place in this browser only. A storage that is blocked or full just means it is not remembered. */
export function writeTabPosition(position: TabPosition): void {
  try {
    window.localStorage.setItem(TAB_POSITION_STORAGE_KEY, JSON.stringify({ side: position.side, ratio: position.ratio }));
  } catch {
    // The tab still moves for this visit.
  }
}

export function clearTabPosition(): void {
  try {
    window.localStorage.removeItem(TAB_POSITION_STORAGE_KEY);
  } catch {
    // Nothing to forget when the storage cannot be reached.
  }
}
