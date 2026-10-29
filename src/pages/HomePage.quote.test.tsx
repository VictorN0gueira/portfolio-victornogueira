import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import HomePage from './HomePage';

// One test in this file, on purpose: React.lazy keeps what it loaded inside the module, so the chunk of the form is
// held back (by the gate below) only for the first load of it, and Vitest gives every file its own modules.
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

vi.setConfig({ testTimeout: 30_000 });

const scrollIntoView = vi.fn();

beforeEach(() => {
  stubMatchMedia();
  rejectUnexpectedFetch();
  Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true, writable: true });
});

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

describe('HomePage quote hand over before the form has loaded', () => {
  it('scrolls to the form once its chunk arrives, and fills the message then', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    const quote = await screen.findByRole('button', { name: 'Quero automatizar esse processo' }, { timeout: 20_000 });
    expect(document.getElementById('contato')).toBeNull();

    await user.click(quote);
    expect(scrollIntoView).not.toHaveBeenCalled();

    gate.release();

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1), { timeout: 20_000 });
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('contato'));
    // The form puts the message in its field from an effect that runs after it mounts, and the scroll (a mutation
    // observer, so a microtask) can come first: the field is waited for, not read on the spot. A read on the spot
    // failed once in a loaded run, with the field still empty.
    await waitFor(() =>
      expect((screen.getByLabelText('Mensagem') as HTMLTextAreaElement).value).toMatch(/^Olá, VN One! Usei a calculadora do site/),
    );
  });
});
