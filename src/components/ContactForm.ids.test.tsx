import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { danglingReferences, describedByElements, duplicateIds } from '../test/ariaWiring';
import { SWAP_WAIT, rejectUnexpectedFetch, stubFetch, submitEmailForm } from '../test/contactForm';
import { renderWithProviders } from '../test/render';
import { ContactForm } from './ContactForm';
import { contactIdPrefix, contactIds } from './contact/contactIds';
import { contactFormCopy } from './contact/contactFormCopy';

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

// The new-tab line of the consent has a fixed id of its own, in ContactConsent.tsx (a protected file of the lead path).
const FIXED_CONSENT_ID = 'contact-privacy-new-tab';

const formsOf = (container: HTMLElement) => [...container.querySelectorAll<HTMLFormElement>('form[name="contact"]')];

/** The label of every control of the form must point at a control that sits inside that same form. */
function labelPairs(form: HTMLFormElement) {
  return [...form.querySelectorAll('label[for]')].map((label) => ({
    label,
    control: form.querySelector(`[id="${label.getAttribute('for')}"]`),
  }));
}

describe('contactIdPrefix', () => {
  it.each([':r1:', '«r1»', '_r_1_', '«r0»'])('turns the React id %s into a prefix that is safe in a selector and an aria token', (reactId) => {
    const prefix = contactIdPrefix(reactId);

    expect(prefix).toMatch(/^contact-[\w-]+$/);
    expect(contactIds(prefix).field('nome')).toMatch(/^[A-Za-z][\w-]*$/);
  });

  it('keeps two different React ids different', () => {
    expect(contactIdPrefix(':r1:')).not.toBe(contactIdPrefix(':r10:'));
    expect(contactIdPrefix('«r1»')).not.toBe(contactIdPrefix('«r2»'));
  });
});

describe('the ids of a contact form come from React useId', () => {
  it('are safe for a CSS selector and an aria token: a letter first, then letters, digits, "-" and "_"', () => {
    const { container } = renderWithProviders(<ContactForm />);

    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
    expect(ids.length).toBeGreaterThan(5);
    for (const id of ids) expect(id, id).toMatch(/^[A-Za-z][\w-]*$/);
  });

  it('give two forms on the same page no id in common, in the first render', () => {
    const { container } = renderWithProviders(
      <>
        <ContactForm />
        <ContactForm />
      </>,
    );

    expect(formsOf(container)).toHaveLength(2);
    expect(duplicateIds(container, [FIXED_CONSENT_ID])).toEqual([]);
  });
});

describe('every label and description of the form reaches its own control', () => {
  it('holds for two forms side by side: valid, with errors, on WhatsApp and after a send', async () => {
    const user = userEvent.setup();
    stubFetch(() => Promise.resolve({ ok: true }));
    const { container } = renderWithProviders(
      <>
        <ContactForm />
        <ContactForm />
      </>,
    );
    const [first, second] = formsOf(container);

    // Valid and untouched.
    for (const form of [first, second]) {
      const pairs = labelPairs(form);
      expect(pairs.length).toBeGreaterThanOrEqual(4);
      for (const { label, control } of pairs) expect(control, label.textContent ?? '').not.toBeNull();
    }
    expect(danglingReferences(container), 'untouched').toEqual([]);
    expect(duplicateIds(container, [FIXED_CONSENT_ID]), 'untouched').toEqual([]);

    // Errors in the first form only: the description of every invalid field is an element of that form.
    await user.click(within(first).getByRole('checkbox'));
    await user.click(within(first).getByRole('button', { name: contactFormCopy.submit }));
    const invalid = [...first.querySelectorAll('[aria-invalid="true"]')];
    expect(invalid.length).toBe(4);
    for (const field of invalid) {
      const targets = describedByElements(field);
      expect(targets.length).toBeGreaterThan(0);
      for (const target of targets) {
        expect(target, field.id).not.toBeNull();
        expect(first.contains(target), field.id).toBe(true);
      }
    }
    expect(second.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
    expect(danglingReferences(container), 'errors').toEqual([]);
    expect(duplicateIds(container, [FIXED_CONSENT_ID]), 'errors').toEqual([]);

    // WhatsApp mode, with its hint and its error.
    // The method toggle sits above the <form>, so it is looked up in the page: the first one belongs to the first form.
    await user.click(screen.getAllByRole('button', { name: 'Por WhatsApp' })[0]);
    const whatsapp = await within(first).findByLabelText('WhatsApp', undefined, SWAP_WAIT);
    await user.click(within(first).getByRole('button', { name: contactFormCopy.submit }));
    const described = describedByElements(whatsapp);
    expect(described.length).toBeGreaterThanOrEqual(2);
    for (const target of described) expect(first.contains(target)).toBe(true);
    expect(danglingReferences(container), 'WhatsApp').toEqual([]);
    expect(duplicateIds(container, [FIXED_CONSENT_ID]), 'WhatsApp').toEqual([]);

    // The second form was never touched by any of this.
    expect(second.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });

  it('keeps the wiring whole after a send and after Enviar outra', async () => {
    const user = userEvent.setup();
    stubFetch(() => Promise.resolve({ ok: true }));
    const { container } = renderWithProviders(<ContactForm />);

    await submitEmailForm(user);
    await screen.findByRole('heading', { level: 3, name: contactFormCopy.success.title });
    expect(danglingReferences(container), 'thanks').toEqual([]);

    await user.click(screen.getByRole('button', { name: contactFormCopy.success.again }));
    const name = await screen.findByLabelText('Nome');
    await waitFor(() => expect(name).toHaveFocus());
    expect(danglingReferences(container), 'new form').toEqual([]);
    expect(labelPairs(formsOf(container)[0]).every(({ control }) => control !== null)).toBe(true);
  });
});
