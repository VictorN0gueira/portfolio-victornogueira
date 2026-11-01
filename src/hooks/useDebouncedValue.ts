import { useEffect, useState } from 'react';

/**
 * The value, but only after it has stayed the same for `delayMs`: every change restarts the wait, so a run of
 * quick changes (a slider being dragged) settles on the last value alone. The first render returns the value
 * itself. A pending update is dropped when the component unmounts.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (Object.is(value, debounced)) return undefined;

    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, debounced, delayMs]);

  return debounced;
}
