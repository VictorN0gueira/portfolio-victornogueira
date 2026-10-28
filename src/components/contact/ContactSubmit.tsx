import { Send } from 'lucide-react';
import { Button } from '../ui/Button';
import { contactFormCopy } from './contactFormCopy';
import type { ContactStatus } from './useContactForm';

interface ContactSubmitProps {
  status: ContactStatus;
  hasConsent: boolean;
}

/**
 * Enviar. It stays off while a request is out, while the error is showing (Fechar clears it) and until the
 * consent is given. While sending it says Enviando… and is marked busy.
 */
export function ContactSubmit({ status, hasConsent }: ContactSubmitProps) {
  const { submit, sending } = contactFormCopy;

  return (
    <Button
      type="submit"
      tone="dark"
      size="lg"
      disabled={status === 'sending' || status === 'error' || !hasConsent}
      aria-busy={status === 'sending'}
      className="group w-full"
    >
      {status === 'sending' ? (
        <span className="animate-pulse">{sending}</span>
      ) : (
        <>
          {submit}
          <Send
            aria-hidden="true"
            className="size-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
          />
        </>
      )}
    </Button>
  );
}

export default ContactSubmit;
