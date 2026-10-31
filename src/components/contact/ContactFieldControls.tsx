import type { ReactNode } from 'react';
import { serviceOptions } from '../../data/services';
import { EMAIL_MAX, MESSAGE_MAX, NAME_MAX, type ContactFields } from '../../lib/contact';
import { contactFormCopy } from './contactFormCopy';
import { LABEL_CLASS } from './contactStyles';
import FieldCapHint from './FieldCapHint';
import FieldError from './FieldError';
import { useContactIds } from './contactIds';
import { fieldProps } from './fieldProps';
import ServiceSelect from './ServiceSelect';
import { whatsappInputProps } from './whatsappInput';

const { labels, placeholders } = contactFormCopy;

// Which browser autofill and which keyboard each text field asks for.
// The WhatsApp field has no cap here: its own formatting (whatsappInput.ts) already bounds what it holds.
const INPUT_CONFIG = {
  nome: { type: 'text', autoComplete: 'name', maxLength: NAME_MAX },
  email: { type: 'email', autoComplete: 'email', maxLength: EMAIL_MAX },
  whatsapp: { type: 'tel', autoComplete: 'tel', maxLength: undefined },
} as const;

interface FieldFrameProps {
  field: keyof ContactFields;
  label: string;
  error?: string;
  /** Id of the control the label belongs to. The service select also names itself with `labelId` (its name is label + text). */
  htmlFor?: string;
  /** Id given to the label, for a control that points at it with aria-labelledby. */
  labelId?: string;
  /** A visible line under the control that tells how to fill it, ahead of the error (the control describes itself by it). */
  hint?: { id: string; text: string };
  children: ReactNode;
}

/** The label, the control and the error message of one field. */
function FieldFrame({ field, label, error, htmlFor, labelId, hint, children }: FieldFrameProps) {
  const ids = useContactIds();

  return (
    // `relative`: the cap hint of the field is positioned in the gap under it (see FieldCapHint).
    <div className="relative flex flex-col gap-2">
      <label id={labelId} htmlFor={htmlFor} className={LABEL_CLASS}>
        {label}
      </label>
      {children}
      {hint && (
        <p id={hint.id} className="text-sm text-vn-gray-light">
          {hint.text}
        </p>
      )}
      <FieldError id={ids.error(field)} message={error} />
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
  const ids = useContactIds();
  const id = ids.field(field);
  const hint = field === 'whatsapp' ? { id: ids.whatsappHint, text: contactFormCopy.whatsappHint } : undefined;
  const config = INPUT_CONFIG[field];
  const extra = field === 'whatsapp' ? whatsappInputProps(onChange) : undefined;

  return (
    <FieldFrame field={field} label={labels[field]} error={error} htmlFor={id} hint={hint}>
      <input
        id={id}
        required
        {...fieldProps(ids.error(field), error, '', hint ? [hint.id] : [])}
        type={config.type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholders[field]}
        autoComplete={config.autoComplete}
        maxLength={config.maxLength}
        {...extra}
      />
      <FieldCapHint id={ids.cap(field)} length={value.length} max={config.maxLength} />
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
  const ids = useContactIds();

  return (
    <FieldFrame field="mensagem" label={labels.mensagem} error={error} htmlFor={ids.field('mensagem')}>
      <textarea
        id={ids.field('mensagem')}
        required
        {...fieldProps(ids.error('mensagem'), error, 'resize-none')}
        rows={4}
        maxLength={MESSAGE_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholders.mensagem}
        enterKeyHint="enter"
      />
      <FieldCapHint id={ids.cap('mensagem')} length={value.length} max={MESSAGE_MAX} />
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
  const ids = useContactIds();

  return (
    <FieldFrame
      field="servico"
      label={labels.servico}
      error={error}
      htmlFor={ids.servicoTrigger}
      labelId={ids.servicoLabel}
    >
      <ServiceSelect
        id={ids.servicoTrigger}
        value={value}
        onChange={onChange}
        options={serviceOptions}
        placeholder={placeholders.servico}
        invalid={!!error}
        describedBy={ids.error('servico')}
        labelledBy={ids.servicoLabel}
      />
    </FieldFrame>
  );
}
