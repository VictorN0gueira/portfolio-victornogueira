import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { contactFormCopy } from '../components/contact/contactFormCopy';
import { homeCopy } from '../data/homeCopy';
import { DEFAULT_HOURLY_RATE, buildQuoteMessage } from '../lib/roi';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { FINAL_CTA_POSITION, WARM_UP_HOOK_TIMEOUT_MS, preloadHomeSections, warmUpRender } from '../test/lazyPages';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { removeScrollIntoViewStub, stubScrollIntoViewEverywhere } from '../test/scroll';
import HomePage from './HomePage';

// One test in this file, on purpose: React.lazy keeps what it loaded inside the module, so the chunk of the form is
// held back (by the gate below) only for the first load of it, and Vitest gives every file its own modules.
// The words the quote opens with, up to the numbers. They come from the builder, so a new wording is one change.
const QUOTE_START = buildQuoteMessage({ hoursPerWeek: 1, teamMultiplier: 1, hourlyRate: DEFAULT_HOURLY_RATE }).split(':')[0];

const gate = vi.hoisted(() => {
  let release: () => void = () => {};
  const opened = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { opened, release };
});

vi.mock('../sections/home/FinalCta', async () => {
  await gate.opened;
  return vi.importActual('../sections/home/FinalCta');
});

let scrollIntoView: ReturnType<typeof stubScrollIntoViewEverywhere>;

// Every lazy section but the form is loaded up front, so the button of the simulator is there at once and only the
// chunk of the form (held by the gate) arrives late, on purpose.
beforeAll(async () => {
  await preloadHomeSections([FINAL_CTA_POSITION]);
  await warmUpRender(<HomePage />, () => expect(Array.from(document.querySelectorAll('button')).some((button) => button.textContent === homeCopy.roi.cta)).toBe(true));
}, WARM_UP_HOOK_TIMEOUT_MS);

beforeEach(() => {
  stubMatchMedia();
  rejectUnexpectedFetch();
  scrollIntoView = stubScrollIntoViewEverywhere();
});

afterEach(removeScrollIntoViewStub);

describe('HomePage quote hand over before the form has loaded', () => {
  it('scrolls to the form once its chunk arrives, and fills the message then', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    const quote = await screen.findByRole('button', { name: homeCopy.roi.cta });
    expect(document.getElementById('contato')).toBeNull();

    await user.click(quote);
    expect(scrollIntoView).not.toHaveBeenCalled();

    gate.release();

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('contato'));
    // The form puts the message in its field from an effect that runs after it mounts, and the scroll (a mutation
    // observer, so a microtask) can come first: the field is waited for, not read on the spot. A read on the spot
    // failed once in a loaded run, with the field still empty.
    await waitFor(() =>
      expect((screen.getByLabelText(contactFormCopy.labels.mensagem) as HTMLTextAreaElement).value.startsWith(QUOTE_START)).toBe(true),
    );
  });
});
