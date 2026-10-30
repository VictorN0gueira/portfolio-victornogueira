import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMAIL_WEBHOOK, readCall, rejectUnexpectedFetch, stubFetch } from '../../test/contactForm';
import { SUBMIT_EVENT, fillValidEmailForm, submitAndSettle, type ContactHookResult } from '../../test/contactHook';
import { COOLDOWN_MESSAGE } from './botGuard';
import { useContactForm } from './useContactForm';

// The test setup turns the time trap and the cooldown off so the other form tests can submit at once. These tests
// need the real numbers, so they take the real module back.
vi.mock('./botGuard', async (importOriginal) => importOriginal());

const FIRST_INTERACTION_WAIT_MS = 2_000;
const COOLDOWN_MS = 30_000;

beforeEach(() => {
  rejectUnexpectedFetch();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-29T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

/** The form as a visitor fills it: a first gesture, then the fields, then `waitMs` before the submit. */
function visitorWhoWaits(waitMs: number) {
  const hook = renderHook(() => useContactForm());
  act(() => hook.result.current.markInteraction());
  fillValidEmailForm(hook.result);
  advance(waitMs);
  return hook;
}

describe('the honeypot', () => {
  it('sends nothing and looks like a success when the hidden field is filled', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(60_000);
    act(() => result.current.setHoneypot('https://spam.example'));

    await submitAndSettle(result);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('success');
  });

  it.each(['email', 'whatsapp'] as const)('thanks the visitor for the %s channel they chose when the hidden field is filled', async (method) => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(60_000);
    act(() => result.current.selectMethod(method));
    act(() => result.current.setField('whatsapp', '+55 81 9 8445-1243'));
    act(() => result.current.setHoneypot('https://spam.example'));

    await submitAndSettle(result);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('success');
    expect(result.current.sentMethod).toBe(method);
  });

  it('is not a payload key: an empty honeypot sends the four fields and the timestamp as always', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(FIRST_INTERACTION_WAIT_MS);

    await submitAndSettle(result);

    expect(Object.keys(readCall(fetchMock).body)).toEqual(['nome', 'email', 'servico', 'mensagem', 'timestamp']);
  });
});

describe('Enviar outra starts the bot guard over, except for the cooldown', () => {
  it('clears the honeypot, so a polluted hidden field does not drop every later real send', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(60_000);
    act(() => result.current.setHoneypot('https://spam.example'));
    await submitAndSettle(result);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('success');

    act(() => result.current.reset());
    expect(result.current.honeypot).toBe('');
    fillValidEmailForm(result);
    await submitAndSettle(result);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('success');
  });

  it('restarts the clock of the first gesture, so the next form is held again if it is sent fast', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(60_000);
    await submitAndSettle(result);
    advance(COOLDOWN_MS);
    act(() => result.current.reset());

    act(() => result.current.markInteraction());
    fillValidEmailForm(result);
    let sent: Promise<void> = Promise.resolve();
    act(() => {
      sent = result.current.handleSubmit(SUBMIT_EVENT);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
      await sent;
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the cooldown, which is about the send that worked', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(60_000);
    await submitAndSettle(result);
    act(() => result.current.reset());
    fillValidEmailForm(result);

    await submitAndSettle(result);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.notice).toBe(COOLDOWN_MESSAGE);
  });
});

describe('the time trap (it waits, it never drops a send)', () => {
  /** Presses Enviar and leaves the request pending in its wait: returns the promise of the submit. */
  function pressEnviar(result: ContactHookResult) {
    let sent: Promise<void> = Promise.resolve();
    act(() => {
      sent = result.current.handleSubmit(SUBMIT_EVENT);
    });
    return sent;
  }

  it('shows Enviando and holds the request for the rest of the 2 seconds, then sends it once', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(500);

    const sent = pressEnviar(result);
    expect(result.current.status).toBe('sending');
    advance(1_499);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('sending');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await sent;
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('success');
  });

  it('sends the same request as a visitor who did not have to wait, stamped when it leaves', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(0);

    const sent = pressEnviar(result);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FIRST_INTERACTION_WAIT_MS);
      await sent;
    });

    const { url, init } = readCall(fetchMock);
    expect(url).toBe(EMAIL_WEBHOOK);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(
      `{"nome":"Ana Lima","email":"ana@example.com","servico":"Automação de processos","mensagem":"Quero automatizar notas fiscais","timestamp":"${new Date().toISOString()}"}`,
    );
  });

  it('ignores a second Enviar while the first one is still waiting', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(0);

    const sent = pressEnviar(result);
    act(() => {
      void result.current.handleSubmit(SUBMIT_EVENT);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FIRST_INTERACTION_WAIT_MS);
      await sent;
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows a real error, not a fake success, when the held request fails, and the retry is not held back', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: false }));
    const { result } = visitorWhoWaits(0);

    const sent = pressEnviar(result);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FIRST_INTERACTION_WAIT_MS);
      await sent;
    });
    expect(result.current.status).toBe('error');
    act(() => result.current.dismissError());
    const retry = pressEnviar(result);
    await act(async () => {
      await retry;
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.notice).toBeUndefined();
  });

  it('sends at once from 2 seconds on, with no wait', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(FIRST_INTERACTION_WAIT_MS);

    await submitAndSettle(result);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('success');
  });

  it('counts from the first gesture, not from the mount, and the first gesture is the one that counts', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const hook = renderHook(() => useContactForm());
    advance(60_000);
    act(() => hook.result.current.markInteraction());
    advance(1_500);
    act(() => hook.result.current.markInteraction());
    fillValidEmailForm(hook.result);
    advance(499);

    const sent = pressEnviar(hook.result);
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await sent;
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('counts from the mount for a visitor with no key or pointer gesture on the fields (autofill, then Enter)', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const hook = renderHook(() => useContactForm());
    fillValidEmailForm(hook.result);
    advance(FIRST_INTERACTION_WAIT_MS);

    await submitAndSettle(hook.result);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still shows the errors to a visitor who submits an empty form at once', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = renderHook(() => useContactForm());

    await submitAndSettle(result);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
  });
});

describe('the cooldown after a successful send', () => {
  /** A visitor who sent once and pressed Enviar outra, with the form filled again. */
  async function sentOnceAndFilledAgain() {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const hook = visitorWhoWaits(FIRST_INTERACTION_WAIT_MS);
    await submitAndSettle(hook.result);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    act(() => hook.result.current.reset());
    fillValidEmailForm(hook.result);
    return { ...hook, fetchMock };
  }

  it('answers a second submit inside 30 seconds with a friendly message and no request', async () => {
    const { result, fetchMock } = await sentOnceAndFilledAgain();
    advance(COOLDOWN_MS - 1);

    await submitAndSettle(result);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
    expect(result.current.notice).toBe(COOLDOWN_MESSAGE);
    expect(COOLDOWN_MESSAGE).toBe('Já recebemos a sua mensagem. Aguarde alguns segundos para enviar outra.');
  });

  it('sends again once 30 seconds have passed', async () => {
    const { result, fetchMock } = await sentOnceAndFilledAgain();
    advance(COOLDOWN_MS);

    await submitAndSettle(result);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.notice).toBeUndefined();
  });

  it('does not block Enviar outra or the typing, only the request', async () => {
    const { result } = await sentOnceAndFilledAgain();

    act(() => result.current.setField('nome', 'Bia Souza'));

    expect(result.current.status).toBe('idle');
    expect(result.current.formData.nome).toBe('Bia Souza');
  });

  it('takes the message away as soon as the visitor edits the form', async () => {
    const { result } = await sentOnceAndFilledAgain();
    await submitAndSettle(result);
    expect(result.current.notice).toBe(COOLDOWN_MESSAGE);

    act(() => result.current.setField('mensagem', 'Outra mensagem bem diferente'));

    expect(result.current.notice).toBeUndefined();
  });

  it('does not start after a send that failed', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: false }));
    const { result } = visitorWhoWaits(FIRST_INTERACTION_WAIT_MS);
    await submitAndSettle(result);
    expect(result.current.status).toBe('error');
    act(() => result.current.dismissError());

    await submitAndSettle(result);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.notice).toBeUndefined();
  });
});
