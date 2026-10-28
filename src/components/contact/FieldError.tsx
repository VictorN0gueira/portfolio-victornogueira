import { AlertCircle } from 'lucide-react';

interface FieldErrorProps {
  /** Id do parágrafo, o mesmo que o campo usa em aria-describedby (ver errorId). */
  id: string;
  message?: string;
}

/**
 * Mensagem de erro de um campo do formulário de contato; não renderiza nada sem mensagem.
 * O erro vai em texto com um ícone, nunca só na cor.
 */
export default function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p id={id} role="alert" aria-live="polite" className="flex items-start gap-2 text-sm text-vn-white">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{message}</span>
    </p>
  );
}
