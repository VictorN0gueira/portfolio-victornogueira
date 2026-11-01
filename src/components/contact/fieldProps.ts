import { FIELD_CLASS, FIELD_INVALID_CLASS, FIELD_VALID_CLASS } from './contactStyles';

/**
 * Atributos comuns dos campos de texto do contato: o par aria que liga o campo ao
 * seu erro e as classes com a borda reforçada quando há erro. `describedBy` são os ids que o campo descreve
 * além do erro (a dica do WhatsApp), na ordem em que são lidos; o do erro vem por último.
 */
export function fieldProps(
  errorId: string,
  error: string | undefined,
  extraClass = '',
  describedBy: readonly string[] = [],
) {
  const described = error ? [...describedBy, errorId] : [...describedBy];
  return {
    'aria-invalid': !!error,
    'aria-describedby': described.length > 0 ? described.join(' ') : undefined,
    className: `block ${FIELD_CLASS} ${error ? FIELD_INVALID_CLASS : FIELD_VALID_CLASS} ${extraClass}`.trim(),
  };
}
