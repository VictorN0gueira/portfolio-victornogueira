import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import {
  SWAP_WAIT,
  TEST_EMAIL,
  pickService,
  rejectUnexpectedFetch,
  serviceTrigger,
  stubFetch,
  submitButton,
  submitEmailForm,
} from '../test/contactForm';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';
import { contactFormCopy } from './contact/contactFormCopy';

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

/** The consent ticked and Enviar pressed on an empty form: every field is in error. */
async function submitEmpty(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox'));
  await user.click(submitButton());
}

describe('focus after a failed submit', () => {
  it('lands on the name field when the whole form is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await submitEmpty(user);

    expect(screen.getByLabelText('Nome')).toHaveFocus();
  });

  it('lands on the service trigger when only the service is missing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
    await user.type(screen.getByLabelText('E-mail'), TEST_EMAIL);
    await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');

    await submitEmpty(user);

    expect(serviceTrigger()).toHaveFocus();
  });

  it('follows the page order: the e-mail field comes before the message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
    await pickService(user);

    await submitEmpty(user);

    expect(screen.getByLabelText('E-mail')).toHaveFocus();
  });

  it('does not take the focus back while the visitor fixes the fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    await submitEmpty(user);

    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
    await user.click(screen.getByLabelText('Mensagem'));
    await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');

    expect(screen.getByLabelText('Mensagem')).toHaveFocus();
  });

  it('moves the focus again on the next failed submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    await submitEmpty(user);
    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');

    await user.click(submitButton());

    expect(serviceTrigger()).toHaveFocus();
  });
});

describe('focus on the thanks and after Enviar outra', () => {
  it('puts the focus on the thanks heading (an h3), without making it a tab stop', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await submitEmailForm(user);

    const heading = await screen.findByRole('heading', { level: 3, name: contactFormCopy.success.title });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('puts the focus on the name field of the new form after Enviar outra', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    await submitEmailForm(user);

    await user.click(await screen.findByRole('button', { name: contactFormCopy.success.again }));

    await waitFor(() => expect(screen.getByLabelText('Nome')).toHaveFocus());
  });
});

describe('focus while sending and after a failed send', () => {
  it('gives the focus to the panel while the request is out, so it does not fall to the page', async () => {
    stubFetch(() => new Promise(() => undefined));
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ContactForm />);

    await submitEmailForm(user);

    await screen.findByRole('button', { name: contactFormCopy.sending });
    const panel = container.querySelector('[aria-busy="true"]') as HTMLElement;
    expect(panel).toContainElement(screen.getByRole('form', { name: contactFormCopy.formLabel }));
    expect(panel).toHaveFocus();
  });

  it('puts the focus on the WhatsApp link of the alert, and back on Enviar after Fechar', async () => {
    stubFetch(() => Promise.resolve({ ok: false }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await submitEmailForm(user);

    const alert = await screen.findByRole('alert');
    const link = within(alert).getByRole('link', { name: contactFormCopy.error.link });
    await waitFor(() => expect(link).toHaveFocus());

    await user.click(within(alert).getByRole('button', { name: contactFormCopy.error.close }));

    await waitFor(() => expect(submitButton()).toHaveFocus());
  });
});

describe('the label of the service field', () => {
  it('opens the list when it is clicked, and keeps the name of the trigger as it was', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ContactForm />);
    const label = screen.getByText(contactFormCopy.labels.servico, { selector: 'label' });

    expect(label).toHaveAttribute('for', serviceTrigger().id);
    expect(container.querySelectorAll(`[id="${serviceTrigger().id}"]`)).toHaveLength(1);
    // The name is the label and then the text of the button, once: pointing the label at the button adds nothing to it.
    expect(serviceTrigger()).toHaveAccessibleName(`${contactFormCopy.labels.servico} ${contactFormCopy.placeholders.servico}`);

    await user.click(label);

    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(serviceTrigger()).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('Enviar and its hint', () => {
  it('says why it is off until the consent is given, and is described by that line', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    expect(submitButton()).toBeDisabled();
    expect(screen.getByText(contactFormCopy.consentHint)).toBeVisible();
    expect(submitButton()).toHaveAccessibleDescription(contactFormCopy.consentHint);

    await user.click(screen.getByRole('checkbox'));

    expect(submitButton()).toBeEnabled();
    expect(screen.queryByText(contactFormCopy.consentHint)).not.toBeInTheDocument();
    expect(submitButton()).not.toHaveAttribute('aria-describedby');
  });

  it('stays enabled after a failed send, so the visitor can try again at once', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: false }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    await submitEmailForm(user);
    await screen.findByRole('alert');

    expect(submitButton()).toBeEnabled();
    await user.click(submitButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

const REFERENCING_ATTRIBUTES = ['aria-controls', 'aria-describedby', 'aria-labelledby'] as const;

/** Every `attribute=id` pair of the page whose id is not on any element: a reference that points at nothing. */
function danglingReferences(root: ParentNode): string[] {
  const dangling: string[] = [];
  for (const attribute of REFERENCING_ATTRIBUTES) {
    for (const element of root.querySelectorAll(`[${attribute}]`)) {
      for (const id of (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean)) {
        if (!root.querySelector(`[id="${id}"]`)) dangling.push(`${attribute}=${id}`);
      }
    }
  }
  return dangling;
}

describe('form structure', () => {
  it('is a named form (a landmark) with one group name for the method', () => {
    renderWithProviders(<ContactForm />);

    expect(screen.getByRole('form', { name: contactFormCopy.formLabel })).toBeInTheDocument();
    expect(screen.getAllByRole('group')).toHaveLength(1);
  });

  it('builds every id from one prefix, so two forms on a page share none', () => {
    const { container } = renderWithProviders(
      <>
        <ContactForm />
        <ContactForm idPrefix="segundo" />
      </>,
    );

    // The new-tab line of the consent has a fixed id of its own, in ContactConsent.tsx (a protected file of the lead path).
    const ids = [...container.querySelectorAll('[id]')]
      .map((element) => element.id)
      .filter((id) => id !== 'contact-privacy-new-tab');
    expect(new Set(ids).size).toBe(ids.length);
    expect(container.querySelector('#contact-nome')).not.toBeNull();
    expect(container.querySelector('#segundo-nome')).not.toBeNull();
  });

  it('keeps the ids unique and every reference inside its own form once both forms show their errors', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <>
        <ContactForm />
        <ContactForm idPrefix="segundo" />
      </>,
    );
    const forms = [...container.querySelectorAll<HTMLFormElement>('form[name="contact"]')];
    expect(forms).toHaveLength(2);

    for (const form of forms) {
      await user.click(within(form).getByRole('checkbox'));
      await user.click(within(form).getByRole('button', { name: 'Enviar' }));
    }

    // Same exception as above: the fixed id of the new-tab line of the consent.
    const ids = [...container.querySelectorAll('[id]')]
      .map((element) => element.id)
      .filter((id) => id !== 'contact-privacy-new-tab');
    expect(new Set(ids).size).toBe(ids.length);
    for (const form of forms) {
      expect(form.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThan(0);
      expect(danglingReferences(form), 'a reference that leaves its form').toEqual([]);
      for (const field of form.querySelectorAll('[aria-invalid="true"]')) {
        expect(field.getAttribute('aria-describedby')).toMatch(/-error/);
      }
    }
  });

  it('has no aria-controls, aria-describedby or aria-labelledby that points at nothing, in every state', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ContactForm />);
    expect(danglingReferences(container), 'closed').toEqual([]);

    await user.click(serviceTrigger());
    await screen.findByRole('listbox');
    expect(danglingReferences(container), 'list open').toEqual([]);
    expect(serviceTrigger()).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(danglingReferences(container), 'list closed again').toEqual([]);

    await submitEmpty(user);
    expect(danglingReferences(container), 'errors shown').toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Por WhatsApp' }));
    await screen.findByLabelText('WhatsApp', undefined, SWAP_WAIT);
    await user.click(submitButton());
    expect(danglingReferences(container), 'WhatsApp method with errors').toEqual([]);
  });
});
