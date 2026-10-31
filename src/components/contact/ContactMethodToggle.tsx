import { Mail, MessageSquare } from 'lucide-react';
import type { ContactMethod } from '../../lib/contact';
import { cn } from '../../lib/utils';
import { contactFormCopy } from './contactFormCopy';

// Two stacked pills below 420px, so "Por WhatsApp" never has to squeeze into half of a 216px panel.
const GROUP_CLASS =
  'grid w-full grid-cols-1 gap-1 rounded-2xl border border-vn-gray-mid bg-vn-white/5 p-1 min-[420px]:grid-cols-2';
const PILL_CLASS = [
  'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5',
  'text-sm font-medium leading-tight',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-white',
].join(' ');
const ACTIVE_CLASS = 'bg-vn-white text-vn-black';
const IDLE_CLASS = 'text-vn-gray-light hover:text-vn-white';

const METHODS = [
  { id: 'email', label: contactFormCopy.method.email, Icon: Mail },
  { id: 'whatsapp', label: contactFormCopy.method.whatsapp, Icon: MessageSquare },
] as const;

interface ContactMethodToggleProps {
  method: ContactMethod;
  onSelect: (method: ContactMethod) => void;
}

/**
 * The choice between answering by e-mail or by WhatsApp: a fieldset (its legend is the one name of the group) with two
 * toggle buttons (aria-pressed), the active one white on black. Changing it swaps the contact field and drops the errors (see selectMethod).
 */
export function ContactMethodToggle({ method, onSelect }: ContactMethodToggleProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{contactFormCopy.method.legend}</legend>
      <div className={GROUP_CLASS}>
        {METHODS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={method === id}
            className={cn(PILL_CLASS, method === id ? ACTIVE_CLASS : IDLE_CLASS)}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default ContactMethodToggle;
