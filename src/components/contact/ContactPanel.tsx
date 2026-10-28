import ContactConsent from './ContactConsent';
import ContactErrorAlert from './ContactErrorAlert';
import ContactFormFields from './ContactFormFields';
import ContactMethodToggle from './ContactMethodToggle';
import ContactSubmit from './ContactSubmit';
import { PANEL_CLASS } from './contactStyles';
import type { ContactFormState } from './useContactForm';

interface ContactPanelProps {
  form: ContactFormState;
}

/** The form itself in its rounded panel: the method toggle, the fields, the consent, the error and Enviar. */
export function ContactPanel({ form }: ContactPanelProps) {
  return (
    <div className={`${PANEL_CLASS} flex flex-col gap-6`}>
      <ContactMethodToggle method={form.method} onSelect={form.selectMethod} />

      <form name="contact" onSubmit={form.handleSubmit} className="flex flex-col gap-5" noValidate>
        <ContactFormFields form={form} />
        <ContactConsent checked={form.consent} onChange={form.setConsent} />
        {form.status === 'error' && <ContactErrorAlert onClose={form.dismissError} />}
        <ContactSubmit status={form.status} hasConsent={form.consent} />
      </form>
    </div>
  );
}

export default ContactPanel;
