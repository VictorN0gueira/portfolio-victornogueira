import { Send } from 'lucide-react';
import { Button } from '../ui/Button';
import { useContactIds } from './contactIds';
import { contactFormCopy } from './contactFormCopy';
import type { ContactStatus } from './useContactForm';

interface ContactSubmitProps {
  status: ContactStatus;
  hasConsent: boolean;
}

/**
 * Enviar. It stays off while a request is out and until the consent is given, and says why in the second case: a
 * visible line under it, which the button is described by. A failed send does not lock it: the visitor can try
 * again at once (Fechar only takes the alert away). While sending it says Enviando… and is marked busy.
 */
export function ContactSubmit({ status, hasConsent }: ContactSubmitProps) {
  const { submit, sending, consentHint } = contactFormCopy;
  const { submitHint } = useContactIds();

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="submit"
        tone="dark"
        size="lg"
        disabled={status === 'sending' || !hasConsent}
        aria-busy={status === 'sending'}
        aria-describedby={hasConsent ? undefined : submitHint}
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
      {!hasConsent && (
        <p id={submitHint} className="text-center text-sm text-vn-gray-light">
          {consentHint}
        </p>
      )}
    </div>
  );
}
