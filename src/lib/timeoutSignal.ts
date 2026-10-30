/**
 * A signal that aborts after `ms` milliseconds, for a request that must not hang forever.
 * AbortSignal.timeout does it natively; a browser without it gets an AbortController and a timer.
 */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}
