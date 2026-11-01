import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { homeCopy } from '../data/homeCopy';
import { shellCopy } from '../data/shellCopy';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { HomePage } from './HomePage';

// One test in this file, on purpose: React.lazy keeps what it loaded inside the module, and Vitest gives every file
// its own modules. The Testimonials chunk fails to load here (the gate), and every other section loads.
const gate = vi.hoisted(() => ({ isBroken: true }));

vi.mock('../sections/home/Testimonials', async () => {
  if (gate.isBroken) throw new Error('chunk is gone');
  return vi.importActual('../sections/home/Testimonials');
});

vi.setConfig({ testTimeout: 40_000 });

const LAZY_WAIT = { timeout: 25_000 } as const;

beforeEach(() => {
  stubMatchMedia();
  rejectUnexpectedFetch();
  // React reports the caught error to the console: expected here.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HomePage with one section that fails to load', () => {
  it('keeps the other sections, shows a retry in the place of the broken one, and recovers on retry', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const retry = await screen.findByRole('button', { name: shellCopy.sectionError.retry }, LAZY_WAIT);
    expect(within(retry.closest('[role="alert"]') as HTMLElement).getByText(shellCopy.sectionError.heading)).toBeInTheDocument();
    // The sections around it are there.
    expect(await screen.findByRole('heading', { name: homeCopy.faq.heading }, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: homeCopy.roi.heading })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: homeCopy.testimonials.heading })).toBeNull();

    gate.isBroken = false;
    await user.click(retry);

    expect(await screen.findByRole('heading', { name: homeCopy.testimonials.heading }, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: shellCopy.sectionError.retry })).toBeNull();
  });
});
