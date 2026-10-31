import { waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { renderWithProviders } from './render';

/**
 * Preloads the lazy chunks of a page, so the first render of a test finds them in the module cache.
 * Each lazy import has to transform and evaluate a whole module graph in jsdom, and on a busy machine (the full suite runs
 * many files at once) that took longer than any sane wait. A test awaits this in a beforeAll with a generous hook timeout
 * and then waits only for rendering, never for module loading.
 */

/** A hook timeout that outlasts the slowest module transform seen under a loaded full run. */
export const PRELOAD_TIMEOUT_MS = 60_000;
// Preloading the modules and warming the first render are two awaits in one hook, so the hook gets room for both.
export const WARM_UP_HOOK_TIMEOUT_MS = 2 * PRELOAD_TIMEOUT_MS;

const HOME_SECTIONS = [
  () => import('../sections/home/StatementStats'),
  () => import('../sections/home/UseCaseTabs'),
  () => import('../sections/home/ServicesCards'),
  () => import('../sections/home/MethodSteps'),
  () => import('../sections/home/RoiSimulator'),
  () => import('../sections/home/Testimonials'),
  () => import('../sections/home/FaqSection'),
  () => import('../sections/home/FinalCta'),
];

/** The position of the final call to action (the form) among the lazy sections of the home. */
export const FINAL_CTA_POSITION = HOME_SECTIONS.length - 1;

/**
 * Loads the lazy sections of the home. `skip` holds the positions of sections a test holds back on purpose (the quote
 * hand over test gates the last one, so it must not wait for it here).
 */
export async function preloadHomeSections(skip: readonly number[] = []): Promise<void> {
  await Promise.all(HOME_SECTIONS.filter((_, position) => !skip.includes(position)).map((load) => load()));
}

/**
 * Renders `ui` once, waits until `isReady` stops throwing, and unmounts it. The first render of a big tree in a file pays for
 * the first run of every component (and, in a coverage run, of the instrumented code): done here, in a hook with a generous
 * timeout, the first test of the file is as fast as the others and never fails on a loaded machine. Call it after
 * preloadHomeSections or preloadAboutSections, so only rendering is left to warm.
 * The tree is unmounted whether the page got ready or the wait ran out, so a failed warm up leaves nothing in the document.
 */
export async function warmUpRender(ui: ReactElement, isReady: () => void, timeoutMs = PRELOAD_TIMEOUT_MS): Promise<void> {
  const view = renderWithProviders(ui);
  try {
    await waitFor(isReady, { timeout: timeoutMs });
  } finally {
    view.unmount();
  }
}

/** Loads the lazy chunks of AboutPage (the skills). */
export async function preloadAboutSections(): Promise<void> {
  await import('../components/Skills');
}
