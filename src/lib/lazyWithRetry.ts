import { lazy, createElement, type ComponentType, type LazyExoticComponent } from 'react';

/** The wait between the first import that failed and the second one. */
export const RETRY_DELAY_MS = 1000;
/** sessionStorage key of the time of the last reload this module did for a missing chunk. */
export const RELOAD_STORAGE_KEY = 'vn-chunk-reload';
/** A second reload for a missing chunk is allowed only after this long, so a chunk that stays missing cannot loop. */
export const RELOAD_GUARD_MS = 30_000;

const CHUNK_ERROR_PATTERN = /dynamically imported module|importing a module script failed|loading chunk .* failed|loading css chunk/i;

type ModuleLoader<T> = () => Promise<T>;

/** A chunk that cannot be fetched: a flaky network, or a deploy that deleted the old hashed file under an open tab. */
function isChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'ChunkLoadError' || CHUNK_ERROR_PATTERN.test(error.message);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * True when the page was reloaded for a missing chunk less than RELOAD_GUARD_MS ago. Storage that throws (all cookies
 * blocked, some in-app browsers) counts as yes: with no way to read the guard a chunk that stays missing would reload
 * the page about once a second for as long as the tab stays open.
 */
function wasReloadedRecently(): boolean {
  try {
    const savedAt = Number(window.sessionStorage.getItem(RELOAD_STORAGE_KEY));
    return Number.isFinite(savedAt) && savedAt > 0 && Date.now() - savedAt < RELOAD_GUARD_MS;
  } catch {
    return true;
  }
}

/** Stores the time of this reload. False when the storage refused it: the guard would not hold, so no reload then. */
function rememberReload(): boolean {
  try {
    window.sessionStorage.setItem(RELOAD_STORAGE_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/**
 * Starts the one reload that fetches the new index.html (and with it the new chunk names). Returns false when it
 * already reloaded a moment ago, or when it cannot remember that it did, so the caller shows the error instead of
 * reloading forever.
 */
function reloadOnce(): boolean {
  if (wasReloadedRecently() || !rememberReload()) return false;
  window.location.reload();
  return true;
}

export interface RetryOptions {
  /**
   * Whether a chunk that stays missing after the retry may reload the page. On by default. Off for what the page does
   * not need to read (a widget): its failure is handed to a boundary and the visitor keeps the page they have.
   */
  canReload?: boolean;
}

/**
 * Runs the import, tries it once more after RETRY_DELAY_MS when it fails, and when that fails too with a chunk
 * error reloads the page once (the promise then never settles: the page is going away). Any other error, or a
 * second chunk error inside the guard window, rejects.
 */
export async function importWithRetry<T>(load: ModuleLoader<T>, { canReload = true }: RetryOptions = {}): Promise<T> {
  try {
    return await load();
  } catch {
    await wait(RETRY_DELAY_MS);
  }
  try {
    return await load();
  } catch (error) {
    if (canReload && isChunkError(error) && reloadOnce()) return new Promise<T>(() => undefined);
    throw error;
  }
}

/**
 * The failures this module has seen, each with what recovers the lazy component that raised it. Keyed by the error
 * object: a boundary that caught it holds that same object, so it finds its own failure and no other (a chunk that
 * failed elsewhere on the page, a widget for one, says nothing about the section this boundary guards).
 */
const failures = new WeakMap<object, () => void>();

export type Recovery = 'reloading' | 'ready';

/**
 * What an error boundary calls with the error it caught, before it renders its children again.
 * A browser keeps a failed module import for the life of the document (the next import() of the same file fails at
 * once, without a request), so a chunk that could not be fetched only comes back with a reload: for such an error this
 * reloads the page and returns 'reloading'. For a lazy that failed any other way it swaps in a fresh lazy component,
 * so the next render imports again, and returns 'ready'. An error this module did not raise (a render error of a
 * section) changes nothing and returns 'ready'. (React.lazy keeps a rejection forever, and the swap is not done when
 * the import fails, because the Suspense retry that follows the rejection would start a new import in a loop and never
 * reach the boundary.)
 */
export function recoverFailedImports(error: unknown): Recovery {
  if (typeof error !== 'object' || error === null) return 'ready';
  const reset = failures.get(error);
  if (!reset) return 'ready';
  if (isChunkError(error)) {
    window.location.reload();
    return 'reloading';
  }
  failures.delete(error);
  reset();
  return 'ready';
}

/** React.lazy that survives a chunk that fails to load: one retry, one reload, then the error reaches a boundary. */
export function lazyWithRetry<P extends object>(
  load: ModuleLoader<{ default: ComponentType<P> }>,
  options?: RetryOptions,
): ComponentType<P> {
  const create = (): LazyExoticComponent<ComponentType<P>> =>
    lazy(() =>
      importWithRetry(load, options).catch((error: unknown) => {
        if (typeof error === 'object' && error !== null) {
          failures.set(error, () => {
            current = create();
          });
        }
        throw error;
      }),
    );
  let current = create();

  function Retryable(props: P) {
    return createElement(current, props);
  }
  return Retryable;
}
