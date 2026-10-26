interface FieldErrorProps {
  /** Id do parágrafo, o mesmo que o campo usa em aria-describedby (ver errorId). */
  id: string;
  message?: string;
}

/** Mensagem de erro de um campo do formulário de contato; não renderiza nada sem mensagem. */
export default function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p id={id} role="alert" aria-live="polite" className="text-[10px] text-red-400 ml-4 mt-1">
      {message}
    </p>
  );
}
