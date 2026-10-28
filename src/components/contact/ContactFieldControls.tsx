import type { ReactNode, SyntheticEvent } from 'react';
import { serviceOptions } from '../../data/services';
import type { ContactFields } from '../../lib/contact';
import ServiceSelect from '../ServiceSelect';
import { contactFormCopy } from './contactFormCopy';
import { LABEL_CLASS } from './contactStyles';
import FieldError from './FieldError';
import { errorId, fieldProps } from './fieldProps';
import { EMPTY_FORM_DATA } from './useContactForm';

const { labels, placeholders } = contactFormCopy;

/** Id of the visible label of the service field: the trigger names itself by it and by its own text. */
export const SERVICE_LABEL_ID = 'contact-servico-label';

// The WhatsApp field always starts with "+55 " (EMPTY_FORM_DATA.whatsapp): a caret before the end of it would make the
// next digits land in front of the prefix, and the formatter would then read them as the country code and the DDD.
const PHONE_PREFIX_LENGTH = EMPTY_FORM_DATA.whatsapp.length;

/**
 * Moves a caret that sits inside the prefix to just after it. Only a collapsed caret moves: the select all that a
 * Tab brings, and a drag or a double click, are ranges and stay as they are. Needs a type that supports selection
 * ranges (tel does).
 */
function keepCaretAfterPrefix(event: SyntheticEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const { selectionStart, selectionEnd } = input;
  if (selectionStart === null || selectionStart !== selectionEnd || selectionStart >= PHONE_PREFIX_LENGTH) return;

  input.setSelectionRange(PHONE_PREFIX_LENGTH, PHONE_PREFIX_LENGTH);
}

// Which browser autofill and which keyboard each text field asks for.
const INPUT_CONFIG = {
  nome: { type: 'text', autoComplete: 'name' },
  email: { type: 'email', autoComplete: 'email' },
  whatsapp: { type: 'tel', autoComplete: 'tel', inputMode: 'tel', onSelect: keepCaretAfterPrefix },
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

/** A single line field of the form: nome, email or whatsapp. */
export function ContactInput({ field, value, error, onChange }: ContactInputProps) {
  const id = `contact-${field}`;
  const config: {
    type: string;
    autoComplete: string;
    inputMode?: 'tel';
    onSelect?: (event: SyntheticEvent<HTMLInputElement>) => void;
  } = INPUT_CONFIG[field];

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
        onSelect={config.onSelect}
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
