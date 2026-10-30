import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rejectUnexpectedFetch } from '../../test/contactForm';
import { useContactForm } from './useContactForm';

// Every test starts with a rejecting fetch: nothing here can reach the real n8n webhooks.
beforeEach(() => {
  rejectUnexpectedFetch();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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
