import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { serviceOptions } from '../data/services';
import ContactForm from './ContactForm';

// src/lib/constants.ts reads window.matchMedia while it is imported.
vi.hoisted(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

const EMAIL_WEBHOOK = 'https://n8n.vnone.com.br/webhook/portfolio-vn-email';
const WHATSAPP_WEBHOOK = 'https://n8n.vnone.com.br/webhook/portfolio-vn-whatsapp';

type User = ReturnType<typeof userEvent.setup>;

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

function stubFetch(impl: () => Promise<unknown>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const submitButton = () => screen.getByRole('button', { name: /solicitar contato/i });
const serviceTrigger = () => screen.getByRole('button', { name: /selecione um serviço/i });

async function pickService(user: User) {
  await user.click(serviceTrigger());
  await user.click(screen.getByRole('button', { name: serviceOptions[0] }));
  // The list animates out; wait until only the trigger (now showing the value) is left.
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
}

async function fillCommonFields(user: User) {
  await user.type(screen.getByLabelText('Nome'), ' Ana Lima ');
  await pickService(user);
  await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');
}

function readCall(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return { url, init, body: JSON.parse(init.body as string) as Record<string, string> };
}

describe('ContactForm validation', () => {
  it('shows per-field errors with aria wiring and clears each one on typing', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = renderForm();

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(fetchMock).not.toHaveBeenCalled();
    const nome = screen.getByLabelText('Nome');
    expect(nome).toHaveAttribute('aria-invalid', 'true');
    expect(nome).toHaveAttribute('aria-describedby', 'contact-nome-error');
    expect(document.getElementById('contact-nome-error')).toHaveTextContent('Conta pra gente seu nome');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', 'contact-email-error');
    expect(document.getElementById('contact-email-error')).toHaveTextContent('Esse e-mail parece incompleto');
    expect(screen.getByLabelText('Mensagem')).toHaveAttribute('aria-describedby', 'contact-mensagem-error');
    expect(document.getElementById('contact-mensagem-error')).toHaveTextContent(
      'Escreve um pouco mais sobre o que você precisa',
    );

    await user.type(nome, 'Ana');
    expect(nome).toHaveAttribute('aria-invalid', 'false');
    expect(nome).not.toHaveAttribute('aria-describedby');
    expect(document.getElementById('contact-nome-error')).toBeNull();
    expect(document.getElementById('contact-email-error')).not.toBeNull();
  });

  it('links the servico error to the select trigger and unlinks it once a service is picked', async () => {
    const user = renderForm();

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    const trigger = serviceTrigger();
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('aria-describedby', 'contact-servico-error');
    const error = document.getElementById('contact-servico-error');
    expect(error).toHaveAttribute('role', 'alert');
    expect(error).toHaveTextContent('Escolhe um serviço');

    await pickService(user);

    expect(document.getElementById('contact-servico-error')).toBeNull();
    const picked = screen.getByRole('button', { name: serviceOptions[0] });
    expect(picked).not.toHaveAttribute('aria-invalid');
    expect(picked).not.toHaveAttribute('aria-describedby');
  });

  it('drops stale errors when the contact method changes', async () => {
    const user = renderForm();

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());
    expect(document.getElementById('contact-email-error')).not.toBeNull();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);

    // The leaving field keeps its last frame while it fades out, so wait for it to go.
    await user.click(screen.getByRole('button', { name: /por whatsapp/i }));
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0));
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'false');
    expect(await screen.findByLabelText('WhatsApp')).toHaveAttribute('aria-invalid', 'false');

    await user.click(screen.getByRole('button', { name: /por email/i }));
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0));
    expect(await screen.findByLabelText('Email')).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('ContactForm submit wiring', () => {
  it('posts the exact email payload to the email webhook', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = renderForm();

    await fillCommonFields(user);
    await user.type(screen.getByLabelText('Email'), 'ana@empresa.com.br');
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
      email: 'ana@empresa.com.br',
      servico: serviceOptions[0],
      mensagem: 'Quero automatizar notas fiscais',
    });
    expect(await screen.findByText(/mensagem enviada/i)).toBeInTheDocument();
  });

  it('posts the exact whatsapp payload to the whatsapp webhook', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = renderForm();

    await user.click(screen.getByRole('button', { name: /por whatsapp/i }));
    await fillCommonFields(user);
    await user.type(await screen.findByLabelText('WhatsApp'), '81984451243');
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const { url, body } = readCall(fetchMock);
    expect(url).toBe(WHATSAPP_WEBHOOK);
    expect(Object.keys(body).sort()).toEqual(['mensagem', 'nome', 'servico', 'timestamp', 'whatsapp']);
    expect(body.whatsapp).toBe('558184451243');
  });

  it('keeps DDD 55 when typing a Rio Grande do Sul number', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = renderForm();

    await user.click(screen.getByRole('button', { name: /por whatsapp/i }));
    await fillCommonFields(user);
    const whatsapp = await screen.findByLabelText('WhatsApp');
    await user.type(whatsapp, '55984451243');
    expect(whatsapp).toHaveValue('+55 55 9 8445-1243');
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const { url, body } = readCall(fetchMock);
    expect(url).toBe(WHATSAPP_WEBHOOK);
    expect(body.whatsapp).toBe('555584451243');
  });

  it('shows the send error UI when the webhook answers not ok', async () => {
    stubFetch(() => Promise.resolve({ ok: false }));
    const user = renderForm();

    await fillCommonFields(user);
    await user.type(screen.getByLabelText('Email'), 'ana@empresa.com.br');
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(await screen.findByText(/erro ao enviar/i)).toBeInTheDocument();
  });

  it('shows the send error UI with the WhatsApp fallback link when the network fails', async () => {
    const fetchMock = stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const user = renderForm();

    await fillCommonFields(user);
    await user.type(screen.getByLabelText('Email'), 'ana@empresa.com.br');
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(await screen.findByText(/erro ao enviar/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fallback = screen.getByRole('link', { name: /fale direto pelo whatsapp/i });
    expect(fallback).toHaveAttribute('href', expect.stringContaining('https://wa.me/5581984451243'));
  });
});
