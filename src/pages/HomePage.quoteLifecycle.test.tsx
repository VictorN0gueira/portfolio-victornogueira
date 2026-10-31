import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { homeCopy } from '../data/homeCopy';
import { shellCopy } from '../data/shellCopy';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { messageField, rejectUnexpectedFetch } from '../test/contactForm';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { removeScrollIntoViewStub, stubScrollIntoViewEverywhere } from '../test/scroll';
import { HomePage } from './HomePage';

// Every call of scrollToIdWhenMounted is recorded with the function that cancels it, so the tests can see when the
// page cancels a scroll and focus loop that it started (the loop itself is the real one).
const loops = vi.hoisted(() => ({ cancels: [] as Array<ReturnType<typeof vi.fn>> }));

vi.mock('../lib/scrollToIdWhenMounted', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/scrollToIdWhenMounted')>();
  return {
    ...actual,
    scrollToIdWhenMounted: (...args: Parameters<typeof actual.scrollToIdWhenMounted>) => {
      const cancel = vi.fn(actual.scrollToIdWhenMounted(...args));
      loops.cancels.push(cancel);
      return cancel;
    },
  };
});

const LAZY_WAIT = { timeout: 20_000 } as const;

vi.setConfig({ testTimeout: 30_000 });

expectNoConsoleOutput();

beforeEach(() => {
  stubMatchMedia();
  rejectUnexpectedFetch();
  loops.cancels.length = 0;
  stubScrollIntoViewEverywhere();
});

afterEach(() => {
  removeScrollIntoViewStub();
});


async function renderWithQuoteButton() {
  const user = userEvent.setup();
  const view = renderWithProviders(<HomePage />);
  await screen.findByRole('region', { name: homeCopy.finalCta.heading }, LAZY_WAIT);
  const quoteButton = await screen.findByRole('button', { name: homeCopy.roi.cta }, LAZY_WAIT);
  return { user, view, quoteButton };
}

describe('HomePage quote hand off, one request after another', () => {
  it('clears the status as soon as a second quote is asked for, so the same words are spoken again', async () => {
    const { user, quoteButton } = await renderWithQuoteButton();
    await user.click(quoteButton);
    const region = (await screen.findByText(shellCopy.quoteFilled)).closest('[role="status"]') as HTMLElement;

    const seen: string[] = [];
    const observer = new MutationObserver(() => seen.push(region.textContent ?? ''));
    observer.observe(region, { childList: true, characterData: true, subtree: true });

    await user.clear(messageField());
    await user.click(quoteButton);
    await waitFor(() => expect(region).toHaveTextContent(shellCopy.quoteFilled));
    observer.disconnect();

    // A live region speaks a change, and the same text put back over itself is no change: it empties first.
    expect(seen).toContain('');
    expect(seen.at(-1)).toBe(shellCopy.quoteFilled);
  });

  it('cancels the scroll and focus loop of the first quote when a second one is asked for', async () => {
    const { user, quoteButton } = await renderWithQuoteButton();
    await user.click(quoteButton);
    expect(loops.cancels).toHaveLength(1);
    expect(loops.cancels[0]).not.toHaveBeenCalled();

    await user.click(quoteButton);

    expect(loops.cancels).toHaveLength(2);
    expect(loops.cancels[0]).toHaveBeenCalledTimes(1);
    expect(loops.cancels[1]).not.toHaveBeenCalled();
  });

  it('cancels the loop that is still running when the visitor leaves the page', async () => {
    const { user, view, quoteButton } = await renderWithQuoteButton();
    await user.click(quoteButton);
    expect(loops.cancels).toHaveLength(1);

    view.unmount();

    expect(loops.cancels[0]).toHaveBeenCalledTimes(1);
  });
});
