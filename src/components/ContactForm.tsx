import { contactFormCopy } from './contact/contactFormCopy';
import ContactPanel from './contact/ContactPanel';
import ContactSuccess from './contact/ContactSuccess';
import { useContactForm } from './contact/useContactForm';

interface ContactFormProps {
  /** Mensagem pré-preenchida (ex.: vinda do simulador de ROI) */
  initialMessage?: string;
  /** Changes each time the parent hands over a message, so the same message fills the field again */
  prefillNonce?: number;
}

/**
 * The contact form on a black surface, in a rounded panel. The state and the submit live in useContactForm;
 * this component only puts the pieces together. A sent form is replaced by the thanks message.
 * The polite status region is mounted from the start and sits outside both branches: the submit button leaves the page
 * with the form and the focus falls to the body, so the thanks has to be announced by a region that was already there
 * (a live region that mounts together with its text is skipped by many screen readers).
 */
export default function ContactForm({ initialMessage, prefillNonce }: ContactFormProps) {
  const form = useContactForm(initialMessage, prefillNonce);
  const isSent = form.status === 'success';
  const { title, text } = contactFormCopy.success;

  return (
    <>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isSent ? `${title}. ${text(form.method)}` : ''}
      </p>
      {isSent ? <ContactSuccess method={form.method} onReset={form.reset} /> : <ContactPanel form={form} />}
    </>
  );
}
