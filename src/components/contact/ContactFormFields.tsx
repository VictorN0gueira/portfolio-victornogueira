import { AnimatePresence, motion } from 'motion/react';
import { formatWhatsappDisplay } from '../../lib/phone';
import { ContactInput, ContactMessage, ContactService } from './ContactFieldControls';
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
        <motion.div key="email" {...SWAP_MOTION}>
          <ContactInput
            field="email"
            value={formData.email}
            error={errors.email}
            onChange={(value) => setField('email', value)}
          />
        </motion.div>
      ) : (
        <motion.div key="whatsapp" {...SWAP_MOTION}>
          <ContactInput
            field="whatsapp"
            value={formData.whatsapp}
            error={errors.whatsapp}
            onChange={(value) => setField('whatsapp', formatWhatsappDisplay(value))}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Nome, serviço, the contact field of the method and the message, in that order. */
export function ContactFormFields({ form }: ContactFormFieldsProps) {
  const { formData, servico, errors, setField, chooseService } = form;

  return (
    <>
      <ContactInput field="nome" value={formData.nome} error={errors.nome} onChange={(value) => setField('nome', value)} />
      <ContactService value={servico} error={errors.servico} onChange={chooseService} />
      <ContactMethodField form={form} />
      <ContactMessage
        value={formData.mensagem}
        error={errors.mensagem}
        onChange={(value) => setField('mensagem', value)}
      />
    </>
  );
}

export default ContactFormFields;
