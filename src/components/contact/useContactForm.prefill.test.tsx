import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rejectUnexpectedFetch, stubFetch } from '../../test/contactForm';
import { fillValidEmailForm, submitAndSettle } from '../../test/contactHook';
import { useContactForm } from './useContactForm';

const QUOTE = 'Simulei a economia no ROI e quero automatizar o financeiro';

beforeEach(() => {
  rejectUnexpectedFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The visitor sent the form successfully and pressed Enviar outra. */
async function sendAndStartAgain(result: { current: ReturnType<typeof useContactForm> }, mensagem: string) {
  stubFetch(() => Promise.resolve({ ok: true }));
  fillValidEmailForm(result, mensagem);
  await submitAndSettle(result);
  expect(result.current.status).toBe('success');
  act(() => result.current.reset());
}

describe('useContactForm Enviar outra with a prefilled message', () => {
  it('puts the ROI quote back in the message field', async () => {
    const { result } = renderHook(() => useContactForm(QUOTE));
    expect(result.current.formData.mensagem).toBe(QUOTE);

    await sendAndStartAgain(result, 'Outra mensagem que o visitante digitou');

    expect(result.current.status).toBe('idle');
    expect(result.current.formData.mensagem).toBe(QUOTE);
  });

  it('still empties everything else', async () => {
    const { result } = renderHook(() => useContactForm(QUOTE));

    await sendAndStartAgain(result, QUOTE);

    expect(result.current.formData.nome).toBe('');
    expect(result.current.formData.email).toBe('');
    expect(result.current.servico).toBe('');
    expect(result.current.consent).toBe(false);
    expect(result.current.errors).toEqual({});
  });

  it('brings back the last quote the parent handed over', async () => {
    const { result, rerender } = renderHook(({ message }) => useContactForm(message), {
      initialProps: { message: 'Primeira simulação' as string | undefined },
    });
    rerender({ message: QUOTE });
    rerender({ message: undefined });

    await sendAndStartAgain(result, 'Texto digitado');

    expect(result.current.formData.mensagem).toBe(QUOTE);
  });

  it('leaves the message empty when there was never a quote', async () => {
    const { result } = renderHook(() => useContactForm());

    await sendAndStartAgain(result, 'Texto digitado');

    expect(result.current.formData.mensagem).toBe('');
  });
});
