import { AnimatePresence, m } from 'motion/react';
import { formatWhatsappDisplay } from '../../lib/phone';
import { ContactInput, ContactMessage, ContactService } from './ContactFieldControls';
import ContactHoneypot from './ContactHoneypot';
import { useContactIds } from './contactIds';
import FieldError from './FieldError';
import type { ContactFormState } from './useContactForm';

const SWAP_MOTION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
} as const;

interface ContactFormFieldsProps {
  form: ContactFormState;
}

/** The e-mail field or the WhatsApp field, whichever the method asks for, swapped with a short fade. */
function ContactMethodField({ form }: ContactFormFieldsProps) {
  const { method, formData, errors, setField } = form;

  return (
    <AnimatePresence mode="wait">
      {method === 'email' ? (
        <m.div key="email" {...SWAP_MOTION}>
          <ContactInput
            field="email"
            value={formData.email}
            error={errors.email}
            onChange={(value) => setField('email', value)}
          />
        </m.div>
      ) : (
        <m.div key="whatsapp" {...SWAP_MOTION}>
          <ContactInput
            field="whatsapp"
            value={formData.whatsapp}
            error={errors.whatsapp}
            onChange={(value) => setField('whatsapp', formatWhatsappDisplay(value))}
          />
        </m.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Nome, serviço, the contact field of the method and the message, in that order, then the cooldown line and the
 * honeypot. The wrapper takes no space (display contents) and listens for the first keyboard or pointer gesture, which
 * starts the clock of the time trap (see botGuard.ts).
 */
export function ContactFormFields({ form }: ContactFormFieldsProps) {
  const { formData, servico, errors, setField, chooseService } = form;
  const ids = useContactIds();

  return (
    <div
      className="contents"
      onKeyDownCapture={(event) => {
        // Enter sends a form, so it is not the visitor starting to fill one (see botGuard.ts).
        if (event.key !== 'Enter') form.markInteraction();
      }}
      onPointerDownCapture={form.markInteraction}
    >
      <ContactInput field="nome" value={formData.nome} error={errors.nome} onChange={(value) => setField('nome', value)} />
      <ContactService value={servico} error={errors.servico} onChange={chooseService} />
      <ContactMethodField form={form} />
      <ContactMessage
        value={formData.mensagem}
        error={errors.mensagem}
        onChange={(value) => setField('mensagem', value)}
      />
      <FieldError id={ids.notice} message={form.notice} announce />
      <ContactHoneypot value={form.honeypot} onChange={form.setHoneypot} />
    </div>
  );
}

export default ContactFormFields;
