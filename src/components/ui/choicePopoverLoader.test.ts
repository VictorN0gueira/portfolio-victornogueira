import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RETRY_DELAY_MS } from '../../lib/lazyWithRetry';

/**
 * A browser keeps a module import that failed for the life of the document, so asking again at the next click would never
 * work: the loader goes through importWithRetry, which asks the network a second time itself. A reload is not on the
 * table for a pill (canReload false): the visitor keeps the page they have.
 */
describe('preloadChoicePopover', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock('./ChoicePillPopover');
  });

  function mockPopover(failures: number): { calls: () => number } {
    let calls = 0;
    vi.doMock('./ChoicePillPopover', () => {
      calls += 1;
      if (calls <= failures) throw new Error('Failed to fetch dynamically imported module');
      return { ChoicePillPopover: () => null };
    });
    return { calls: () => calls };
  }

  it('loads the popover when the first import fails and the second one works', async () => {
    const popover = mockPopover(1);
    const { preloadChoicePopover, loadedChoicePopover } = await import('./choicePopoverLoader');

    const loading = preloadChoicePopover();
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    await loading;

    expect(popover.calls()).toBe(2);
    expect(loadedChoicePopover()?.ChoicePillPopover).toBeTypeOf('function');
  });

  it('rejects without reloading the page when the chunk stays missing, and the next call tries again', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    mockPopover(2);
    const { preloadChoicePopover, loadedChoicePopover } = await import('./choicePopoverLoader');

    const failing = preloadChoicePopover();
    const rejected = expect(failing).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    await rejected;
    expect(reload).not.toHaveBeenCalled();
    expect(loadedChoicePopover()).toBeUndefined();

    const again = preloadChoicePopover();
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    await again;
    expect(loadedChoicePopover()).toBeDefined();
    vi.unstubAllGlobals();
  });
});
