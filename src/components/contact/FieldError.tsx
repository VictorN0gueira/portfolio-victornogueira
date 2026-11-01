import { AlertCircle } from 'lucide-react';

interface FieldErrorProps {
  /** Id do parágrafo, o mesmo que o campo usa em aria-describedby (ver contactIds). */
  id: string;
  message?: string;
  /**
   * For a line no field points at (the cooldown notice): nothing moves the focus to it, so it is announced as an alert.
   * A field error is not: it reaches the visitor through the focus that lands on the field and its aria-describedby, and
   * several alerts at once would also talk over each other.
   */
  announce?: boolean;
}

/**
 * Mensagem de erro de um campo do formulário de contato; não renderiza nada sem mensagem.
 * O erro vai em texto com um ícone, nunca só na cor.
 */
export function FieldError({ id, message, announce = false }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p id={id} role={announce ? 'alert' : undefined} className="flex items-start gap-2 text-sm text-vn-white">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{message}</span>
    </p>
  );
}
