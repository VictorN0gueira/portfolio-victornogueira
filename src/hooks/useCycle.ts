import { useCallback, useEffect, useState } from 'react';

interface UseCycleOptions {
  enabled?: boolean;
}

interface UseCycleResult {
  index: number;
  select: (index: number) => void;
  pause: () => void;
  resume: () => void;
  isAuto: boolean;
}

function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

function wrapIndex(index: number, length: number): number {
  if (length <= 0 || !Number.isFinite(index)) return 0;
  return ((Math.trunc(index) % length) + length) % length;
}

/**
 * Steps through `length` items every `intervalMs`.
 * It only auto-advances while enabled, not paused, in auto mode and with the tab visible.
 * `select` pins an index and ends auto mode for good; `pause` and `resume` are for hover and focus.
 */
export function useCycle(
  length: number,
  intervalMs: number,
  opts: UseCycleOptions = {},
): UseCycleResult {
  const { enabled = true } = opts;
  const [index, setIndex] = useState(0);
  const [isAuto, setIsAuto] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(isDocumentVisible);

  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(isDocumentVisible());
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const isRunning = enabled && isAuto && !isPaused && isVisible && length > 1;

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => setIndex((current) => (current + 1) % length), intervalMs);
    return () => clearInterval(timer);
  }, [isRunning, length, intervalMs]);

  const select = useCallback(
    (next: number) => {
      setIsAuto(false);
      setIndex(wrapIndex(next, length));
    },
    [length],
  );
  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  return { index: index < length ? index : 0, select, pause, resume, isAuto };
}
