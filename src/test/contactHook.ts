import { act } from '@testing-library/react';
import type { FormEvent } from 'react';
import { serviceOptions } from '../data/services';
import type { useContactForm } from '../components/contact/useContactForm';
import { TEST_EMAIL } from './contactForm';

/** Helpers for the tests that drive useContactForm through renderHook. Every request goes to a mocked fetch. */

export type ContactHookResult = { current: ReturnType<typeof useContactForm> };

export const SUBMIT_EVENT = { preventDefault: () => {} } as unknown as FormEvent;

export const VALID_MESSAGE = 'Quero automatizar notas fiscais';

/** The e-mail form filled and with the consent given, one visitor action at a time. */
export function fillValidEmailForm(result: ContactHookResult, mensagem: string = VALID_MESSAGE) {
  act(() => result.current.setField('nome', 'Ana Lima'));
  act(() => result.current.chooseService(serviceOptions[0]));
  act(() => result.current.setField('email', TEST_EMAIL));
  act(() => result.current.setField('mensagem', mensagem));
  act(() => result.current.setConsent(true));
}

/** Submits and waits for the request to settle. */
export async function submitAndSettle(result: ContactHookResult) {
  await act(async () => {
    await result.current.handleSubmit(SUBMIT_EVENT);
  });
}
