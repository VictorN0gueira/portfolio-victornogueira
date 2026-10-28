import type { ReactNode } from 'react';
import { serviceOptions } from '../../data/services';
import type { ContactFields as ContactFieldValues } from '../../lib/contact';
import ServiceSelect from '../ServiceSelect';
import { contactFormCopy } from './contactFormCopy';
import { LABEL_CLASS } from './contactStyles';
import FieldError from './FieldError';
import { errorId, fieldProps } from './fieldProps';

const { labels, placeholders } = contactFormCopy;

// Which browser autofill and which keyboard each text field asks for.
const INPUT_CONFIG = {
  nome: { type: 'text', autoComplete: 'name' },
  email: { type: 'email', autoComplete: 'email' },
  whatsapp: { type: 'tel', autoComplete: 'tel', inputMode: 'tel' },
} as const;

interface FieldFrameProps {
  field: keyof ContactFieldValues;
  label: string;
  error?: string;
  /** Id of the control the label belongs to. The service select has none: it names itself by its text. */
  htmlFor?: string;
  children: ReactNode;
}

/** The label, the control and the error message of one field. */
function FieldFrame({ field, label, error, htmlFor, children }: FieldFrameProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className={LABEL_CLASS}>
        {label}
      </label>
      {children}
      <FieldError id={errorId(field)} message={error} />
    </div>
  );
}

interface ContactInputProps {
  field: keyof typeof INPUT_CONFIG;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/** A single line field of the form: nome, email or whatsapp. */
export function ContactInput({ field, value, error, onChange }: ContactInputProps) {
  const id = `contact-${field}`;
  const config: { type: string; autoComplete: string; inputMode?: 'tel' } = INPUT_CONFIG[field];

  return (
    <FieldFrame field={field} label={labels[field]} error={error} htmlFor={id}>
      <input
        id={id}
        required
        aria-required="true"
        {...fieldProps(field, error)}
        type={config.type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholders[field]}
        autoComplete={config.autoComplete}
        inputMode={config.inputMode}
      />
    </FieldFrame>
  );
}

interface ContactMessageProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/** The message box. The Enter key of a phone keyboard says "send". */
export function ContactMessage({ value, error, onChange }: ContactMessageProps) {
  return (
    <FieldFrame field="mensagem" label={labels.mensagem} error={error} htmlFor="contact-mensagem">
      <textarea
        id="contact-mensagem"
        required
        aria-required="true"
        {...fieldProps('mensagem', error, 'resize-none')}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholders.mensagem}
        enterKeyHint="send"
      />
    </FieldFrame>
  );
}

interface ContactServiceProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/** Serviço de interesse, comum a email e WhatsApp. */
export function ContactService({ value, error, onChange }: ContactServiceProps) {
  return (
    <FieldFrame field="servico" label={labels.servico} error={error}>
      <ServiceSelect
        value={value}
        onChange={onChange}
        options={serviceOptions}
        placeholder={placeholders.servico}
        invalid={!!error}
        describedBy={errorId('servico')}
      />
    </FieldFrame>
  );
}
