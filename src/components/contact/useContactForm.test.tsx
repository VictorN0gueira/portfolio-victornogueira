import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMAIL_WEBHOOK, readCall, rejectUnexpectedFetch, stubFetch } from '../../test/contactForm';
import { SUBMIT_EVENT, fillValidEmailForm } from '../../test/contactHook';
import { useContactForm } from './useContactForm';

// Every test starts with a rejecting fetch: nothing here can reach the real n8n webhooks.
beforeEach(() => {
  rejectUnexpectedFetch();
});

const NATIVE_TIMEOUT = AbortSignal.timeout;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Object.defineProperty(AbortSignal, 'timeout', { value: NATIVE_TIMEOUT, configurable: true, writable: true });
});

/** A request that stays open until the test answers it. */
function deferredFetch() {
  let answer: (value: { ok: boolean }) => void = () => {};
  const fetchMock = stubFetch(
    () =>
      new Promise((resolve) => {
        answer = resolve as (value: { ok: boolean }) => void;
      }),
  );
  return { fetchMock, answer: (ok: boolean) => answer({ ok }) };
}

describe('useContactForm setField', () => {
  it('keeps both values when two fields are set in the same tick', () => {
    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.setField('nome', 'Ana Lima');
      result.current.setField('mensagem', 'Quero automatizar notas fiscais');
    });

    expect(result.current.formData.nome).toBe('Ana Lima');
    expect(result.current.formData.mensagem).toBe('Quero automatizar notas fiscais');
  });
});

describe('useContactForm double submit', () => {
  it('sends nothing for a second submit while the first one is in flight', async () => {
    const { fetchMock, answer } = deferredFetch();
    const { result } = renderHook(() => useContactForm());
    fillValidEmailForm(result);

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.handleSubmit(SUBMIT_EVENT);
    });
    expect(result.current.status).toBe('sending');
    act(() => {
      void result.current.handleSubmit(SUBMIT_EVENT);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readCall(fetchMock).url).toBe(EMAIL_WEBHOOK);

    await act(async () => {
      answer(true);
      await first;
    });
    expect(result.current.status).toBe('success');
  });

  it('lets the visitor submit again once the first request failed', async () => {
    const { fetchMock, answer } = deferredFetch();
    const { result } = renderHook(() => useContactForm());
    fillValidEmailForm(result);

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.handleSubmit(SUBMIT_EVENT);
    });
    await act(async () => {
      answer(false);
      await first;
    });
    expect(result.current.status).toBe('error');

    act(() => result.current.dismissError());
    await act(async () => {
      const second = result.current.handleSubmit(SUBMIT_EVENT);
      answer(true);
      await second;
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('success');
  });
});

/** A request that only ends when the signal it was given aborts: with no signal it never ends at all. */
function fetchThatEndsOnAbort() {
  const fetchMock = vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<never>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('The operation timed out.', 'TimeoutError')));
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('useContactForm request timeout', () => {
  it('hands the request a signal made by AbortSignal.timeout(15000)', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { result } = renderHook(() => useContactForm());
    fillValidEmailForm(result);

    await act(async () => {
      await result.current.handleSubmit(SUBMIT_EVENT);
    });

    expect(timeoutSpy).toHaveBeenCalledWith(15_000);
    expect(readCall(fetchMock).init.signal).toBeInstanceOf(AbortSignal);
  });

  it('moves to the error state when the signal aborts, and the form can be used again', async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    const fetchMock = fetchThatEndsOnAbort();
    const { result } = renderHook(() => useContactForm());
    fillValidEmailForm(result);

    let sent: Promise<void> = Promise.resolve();
    act(() => {
      sent = result.current.handleSubmit(SUBMIT_EVENT);
    });
    expect(result.current.status).toBe('sending');
    await act(async () => {
      controller.abort();
      await sent;
    });

    expect(result.current.status).toBe('error');
    act(() => result.current.dismissError());
    expect(result.current.status).toBe('idle');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('times the request out after 15 seconds where AbortSignal.timeout does not exist', async () => {
    vi.useFakeTimers();
    Object.defineProperty(AbortSignal, 'timeout', { value: undefined, configurable: true, writable: true });
    fetchThatEndsOnAbort();
    const { result } = renderHook(() => useContactForm());
    fillValidEmailForm(result);

    let sent: Promise<void> = Promise.resolve();
    act(() => {
      sent = result.current.handleSubmit(SUBMIT_EVENT);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14_999);
    });
    expect(result.current.status).toBe('sending');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await sent;
    });

    expect(result.current.status).toBe('error');
  });
});
