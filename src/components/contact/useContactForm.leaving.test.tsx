import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMAIL_WEBHOOK, readCall, rejectUnexpectedFetch, stubFetch } from '../../test/contactForm';
import { SUBMIT_EVENT, fillValidEmailForm, type ContactHookResult } from '../../test/contactHook';
import { useContactForm } from './useContactForm';

// A visitor who leaves while the time trap still holds the request must not lose the lead: the hold ends at once and the
// real request goes out, with keepalive so it survives the page going away. These tests need the real time trap.
vi.mock('./botGuard', async (importOriginal) => importOriginal());

const NATIVE_VISIBILITY = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');

beforeEach(() => {
  rejectUnexpectedFetch();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-29T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'visibilityState');
  if (NATIVE_VISIBILITY) Object.defineProperty(Document.prototype, 'visibilityState', NATIVE_VISIBILITY);
});

function setVisibilityInAct(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/** A fast visitor who has just pressed Enviar: the request is in its hold, nothing has gone out. */
function fastVisitorPressedEnviar() {
  const hook = renderHook(() => useContactForm());
  act(() => hook.result.current.markInteraction());
  fillValidEmailForm(hook.result);
  let sent: Promise<void> = Promise.resolve();
  act(() => {
    sent = hook.result.current.handleSubmit(SUBMIT_EVENT);
  });
  expect(hook.result.current.status).toBe('sending');
  return { ...hook, sent };
}

async function settle(sent: Promise<void>) {
  await act(async () => {
    await sent;
  });
}

function expectOneRealRequest(fetchMock: ReturnType<typeof stubFetch>, result: ContactHookResult) {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const { url, init, body } = readCall(fetchMock);
  expect(url).toBe(EMAIL_WEBHOOK);
  expect(init.method).toBe('POST');
  expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
  expect(init.keepalive).toBe(true);
  expect(Object.keys(body)).toEqual(['nome', 'email', 'servico', 'mensagem', 'timestamp']);
  expect(result.current.status).not.toBe('idle');
}

describe('leaving during the hold of the time trap', () => {
  it('sends the one real request at once when the tab is hidden', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result, sent } = fastVisitorPressedEnviar();
    expect(fetchMock).not.toHaveBeenCalled();

    setVisibilityInAct('hidden');
    await settle(sent);

    expectOneRealRequest(fetchMock, result);
    expect(result.current.status).toBe('success');
  });

  it('does not send early when the page only becomes visible', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { sent } = fastVisitorPressedEnviar();

    setVisibilityInAct('visible');

    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
      await sent;
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends the one real request at once on pagehide', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result, sent } = fastVisitorPressedEnviar();

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await settle(sent);

    expectOneRealRequest(fetchMock, result);
  });

  it('sends the one real request at once when the form is unmounted by a navigation', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result, sent, unmount } = fastVisitorPressedEnviar();

    unmount();
    await act(async () => {
      await sent;
    });

    expectOneRealRequest(fetchMock, result);
  });

  it('does not send twice when the visitor leaves after the hold is over', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { sent, unmount } = fastVisitorPressedEnviar();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
      await sent;
    });

    setVisibilityInAct('hidden');
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    unmount();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never sends a filled honeypot, whatever the visitor does', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const hook = renderHook(() => useContactForm());
    act(() => hook.result.current.markInteraction());
    fillValidEmailForm(hook.result);
    act(() => hook.result.current.setHoneypot('https://spam.example'));
    await act(async () => {
      await hook.result.current.handleSubmit(SUBMIT_EVENT);
    });

    setVisibilityInAct('hidden');
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    hook.unmount();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('the request keeps the bytes it always had', () => {
  it('has the same body with and without the hold, and keepalive is an option of the request, not of the body', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result, sent } = fastVisitorPressedEnviar();
    setVisibilityInAct('hidden');
    await settle(sent);

    const { init } = readCall(fetchMock);
    expect(init.body).toBe(
      `{"nome":"Ana Lima","email":"ana@example.com","servico":"Automação de processos","mensagem":"Quero automatizar notas fiscais","timestamp":"${new Date().toISOString()}"}`,
    );
    expect(init.body).not.toContain('keepalive');
    expect(result.current.status).toBe('success');
  });
});
