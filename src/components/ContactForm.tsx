import ContactConsent from './contact/ContactConsent';
import ContactErrorAlert from './contact/ContactErrorAlert';
import ContactFormFields from './contact/ContactFormFields';
import ContactMethodToggle from './contact/ContactMethodToggle';
import ContactSubmit from './contact/ContactSubmit';
import ContactSuccess from './contact/ContactSuccess';
import { PANEL_CLASS } from './contact/contactStyles';
import { useContactForm } from './contact/useContactForm';

interface ContactFormProps {
  /** Mensagem pré-preenchida (ex.: vinda do simulador de ROI) */
  initialMessage?: string;
}

/**
 * The contact form on a black surface, in a rounded panel. The state and the submit live in useContactForm;
 * this component only puts the pieces together. A sent form is replaced by the thanks message.
 */
export default function ContactForm({ initialMessage }: ContactFormProps) {
  const form = useContactForm(initialMessage);

  if (form.status === 'success') {
    return <ContactSuccess method={form.method} onReset={form.reset} />;
  }

  return (
    <div className={`${PANEL_CLASS} flex flex-col gap-6`}>
      <ContactMethodToggle method={form.method} onSelect={form.selectMethod} />

      <form name="contact" onSubmit={form.handleSubmit} className="flex flex-col gap-5" noValidate>
        <ContactFormFields form={form} />
        <ContactConsent checked={form.consent} onChange={form.setConsent} />
        {form.status === 'error' && <ContactErrorAlert onClose={() => form.setStatus('idle')} />}
        <ContactSubmit status={form.status} hasConsent={form.consent} />
      </form>
    </div>
  );
}
