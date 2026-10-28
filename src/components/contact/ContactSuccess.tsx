import { CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { ContactMethod } from '../../lib/contact';
import { Button } from '../ui/Button';
import { Heading } from '../ui/Heading';
import { contactFormCopy } from './contactFormCopy';
import { PANEL_CLASS } from './contactStyles';

const { success } = contactFormCopy;

interface ContactSuccessProps {
  method: ContactMethod;
  /** Enviar outra: the form starts over, empty. */
  onReset: () => void;
}

/** What replaces the form once the webhook answered: thanks, by the method the visitor chose, and a way to start over. */
export function ContactSuccess({ method, onReset }: ContactSuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${PANEL_CLASS} text-center`}
    >
      <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-vn-white md:size-20">
        <CheckCircle2 aria-hidden="true" className="size-8 text-vn-black md:size-10" />
      </div>
      <Heading as="h4" size="m">
        {success.title}
      </Heading>
      <p className="mx-auto mb-8 mt-4 max-w-xs text-base text-vn-gray-light">{success.text(method)}</p>
      <Button tone="dark" size="lg" onClick={onReset}>
        {success.again}
      </Button>
    </motion.div>
  );
}

export default ContactSuccess;
