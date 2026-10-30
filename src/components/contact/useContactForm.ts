import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  WEBHOOKS,
  buildContactPayload,
  validateContact,
  type ContactErrors,
  type ContactFields,
  type ContactMethod,
} from '../../lib/contact';

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
  // Pré-preenche a mensagem quando o usuário usa a calculadora de ROI
  useEffect(() => {
    if (initialMessage) {
      setFormData((prev) => ({ ...prev, mensagem: initialMessage }));
    }
  }, [initialMessage, prefillNonce, setFormData]);
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
  usePrefill(initialMessage, prefillNonce, setFormData);

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
    setFormData(EMPTY_FORM_DATA);
    setServico('');
    setConsent(false);
    setErrors({});
  };

  return { method, formData, servico, errors, consent, setConsent, setField, chooseService, selectMethod, setErrors, resetDraft };
}

/** The state and the submit of the contact form (ContactForm renders it). */
export function useContactForm(initialMessage?: string, prefillNonce?: number) {
  const { setErrors, resetDraft, ...draft } = useContactDraft(initialMessage, prefillNonce);
  const [status, setStatus] = useState<ContactStatus>('idle');
  const { method, formData, servico } = draft;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const fields: ContactFields = { ...formData, servico };
    const newErrors = validateContact(fields, method);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStatus('sending');
    setStatus(await sendContact(fields, method));
  };

  const dismissError = () => setStatus('idle');

  const reset = () => {
    setStatus('idle');
    resetDraft();
  };

  return { ...draft, status, handleSubmit, dismissError, reset };
}

export type ContactFormState = ReturnType<typeof useContactForm>;
