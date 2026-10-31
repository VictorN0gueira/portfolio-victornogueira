import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { homeCopy } from '../data/homeCopy';
import { shellCopy } from '../data/shellCopy';
import { DEFAULT_HOURLY_RATE, buildQuoteMessage } from '../lib/roi';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { messageField, rejectUnexpectedFetch } from '../test/contactForm';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { removeScrollIntoViewStub, stubScrollIntoViewEverywhere } from '../test/scroll';
import HomePage from './HomePage';

const LAZY_WAIT = { timeout: 20_000 } as const;
const QUOTE_START = buildQuoteMessage({ hoursPerWeek: 1, teamMultiplier: 1, hourlyRate: DEFAULT_HOURLY_RATE }).split(':')[0];

vi.setConfig({ testTimeout: 30_000 });

expectNoConsoleOutput();

let scrollIntoView: ReturnType<typeof stubScrollIntoViewEverywhere>;

beforeEach(() => {
  stubMatchMedia();
  rejectUnexpectedFetch();
  scrollIntoView = stubScrollIntoViewEverywhere();
});

afterEach(() => {
  removeScrollIntoViewStub();
});


async function waitForForm() {
  return screen.findByRole('region', { name: homeCopy.finalCta.heading }, LAZY_WAIT);
}

describe('HomePage focus after the quote hand off', () => {
  it('moves focus to the message field once it holds the quote, and says so in a polite status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    await waitForForm();

    await user.click(await screen.findByRole('button', { name: homeCopy.roi.cta }, LAZY_WAIT));

    await waitFor(() => expect(messageField()).toHaveFocus());
    expect(messageField().value.startsWith(QUOTE_START)).toBe(true);
    expect((await screen.findByText(shellCopy.quoteFilled)).closest('[role="status"]')).not.toBeNull();
  });

  it('keeps the status region in the page from the start, empty, so the announcement is spoken when it fills', async () => {
    renderWithProviders(<HomePage />);
    await waitForForm();

    const regions = screen.getAllByRole('status').filter((region) => region.textContent === '');
    expect(regions.length).toBeGreaterThan(0);
    expect(screen.queryByText(shellCopy.quoteFilled)).toBeNull();
  });

  it('focuses the field again when the visitor asks for the same quote after editing it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    await waitForForm();
    const quoteButton = await screen.findByRole('button', { name: homeCopy.roi.cta }, LAZY_WAIT);
    await user.click(quoteButton);
    await waitFor(() => expect(messageField()).toHaveFocus());

    await user.clear(messageField());
    await user.click(quoteButton);

    await waitFor(() => expect(messageField().value.startsWith(QUOTE_START)).toBe(true));
    await waitFor(() => expect(messageField()).toHaveFocus());
  });

  it('works under StrictMode: the field gets focus once and the page stays quiet', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />, { strict: true });
    await waitForForm();

    await user.click(await screen.findByRole('button', { name: homeCopy.roi.cta }, LAZY_WAIT));

    await waitFor(() => expect(messageField()).toHaveFocus());
    expect(messageField().value.startsWith(QUOTE_START)).toBe(true);
  });
});

describe('HomePage focus after a hash link', () => {
  it('puts focus on the heading of the section the hash points at', async () => {
    renderWithProviders(<HomePage />, { route: '/#metodo' });

    const section = await screen.findByRole('region', { name: 'Do primeiro papo ao fluxo rodando' }, LAZY_WAIT);
    const heading = within(section).getByRole('heading', { level: 2 });

    await waitFor(() => expect(heading).toHaveFocus());
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('leaves focus alone on a visit without a hash', async () => {
    renderWithProviders(<HomePage />);
    await waitForForm();

    expect(document.body).toHaveFocus();
  });
});
