import { CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
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

/**
 * What replaces the form once the webhook answered: thanks, by the method the visitor chose, and a way to start over.
 * The form took the focus with it when it left, so the heading (an h3, under the h2 of the section) takes it on mount:
 * a keyboard or screen reader visitor lands on the thanks instead of the top of the page. The heading is focusable by
 * script only (tabindex -1), without scrolling.
 */
export function ContactSuccess({ method, onReset }: ContactSuccessProps) {
  const headingBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const heading = headingBox.current?.querySelector('h3');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${PANEL_CLASS} text-center`}
    >
      <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-vn-white md:size-20">
        <CheckCircle2 aria-hidden="true" className="size-8 text-vn-black md:size-10" />
      </div>
      <div ref={headingBox}>
        <Heading as="h3" size="m" className="outline-none">
          {success.title}
        </Heading>
      </div>
      <p className="mx-auto mb-8 mt-4 max-w-xs text-base text-vn-gray-light">{success.text(method)}</p>
      <Button tone="dark" size="lg" onClick={onReset}>
        {success.again}
      </Button>
    </motion.div>
  );
}

export default ContactSuccess;
