import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import {
  TEST_PHONE_TYPED,
  findWhatsappField,
  pickService,
  rejectUnexpectedFetch,
  stubFetch,
  submitButton,
  submitEmailForm,
} from '../test/contactForm';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';

const SERVICE_TRIGGER_NAME = /selecione um serviço/i;
const STATUS_TEXT_EMAIL = 'Recebemos sua mensagem. Obrigado! A gente responde pelo e-mail em breve.';
const STATUS_TEXT_WHATSAPP = 'Recebemos sua mensagem. Obrigado! A gente responde pelo WhatsApp em breve.';

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

const togglePill = (name: string) => screen.getByRole('button', { name });

describe('ContactForm success announcement', () => {
  it('keeps one polite status region mounted, empty until the send works', () => {
    renderWithProviders(<ContactForm />);
    const status = screen.getByRole('status');

    expect(status).toBeEmptyDOMElement();
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveClass('sr-only');
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('announces the title and the text through the same region that was there before the send', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const before = screen.getByRole('status');

    await submitEmailForm(user);

    const heading = await screen.findByRole('heading', { level: 4, name: 'Recebemos sua mensagem' });
    expect(screen.getByRole('status')).toBe(before);
    expect(before).toHaveTextContent(STATUS_TEXT_EMAIL);
    // The region is not inside the success markup: that mounts together with its text, which many readers skip.
    expect(heading.closest('[role="status"]')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('says WhatsApp when the visitor chose WhatsApp', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(togglePill('Por WhatsApp'));
    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
    await pickService(user);
    await user.type(await findWhatsappField(), TEST_PHONE_TYPED);
    await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await screen.findByRole('heading', { level: 4 });
    expect(screen.getByRole('status')).toHaveTextContent(STATUS_TEXT_WHATSAPP);
  });

  it('empties the region again with Enviar outra', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    await submitEmailForm(user);

    await user.click(await screen.findByRole('button', { name: 'Enviar outra' }));

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('stays silent on an error, which keeps its own alert', async () => {
    stubFetch(() => Promise.resolve({ ok: false }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await submitEmailForm(user);

    await screen.findByRole('alert');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('keeps the four validation alerts as they were', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(screen.getAllByRole('alert')).toHaveLength(4);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});

describe('ContactForm service label', () => {
  it('names the trigger by its label and its own text', () => {
    renderWithProviders(<ContactForm />);
    const trigger = screen.getByRole('button', { name: SERVICE_TRIGGER_NAME });

    expect(trigger).toHaveAccessibleName('Serviço de interesse Selecione um serviço');
    expect(trigger).toHaveAccessibleName(/Serviço de interesse/);
  });

  it('keeps the label in the name once a service is chosen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await pickService(user);

    expect(screen.getByRole('button', { name: /Serviço de interesse/ })).toHaveAccessibleName(
      'Serviço de interesse Automação de processos',
    );
  });

  it('ties the trigger to the label by id, and the label text is the visible one', () => {
    renderWithProviders(<ContactForm />);
    const trigger = screen.getByRole('button', { name: SERVICE_TRIGGER_NAME });
    const label = document.getElementById('contact-servico-label') as HTMLElement;

    expect(label).toHaveTextContent('Serviço de interesse');
    expect(trigger.id).not.toBe('');
    expect(trigger).toHaveAttribute('aria-labelledby', `contact-servico-label ${trigger.id}`);
  });
});
