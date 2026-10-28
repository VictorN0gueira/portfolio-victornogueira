import type { ReactNode } from 'react';
import { serviceOptions } from '../../data/services';
import type { ContactFields } from '../../lib/contact';
import ServiceSelect from '../ServiceSelect';
import { contactFormCopy } from './contactFormCopy';
import { LABEL_CLASS } from './contactStyles';
import FieldError from './FieldError';
import { errorId, fieldProps } from './fieldProps';
import { whatsappInputProps } from './whatsappInput';

const { labels, placeholders } = contactFormCopy;

/** Id of the visible label of the service field: the trigger names itself by it and by its own text. */
export const SERVICE_LABEL_ID = 'contact-servico-label';

// Which browser autofill and which keyboard each text field asks for.
const INPUT_CONFIG = {
  nome: { type: 'text', autoComplete: 'name' },
  email: { type: 'email', autoComplete: 'email' },
  whatsapp: { type: 'tel', autoComplete: 'tel' },
} as const;

interface FieldFrameProps {
  field: keyof ContactFields;
  label: string;
  error?: string;
  /** Id of the control the label belongs to. The service select has none: it names itself with `labelId`. */
  htmlFor?: string;
  /** Id given to the label, for a control that points at it with aria-labelledby. */
  labelId?: string;
  children: ReactNode;
}

/** The label, the control and the error message of one field. */
function FieldFrame({ field, label, error, htmlFor, labelId, children }: FieldFrameProps) {
  return (
    <div className="flex flex-col gap-2">
      <label id={labelId} htmlFor={htmlFor} className={LABEL_CLASS}>
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

/**
 * A single line field of the form: nome, email or whatsapp. The WhatsApp field also gets its caret and paste guards
 * (see whatsappInput.ts); the other two fields have none.
 */
export function ContactInput({ field, value, error, onChange }: ContactInputProps) {
  const id = `contact-${field}`;
  const config = INPUT_CONFIG[field];
  const extra = field === 'whatsapp' ? whatsappInputProps(onChange) : undefined;

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
        {...extra}
      />
    </FieldFrame>
  );
}

interface ContactMessageProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/**
 * The message box. The Enter key of a phone keyboard stays an Enter key: in a textarea it inserts a new line, so it must
 * not say "send" (a visitor could believe the message went out). Sending is the Enviar button.
 */
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
        enterKeyHint="enter"
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
    <FieldFrame field="servico" label={labels.servico} error={error} labelId={SERVICE_LABEL_ID}>
      <ServiceSelect
        value={value}
        onChange={onChange}
        options={serviceOptions}
        placeholder={placeholders.servico}
        invalid={!!error}
        describedBy={errorId('servico')}
        labelledBy={SERVICE_LABEL_ID}
      />
    </FieldFrame>
  );
}
