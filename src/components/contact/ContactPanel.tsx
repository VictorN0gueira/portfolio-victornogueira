import { useRef, useState, type FormEvent } from 'react';
import ContactConsent from './ContactConsent';
import ContactErrorAlert from './ContactErrorAlert';
import ContactFormFields from './ContactFormFields';
import ContactMethodToggle from './ContactMethodToggle';
import ContactSubmit from './ContactSubmit';
import { contactFormCopy } from './contactFormCopy';
import { PANEL_CLASS } from './contactStyles';
import type { ContactFormState } from './useContactForm';
import { useContactFocus } from './useContactFocus';

interface ContactPanelProps {
  form: ContactFormState;
}

/**
 * The form itself in its rounded panel: the method toggle, the fields, the consent, the error and Enviar.
 * The panel takes the focus while a request is out (see useContactFocus), so it is focusable but not a tab stop and
 * draws no ring: it is not a control. The submit is the one of the form, called as it always was; this only counts it.
 */
export function ContactPanel({ form }: ContactPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [submitCount, setSubmitCount] = useState(0);
  useContactFocus(panelRef, form.status, form.errors, submitCount);

  const handleSubmit = (event: FormEvent) => {
    void form.handleSubmit(event);
    setSubmitCount((count) => count + 1);
  };

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      aria-busy={form.status === 'sending'}
      className={`${PANEL_CLASS} flex flex-col gap-6 outline-none`}
    >
      <ContactMethodToggle method={form.method} onSelect={form.selectMethod} />

      <form
        name="contact"
        aria-label={contactFormCopy.formLabel}
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
        noValidate
      >
        <ContactFormFields form={form} />
        <ContactConsent checked={form.consent} onChange={form.setConsent} />
        {form.status === 'error' && <ContactErrorAlert onClose={form.dismissError} />}
        <ContactSubmit status={form.status} hasConsent={form.consent} />
      </form>
    </div>
  );
}

export default ContactPanel;
