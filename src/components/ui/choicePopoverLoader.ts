import { importWithRetry } from '../../lib/lazyWithRetry';

type PopoverModule = typeof import('./ChoicePillPopover');

// One request for the whole page: every pill shares the module once it has arrived.
let popoverModule: PopoverModule | undefined;
let pendingLoad: Promise<void> | undefined;

/**
 * Requests the chunk with the popover (Radix Popover and floating-ui, about 24 kB gzip that the first paint does not need).
 * Goes through importWithRetry (a browser keeps a failed module import for the life of the document, so the retry has to
 * be a fresh import after a pause, not the next click). It never reloads the page: the visitor keeps what they have, the
 * plain pill stays, and a later call can ask again.
 */
export function preloadChoicePopover(): Promise<void> {
  pendingLoad ??= importWithRetry(() => import('./ChoicePillPopover'), { canReload: false }).then(
    (module) => {
      popoverModule = module;
    },
    (error: unknown) => {
      pendingLoad = undefined;
      throw error;
    },
  );
  return pendingLoad;
}

/** The popover module once it has arrived, or undefined before that. */
export function loadedChoicePopover(): PopoverModule | undefined {
  return popoverModule;
}

/** Forgets the module, so a test can start again from the plain pill. Not used by the app. */
export function forgetChoicePopoverForTests(): void {
  popoverModule = undefined;
  pendingLoad = undefined;
}
