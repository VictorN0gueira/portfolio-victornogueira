import { useEffect, useMemo, useState } from 'react';
import { ContactIdsContext, DEFAULT_ID_PREFIX, contactIds } from './contact/contactIds';
import { contactFormCopy } from './contact/contactFormCopy';
import ContactPanel from './contact/ContactPanel';
import ContactSuccess from './contact/ContactSuccess';
import { useContactForm } from './contact/useContactForm';

interface ContactFormProps {
  /** Mensagem pré-preenchida (ex.: vinda do simulador de ROI) */
  initialMessage?: string;
  /** Changes each time the parent hands over a message, so the same message fills the field again */
  prefillNonce?: number;
  /**
   * Start of every DOM id of the form (`contact-nome`, `contact-nome-error`...). A page that holds a second form gives
   * it another prefix, so no id repeats. The default is the one the form has always had.
   */
  idPrefix?: string;
}

/**
 * The contact form on a black surface, in a rounded panel. The state and the submit live in useContactForm;
 * this component only puts the pieces together. A sent form is replaced by the thanks message.
 * The polite status region is mounted from the start and sits outside both branches: the submit button leaves the page
 * with the form and the focus falls to the body, so the thanks has to be announced by a region that was already there
 * (a live region that mounts together with its text is skipped by many screen readers). The region carries only the
 * second sentence of the thanks: the title is read once, by the focus that lands on the heading (see ContactSuccess).
 * Enviar outra puts the focus on the name field of the new, empty form.
 */
export default function ContactForm({ initialMessage, prefillNonce, idPrefix = DEFAULT_ID_PREFIX }: ContactFormProps) {
  const form = useContactForm(initialMessage, prefillNonce);
  const ids = useMemo(() => contactIds(idPrefix), [idPrefix]);
  const [resetCount, setResetCount] = useState(0);
  const isSent = form.status === 'success';
  const { text } = contactFormCopy.success;

  useEffect(() => {
    if (resetCount > 0) document.getElementById(ids.field('nome'))?.focus();
  }, [resetCount, ids]);

  const handleReset = () => {
    form.reset();
    setResetCount((count) => count + 1);
  };

  return (
    <ContactIdsContext.Provider value={ids}>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isSent ? text(form.sentMethod) : ''}
      </p>
      {isSent ? <ContactSuccess method={form.sentMethod} onReset={handleReset} /> : <ContactPanel form={form} />}
    </ContactIdsContext.Provider>
  );
}
