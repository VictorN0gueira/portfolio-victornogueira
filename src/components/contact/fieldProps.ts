import type { ContactFields } from '../../lib/contact';
import { FIELD_CLASS, FIELD_INVALID_CLASS, FIELD_VALID_CLASS } from './contactStyles';

/** Id do parágrafo de erro de um campo: `contact-<campo>-error`. */
export function errorId(field: keyof ContactFields): string {
  return `contact-${field}-error`;
}

/**
 * Atributos comuns dos campos de texto do contato: o par aria que liga o campo ao
 * seu erro e as classes com a borda reforçada quando há erro.
 */
export function fieldProps(field: keyof ContactFields, error: string | undefined, extraClass = '') {
  return {
    'aria-invalid': !!error,
    'aria-describedby': error ? errorId(field) : undefined,
    className: `block ${FIELD_CLASS} ${error ? FIELD_INVALID_CLASS : FIELD_VALID_CLASS} ${extraClass}`.trim(),
  };
}
