import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readCall, rejectUnexpectedFetch, stubFetch } from '../../test/contactForm';
import { fillValidEmailForm, submitAndSettle } from '../../test/contactHook';
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

  it('is not a payload key: an empty honeypot sends the four fields and the timestamp as always', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(FIRST_INTERACTION_WAIT_MS);

    await submitAndSettle(result);

    expect(Object.keys(readCall(fetchMock).body)).toEqual(['nome', 'email', 'servico', 'mensagem', 'timestamp']);
  });
});

describe('the time trap', () => {
  it('sends nothing and looks like a success when the submit comes under 2 seconds after the first gesture', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = visitorWhoWaits(FIRST_INTERACTION_WAIT_MS - 1);

    await submitAndSettle(result);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('success');
  });

  it('sends from 2 seconds on', async () => {
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

    await submitAndSettle(hook.result);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('counts from the mount for a visitor with no gesture at all (autofill, then Enter)', async () => {
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
