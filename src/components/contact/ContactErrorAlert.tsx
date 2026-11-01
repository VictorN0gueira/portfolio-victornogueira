import { AlertCircle } from 'lucide-react';
import { m } from 'motion/react';
import { WHATSAPP_FALLBACK_URL } from '../../lib/constants';
import { contactFormCopy } from './contactFormCopy';
import { LINK_CLASS } from './contactStyles';

const { error } = contactFormCopy;

interface ContactErrorAlertProps {
  onClose: () => void;
}

/**
 * The send failed: a message with an icon and a link to talk on WhatsApp instead, and a Fechar button that
 * dismisses it. It is an assertive alert, as before, and does not rely on color.
 */
export function ContactErrorAlert({ onClose }: ContactErrorAlertProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      aria-live="assertive"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-vn-white/30 bg-vn-white/10 py-2 pl-4 pr-2 text-sm text-vn-white"
    >
      <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        {error.before}
        <a href={WHATSAPP_FALLBACK_URL} target="_blank" rel="noopener noreferrer" className={`${LINK_CLASS} font-medium`}>
          {error.link}
        </a>
        {error.after}
      </span>
      <button
        type="button"
        onClick={onClose}
        className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-white"
      >
        {error.close}
      </button>
    </m.div>
  );
}

export default ContactErrorAlert;
