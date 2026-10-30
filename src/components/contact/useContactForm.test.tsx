import { act, renderHook } from '@testing-library/react';
import type { FormEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serviceOptions } from '../../data/services';
import { EMAIL_WEBHOOK, TEST_EMAIL, readCall, rejectUnexpectedFetch, stubFetch } from '../../test/contactForm';
import { useContactForm } from './useContactForm';

// Every test starts with a rejecting fetch: nothing here can reach the real n8n webhooks.
beforeEach(() => {
  rejectUnexpectedFetch();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const SUBMIT_EVENT = { preventDefault: () => {} } as unknown as FormEvent;

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

/** The e-mail form filled and with the consent given, one visitor action at a time. */
function fillValidEmailForm(result: { current: ReturnType<typeof useContactForm> }) {
  act(() => result.current.setField('nome', 'Ana Lima'));
  act(() => result.current.chooseService(serviceOptions[0]));
  act(() => result.current.setField('email', TEST_EMAIL));
  act(() => result.current.setField('mensagem', 'Quero automatizar notas fiscais'));
  act(() => result.current.setConsent(true));
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
