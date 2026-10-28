import { useEffect, useState, type FormEvent } from 'react';
import {
  WEBHOOKS,
  buildContactPayload,
  validateContact,
  type ContactErrors,
  type ContactFields,
  type ContactMethod,
} from '../../lib/contact';

export type ContactStatus = 'idle' | 'sending' | 'success' | 'error';

const EMPTY_FORM_DATA = {
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

/** What the visitor typed and chose: the method, the fields, the errors and the consent. */
function useContactDraft(initialMessage?: string) {
  const [method, setMethod] = useState<ContactMethod>('email');
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);
  const [servico, setServico] = useState('');
  const [errors, setErrors] = useState<ContactErrors>({});
  // Consentimento LGPD: obrigatório para enviar
  const [consent, setConsent] = useState(false);

  // Digitar num campo limpa só o erro daquele campo.
  const clearError = (field: keyof ContactFields) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  // Trocar o método descarta os erros do método anterior.
  const selectMethod = (next: ContactMethod) => {
    setMethod(next);
    setErrors({});
  };

  // Pré-preenche a mensagem quando o usuário usa a calculadora de ROI
  useEffect(() => {
    if (initialMessage) {
      setFormData((prev) => ({ ...prev, mensagem: initialMessage }));
    }
  }, [initialMessage]);

  const resetDraft = () => {
    setFormData(EMPTY_FORM_DATA);
    setServico('');
    setConsent(false);
    setErrors({});
  };

  return {
    method,
    formData,
    setFormData,
    servico,
    setServico,
    errors,
    setErrors,
    consent,
    setConsent,
    clearError,
    selectMethod,
    resetDraft,
  };
}

/** The state and the submit of the contact form (ContactForm renders it). */
export function useContactForm(initialMessage?: string) {
  const draft = useContactDraft(initialMessage);
  const [status, setStatus] = useState<ContactStatus>('idle');
  const { method, formData, servico, setErrors } = draft;

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

  const reset = () => {
    setStatus('idle');
    draft.resetDraft();
  };

  return { ...draft, status, setStatus, handleSubmit, reset };
}

export type ContactFormState = ReturnType<typeof useContactForm>;
