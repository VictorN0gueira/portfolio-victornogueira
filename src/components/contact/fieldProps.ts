import type { ContactFields } from '../../lib/contact';

const BASE_CLASS =
  'w-full bg-white/5 border rounded-2xl px-6 py-3.5 md:py-4 focus:outline-none focus:ring-2 transition-all placeholder:text-zinc-600 text-sm';
const VALID_CLASS = 'border-white/10 focus:ring-white/20';
const INVALID_CLASS = 'border-red-500/50 focus:ring-red-500/20';

/** Id do parágrafo de erro de um campo: `contact-<campo>-error`. */
export function errorId(field: keyof ContactFields): string {
  return `contact-${field}-error`;
}

/**
 * Atributos comuns dos campos de texto do contato: o par aria que liga o campo ao
 * seu erro e as classes com a borda vermelha quando há erro.
 */
export function fieldProps(field: keyof ContactFields, error: string | undefined, extraClass = '') {
  return {
    'aria-invalid': !!error,
    'aria-describedby': error ? errorId(field) : undefined,
    className: `${BASE_CLASS} ${error ? INVALID_CLASS : VALID_CLASS} ${extraClass}`.trim(),
  };
}
