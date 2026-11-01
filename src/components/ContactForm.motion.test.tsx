import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { rejectUnexpectedFetch, stubFetch, submitEmailForm } from '../test/contactForm';
import { renderWithProviders } from '../test/render';
import { ContactForm } from './ContactForm';
import { contactFormCopy } from './contact/contactFormCopy';

// Motion warns in development that reduced motion is on, which is exactly what these tests ask for.
expectNoConsoleOutput(['error']);

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  rejectUnexpectedFetch();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => warn.mockRestore());

// With reduced motion on, the movement of the thanks and of the error alert (a scale and a rise) must be gone: only the
// fade may stay. The site turns this on for the system setting and for its own accessibility option (MotionProvider).
const renderReduced = () =>
  renderWithProviders(
    <MotionConfig reducedMotion="always">
      <ContactForm />
    </MotionConfig>,
  );

// Reduced motion turns a transform animation into a jump to the end value: it is over within a frame or two, where a real
// animation (a few hundred milliseconds) would still be in the middle of its path.
const JUMP = { timeout: 120, interval: 10 } as const;
const NO_TRANSFORM = /^(|none)$/;
const transformOf = (element: HTMLElement) => element.style.transform;

describe('ContactForm motion with reduced motion', () => {
  it('shows the thanks with no transform at all', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderReduced();

    await submitEmailForm(user);

    const heading = await screen.findByRole('heading', { level: 3, name: contactFormCopy.success.title });
    const panel = heading.closest('[style]') as HTMLElement;
    // The heading is found while the panel still holds its first style: the jump comes a frame or two later.
    await waitFor(() => expect(transformOf(panel)).toMatch(NO_TRANSFORM), JUMP);
    expect(heading.closest('[style*="scale"]')).toBeNull();
  });

  it('shows the failed send alert with no transform at all', async () => {
    stubFetch(() => Promise.resolve({ ok: false }));
    const user = userEvent.setup();
    renderReduced();

    await submitEmailForm(user);

    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(transformOf(alert)).toMatch(NO_TRANSFORM), JUMP);
  });
});
