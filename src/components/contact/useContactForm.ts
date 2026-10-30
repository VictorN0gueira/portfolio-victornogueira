import { useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  WEBHOOKS,
  buildContactPayload,
  validateContact,
  type ContactErrors,
  type ContactFields,
  type ContactMethod,
} from '../../lib/contact';
import { timeoutSignal } from '../../lib/timeoutSignal';
import { holdUnlessLeaving } from './holdUnlessLeaving';
import { useBotGuard } from './useBotGuard';

/** How long a request may stay open before the form gives up and shows the WhatsApp fallback. */
const REQUEST_TIMEOUT_MS = 15_000;

export type ContactStatus = 'idle' | 'sending' | 'success' | 'error';

/** The empty form. The WhatsApp field never starts empty: it always shows the +55 prefix. */
export const EMPTY_FORM_DATA = {
  nome: '',
  email: '',
  whatsapp: '+55 ',
  mensagem: '',
};

/**
 * Posts the payload to the webhook of the chosen method and answers the status the form moves to.
 * The URLs, the payload and the error handling are the ones the form always had; nothing sits in front of n8n.
 */
async function sendContact(fields: ContactFields, method: ContactMethod): Promise<'success' | 'error'> {
  const webhookUrl = method === 'email' ? WEBHOOKS.email : WEBHOOKS.whatsapp;

  // Campos legados intactos (nome, email ou whatsapp, mensagem, timestamp) + 'servico' aditivo.
  const payload = buildContactPayload(fields, method, new Date());

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
      // The request survives the page going away (see holdUnlessLeaving). The body is far under the 64 KB limit of keepalive.
      keepalive: true,
    });

    if (response.ok) {
      return 'success';
    }
    throw new Error('Failed to send');
  } catch {
    return 'error';
  }
}

type TextField = keyof typeof EMPTY_FORM_DATA;

/**
 * Fills the message with the one the parent hands over (the ROI simulator quote), each time that string changes.
 * The nonce makes the same string count again: the parent bumps it for a request that repeats the message after the
 * visitor edited the field.
 */
function usePrefill(
  initialMessage: string | undefined,
  prefillNonce: number | undefined,
  setFormData: Dispatch<SetStateAction<typeof EMPTY_FORM_DATA>>,
) {
  // The last message the parent handed over: Enviar outra puts it back instead of leaving the field empty.
  const lastPrefill = useRef('');

  // Pré-preenche a mensagem quando o usuário usa a calculadora de ROI
  useEffect(() => {
    if (initialMessage) {
      lastPrefill.current = initialMessage;
      setFormData((prev) => ({ ...prev, mensagem: initialMessage }));
    }
  }, [initialMessage, prefillNonce, setFormData]);

  return lastPrefill;
}

/**
 * What the visitor typed and chose: the method, the fields, the errors and the consent. The raw setters stay in here:
 * the form gets `setField`, `chooseService` and `selectMethod`, which are the same updates the handlers always made.
 */
function useContactDraft(initialMessage?: string, prefillNonce?: number) {
  const [method, setMethod] = useState<ContactMethod>('email');
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);
  const [servico, setServico] = useState('');
  const [errors, setErrors] = useState<ContactErrors>({});
  // Consentimento LGPD: obrigatório para enviar
  const [consent, setConsent] = useState(false);
  const lastPrefill = usePrefill(initialMessage, prefillNonce, setFormData);

  // Digitar num campo limpa só o erro daquele campo.
  const clearError = (field: keyof ContactFields) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };
  const setField = (field: TextField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };
  const chooseService = (value: string) => {
    setServico(value);
    clearError('servico');
  };
  // Trocar o método descarta os erros do método anterior.
  const selectMethod = (next: ContactMethod) => {
    setMethod(next);
    setErrors({});
  };
  const resetDraft = () => {
    setFormData({ ...EMPTY_FORM_DATA, mensagem: lastPrefill.current });
    setServico('');
    setConsent(false);
    setErrors({});
  };

  return { method, formData, servico, errors, consent, setConsent, setField, chooseService, selectMethod, setErrors, resetDraft };
}

/**
 * The status of the send and the send itself: one request at a time, and `onSuccess` runs when the webhook said yes.
 * `sentMethod` is the method of the last send, kept apart from the toggle: the thanks names the channel that was used,
 * even when the visitor flips the toggle while Enviando is still showing.
 */
function useContactSender(method: ContactMethod, onSuccess: () => void) {
  const [status, setStatus] = useState<ContactStatus>('idle');
  const [sentMethod, setSentMethod] = useState<ContactMethod>(method);
  // A second submit while a request is out (a double tap, Enter then click) sends nothing.
  const isInFlight = useRef(false);
  // Ends the hold of the time trap now: the form is unmounted by a navigation, so the request goes out instead of dying.
  const releaseHold = useRef<(() => void) | null>(null);
  useEffect(() => () => releaseHold.current?.(), []);

  /** `waitMs` is the rest of the time trap (see botGuard.ts): shown as Enviando, still one request at a time. */
  const send = async (fields: ContactFields, waitMs: number) => {
    isInFlight.current = true;
    setSentMethod(method);
    try {
      setStatus('sending');
      if (waitMs > 0) {
        const hold = holdUnlessLeaving(waitMs);
        releaseHold.current = hold.release;
        await hold.done;
        releaseHold.current = null;
      }
      const outcome = await sendContact(fields, method);
      if (outcome === 'success') {
        onSuccess();
      }
      setStatus(outcome);
    } finally {
      isInFlight.current = false;
    }
  };

  /** What a bot gets: the thanks, with nothing sent. */
  const succeedWithoutSending = () => {
    setSentMethod(method);
    setStatus('success');
  };

  return { status, setStatus, sentMethod, send, succeedWithoutSending, isSending: () => isInFlight.current };
}

/** The state and the submit of the contact form (ContactForm renders it). */
export function useContactForm(initialMessage?: string, prefillNonce?: number) {
  const { setErrors, resetDraft, ...draft } = useContactDraft(initialMessage, prefillNonce);
  const { method, formData, servico } = draft;
  const { judge, recordSent, clearNotice, resetGuard, ...guard } = useBotGuard();
  const { status, setStatus, sentMethod, send, succeedWithoutSending, isSending } = useContactSender(method, recordSent);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSending()) {
      return;
    }
    const fields: ContactFields = { ...formData, servico };
    const newErrors = validateContact(fields, method);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const verdict = judge();
    if (verdict.action === 'bot') {
      // Looks like a success and sends nothing: a bot gets no signal (see botGuard.ts).
      succeedWithoutSending();
    } else if (verdict.action === 'send') {
      await send(fields, verdict.waitMs);
    }
  };

  const dismissError = () => setStatus('idle');

  const reset = () => {
    resetGuard();
    setStatus('idle');
    resetDraft();
  };

  // Editing the form takes the cooldown line away: the visitor is already doing something about it.
  const setField = (field: Parameters<typeof draft.setField>[0], value: string) => {
    clearNotice();
    draft.setField(field, value);
  };
  const chooseService = (value: string) => {
    clearNotice();
    draft.chooseService(value);
  };

  return { ...draft, ...guard, status, sentMethod, handleSubmit, dismissError, reset, setField, chooseService };
}

export type ContactFormState = ReturnType<typeof useContactForm>;
