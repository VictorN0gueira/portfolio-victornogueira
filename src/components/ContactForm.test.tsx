import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serviceOptions } from '../data/services';
import {
  EMAIL_WEBHOOK,
  TEST_EMAIL,
  TEST_PHONE_EVOLUTION,
  TEST_PHONE_TYPED,
  WHATSAPP_WEBHOOK,
  pickService,
  readCall,
  rejectUnexpectedFetch,
  serviceTrigger,
  stubFetch,
  submitButton,
  type User,
  SWAP_WAIT,
  findWhatsappField,
  fieldError,
} from '../test/contactForm';
import { ContactForm } from './ContactForm';

// src/lib/constants.ts reads window.matchMedia while it is imported.
vi.hoisted(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

// Every test starts with a rejecting fetch, so a validation regression can never reach
// the real n8n webhooks. Tests that need a specific response call stubFetch again.
beforeEach(() => {
  rejectUnexpectedFetch();
});

afterEach(() => vi.unstubAllGlobals());

function renderForm() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ContactForm />
    </MemoryRouter>,
  );
  return user;
}

async function fillCommonFields(user: User) {
  await user.type(screen.getByLabelText('Nome'), ' Ana Lima ');
  await pickService(user);
  await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');
}

describe('ContactForm validation', () => {
  it('shows per-field errors with aria wiring and clears each one on typing', async () => {
    const user = renderForm();

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(fetch).not.toHaveBeenCalled();
    const nome = screen.getByLabelText('Nome');
    expect(nome).toHaveAttribute('aria-invalid', 'true');
    expect(nome).toHaveAttribute('aria-describedby', fieldError('nome')?.id);
    expect(fieldError('nome')).toHaveTextContent('Conta pra gente seu nome');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-describedby', fieldError('email')?.id);
    expect(fieldError('email')).toHaveTextContent('Esse e-mail parece incompleto');
    expect(screen.getByLabelText('Mensagem')).toHaveAttribute('aria-describedby', fieldError('mensagem')?.id);
    expect(fieldError('mensagem')).toHaveTextContent(
      'Escreve um pouco mais sobre o que você precisa',
    );

    await user.type(nome, 'Ana');
    expect(nome).toHaveAttribute('aria-invalid', 'false');
    expect(nome).not.toHaveAttribute('aria-describedby');
    expect(fieldError('nome')).toBeNull();
    expect(fieldError('email')).not.toBeNull();
  });

  it('links the servico error to the select trigger and unlinks it once a service is picked', async () => {
    const user = renderForm();

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    const trigger = serviceTrigger();
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('aria-describedby', fieldError('servico')?.id);
    const error = fieldError('servico');
    // The message is the description of the field, which the failed submit focuses: it is not an alert of its own.
    expect(error).not.toHaveAttribute('role');
    expect(error).toHaveTextContent('Escolhe um serviço');

    await pickService(user);

    expect(fieldError('servico')).toBeNull();
    const picked = screen.getByRole('button', { name: `Serviço de interesse ${serviceOptions[0]}` });
    expect(picked).not.toHaveAttribute('aria-invalid');
    expect(picked).not.toHaveAttribute('aria-describedby');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('drops stale errors when the contact method changes', async () => {
    const user = renderForm();

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());
    expect(fieldError('email')).not.toBeNull();
    expect(document.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThan(0);

    // The leaving field keeps its last frame while it fades out, so wait for it to go.
    await user.click(screen.getByRole('button', { name: /por whatsapp/i }));
    await waitFor(() => expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0), SWAP_WAIT);
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'false');
    expect(await findWhatsappField()).toHaveAttribute('aria-invalid', 'false');

    await user.click(screen.getByRole('button', { name: /por e-mail/i }));
    await waitFor(() => expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0), SWAP_WAIT);
    expect(await screen.findByLabelText('E-mail', undefined, SWAP_WAIT)).toHaveAttribute('aria-invalid', 'false');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('ContactForm submit wiring', () => {
  it('posts the exact email payload to the email webhook', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = renderForm();

    await fillCommonFields(user);
    await user.type(screen.getByLabelText('E-mail'), TEST_EMAIL);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const { url, init, body } = readCall(fetchMock);
    expect(url).toBe(EMAIL_WEBHOOK);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(Object.keys(body).sort()).toEqual(['email', 'mensagem', 'nome', 'servico', 'timestamp']);
    expect(body).toMatchObject({
      nome: 'Ana Lima',
      email: TEST_EMAIL,
      servico: serviceOptions[0],
      mensagem: 'Quero automatizar notas fiscais',
    });
    // The same words are also in the status region, so the visible title is read by its role.
    expect(await screen.findByRole('heading', { name: 'A gente recebeu sua mensagem' })).toBeInTheDocument();
  });

  it('posts the exact whatsapp payload to the whatsapp webhook', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = renderForm();

    await user.click(screen.getByRole('button', { name: /por whatsapp/i }));
    await fillCommonFields(user);
    await user.type(await findWhatsappField(), TEST_PHONE_TYPED);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const { url, body } = readCall(fetchMock);
    expect(url).toBe(WHATSAPP_WEBHOOK);
    expect(Object.keys(body).sort()).toEqual(['mensagem', 'nome', 'servico', 'timestamp', 'whatsapp']);
    expect(body.whatsapp).toBe(TEST_PHONE_EVOLUTION);
  });

  it('keeps DDD 55 when typing a Rio Grande do Sul number', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = renderForm();

    await user.click(screen.getByRole('button', { name: /por whatsapp/i }));
    await fillCommonFields(user);
    const whatsapp = await findWhatsappField();
    await user.type(whatsapp, '55900000000');
    expect(whatsapp).toHaveValue('+55 55 9 0000-0000');
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const { url, body } = readCall(fetchMock);
    expect(url).toBe(WHATSAPP_WEBHOOK);
    expect(body.whatsapp).toBe('555500000000');
  });

  it('shows the send error UI when the webhook answers not ok', async () => {
    stubFetch(() => Promise.resolve({ ok: false }));
    const user = renderForm();

    await fillCommonFields(user);
    await user.type(screen.getByLabelText('E-mail'), TEST_EMAIL);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(await screen.findByText(/não deu pra enviar/i)).toBeInTheDocument();
  });

  it('shows the send error UI with the WhatsApp fallback link when the network fails', async () => {
    const fetchMock = stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const user = renderForm();

    await fillCommonFields(user);
    await user.type(screen.getByLabelText('E-mail'), TEST_EMAIL);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(await screen.findByText(/não deu pra enviar/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fallback = screen.getByRole('link', { name: /fala direto pelo whatsapp/i });
    expect(fallback).toHaveAttribute('href', expect.stringContaining('https://wa.me/5581984451243'));
  });
});
