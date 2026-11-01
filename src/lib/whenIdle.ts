/**
 * Runs the callback when the browser is idle, and no later than `timeoutMs` from now. Browsers without
 * requestIdleCallback (Safari) get a plain timer of the same length. Returns the function that cancels it.
 */
export function whenIdle(callback: () => void, timeoutMs: number): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(callback, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = window.setTimeout(callback, timeoutMs);
  return () => window.clearTimeout(timer);
}
